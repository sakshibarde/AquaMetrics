// import { useState, useEffect } from 'react';
// import Header from '@/components/Header';
// import { Card } from '@/components/ui/card';
// import { Label } from '@/components/ui/label';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
// import { LineChart, Activity, TrendingUp, Loader2 } from 'lucide-react';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { ResponsiveContainer, LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
// import Plot from 'react-plotly.js'; // Make sure this is imported
// import { toast } from 'sonner';

// type Station = {
//   id: string;
//   name: string;
// };

// const Analysis = () => {
//   const [stations, setStations] = useState<Station[]>([]);
//   const [selectedStation, setSelectedStation] = useState<string | null>(null);
//   const [isStationsLoading, setIsStationsLoading] = useState(true);

//   const [dayNightImageUrl, setDayNightImageUrl] = useState<string>('');
  
//   const [heatmapData, setHeatmapData] = useState<any>(null); // For Anomaly Heatmap
//   const [isHeatmapLoading, setIsHeatmapLoading] = useState(true);

//   // --- (NEW) State for Correlation Plot ---
//   const [correlationData, setCorrelationData] = useState<any>(null);
//   const [isCorrelationLoading, setIsCorrelationLoading] = useState(false);
//   // ----------------------------------------

//   // --- Effect to load station list ---
//   useEffect(() => {
//     setIsStationsLoading(true);
//     fetch('http://localhost:5000/api/daynight/list')
//       .then(res => res.json())
//       .then((filenames: string[]) => {
//         if (!filenames || filenames.length === 0) {
//           toast.warning("No station plots found. Run your batch jobs first.");
//           return;
//         }
        
//         const parsedStations = filenames.map(filename => {
//           const id = filename.replace('station_', '').replace('.png', '');
//           return { id: id, name: `Monitoring Station ${id}` };
//         });
        
//         setStations(parsedStations);
        
//         const firstStationId = parsedStations[0].id;
//         setSelectedStation(firstStationId);
//         // (This call is now handled by the new useEffect below)
//       })
//       .catch(err => {
//         console.error("Failed to fetch station list", err);
//         toast.error("Failed to load station list from backend.");
//       })
//       .finally(() => setIsStationsLoading(false));
//   }, []); // Runs once on mount

//   // --- Effect to load anomaly heatmap (runs once) ---
//   useEffect(() => {
//     setIsHeatmapLoading(true);
//     fetch('http://localhost:5000/api/anomaly-heatmap')
//       .then(res => res.json())
//       .then(data => setHeatmapData(data))
//       .catch(err => toast.error("Failed to load anomaly heatmap."))
//       .finally(() => setIsHeatmapLoading(false));
//   }, []);

//   // --- (NEW) Effect to load data WHEN STATION CHANGES ---
//   useEffect(() => {
//     if (!selectedStation) return; // Don't run if no station is selected

//     // 1. Load Day/Night Image
//     setDayNightImageUrl(`http://localhost:5000/static/daynight/station_${selectedStation}.png`);

//     // 2. Load Correlation Plot
//     setIsCorrelationLoading(true);
//     fetch(`http://localhost:5000/api/correlation/${selectedStation}`)
//       .then(res => res.json())
//       .then(data => {
//         if (data.error) throw new Error(data.error);
//         setCorrelationData(data);
//       })
//       .catch(err => {
//         console.error("Failed to fetch correlation plot", err);
//         toast.error(`Failed to load correlation plot for Station ${selectedStation}.`);
//         setCorrelationData(null); // Clear old data on error
//       })
//       .finally(() => setIsCorrelationLoading(false));

//   }, [selectedStation]); // This runs every time 'selectedStation' changes

//   // ... (rest of your component, like handleStationChange, anomalyData, etc.) ...
//   const handleStationChange = (stationId: string) => {
//     setSelectedStation(stationId);
//     // (The useEffect hook now handles all loading)
//   };

//   // Mock data for Anomaly Detection line chart
//   const anomalyData = Array.from({ length: 30 }, (_, i) => ({
//     day: i + 1,
//     value: Math.random() * 100 + 50 + (i > 20 ? Math.random() * 50 : 0),
//     anomaly: i > 20 && Math.random() > 0.7,
//   }));

//   return (
//     <div className="min-h-screen bg-background">
//       <Header />
      
//       <div className="pt-24 pb-16 px-4">
//         <div className="container mx-auto max-w-7xl">
//           {/* ... (Your Header and Station Select Card) ... */}
//           <Card className="p-8 shadow-medium border-2 mb-8">
//             <div className="max-w-md">
//               <Label htmlFor="station-select" className="text-sm font-medium mb-2 block">
//                 Select Monitoring Station
//               </Label>
//               {isStationsLoading ? (
//                 <div className="flex items-center gap-2 text-muted-foreground">
//                   <Loader2 className="h-4 w-4 animate-spin" />
//                   Loading stations...
//                 </div>
//               ) : (
//                 <Select value={selectedStation || ''} onValueChange={handleStationChange}>
//                   <SelectTrigger id="station-select" className="w-full">
//                     <SelectValue placeholder="Select a station" />
//                   </SelectTrigger>
//                   <SelectContent className="max-h-64">
//                     {stations.map((station) => (
//                       <SelectItem key={station.id} value={station.id}>
//                         {station.name}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               )}
//             </div>
//           </Card>

//           <Tabs defaultValue="day-night" className="space-y-8">
//             <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto">
//               <TabsTrigger value="day-night">Day-Night Analysis</TabsTrigger>
//               <TabsTrigger value="correlation">Correlation Heatmap</TabsTrigger> {/* (MODIFIED) Swapped order */}
//               <TabsTrigger value="anomaly-heatmap">Anomaly Detection</TabsTrigger> {/* (MODIFIED) Renamed */}
//             </TabsList>

//             {/* Day-Night Tab (Unchanged, but now loads on station change) */}
//             <TabsContent value="day-night" className="space-y-6 animate-fade-in">
//               <Card className="p-8 shadow-medium border-2">
//                 <div className="flex items-center gap-3 mb-6">
//                   <LineChart className="h-6 w-6 text-primary" />
//                   <h2 className="text-2xl font-bold">Day vs Night Parameter Comparison</h2>
//                 </div>
//                 <p className="text-muted-foreground mb-6">
//                   Average values of water parameters during day and night periods for {selectedStation ? `Station ${selectedStation}` : '...'}
//                 </p>
                
//                 <div className="flex justify-center items-center min-h-[400px] bg-muted/30 rounded-lg">
//                   {selectedStation ? (
//                     <img 
//                       src={dayNightImageUrl} 
//                       alt={`Day/Night plot for station ${selectedStation}`}
//                       className="max-w-full h-auto"
//                       onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/800x600?text=Plot+Not+Found")}
//                     />
//                   ) : (
//                     <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
//                   )}
//                 </div>
//               </Card>
//             </TabsContent>

//             {/* --- (MODIFIED) Correlation tab now loads the new station-specific Plotly plot --- */}
//             <TabsContent value="correlation" className="space-y-6 animate-fade-in">
//               <Card className="p-8 shadow-medium border-2">
//                 <div className="flex items-center gap-3 mb-6">
//                   <Activity className="h-6 w-6 text-primary" />
//                   <h2 className="text-2xl font-bold">Inter-Parameter Correlation</h2>
//                 </div>
//                 <p className="text-muted-foreground mb-6">
//                   Spearman correlation matrix for {selectedStation ? `Station ${selectedStation}` : '...'}. 
//                   Values range from -1 (negative) to +1 (positive).
//                 </p>
                
//                 <div className="min-h-[700px] flex justify-center items-center">
//                   {isCorrelationLoading || !correlationData ? (
//                     <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
//                   ) : (
//                     <Plot
//                       data={correlationData.data}
//                       layout={correlationData.layout}
//                       style={{ width: '100%', height: '100%' }}
//                       useResizeHandler={true}
//                       className="w-full"
//                     />
//                   )}
//                 </div>
//               </Card>
//             </TabsContent>
            
