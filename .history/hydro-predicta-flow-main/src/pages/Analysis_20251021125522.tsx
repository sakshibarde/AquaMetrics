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
import { LineChart, Activity, TrendingUp, Loader2, Info } from 'lucide-react'; // (NEW) Added Info icon
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Plot from 'react-plotly.js';
import { toast } from 'sonner';

// --- Define types ---
type Station = {
  id: string;
  name: string;
};

type WeeklyDetails = {
  [dayOrStat: string]: {
    [parameter: string]: number;
  };
};

// (NEW) Types for insights
type CorrelationInsight = {
  param1: string;
  param2: string;
  value: number;
};

type AnomalyInsight = {
  station: string;
  parameter: string;
  count: number;
};

const Analysis = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [isStationsLoading, setIsStationsLoading] = useState(true);

  const [dayNightImageUrl, setDayNightImageUrl] = useState<string>('');
  
  const [heatmapData, setHeatmapData] = useState<any>(null); // For Anomaly Heatmap
  const [isHeatmapLoading, setIsHeatmapLoading] = useState(true);
  
  const [correlationData, setCorrelationData] = useState<any>(null); // For Correlation Plot
  const [isCorrelationLoading, setIsCorrelationLoading] = useState(false);

  // --- (NEW) State for insights ---
  const [correlationInsights, setCorrelationInsights] = useState<CorrelationInsight[]>([]);
  const [anomalyInsights, setAnomalyInsights] = useState<AnomalyInsight[]>([]);
  // --------------------------------

  // Effect to load station list on mount
  useEffect(() => {
    setIsStationsLoading(true);
    fetch('http://localhost:5000/api/daynight/list') 
      .then(res => res.json())
      .then((filenames: string[]) => {
        if (!filenames || filenames.length === 0) {
          toast.warning("No station plots found. Run your batch jobs first.");
          return;
        }
        const parsedStations = filenames.map(filename => {
          const id = filename.replace('station_', '').replace('.png', '');
          return { id: id, name: `Monitoring Station ${id}` };
        });
        setStations(parsedStations);
        if (parsedStations.length > 0) {
          setSelectedStation(parsedStations[0].id);
        }
      })
      .catch(err => toast.error("Failed to load station list from backend."))
      .finally(() => setIsStationsLoading(false));
  }, []); // Runs once

  // (MODIFIED) Effect to load Anomaly Heatmap and generate insights
  useEffect(() => {
    setIsHeatmapLoading(true);
    fetch('http://localhost:5000/api/anomaly-heatmap')
      .then(res => res.json())
      .then(data => {
        setHeatmapData(data);
        generateAnomalyInsights(data); // (NEW) Generate insights
      })
      .catch(err => toast.error("Failed to load anomaly heatmap."))
      .finally(() => setIsHeatmapLoading(false));
  }, []); // Runs once

  // (MODIFIED) Effect to load station-specific data and generate insights
  useEffect(() => {
    if (!selectedStation) return; 

    // 1. Load Day/Night Image
    setDayNightImageUrl(`http://localhost:5000/static/daynight/station_${selectedStation}.png`);

    // 2. Load Correlation Plot & Generate Insights
    setIsCorrelationLoading(true);
    setCorrelationInsights([]); // Clear old insights
    fetch(`http://localhost:5000/api/correlation/${selectedStation}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setCorrelationData(data);
        generateCorrelationInsights(data); // (NEW) Generate insights
      })
      .catch(err => {
        console.error("Failed to fetch correlation plot", err);
        toast.error(`Failed to load correlation plot for Station ${selectedStation}.`);
        setCorrelationData(null);
      })
      .finally(() => setIsCorrelationLoading(false));

  }, [selectedStation]); // Runs every time 'selectedStation' changes
  
  // --- (NEW) Function to generate Correlation Insights ---
  const generateCorrelationInsights = (plotData: any) => {
    if (!plotData?.data?.[0]?.z || !plotData?.data?.[0]?.x || !plotData?.data?.[0]?.y) {
      setCorrelationInsights([]);
      return;
    }
    const z = plotData.data[0].z; // The matrix values
    const x = plotData.data[0].x; // Parameters (columns)
    const y = plotData.data[0].y; // Parameters (rows)
    
    let insights: CorrelationInsight[] = [];
    // Iterate through upper triangle of matrix (excluding diagonal)
    for (let i = 0; i < y.length; i++) {
      for (let j = i + 1; j < x.length; j++) {
        insights.push({ param1: y[i], param2: x[j], value: z[i][j] });
      }
    }
    
    // Sort by absolute correlation value, descending
    insights.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    
    // Keep top 3 positive and top 3 negative correlations (or fewer if not enough)
    const topPositive = insights.filter(ins => ins.value > 0).slice(0, 3);
    const topNegative = insights.filter(ins => ins.value < 0).slice(0, 3);
    
    setCorrelationInsights([...topPositive, ...topNegative]);
  };
  
  // --- (NEW) Function to generate Anomaly Insights ---
  const generateAnomalyInsights = (plotData: any) => {
    if (!plotData?.data?.[0]?.z || !plotData?.data?.[0]?.x || !plotData?.data?.[0]?.y) {
      setAnomalyInsights([]);
      return;
    }
    const z = plotData.data[0].z; // Counts
    const x = plotData.data[0].x; // Parameters
    const y = plotData.data[0].y; // Stations (as strings)
    
    let insights: AnomalyInsight[] = [];
    for (let i = 0; i < y.length; i++) { // For each station
      for (let j = 0; j < x.length; j++) { // For each parameter
        if (z[i][j] > 0) { // Only record if there's an anomaly
          insights.push({ station: y[i], parameter: x[j], count: z[i][j] });
        }
      }
    }
    
    // Sort by count, descending
    insights.sort((a, b) => b.count - a.count);
    
    // Keep top 5 anomalies
    setAnomalyInsights(insights.slice(0, 5));
  };
  
  // --- Handler to update selected station ---
  const handleStationChange = (stationId: string) => {
    setSelectedStation(stationId);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* ... (Header Text and Station Select Card unchanged) ... */}
          <div className="text-center mb-12 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-6 py-2 mb-4">
              <Activity className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Station Analysis</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-water bg-clip-text text-transparent">
              Station-wise Water Analysis
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive analysis including day-night patterns, anomaly detection, and correlation matrices
            </p>
          </div>
          <Card className="p-8 shadow-medium border-2 mb-8">
            <div className="max-w-md">
              <Label htmlFor="station-select" className="text-sm font-medium mb-2 block">
                Select Monitoring Station
              </Label>
              {isStationsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading stations...
                </div>
              ) : (
                <Select value={selectedStation || ''} onValueChange={handleStationChange}>
                  <SelectTrigger id="station-select" className="w-full">
                    <SelectValue placeholder="Select a station" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {stations.map((station) => (
                      <SelectItem key={station.id} value={station.id}>
                        {station.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </Card>
          
          <Tabs defaultValue="day-night" className="space-y-8">
            <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto">
              <TabsTrigger value="day-night">Day-Night Analysis</TabsTrigger>
              <TabsTrigger value="correlation">Correlation Heatmap</TabsTrigger>
              <TabsTrigger value="anomaly-heatmap">Overall Anomaly Heatmap</TabsTrigger>
            </TabsList>

            {/* Day-Night Tab */}
            <TabsContent value="day-night" className="space-y-6 animate-fade-in">
              <Card className="p-8 shadow-medium border-2">
                {/* ... (Chart section unchanged) ... */}
                <div className="flex items-center gap-3 mb-6">
                  <LineChart className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Day vs Night Parameter Comparison</h2>
                </div>
                <p className="text-muted-foreground mb-6">
                  Average values of water parameters during day and night periods for {selectedStation ? `Station ${selectedStation}` : '...'}
                </p>
                <div className="flex justify-center items-center min-h-[400px] bg-muted/30 rounded-lg mb-6">
                  {selectedStation ? (
                    <img 
                      src={dayNightImageUrl} 
                      alt={`Day/Night plot for station ${selectedStation}`}
                      className="max-w-full h-auto"
                      onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/800x600?text=Plot+Not+Found")}
                    />
                  ) : (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  )}
                </div>
                {/* --- (NEW) Generic Insights for Day-Night --- */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
                  <h4 className="font-semibold mb-2 flex items-center">
                    <Info className="h-4 w-4 mr-2 text-primary" /> Insights
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Comparing day and night values helps identify parameters influenced by daily cycles (e.g., temperature, biological activity affecting DO/BOD).</li>
                    <li>Significant differences might indicate specific pollution events occurring during certain times or natural processes like photosynthesis (increasing DO during the day).</li>
                    <li>Look for parameters that consistently differ between day and night across multiple days.</li>
                  </ul>
                </div>
              </Card>
            </TabsContent>

            {/* Correlation Tab */}
            <TabsContent value="correlation" className="space-y-6 animate-fade-in">
              <Card className="p-8 shadow-medium border-2">
                {/* ... (Chart section unchanged) ... */}
                <div className="flex items-center gap-3 mb-6">
                  <Activity className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Inter-Parameter Correlation</h2>
                </div>
                <p className="text-muted-foreground mb-6">
                  Spearman correlation matrix for {selectedStation ? `Station ${selectedStation}` : '...'}. 
                  Values range from -1 (negative) to +1 (positive).
                </p>
                <div className="min-h-[700px] flex justify-center items-center mb-6">
                  {isCorrelationLoading || !correlationData ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <Plot
                      data={correlationData.data}
                      layout={correlationData.layout}
                      style={{ width: '100%', height: '100%' }}
                      useResizeHandler={true}
                      className="w-full"
                    />
                  )}
                </div>
                {/* --- (NEW) Dynamic Insights for Correlation --- */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
                  <h4 className="font-semibold mb-2 flex items-center">
                    <Info className="h-4 w-4 mr-2 text-primary" /> Key Correlations (Station {selectedStation})
                  </h4>
                  {isCorrelationLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : correlationInsights.length > 0 ? (
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {correlationInsights.map((ins, idx) => (
                        <li key={idx}>
                          <span className={`font-medium ${ins.value > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {ins.value > 0 ? 'Strong Positive' : 'Strong Negative'}
                          </span> correlation ({ins.value.toFixed(2)}) between <span className="font-medium text-foreground">{ins.param1}</span> and <span className="font-medium text-foreground">{ins.param2}</span>.
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No strong correlations found for this station.</p>
                  )}
                </div>
              </Card>
            </TabsContent>
            
            {/* Overall Anomaly Heatmap Tab */}
            <TabsContent value="anomaly-heatmap" className="space-y-6 animate-fade-in">
              <Card className="p-8 shadow-medium border-2">
                {/* ... (Chart section unchanged) ... */}
                <div className="flex items-center gap-3 mb-6">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Overall Anomaly Heatmap (All Stations)</h2>
                </div>
                <p className="text-muted-foreground mb-6">
                  Total anomaly counts from the LSTM Autoencoder across all parameters and stations.
                </p>
                <div className="min-h-[600px] flex justify-center items-center mb-6">
                  {isHeatmapLoading || !heatmapData ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <Plot
                      data={heatmapData.data}
                      layout={heatmapData.layout}
                      style={{ width: '100%', height: '100%' }}
                      useResizeHandler={true}
                      className="w-full"
                    />
                  )}
                </div>
                {/* --- (NEW) Dynamic Insights for Anomaly Heatmap --- */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
                  <h4 className="font-semibold mb-2 flex items-center">
                    <Info className="h-4 w-4 mr-2 text-primary" /> Anomaly Hotspots
                  </h4>
                  {isHeatmapLoading ? (
                     <Loader2 className="h-4 w-4 animate-spin" />
                  ) : anomalyInsights.length > 0 ? (
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {anomalyInsights.map((ins, idx) => (
                        <li key={idx}>
                          <span className="font-medium text-foreground">Station {ins.station}</span> shows <span className="font-medium text-red-600">{ins.count} anomalies</span> in <span className="font-medium text-foreground">{ins.parameter}</span>.
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No significant anomaly hotspots detected.</p>
                  )}
                </div>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Analysis;