//             {/* --- (MODIFIED) This is now the *Overall* Anomaly Heatmap --- */}
//             <TabsContent value="anomaly-heatmap" className="space-y-6 animate-fade-in">
//               <Card className="p-8 shadow-medium border-2">
//                 <div className="flex items-center gap-3 mb-6">
//                   <TrendingUp className="h-6 w-6 text-primary" />
//                   <h2 className="text-2xl font-bold">Overall Anomaly Heatmap (All Stations)</h2>
//                 </div>
//                 <p className="text-muted-foreground mb-6">
//                   Total anomaly counts from the LSTM Autoencoder across all parameters and stations.
//                 </p>
                
//                 <div className="min-h-[600px] flex justify-center items-center">
//                   {isHeatmapLoading || !heatmapData ? (
//                     <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
//                   ) : (
//                     <Plot
//                       data={heatmapData.data}
//                       layout={heatmapData.layout}
//                       style={{ width: '100%', height: '100%' }}
//                       useResizeHandler={true}
//                       className="w-full"
//                     />
//                   )}
//                 </div>
//               </Card>
//             </TabsContent>

//           </Tabs>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Analysis;



// import { useState, useEffect } from 'react';
// import Header from '@/components/Header';
// import { Card } from '@/components/ui/card';
// import { Label } from '@/components/ui/label';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
// import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; // Import RadioGroup
// import { LineChart, Activity, TrendingUp, Loader2, Info } from 'lucide-react'; // Import Info
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import Plot from 'react-plotly.js';
// import { toast } from 'sonner';

// // --- Define types ---
// type Station = {
//   id: string; // Keep as string, matches filename parsing and Select value
//   name: string;
// };

// type QualityLevel = 'Excellent' | 'Good' | 'Medium' | 'Bad' | 'Very Bad';

// // Correlation Insight Types
// type CorrelationPair = {
//   param1: string;
//   param2: string;
//   correlation: number; // Renamed from 'value' for clarity
// };
// type CorrelationInsights = {
//   positive: CorrelationPair[];
//   negative: CorrelationPair[];
// };

// type AnomalyInsight = {
//   station: string;
//   parameter: string;
//   count: number;
// };

// // Correlation Methods Type
// type CorrelationMethod = 'pearson' | 'spearman' | 'kendall';


// const Analysis = () => {
//   const [stations, setStations] = useState<Station[]>([]);
//   const [selectedStation, setSelectedStation] = useState<string | null>(null);
//   const [isStationsLoading, setIsStationsLoading] = useState(true);

//   const [dayNightImageUrl, setDayNightImageUrl] = useState<string>('');

//   const [heatmapData, setHeatmapData] = useState<any>(null);
//   const [isHeatmapLoading, setIsHeatmapLoading] = useState(true);

//   const [correlationData, setCorrelationData] = useState<any>(null);
//   const [isCorrelationLoading, setIsCorrelationLoading] = useState(false);

//   // States for Correlation
//   const [correlationMethod, setCorrelationMethod] = useState<CorrelationMethod>('spearman');
//   const [correlationInsights, setCorrelationInsights] = useState<CorrelationInsights | null>(null);


//   const [anomalyInsights, setAnomalyInsights] = useState<AnomalyInsight[]>([]);


//   // Effect to load station list on mount
//   useEffect(() => {
//     setIsStationsLoading(true);
//     // Fetch from /api/stations which has richer data (name, id) if available
//     // Fallback to /api/daynight/list if /api/stations is not ready yet
//     fetch('http://localhost:5000/api/stations')
//       .then(res => {
//           if (!res.ok) throw new Error('Failed to fetch stations');
//           return res.json();
//       })
//       .then((data: { stationId: number; name: string }[]) => { // Expecting stationId and name
//         if (!data || data.length === 0) {
//           toast.warning("No station data found from backend.");
//           setStations([]);
//           return;
//         }
//         // Map station ID to string for Select component compatibility
//         const formattedStations = data.map(s => ({ id: String(s.stationId), name: s.name || `Station ${s.stationId}` }));
//         setStations(formattedStations);

//         if (formattedStations.length > 0) {
//           setSelectedStation(formattedStations[0].id); // Select first station ID (as string)
//         }
//       })
//       .catch(err => {
//           console.error("Failed fetching /api/stations, falling back to /api/daynight/list", err);
//           // Fallback to daynight list if /api/stations fails
//           fetch('http://localhost:5000/api/daynight/list')
//             .then(res => res.json())
//             .then((filenames: string[]) => {
//                 if (!filenames || filenames.length === 0) {
//                     toast.warning("No station plots found. Run your batch jobs first.");
//                     setStations([]); return;
//                 }
//                 const parsedStations = filenames.map(filename => {
//                     const id = filename.replace('station_', '').replace('.png', '');
//                     return { id: id, name: `Monitoring Station ${id}` }; // Use generic name
//                 });
//                 setStations(parsedStations);
//                 if (parsedStations.length > 0) setSelectedStation(parsedStations[0].id);
//             })
//             .catch(fallbackErr => toast.error("Failed to load station list from backend."))
//       })
//       .finally(() => setIsStationsLoading(false));
//   }, []); // Runs once

//   // Effect to load Anomaly Heatmap and generate insights
//   useEffect(() => {
//     setIsHeatmapLoading(true);
//     fetch('http://localhost:5000/api/anomaly-heatmap')
//       .then(res => res.json())
//       .then(data => {
//         setHeatmapData(data);
//         generateAnomalyInsights(data);
//       })
//       .catch(err => toast.error("Failed to load anomaly heatmap."))
//       .finally(() => setIsHeatmapLoading(false));
//   }, []); // Runs once

//   // Effect to load station-specific data based on station AND method
//   useEffect(() => {
//     if (!selectedStation) return;

//     // 1. Load Day/Night Image (Only depends on station)
//     setDayNightImageUrl(`http://localhost:5000/static/daynight/station_${selectedStation}.png`);

//     // 2. Load Correlation Plot & Generate Insights (Depends on station AND method)
//     setIsCorrelationLoading(true);
//     setCorrelationInsights(null); // Clear old insights
//     setCorrelationData(null); // Clear old plot

//     fetch(`http://localhost:5000/api/correlation/${selectedStation}?method=${correlationMethod}`) // Add method query param
//       .then(res => res.json())
//       .then(data => {
//         if (data.error) throw new Error(data.error);
//         setCorrelationData(data);
//         // Extract insights from metadata embedded by the backend
//         if (data?.layout?.meta?.top_correlated_pairs) {
//           setCorrelationInsights(data.layout.meta.top_correlated_pairs);
//         } else {
//            console.warn("Top correlated pairs not found in plot metadata.");
//            setCorrelationInsights({ positive: [], negative: [] }); // Default empty if not found
//         }
//       })
//       .catch(err => {
//         console.error("Failed to fetch correlation plot", err);
//         toast.error(`Failed to load ${correlationMethod} correlation for Station ${selectedStation}.`);
//       })
//       .finally(() => setIsCorrelationLoading(false));

//   }, [selectedStation, correlationMethod]); // Re-run when method changes too


//   // --- Functions to generate insights ---
//   const generateAnomalyInsights = (plotData: any) => {
//     // This function remains unchanged - extracts from anomaly heatmap data
//     if (!plotData?.data?.[0]?.z || !plotData?.data?.[0]?.x || !plotData?.data?.[0]?.y) {
//       setAnomalyInsights([]); return;
//     }
//     const z = plotData.data[0].z; const x = plotData.data[0].x; const y = plotData.data[0].y;
//     let insights: AnomalyInsight[] = [];
//     for (let i = 0; i < y.length; i++) { for (let j = 0; j < x.length; j++) {
//         // Use parseFloat for station ID if it's numeric string, otherwise keep as string
//         const stationId = !isNaN(parseFloat(y[i])) ? parseFloat(y[i]) : y[i];
//         if (z[i][j] > 0) { insights.push({ station: String(stationId), parameter: x[j], count: z[i][j] }); } } }
//     insights.sort((a, b) => b.count - a.count);
//     setAnomalyInsights(insights.slice(0, 5));
//   };


//   // --- Handler for station change ---
//   const handleStationChange = (stationId: string) => {
//     setSelectedStation(stationId);
//   };

//   // Helper function to format parameter names (add spaces before capitals)
//   const formatParamName = (name: string) => name.replace(/([A-Z])/g, ' $1').trim();

//   return (
//     <div className="min-h-screen bg-background">
//       <Header />

//       <div className="pt-24 pb-16 px-4">
//         <div className="container mx-auto max-w-7xl">
//           {/* Header Text */}
//           <div className="text-center mb-12 animate-fade-in-up">
//             <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-6 py-2 mb-4">
//               <Activity className="h-5 w-5 text-primary" />
//               <span className="text-sm font-medium text-primary">Station Analysis</span>
//             </div>
//             <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-water bg-clip-text text-transparent">
//               Station-wise Water Analysis
//             </h1>
//             <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
//               Comprehensive analysis including day-night patterns, anomaly detection, and correlation matrices
//             </p>
//            </div>
//           {/* Station Select Card */}
//           <Card className="p-8 shadow-medium border-2 mb-8">
//             <div className="max-w-md">
//               <Label htmlFor="station-select" className="text-sm font-medium mb-2 block">
//                 Select Monitoring Station
//               </Label>
//               {isStationsLoading ? (
//                  <Loader2 className="h-4 w-4 animate-spin" />
//               ) : (
//                 <Select value={selectedStation || ''} onValueChange={handleStationChange}>
//                   <SelectTrigger id="station-select" className="w-full">
//                     {/* Display selected station name or placeholder */}
//                     <SelectValue placeholder="Select a station">
//                       {selectedStation ? stations.find(s => s.id === selectedStation)?.name : "Select a station"}
//                     </SelectValue>
//                   </SelectTrigger>
//                   <SelectContent className="max-h-64">
//                     {stations.map((station) => (
//                       <SelectItem key={station.id} value={station.id}>
//                         {station.name} (#{station.id})
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               )}
//             </div>
//           </Card>

//           <Tabs defaultValue="day-night" className="space-y-8">
//             <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto">
//               <TabsTrigger value="day-night">Day-Night Analysis</TabsTrigger>
//               <TabsTrigger value="correlation">Correlation Heatmap</TabsTrigger>
//               <TabsTrigger value="anomaly-heatmap">Overall Anomaly Heatmap</TabsTrigger>
//             </TabsList>

//             {/* Day-Night Tab */}
//             <TabsContent value="day-night" className="space-y-6 animate-fade-in">
//               <Card className="p-8 shadow-medium border-2">
//                  {/* Chart and generic insights */}
//                  <div className="flex items-center gap-3 mb-6">
//                    <LineChart className="h-6 w-6 text-primary" />
//                    <h2 className="text-2xl font-bold">Day vs Night Parameter Comparison</h2>
//                  </div>
//                  <p className="text-muted-foreground mb-6">
//                    Average values for {selectedStation ? `Station ${selectedStation}` : '...'}
//                  </p>
//                  <div className="flex justify-center items-center min-h-[400px] bg-muted/30 rounded-lg mb-6">
//                    {selectedStation ? (
//                      <img
//                        src={dayNightImageUrl}
//                        alt={`Day/Night plot for station ${selectedStation}`}
//                        className="max-w-full h-auto"
//                        onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/800x600?text=Plot+Not+Found")}
//                      />
//                    ) : ( <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> )}
//                  </div>
//                  <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
//                    <h4 className="font-semibold mb-2 flex items-center"><Info className="h-4 w-4 mr-2 text-primary" /> Insights</h4>
//                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
//                      <li>Comparing day/night values helps identify parameters influenced by daily cycles.</li>
//                      <li>Significant differences might indicate specific pollution events or natural processes.</li>
//                    </ul>
//                  </div>
//               </Card>
//             </TabsContent>

//             {/* Correlation Tab */}
//             <TabsContent value="correlation" className="space-y-6 animate-fade-in">
//               <Card className="p-8 shadow-medium border-2">
//                  <div className="flex items-center gap-3 mb-6">
//                    <Activity className="h-6 w-6 text-primary" />
//                    <h2 className="text-2xl font-bold">Inter-Parameter Correlation</h2>
//                  </div>
//                  {/* Radio Group for Method Selection */}
//                  <div className="mb-6 max-w-md">
//                     <Label className="text-sm font-medium mb-2 block">Correlation Method</Label>
//                     <RadioGroup
//                         value={correlationMethod}
//                         onValueChange={(value) => setCorrelationMethod(value as CorrelationMethod)}
//                         className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4" // Responsive layout
//                     >
//                         <div className="flex items-center space-x-2">
//                             <RadioGroupItem value="pearson" id="pearson" />
//                             <Label htmlFor="pearson" className="cursor-pointer">Pearson (Linear)</Label>
//                         </div>
//                         <div className="flex items-center space-x-2">
//                             <RadioGroupItem value="spearman" id="spearman" />
//                             <Label htmlFor="spearman" className="cursor-pointer">Spearman (Monotonic)</Label>
//                         </div>
//                         <div className="flex items-center space-x-2">
//                             <RadioGroupItem value="kendall" id="kendall" />
//                             <Label htmlFor="kendall" className="cursor-pointer">Kendall (Ordinal)</Label>
//                         </div>
//                     </RadioGroup>
//                  </div>
//                  <p className="text-muted-foreground mb-6">
//                    {correlationMethod.charAt(0).toUpperCase() + correlationMethod.slice(1)} correlation matrix for {selectedStation ? `Station ${selectedStation}` : '...'}.
//                  </p>
//                  {/* Grid layout for Plot and Insights */}
//                  <div className="grid lg:grid-cols-3 gap-6">
//                     {/* Heatmap Plot */}
//                     <div className="lg:col-span-2 min-h-[700px] flex justify-center items-center border border-border rounded-lg p-2">
//                         {isCorrelationLoading || !correlationData ? (
//                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
//                         ) : (
//                            <Plot
//                              data={correlationData.data}
//                              layout={correlationData.layout}
//                              style={{ width: '100%', height: '100%' }}
//                              useResizeHandler={true}
//                              className="w-full h-full" // Ensure it fills container
//                            />
//                         )}
//                     </div>
//                     {/* Insights Box */}
//                     <div className="lg:col-span-1 p-4 bg-muted/50 rounded-lg border border-border h-fit lg:sticky lg:top-24">
//                         <h4 className="font-semibold mb-3 flex items-center text-base">
//                             <Info className="h-5 w-5 mr-2 text-primary" /> Top Correlations
//                         </h4>
//                         {isCorrelationLoading ? (
//                              <Loader2 className="h-5 w-5 animate-spin mx-auto mt-4" />
//                         ) : correlationInsights ? (
//                           <div className="space-y-4">
//                             {/* Positive Correlations */}
//                             {correlationInsights.positive && correlationInsights.positive.length > 0 && (
//                               <div>
//                                 <h5 className="text-sm font-medium mb-1 text-green-700 dark:text-green-500">Strong Positive:</h5>
//                                 <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 pl-2">
//                                   {correlationInsights.positive.map((pair, idx) => (
//                                     <li key={`pos-${idx}`}>
//                                       <span className='font-medium text-foreground'>{formatParamName(pair.param1)}</span> & <span className='font-medium text-foreground'>{formatParamName(pair.param2)}</span> ({pair.correlation.toFixed(2)})
//                                     </li>
//                                   ))}
//                                 </ul>
//                               </div>
//                             )}
//                              {/* Negative Correlations */}
//                             {correlationInsights.negative && correlationInsights.negative.length > 0 && (
//                               <div>
//                                 <h5 className="text-sm font-medium mb-1 text-red-700 dark:text-red-500">Strong Negative:</h5>
//                                 <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 pl-2">
//                                   {correlationInsights.negative.map((pair, idx) => (
//                                      <li key={`neg-${idx}`}>
//                                        <span className='font-medium text-foreground'>{formatParamName(pair.param1)}</span> & <span className='font-medium text-foreground'>{formatParamName(pair.param2)}</span> ({pair.correlation.toFixed(2)})
//                                     </li>
//                                   ))}
//                                 </ul>
//                               </div>
//                             )}
//                              {/* No Strong Correlations Found */}
//                             {(!correlationInsights.positive || correlationInsights.positive.length === 0) &&
//                              (!correlationInsights.negative || correlationInsights.negative.length === 0) && (
//                                 <p className="text-xs text-muted-foreground italic">No strong correlations ( |r| &gt; 0.6 ) found for this method.</p>
//                             )}
//                           </div>
//                         ) : (
//                           <p className="text-xs text-muted-foreground italic">Correlation insights not available.</p>
//                         )}
//                     </div>
//                  </div>
//               </Card>
//             </TabsContent>

//             {/* Overall Anomaly Heatmap Tab */}
//             <TabsContent value="anomaly-heatmap" className="space-y-6 animate-fade-in">
//               <Card className="p-8 shadow-medium border-2">
//                 {/* Chart and dynamic insights */}
//                 <div className="flex items-center gap-3 mb-6">
//                   <TrendingUp className="h-6 w-6 text-primary" />
//                   <h2 className="text-2xl font-bold">Overall Anomaly Heatmap (All Stations)</h2>
//                 </div>
//                 <p className="text-muted-foreground mb-6">
//                   Total anomaly counts from the LSTM Autoencoder across all parameters and stations.
//                 </p>
//                 <div className="min-h-[600px] flex justify-center items-center mb-6 border border-border rounded-lg p-2">
//                   {isHeatmapLoading || !heatmapData ? (
//                     <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
//                   ) : (
//                     <Plot
//                       data={heatmapData.data}
//                       layout={heatmapData.layout}
//                       style={{ width: '100%', height: '100%' }}
//                       useResizeHandler={true}
//                       className="w-full h-full" // Ensure it fills container
//                     />
//                   )}
//                 </div>
//                 <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
//                   <h4 className="font-semibold mb-2 flex items-center"><Info className="h-4 w-4 mr-2 text-primary" /> Anomaly Hotspots</h4>
//                   {isHeatmapLoading ? ( <Loader2 className="h-4 w-4 animate-spin" />
//                   ) : anomalyInsights.length > 0 ? (
//                     <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pl-2">
//                       {anomalyInsights.map((ins, idx) => (
//                          <li key={idx}>
//                            <span className="font-medium text-foreground">Station {ins.station}</span> shows <span className="font-medium text-red-600">{ins.count} anomalies</span> in <span className="font-medium text-foreground">{formatParamName(ins.parameter)}</span>.
//                          </li>
//                        ))}
//                     </ul>
//                   ) : ( <p className="text-sm text-muted-foreground italic">No significant anomaly hotspots detected.</p> )}
//                 </div>
//               </Card>
//             </TabsContent>

//           </Tabs>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Analysis;






// import { useState, useEffect } from 'react';
// import Header from '@/components/Header';
// import { Card } from '@/components/ui/card';
// import { Label } from '@/components/ui/label';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
// import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
// import { LineChart, Activity, TrendingUp, Loader2, Info } from 'lucide-react';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import Plot from 'react-plotly.js';
// import { toast } from 'sonner';

// // --- Define types ---
// type Station = {
//   id: string; // Keep as string for Select component
//   name: string; // Keep name for potential future use or tooltips
// };

// type QualityLevel = 'Excellent' | 'Good' | 'Medium' | 'Bad' | 'Very Bad';

// type CorrelationPair = {
//   param1: string;
//   param2: string;
//   correlation: number;
// };
// type CorrelationInsights = {
//   positive: CorrelationPair[];
//   negative: CorrelationPair[];
// };

// type AnomalyInsight = {
//   station: string;
//   parameter: string;
//   count: number;
// };

// type CorrelationMethod = 'pearson' | 'spearman' | 'kendall';


// const Analysis = () => {
//   const [stations, setStations] = useState<Station[]>([]);
//   const [selectedStation, setSelectedStation] = useState<string | null>(null);
//   const [isStationsLoading, setIsStationsLoading] = useState(true);

//   const [dayNightImageUrl, setDayNightImageUrl] = useState<string>('');

//   const [heatmapData, setHeatmapData] = useState<any>(null);
//   const [isHeatmapLoading, setIsHeatmapLoading] = useState(true);

//   const [correlationData, setCorrelationData] = useState<any>(null);
//   const [isCorrelationLoading, setIsCorrelationLoading] = useState(false);

//   const [correlationMethod, setCorrelationMethod] = useState<CorrelationMethod>('spearman');
//   const [correlationInsights, setCorrelationInsights] = useState<CorrelationInsights | null>(null);

//   const [anomalyInsights, setAnomalyInsights] = useState<AnomalyInsight[]>([]);

//   // Effect to load station list on mount
//   useEffect(() => {
//     setIsStationsLoading(true);
//     fetch('http://localhost:5000/api/stations')
//       .then(res => {
//           if (!res.ok) throw new Error('Failed to fetch stations');
//           return res.json();
//       })
//       .then((data: { stationId: number; name: string }[]) => {
//         if (!data || data.length === 0) {
//           toast.warning("No station data found from backend."); setStations([]); return;
//         }
//         const formattedStations = data.map(s => ({ id: String(s.stationId), name: s.name || `Station ${s.stationId}` }));
//         setStations(formattedStations);
//         if (formattedStations.length > 0) setSelectedStation(formattedStations[0].id);
//       })
//       .catch(err => {
//           console.error("Failed fetching /api/stations, falling back to /api/daynight/list", err);
//           fetch('http://localhost:5000/api/daynight/list')
//             .then(res => res.json())
//             .then((filenames: string[]) => {
//                 if (!filenames || filenames.length === 0) {
//                     toast.warning("No station plots found."); setStations([]); return;
//                 }
//                 const parsedStations = filenames.map(filename => {
//                     const id = filename.replace('station_', '').replace('.png', '');
//                     return { id: id, name: `Monitoring Station ${id}` }; // Still keep name internally
//                 });
//                 setStations(parsedStations);
//                 if (parsedStations.length > 0) setSelectedStation(parsedStations[0].id);
//             })
//             .catch(fallbackErr => toast.error("Failed to load station list."))
//       })
//       .finally(() => setIsStationsLoading(false));
//   }, []); // Runs once

//   // Effect to load Anomaly Heatmap
//   useEffect(() => {
//     setIsHeatmapLoading(true);
//     fetch('http://localhost:5000/api/anomaly-heatmap')
//       .then(res => res.json())
//       .then(data => { setHeatmapData(data); generateAnomalyInsights(data); })
//       .catch(err => toast.error("Failed to load anomaly heatmap."))
//       .finally(() => setIsHeatmapLoading(false));
//   }, []); // Runs once

//   // Effect to load station-specific data
//   useEffect(() => {
//     if (!selectedStation) return;
//     setDayNightImageUrl(`http://localhost:5000/static/daynight/station_${selectedStation}.png`);
//     setIsCorrelationLoading(true); setCorrelationInsights(null); setCorrelationData(null);
//     fetch(`http://localhost:5000/api/correlation/${selectedStation}?method=${correlationMethod}`)
//       .then(res => res.json())
//       .then(data => {
//         if (data.error) throw new Error(data.error);
//         setCorrelationData(data);
//         if (data?.layout?.meta?.top_correlated_pairs) {
//           setCorrelationInsights(data.layout.meta.top_correlated_pairs);
//         } else {
//            console.warn("Top correlated pairs not found.");
//            setCorrelationInsights({ positive: [], negative: [] });
//         }
//       })
//       .catch(err => toast.error(`Failed to load ${correlationMethod} correlation for Station ${selectedStation}.`))
//       .finally(() => setIsCorrelationLoading(false));
//   }, [selectedStation, correlationMethod]); // Re-runs


//   // --- Functions to generate insights ---
//   const generateAnomalyInsights = (plotData: any) => {
//     if (!plotData?.data?.[0]?.z || !plotData?.data?.[0]?.x || !plotData?.data?.[0]?.y) {
//       setAnomalyInsights([]); return;
//     }
//     const z = plotData.data[0].z; const x = plotData.data[0].x; const y = plotData.data[0].y;
//     let insights: AnomalyInsight[] = [];
//     for (let i = 0; i < y.length; i++) { for (let j = 0; j < x.length; j++) {
//         const stationId = !isNaN(parseFloat(y[i])) ? parseFloat(y[i]) : y[i];
//         if (z[i][j] > 0) { insights.push({ station: String(stationId), parameter: x[j], count: z[i][j] }); } } }
//     insights.sort((a, b) => b.count - a.count);
//     setAnomalyInsights(insights.slice(0, 5));
//   };

//   // --- Handler for station change ---
//   const handleStationChange = (stationId: string) => { setSelectedStation(stationId); };

//   // Helper function to format parameter names
//   const formatParamName = (name: string) => name.replace(/([A-Z])/g, ' $1').trim();

//   return (
//     <div className="min-h-screen bg-background">
//       <Header />

//       <div className="pt-24 pb-16 px-4">
//         <div className="container mx-auto max-w-7xl">
//           {/* Header Text */}
//           <div className="text-center mb-12 animate-fade-in-up">
//             <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-6 py-2 mb-4"> <Activity className="h-5 w-5 text-primary" /> <span className="text-sm font-medium text-primary">Station Analysis</span> </div>
//             <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-water bg-clip-text text-transparent"> Station-wise Water Analysis </h1>
//             <p className="text-lg text-muted-foreground max-w-2xl mx-auto"> Comprehensive analysis including day-night patterns, anomaly detection, and correlation matrices </p>
//            </div>
//           {/* Station Select Card */}
//           <Card className="p-8 shadow-medium border-2 mb-8">
//             <div className="max-w-md">
//               <Label htmlFor="station-select" className="text-sm font-medium mb-2 block"> Select Monitoring Station ID </Label> {/* <-- Modified Label */}
//               {isStationsLoading ? ( <Loader2 className="h-4 w-4 animate-spin" /> ) : (
//                 <Select value={selectedStation || ''} onValueChange={handleStationChange}>
//                   <SelectTrigger id="station-select" className="w-full">
//                     {/* --- (MODIFIED) Show selected ID --- */}
//                     <SelectValue placeholder="Select a station ID">
//                       {selectedStation || "Select a station ID"}
//                     </SelectValue>
//                   </SelectTrigger>
//                   <SelectContent className="max-h-64">
//                     {stations.map((station) => (
//                       // --- (MODIFIED) Show only station ID in dropdown list ---
//                       <SelectItem key={station.id} value={station.id}>
//                         {station.id}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               )}
//             </div>
//           </Card>

//           <Tabs defaultValue="day-night" className="space-y-8">
//             <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto"> <TabsTrigger value="day-night">Day-Night Analysis</TabsTrigger> <TabsTrigger value="correlation">Correlation Heatmap</TabsTrigger> <TabsTrigger value="anomaly-heatmap">Overall Anomaly Heatmap</TabsTrigger> </TabsList>

//             {/* Day-Night Tab */}
//             <TabsContent value="day-night" className="space-y-6 animate-fade-in">
//               <Card className="p-8 shadow-medium border-2">
//                  <div className="flex items-center gap-3 mb-6"> <LineChart className="h-6 w-6 text-primary" /> <h2 className="text-2xl font-bold">Day vs Night Parameter Comparison</h2> </div>
//                  {/* --- (MODIFIED) Show only station ID --- */}
//                  <p className="text-muted-foreground mb-6"> Average values for Station ID: {selectedStation || '...'} </p>
//                  <div className="flex justify-center items-center min-h-[400px] bg-muted/30 rounded-lg mb-6">
//                    {selectedStation ? ( <img src={dayNightImageUrl} alt={`Day/Night plot for station ${selectedStation}`} className="max-w-full h-auto" onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/800x600?text=Plot+Not+Found")}/> ) : ( <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> )}
//                  </div>
//                  <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border"> <h4 className="font-semibold mb-2 flex items-center"><Info className="h-4 w-4 mr-2 text-primary" /> Insights</h4> <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1"> <li>Comparing day/night values helps identify parameters influenced by daily cycles.</li> <li>Significant differences might indicate specific pollution events or natural processes.</li> </ul> </div>
//               </Card>
//             </TabsContent>

//             {/* Correlation Tab */}
//             <TabsContent value="correlation" className="space-y-6 animate-fade-in">
//               <Card className="p-8 shadow-medium border-2">
//                  <div className="flex items-center gap-3 mb-6"> <Activity className="h-6 w-6 text-primary" /> <h2 className="text-2xl font-bold">Inter-Parameter Correlation</h2> </div>
//                  {/* Method Selection */}
//                  <div className="mb-6 max-w-md"> <Label className="text-sm font-medium mb-2 block">Correlation Method</Label> <RadioGroup value={correlationMethod} onValueChange={(value) => setCorrelationMethod(value as CorrelationMethod)} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4"> <div className="flex items-center space-x-2"> <RadioGroupItem value="pearson" id="pearson" /> <Label htmlFor="pearson" className="cursor-pointer">Pearson (Linear)</Label> </div> <div className="flex items-center space-x-2"> <RadioGroupItem value="spearman" id="spearman" /> <Label htmlFor="spearman" className="cursor-pointer">Spearman (Monotonic)</Label> </div> <div className="flex items-center space-x-2"> <RadioGroupItem value="kendall" id="kendall" /> <Label htmlFor="kendall" className="cursor-pointer">Kendall (Ordinal)</Label> </div> </RadioGroup> </div>
//                  {/* --- (MODIFIED) Show only station ID --- */}
//                  <p className="text-muted-foreground mb-6"> {correlationMethod.charAt(0).toUpperCase() + correlationMethod.slice(1)} correlation matrix for Station ID: {selectedStation || '...'}. </p>
//                  {/* Heatmap container */}
//                  <div className="min-h-[700px] w-full flex justify-center items-center border border-border rounded-lg p-2 mb-6">
//                      {isCorrelationLoading || !correlationData ? ( <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> ) : (
//                          <Plot data={correlationData.data} layout={correlationData.layout} style={{ width: '100%', height: '100%' }} useResizeHandler={true} className="w-full h-full" />
//                      )}
//                  </div>
//                  {/* Insights Box */}
//                  <div className="mt-8 p-6 bg-card rounded-lg border-2 border-primary/20 shadow-soft">
//                      <h4 className="font-semibold mb-4 flex items-center text-lg text-primary"> <Info className="h-5 w-5 mr-2" /> Top Correlations </h4>
//                      {isCorrelationLoading ? ( <Loader2 className="h-5 w-5 animate-spin mx-auto mt-4 text-primary" />
//                      ) : correlationInsights ? (
//                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                          {/* Positive */}
//                          <div> <h5 className="text-base font-medium mb-2 text-green-700 dark:text-green-500 border-b pb-1">Strong Positive:</h5> {correlationInsights.positive && correlationInsights.positive.length > 0 ? ( <ul className="space-y-1.5 text-sm text-muted-foreground"> {correlationInsights.positive.map((pair, idx) => ( <li key={`pos-${idx}`} className="flex justify-between items-center"> <span> <span className='font-medium text-foreground'>{formatParamName(pair.param1)}</span> & <span className='font-medium text-foreground'>{formatParamName(pair.param2)}</span> </span> <span className="font-mono text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded"> {pair.correlation.toFixed(2)} </span> </li> ))} </ul> ) : ( <p className="text-sm text-muted-foreground italic">None found.</p> )} </div>
//                           {/* Negative */}
//                          <div> <h5 className="text-base font-medium mb-2 text-red-700 dark:text-red-500 border-b pb-1">Strong Negative:</h5> {correlationInsights.negative && correlationInsights.negative.length > 0 ? ( <ul className="space-y-1.5 text-sm text-muted-foreground"> {correlationInsights.negative.map((pair, idx) => ( <li key={`neg-${idx}`} className="flex justify-between items-center"> <span> <span className='font-medium text-foreground'>{formatParamName(pair.param1)}</span> & <span className='font-medium text-foreground'>{formatParamName(pair.param2)}</span> </span> <span className="font-mono text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded"> {pair.correlation.toFixed(2)} </span> </li> ))} </ul> ) : ( <p className="text-sm text-muted-foreground italic">None found.</p> )} </div>
//                        </div>
//                      ) : ( <p className="text-sm text-muted-foreground italic">Correlation insights not available.</p> )}
//                  </div>
//               </Card>
//             </TabsContent>

//             {/* Overall Anomaly Heatmap Tab */}
//             <TabsContent value="anomaly-heatmap" className="space-y-6 animate-fade-in">
//               <Card className="p-8 shadow-medium border-2">
//                  <div className="flex items-center gap-3 mb-6"> <TrendingUp className="h-6 w-6 text-primary" /> <h2 className="text-2xl font-bold">Overall Anomaly Heatmap (All Stations)</h2> </div>
//                  <p className="text-muted-foreground mb-6"> Total anomaly counts from the LSTM Autoencoder across all parameters and stations. </p>
//                  <div className="min-h-[600px] flex justify-center items-center mb-6 border border-border rounded-lg p-2">
//                    {isHeatmapLoading || !heatmapData ? ( <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> ) : (
//                      <Plot data={heatmapData.data} layout={heatmapData.layout} style={{ width: '100%', height: '100%' }} useResizeHandler={true} className="w-full h-full" />
//                    )}
//                  </div>
//                  <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border"> <h4 className="font-semibold mb-2 flex items-center"><Info className="h-4 w-4 mr-2 text-primary" /> Anomaly Hotspots</h4> {isHeatmapLoading ? ( <Loader2 className="h-4 w-4 animate-spin" /> ) : anomalyInsights.length > 0 ? ( <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pl-2"> {anomalyInsights.map((ins, idx) => ( <li key={idx}> <span className="font-medium text-foreground">Station {ins.station}</span> shows <span className="font-medium text-red-600">{ins.count} anomalies</span> in <span className="font-medium text-foreground">{formatParamName(ins.parameter)}</span>.</li> ))} </ul> ) : ( <p className="text-sm text-muted-foreground italic">No significant anomaly hotspots detected.</p> )} </div>
//               </Card>
//             </TabsContent>

//           </Tabs>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Analysis;



import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LineChart, Activity, TrendingUp, Loader2, Info, AlertTriangle, CheckCircle } from 'lucide-react'; // Added icons
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Plot from 'react-plotly.js';
import { toast } from 'sonner';

// --- Define types ---
type Station = {
  id: string;
  name: string;
};

type QualityLevel = 'Excellent' | 'Good' | 'Medium' | 'Bad' | 'Very Bad';

type CorrelationPair = {
  param1: string;
  param2: string;
  correlation: number;
};
type CorrelationInsights = {
  positive: CorrelationPair[];
  negative: CorrelationPair[];
};

// (MODIFIED) Anomaly Insight Types for new structure
type AnomalyHotspot = { // Specific station-parameter combo
  station: string;
  parameter: string;
  count: number;
};
type AnomalySummary = { // Overall summaries
  totalAnomalies: number;
  stationWithMost: { station: string; count: number } | null;
  parameterWithMost: { parameter: string; count: number } | null;
  topHotspots: AnomalyHotspot[];
};
// ----------------------------------------

type CorrelationMethod = 'pearson' | 'spearman' | 'kendall';


const Analysis = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [isStationsLoading, setIsStationsLoading] = useState(true);

  const [dayNightImageUrl, setDayNightImageUrl] = useState<string>('');

  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [isHeatmapLoading, setIsHeatmapLoading] = useState(true);

  const [correlationData, setCorrelationData] = useState<any>(null);
  const [isCorrelationLoading, setIsCorrelationLoading] = useState(false);

  const [correlationMethod, setCorrelationMethod] = useState<CorrelationMethod>('spearman');
  const [correlationInsights, setCorrelationInsights] = useState<CorrelationInsights | null>(null);

  // --- (MODIFIED) State for Anomaly Insights ---
  const [anomalySummary, setAnomalySummary] = useState<AnomalySummary | null>(null);
  // ------------------------------------------

  // Effect to load station list on mount
  useEffect(() => {
    setIsStationsLoading(true);
    fetch('http://localhost:5000/api/stations')
      .then(res => { if (!res.ok) throw new Error('Failed fetch'); return res.json(); })
      .then((data: { stationId: number; name: string }[]) => {
        if (!data || data.length === 0) { toast.warning("No station data found."); setStations([]); return; }
        const formattedStations = data.map(s => ({ id: String(s.stationId), name: s.name || `Station ${s.stationId}` }));
        setStations(formattedStations);
        if (formattedStations.length > 0) setSelectedStation(formattedStations[0].id);
      })
      .catch(err => {
        console.error("Fallback: /api/daynight/list", err);
        fetch('http://localhost:5000/api/daynight/list')
          .then(res => res.json())
          .then((filenames: string[]) => {
            if (!filenames || filenames.length === 0) { toast.warning("No plots found."); setStations([]); return; }
            const parsedStations = filenames.map(f => ({ id: f.replace('station_', '').replace('.png', ''), name: `Station ${f.replace('station_', '').replace('.png', '')}` }));
            setStations(parsedStations);
            if (parsedStations.length > 0) setSelectedStation(parsedStations[0].id);
          })
          .catch(fallbackErr => toast.error("Failed to load stations."))
      })
      .finally(() => setIsStationsLoading(false));
  }, []); // Runs once

  // Effect to load Anomaly Heatmap & generate insights
  useEffect(() => {
  setIsHeatmapLoading(true);
  fetch('http://localhost:5000/api/anomaly-heatmap')
    .then(res => res.json())
    .then(data => {
      console.log("Fetched Anomaly Heatmap Data:", data); // <-- ADD THIS LINE
      setHeatmapData(data);
      generateAnomalyInsights(data);
    })
    .catch(err => toast.error("Failed to load anomaly heatmap."))
    .finally(() => setIsHeatmapLoading(false));
}, []); // Runs once

  // Effect to load station-specific data
  useEffect(() => {
    if (!selectedStation) return;
    setDayNightImageUrl(`http://localhost:5000/static/daynight/station_${selectedStation}.png`);
    setIsCorrelationLoading(true); setCorrelationInsights(null); setCorrelationData(null);
    fetch(`http://localhost:5000/api/correlation/${selectedStation}?method=${correlationMethod}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setCorrelationData(data);
        if (data?.layout?.meta?.top_correlated_pairs) {
          setCorrelationInsights(data.layout.meta.top_correlated_pairs);
        } else {
           setCorrelationInsights({ positive: [], negative: [] });
        }
      })
      .catch(err => toast.error(`Failed correlation load (${correlationMethod}, Stn ${selectedStation}).`))
      .finally(() => setIsCorrelationLoading(false));
  }, [selectedStation, correlationMethod]); // Re-runs


  // --- (MODIFIED) Function to generate Anomaly Insights Summary ---
// --- (REPLACE THIS FUNCTION in Analysis.tsx) ---
const generateAnomalyInsights = (plotData: any) => {
  console.log("--- Inside generateAnomalyInsights ---");
  console.log("Raw plotData received:", plotData); // Already added

  // Basic structure check
  if (!plotData?.data?.[0]?.z || !plotData?.data?.[0]?.x || !plotData?.data?.[0]?.y) {
    console.error("generateAnomalyInsights: Expected data structure (data[0].z/x/y) not found!");
    setAnomalySummary(null); return;
  }

  const z = plotData.data[0].z as (number | null)[][]; // Allow nulls just in case
  const parameters = plotData.data[0].x as string[];
  const stations = plotData.data[0].y as string[]; // Expecting strings from backend
  console.log("Extracted 'z' (Counts):", z);
  console.log("Extracted 'parameters' (x-axis):", parameters);
  console.log("Extracted 'stations' (y-axis):", stations);


  // Check array validity
  if (!Array.isArray(stations) || !Array.isArray(parameters) || !Array.isArray(z) || stations.length === 0 || parameters.length === 0 || z.length === 0 || z.length !== stations.length || !Array.isArray(z[0]) || z[0].length !== parameters.length ) {
     console.warn("generateAnomalyInsights: Data arrays (z, x, y) are missing, empty, or have mismatched dimensions.");
     setAnomalySummary({ totalAnomalies: 0, stationWithMost: null, parameterWithMost: null, topHotspots: [] });
     return;
  }

  let totalAnomalies = 0;
  const stationCounts: Record<string, number> = {};
  const parameterCounts: Record<string, number> = {};
  const hotspots: AnomalyHotspot[] = [];

  try {
    // Iterate and calculate
    for (let i = 0; i < stations.length; i++) {
      const stationId = stations[i]; // Use the ID directly
      // Initialize station count if not present
      if (typeof stationId === 'string' && stationId.length > 0) {
           stationCounts[stationId] = stationCounts[stationId] || 0; // Initialize only if not already present
      } else {
           console.warn(`generateAnomalyInsights: Invalid or empty station ID at index ${i}:`, stationId);
           continue; // Skip this row if station ID is invalid
      }

      for (let j = 0; j < parameters.length; j++) {
        const parameterName = parameters[j];
        const count = z[i]?.[j]; // Use optional chaining for safety

        // Check count validity more strictly
        if (typeof count !== 'number' || isNaN(count)) {
           // console.warn(`generateAnomalyInsights: Invalid or missing count at z[${i}][${j}] for Station ${stationId}, Param ${parameterName}. Value:`, count);
           continue; // Skip if count is not a valid number
        }

        if (count > 0) {
          totalAnomalies += count;
          stationCounts[stationId] = (stationCounts[stationId] || 0) + count;
          parameterCounts[parameterName] = (parameterCounts[parameterName] || 0) + count;
          hotspots.push({ station: stationId, parameter: parameterName, count: count });
        }
      }
    }
    console.log("Calculated totalAnomalies:", totalAnomalies);
    console.log("Calculated stationCounts:", stationCounts);
    console.log("Calculated parameterCounts:", parameterCounts);

    // --- Finding Maximums ---
    let stationWithMost: { station: string; count: number } | null = null;
    let maxStationCount = 0;
    for (const [station, count] of Object.entries(stationCounts)) {
        if (count > maxStationCount) {
            maxStationCount = count;
            stationWithMost = { station, count };
        }
    }
    console.log("Station with most:", stationWithMost);


    let parameterWithMost: { parameter: string; count: number } | null = null;
    let maxParamCount = 0;
    for (const [parameter, count] of Object.entries(parameterCounts)) {
         if (count > maxParamCount) {
             maxParamCount = count;
             parameterWithMost = { parameter, count };
         }
    }
    console.log("Parameter with most:", parameterWithMost);

    // Sort hotspots
    hotspots.sort((a, b) => b.count - a.count);
    const topHotspots = hotspots.slice(0, 5);
    console.log("Top 5 hotspots:", topHotspots);

    // Set state
    const finalSummary = { totalAnomalies, stationWithMost, parameterWithMost, topHotspots };
    console.log("Setting anomalySummary state:", finalSummary);
    setAnomalySummary(finalSummary);

  } catch (error) {
     console.error("Error during anomaly insight calculation:", error);
     setAnomalySummary(null);
  }
};
// --- (END OF REPLACED FUNCTION) ---
  // ------------------------------------------------------------------

  // --- Handler for station change ---
  const handleStationChange = (stationId: string) => { setSelectedStation(stationId); };

  // Helper function to format parameter names
  const formatParamName = (name: string) => name ? name.replace(/([A-Z])/g, ' $1').trim() : 'N/A';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Header Text */}
          <div className="text-center mb-12 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-6 py-2 mb-4"> <Activity className="h-5 w-5 text-primary" /> <span className="text-sm font-medium text-primary">Station Analysis</span> </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-water bg-clip-text text-transparent"> Station-wise Water Analysis </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto"> Comprehensive analysis including day-night patterns, anomaly detection, and correlation matrices </p>
           </div>
          {/* Station Select Card */}
          <Card className="p-8 shadow-medium border-2 mb-8">
            <div className="max-w-md">
              <Label htmlFor="station-select" className="text-sm font-medium mb-2 block"> Select Monitoring Station ID </Label>
              {isStationsLoading ? ( <Loader2 className="h-4 w-4 animate-spin" /> ) : (
                <Select value={selectedStation || ''} onValueChange={handleStationChange}>
                  <SelectTrigger id="station-select" className="w-full">
                    <SelectValue placeholder="Select a station ID"> {selectedStation || "Select a station ID"} </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {stations.map((station) => ( <SelectItem key={station.id} value={station.id}> {station.id} </SelectItem> ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </Card>

          <Tabs defaultValue="day-night" className="space-y-8">
            <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto"> <TabsTrigger value="day-night">Day-Night Analysis</TabsTrigger> <TabsTrigger value="correlation">Correlation Heatmap</TabsTrigger> <TabsTrigger value="anomaly-heatmap">Overall Anomaly Heatmap</TabsTrigger> </TabsList>

            {/* Day-Night Tab */}
            <TabsContent value="day-night" className="space-y-6 animate-fade-in">
              <Card className="p-8 shadow-medium border-2">
                 <div className="flex items-center gap-3 mb-6"> <LineChart className="h-6 w-6 text-primary" /> <h2 className="text-2xl font-bold">Day vs Night Parameter Comparison</h2> </div>
                 <p className="text-muted-foreground mb-6"> Average values for Station ID: {selectedStation || '...'} </p>
                 <div className="flex justify-center items-center min-h-[400px] bg-muted/30 rounded-lg mb-6">
                   {selectedStation ? ( <img src={dayNightImageUrl} alt={`Day/Night plot for station ${selectedStation}`} className="max-w-full h-auto" onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/800x600?text=Plot+Not+Found")}/> ) : ( <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> )}
                 </div>
                 {/* --- (MODIFIED) Slightly refined generic insights --- */}
                 <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
                   <h4 className="font-semibold mb-2 flex items-center"><Info className="h-4 w-4 mr-2 text-primary" /> Insights from Day-Night Patterns</h4>
                   <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                     <li>This plot highlights parameters potentially influenced by daily environmental cycles (like sunlight affecting temperature and photosynthesis impacting Dissolved Oxygen).</li>
                     <li>Large, consistent differences between day and night values for certain parameters (e.g., pH, DO, temperature) might suggest strong natural processes or time-specific pollution inputs.</li>
                     <li>Parameters showing little variation might be more influenced by consistent sources or slower processes.</li>
                   </ul>
                 </div>
                 {/* --- (END MODIFIED) --- */}
              </Card>
            </TabsContent>

            {/* Correlation Tab */}
            <TabsContent value="correlation" className="space-y-6 animate-fade-in">
              <Card className="p-8 shadow-medium border-2">
                 <div className="flex items-center gap-3 mb-6"> <Activity className="h-6 w-6 text-primary" /> <h2 className="text-2xl font-bold">Inter-Parameter Correlation</h2> </div>
                 {/* Method Selection */}
                 <div className="mb-6 max-w-md"> <Label className="text-sm font-medium mb-2 block">Correlation Method</Label> <RadioGroup value={correlationMethod} onValueChange={(value) => setCorrelationMethod(value as CorrelationMethod)} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4"> <div className="flex items-center space-x-2"> <RadioGroupItem value="pearson" id="pearson" /> <Label htmlFor="pearson" className="cursor-pointer">Pearson (Linear)</Label> </div> <div className="flex items-center space-x-2"> <RadioGroupItem value="spearman" id="spearman" /> <Label htmlFor="spearman" className="cursor-pointer">Spearman (Monotonic)</Label> </div> <div className="flex items-center space-x-2"> <RadioGroupItem value="kendall" id="kendall" /> <Label htmlFor="kendall" className="cursor-pointer">Kendall (Ordinal)</Label> </div> </RadioGroup> </div>
                 <p className="text-muted-foreground mb-6"> {correlationMethod.charAt(0).toUpperCase() + correlationMethod.slice(1)} correlation matrix for Station ID: {selectedStation || '...'}. </p>
                 {/* Heatmap container */}
                 <div className="min-h-[700px] w-full flex justify-center items-center border border-border rounded-lg p-2 mb-6">
                     {isCorrelationLoading || !correlationData ? ( <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> ) : (
                         <Plot data={correlationData.data} layout={correlationData.layout} style={{ width: '100%', height: '100%' }} useResizeHandler={true} className="w-full h-full" />
                     )}
                 </div>
                 {/* Insights Box */}
                 <div className="mt-8 p-6 bg-card rounded-lg border-2 border-primary/20 shadow-soft">
                     <h4 className="font-semibold mb-4 flex items-center text-lg text-primary"> <Info className="h-5 w-5 mr-2" /> Top Correlations </h4>
                     {isCorrelationLoading ? ( <Loader2 className="h-5 w-5 animate-spin mx-auto mt-4 text-primary" />
                     ) : correlationInsights ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* Positive */}
                         <div> <h5 className="text-base font-medium mb-2 text-green-700 dark:text-green-500 border-b pb-1">Strong Positive:</h5> {correlationInsights.positive && correlationInsights.positive.length > 0 ? ( <ul className="space-y-1.5 text-sm text-muted-foreground"> {correlationInsights.positive.map((pair, idx) => ( <li key={`pos-${idx}`} className="flex justify-between items-center"> <span> <span className='font-medium text-foreground'>{formatParamName(pair.param1)}</span> & <span className='font-medium text-foreground'>{formatParamName(pair.param2)}</span> </span> <span className="font-mono text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded"> {pair.correlation.toFixed(2)} </span> </li> ))} </ul> ) : ( <p className="text-sm text-muted-foreground italic">None found.</p> )} </div>
                          {/* Negative */}
                         <div> <h5 className="text-base font-medium mb-2 text-red-700 dark:text-red-500 border-b pb-1">Strong Negative:</h5> {correlationInsights.negative && correlationInsights.negative.length > 0 ? ( <ul className="space-y-1.5 text-sm text-muted-foreground"> {correlationInsights.negative.map((pair, idx) => ( <li key={`neg-${idx}`} className="flex justify-between items-center"> <span> <span className='font-medium text-foreground'>{formatParamName(pair.param1)}</span> & <span className='font-medium text-foreground'>{formatParamName(pair.param2)}</span> </span> <span className="font-mono text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded"> {pair.correlation.toFixed(2)} </span> </li> ))} </ul> ) : ( <p className="text-sm text-muted-foreground italic">None found.</p> )} </div>
                       </div>
                     ) : ( <p className="text-sm text-muted-foreground italic">Correlation insights not available.</p> )}
                 </div>
              </Card>
            </TabsContent>

            {/* Overall Anomaly Heatmap Tab */}
            <TabsContent value="anomaly-heatmap" className="space-y-6 animate-fade-in">
              <Card className="p-8 shadow-medium border-2">
                 <div className="flex items-center gap-3 mb-6"> <TrendingUp className="h-6 w-6 text-primary" /> <h2 className="text-2xl font-bold">Overall Anomaly Heatmap (All Stations)</h2> </div>
                 <p className="text-muted-foreground mb-6"> Total anomaly counts from the LSTM Autoencoder across all parameters and stations. </p>
                 <div className="min-h-[600px] flex justify-center items-center mb-6 border border-border rounded-lg p-2">
                   {isHeatmapLoading || !heatmapData ? ( <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> ) : (
                     <Plot data={heatmapData.data} layout={heatmapData.layout} style={{ width: '100%', height: '100%' }} useResizeHandler={true} className="w-full h-full" />
                   )}
                 </div>
                 {/* --- (MODIFIED) Anomaly Insights Box --- */}
                 <div className="mt-6 p-6 bg-card rounded-lg border-2 border-primary/20 shadow-soft">
                   <h4 className="font-semibold mb-4 flex items-center text-lg text-primary">
                      <Info className="h-5 w-5 mr-2" /> Anomaly Summary
                   </h4>
                   {isHeatmapLoading ? ( <Loader2 className="h-5 w-5 animate-spin mx-auto mt-4 text-primary" />
                   ) : anomalySummary ? (
                     <div className="space-y-4 text-sm">
                        <div className='flex items-center gap-2'>
                           {anomalySummary.totalAnomalies > 0 ? <AlertTriangle className="h-5 w-5 text-orange-500" /> : <CheckCircle className="h-5 w-5 text-green-500" />}
                           <p>Total anomalies detected across all stations: <span className="font-bold">{anomalySummary.totalAnomalies}</span></p>
                        </div>

                       {anomalySummary.stationWithMost && anomalySummary.stationWithMost.count > 0 && (
                          <p>Station with most anomalies: <span className="font-semibold text-foreground">Station {anomalySummary.stationWithMost.station}</span> ({anomalySummary.stationWithMost.count} anomalies)</p>
                       )}

                       {anomalySummary.parameterWithMost && anomalySummary.parameterWithMost.count > 0 && (
                          <p>Parameter with most anomalies overall: <span className="font-semibold text-foreground">{formatParamName(anomalySummary.parameterWithMost.parameter)}</span> ({anomalySummary.parameterWithMost.count} anomalies)</p>
                       )}

                       {anomalySummary.topHotspots && anomalySummary.topHotspots.length > 0 && (
                         <div>
                           <h5 className="font-medium mt-3 mb-1 border-b pb-1">Top 5 Anomaly Hotspots:</h5>
                           <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-2">
                             {anomalySummary.topHotspots.map((spot, idx) => (
                               <li key={idx}>
                                 <span className="font-medium text-foreground">Station {spot.station}</span> / <span className="font-medium text-foreground">{formatParamName(spot.parameter)}</span>: <span className="font-semibold text-red-600">{spot.count}</span> anomalies
                               </li>
                             ))}
                           </ul>
                         </div>
                       )}

                     </div>
                   ) : ( <p className="text-sm text-muted-foreground italic">Anomaly summary could not be generated.</p> )}
                 </div>
                 {/* --- (END MODIFIED) --- */}
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Analysis;