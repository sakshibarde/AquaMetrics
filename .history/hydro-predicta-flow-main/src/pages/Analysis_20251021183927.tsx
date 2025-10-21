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
import { LineChart, Activity, TrendingUp, Loader2, Info } from 'lucide-react'; // Removed AlertTriangle, CheckCircle
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Plot from 'react-plotly.js';
import { toast } from 'sonner';

// --- Define types ---
type Station = {
  id: string;
  name: string;
};

type CorrelationPair = {
  param1: string;
  param2: string;
  correlation: number;
};
type CorrelationInsights = {
  positive: CorrelationPair[];
  negative: CorrelationPair[];
};

// Removed Anomaly Insight Types as they are no longer used

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

  // Removed anomalySummary state

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

  // Effect to load Anomaly Heatmap (Removed insight generation)
  useEffect(() => {
    setIsHeatmapLoading(true);
    fetch('http://localhost:5000/api/anomaly-heatmap')
      .then(res => res.json())
      .then(data => {
        console.log("Fetched Anomaly Heatmap Data:", data);
        setHeatmapData(data);
        // Removed call to generateAnomalyInsights
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


  // Removed generateAnomalyInsights function


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
                 <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
                   <h4 className="font-semibold mb-2 flex items-center"><Info className="h-4 w-4 mr-2 text-primary" /> Insights from Day-Night Patterns</h4>
                   <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                     <li>This plot highlights parameters potentially influenced by daily environmental cycles (like sunlight affecting temperature and photosynthesis impacting Dissolved Oxygen).</li>
                     <li>Large, consistent differences between day and night values for certain parameters (e.g., pH, DO, temperature) might suggest strong natural processes or time-specific pollution inputs.</li>
                     <li>Parameters showing little variation might be more influenced by consistent sources or slower processes.</li>
                   </ul>
                 </div>
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
                 {/* --- Anomaly Insights Box REMOVED --- */}
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Analysis;



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
// import { LineChart, Activity, TrendingUp, Loader2, Info, AlertTriangle, CheckCircle } from 'lucide-react'; // Added icons
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import Plot from 'react-plotly.js';
// import { toast } from 'sonner';

// // --- Define types ---
// type Station = {
//   id: string;
//   name: string;
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

// // (MODIFIED) Anomaly Insight Types for new structure
// type AnomalyHotspot = { // Specific station-parameter combo
//   station: string;
//   parameter: string;
//   count: number;
// };
// type AnomalySummary = { // Overall summaries
//   totalAnomalies: number;
//   stationWithMost: { station: string; count: number } | null;
//   parameterWithMost: { parameter: string; count: number } | null;
//   topHotspots: AnomalyHotspot[];
// };
// // ----------------------------------------

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

//   // --- (MODIFIED) State for Anomaly Insights ---
//   const [anomalySummary, setAnomalySummary] = useState<AnomalySummary | null>(null);
//   // ------------------------------------------

//   // Effect to load station list on mount
//   useEffect(() => {
//     setIsStationsLoading(true);
//     fetch('http://localhost:5000/api/stations')
//       .then(res => { if (!res.ok) throw new Error('Failed fetch'); return res.json(); })
//       .then((data: { stationId: number; name: string }[]) => {
//         if (!data || data.length === 0) { toast.warning("No station data found."); setStations([]); return; }
//         const formattedStations = data.map(s => ({ id: String(s.stationId), name: s.name || `Station ${s.stationId}` }));
//         setStations(formattedStations);
//         if (formattedStations.length > 0) setSelectedStation(formattedStations[0].id);
//       })
//       .catch(err => {
//         console.error("Fallback: /api/daynight/list", err);
//         fetch('http://localhost:5000/api/daynight/list')
//           .then(res => res.json())
//           .then((filenames: string[]) => {
//             if (!filenames || filenames.length === 0) { toast.warning("No plots found."); setStations([]); return; }
//             const parsedStations = filenames.map(f => ({ id: f.replace('station_', '').replace('.png', ''), name: `Station ${f.replace('station_', '').replace('.png', '')}` }));
//             setStations(parsedStations);
//             if (parsedStations.length > 0) setSelectedStation(parsedStations[0].id);
//           })
//           .catch(fallbackErr => toast.error("Failed to load stations."))
//       })
//       .finally(() => setIsStationsLoading(false));
//   }, []); // Runs once

//   // Effect to load Anomaly Heatmap & generate insights
//   useEffect(() => {
//   setIsHeatmapLoading(true);
//   fetch('http://localhost:5000/api/anomaly-heatmap')
//     .then(res => res.json())
//     .then(data => {
//       console.log("Fetched Anomaly Heatmap Data:", data); // <-- ADD THIS LINE
//       setHeatmapData(data);
//       generateAnomalyInsights(data);
//     })
//     .catch(err => toast.error("Failed to load anomaly heatmap."))
//     .finally(() => setIsHeatmapLoading(false));
// }, []); // Runs once

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
//            setCorrelationInsights({ positive: [], negative: [] });
//         }
//       })
//       .catch(err => toast.error(`Failed correlation load (${correlationMethod}, Stn ${selectedStation}).`))
//       .finally(() => setIsCorrelationLoading(false));
//   }, [selectedStation, correlationMethod]); // Re-runs


//   // --- (MODIFIED) Function to generate Anomaly Insights Summary ---
// // --- (REPLACE THIS FUNCTION in Analysis.tsx) ---
// const generateAnomalyInsights = (plotData: any) => {
//   console.log("--- Inside generateAnomalyInsights ---");
//   console.log("Raw plotData received:", plotData); // Already added

//   // Basic structure check
//   if (!plotData?.data?.[0]?.z || !plotData?.data?.[0]?.x || !plotData?.data?.[0]?.y) {
//     console.error("generateAnomalyInsights: Expected data structure (data[0].z/x/y) not found!");
//     setAnomalySummary(null); return;
//   }

//   const z = plotData.data[0].z as (number | null)[][]; // Allow nulls just in case
//   const parameters = plotData.data[0].x as string[];
//   const stations = plotData.data[0].y as string[]; // Expecting strings from backend
//   console.log("Extracted 'z' (Counts):", z);
//   console.log("Extracted 'parameters' (x-axis):", parameters);
//   console.log("Extracted 'stations' (y-axis):", stations);


//   // Check array validity
//   // Check array validity
//   // --- ADD THESE LOGS ---
//   console.log(`--- Checking Array Validity ---`);
//   console.log(`Is stations an array? ${Array.isArray(stations)}, Length: ${stations?.length}`);
//   console.log(`Is parameters an array? ${Array.isArray(parameters)}, Length: ${parameters?.length}`);
//   console.log(`Is z an array? ${Array.isArray(z)}, Length: ${z?.length}`);
//   console.log(`Is z[0] an array? ${Array.isArray(z?.[0])}, Length: ${z?.[0]?.length}`); // Use optional chaining
//   console.log(`Dimension check: z.length (${z?.length}) === stations.length (${stations?.length}) -> ${z?.length === stations?.length}`);
//   console.log(`Dimension check: z[0].length (${z?.[0]?.length}) === parameters.length (${parameters?.length}) -> ${z?.[0]?.length === parameters?.length}`);
//   console.log(`--- End Check ---`);
//   // --- END ADDED LOGS ---

//   if (!Array.isArray(stations) || !Array.isArray(parameters) || !Array.isArray(z) || stations.length === 0 || parameters.length === 0 || z.length === 0 || z.length !== stations.length || !Array.isArray(z?.[0]) || z?.[0]?.length !== parameters.length ) { // Used optional chaining here too
//      console.warn("generateAnomalyInsights: Data arrays (z, x, y) are missing, empty, or have mismatched dimensions.");
//      setAnomalySummary({ totalAnomalies: 0, stationWithMost: null, parameterWithMost: null, topHotspots: [] });
//      return;
//   }
//   // ... rest of the function

//   let totalAnomalies = 0;
//   const stationCounts: Record<string, number> = {};
//   const parameterCounts: Record<string, number> = {};
//   const hotspots: AnomalyHotspot[] = [];

//   try {
//     // Iterate and calculate
//     for (let i = 0; i < stations.length; i++) {
//       const stationId = stations[i]; // Use the ID directly
//       // Initialize station count if not present
//       if (typeof stationId === 'string' && stationId.length > 0) {
//            stationCounts[stationId] = stationCounts[stationId] || 0; // Initialize only if not already present
//       } else {
//            console.warn(`generateAnomalyInsights: Invalid or empty station ID at index ${i}:`, stationId);
//            continue; // Skip this row if station ID is invalid
//       }

//       for (let j = 0; j < parameters.length; j++) {
//         const parameterName = parameters[j];
//         const count = z[i]?.[j]; // Use optional chaining for safety

//         // Check count validity more strictly
//         if (typeof count !== 'number' || isNaN(count)) {
//            // console.warn(`generateAnomalyInsights: Invalid or missing count at z[${i}][${j}] for Station ${stationId}, Param ${parameterName}. Value:`, count);
//            continue; // Skip if count is not a valid number
//         }

//         if (count > 0) {
//           totalAnomalies += count;
//           stationCounts[stationId] = (stationCounts[stationId] || 0) + count;
//           parameterCounts[parameterName] = (parameterCounts[parameterName] || 0) + count;
//           hotspots.push({ station: stationId, parameter: parameterName, count: count });
//         }
//       }
//     }
//     console.log("Calculated totalAnomalies:", totalAnomalies);
//     console.log("Calculated stationCounts:", stationCounts);
//     console.log("Calculated parameterCounts:", parameterCounts);

//     // --- Finding Maximums ---
//     let stationWithMost: { station: string; count: number } | null = null;
//     let maxStationCount = 0;
//     for (const [station, count] of Object.entries(stationCounts)) {
//         if (count > maxStationCount) {
//             maxStationCount = count;
//             stationWithMost = { station, count };
//         }
//     }
//     console.log("Station with most:", stationWithMost);


//     let parameterWithMost: { parameter: string; count: number } | null = null;
//     let maxParamCount = 0;
//     for (const [parameter, count] of Object.entries(parameterCounts)) {
//          if (count > maxParamCount) {
//              maxParamCount = count;
//              parameterWithMost = { parameter, count };
//          }
//     }
//     console.log("Parameter with most:", parameterWithMost);

//     // Sort hotspots
//     hotspots.sort((a, b) => b.count - a.count);
//     const topHotspots = hotspots.slice(0, 5);
//     console.log("Top 5 hotspots:", topHotspots);

//     // Set state
//     const finalSummary = { totalAnomalies, stationWithMost, parameterWithMost, topHotspots };
//     console.log("Setting anomalySummary state:", finalSummary);
//     setAnomalySummary(finalSummary);

//   } catch (error) {
//      console.error("Error during anomaly insight calculation:", error);
//      setAnomalySummary(null);
//   }
// };
// // --- (END OF REPLACED FUNCTION) ---
//   // ------------------------------------------------------------------

//   // --- Handler for station change ---
//   const handleStationChange = (stationId: string) => { setSelectedStation(stationId); };

//   // Helper function to format parameter names
//   const formatParamName = (name: string) => name ? name.replace(/([A-Z])/g, ' $1').trim() : 'N/A';

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
//               <Label htmlFor="station-select" className="text-sm font-medium mb-2 block"> Select Monitoring Station ID </Label>
//               {isStationsLoading ? ( <Loader2 className="h-4 w-4 animate-spin" /> ) : (
//                 <Select value={selectedStation || ''} onValueChange={handleStationChange}>
//                   <SelectTrigger id="station-select" className="w-full">
//                     <SelectValue placeholder="Select a station ID"> {selectedStation || "Select a station ID"} </SelectValue>
//                   </SelectTrigger>
//                   <SelectContent className="max-h-64">
//                     {stations.map((station) => ( <SelectItem key={station.id} value={station.id}> {station.id} </SelectItem> ))}
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
//                  <p className="text-muted-foreground mb-6"> Average values for Station ID: {selectedStation || '...'} </p>
//                  <div className="flex justify-center items-center min-h-[400px] bg-muted/30 rounded-lg mb-6">
//                    {selectedStation ? ( <img src={dayNightImageUrl} alt={`Day/Night plot for station ${selectedStation}`} className="max-w-full h-auto" onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/800x600?text=Plot+Not+Found")}/> ) : ( <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> )}
//                  </div>
//                  {/* --- (MODIFIED) Slightly refined generic insights --- */}
//                  <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
//                    <h4 className="font-semibold mb-2 flex items-center"><Info className="h-4 w-4 mr-2 text-primary" /> Insights from Day-Night Patterns</h4>
//                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
//                      <li>This plot highlights parameters potentially influenced by daily environmental cycles (like sunlight affecting temperature and photosynthesis impacting Dissolved Oxygen).</li>
//                      <li>Large, consistent differences between day and night values for certain parameters (e.g., pH, DO, temperature) might suggest strong natural processes or time-specific pollution inputs.</li>
//                      <li>Parameters showing little variation might be more influenced by consistent sources or slower processes.</li>
//                    </ul>
//                  </div>
//                  {/* --- (END MODIFIED) --- */}
//               </Card>
//             </TabsContent>

//             {/* Correlation Tab */}
//             <TabsContent value="correlation" className="space-y-6 animate-fade-in">
//               <Card className="p-8 shadow-medium border-2">
//                  <div className="flex items-center gap-3 mb-6"> <Activity className="h-6 w-6 text-primary" /> <h2 className="text-2xl font-bold">Inter-Parameter Correlation</h2> </div>
//                  {/* Method Selection */}
//                  <div className="mb-6 max-w-md"> <Label className="text-sm font-medium mb-2 block">Correlation Method</Label> <RadioGroup value={correlationMethod} onValueChange={(value) => setCorrelationMethod(value as CorrelationMethod)} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4"> <div className="flex items-center space-x-2"> <RadioGroupItem value="pearson" id="pearson" /> <Label htmlFor="pearson" className="cursor-pointer">Pearson (Linear)</Label> </div> <div className="flex items-center space-x-2"> <RadioGroupItem value="spearman" id="spearman" /> <Label htmlFor="spearman" className="cursor-pointer">Spearman (Monotonic)</Label> </div> <div className="flex items-center space-x-2"> <RadioGroupItem value="kendall" id="kendall" /> <Label htmlFor="kendall" className="cursor-pointer">Kendall (Ordinal)</Label> </div> </RadioGroup> </div>
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
//                  {/* --- (MODIFIED) Anomaly Insights Box --- */}
//                  <div className="mt-6 p-6 bg-card rounded-lg border-2 border-primary/20 shadow-soft">
//                    <h4 className="font-semibold mb-4 flex items-center text-lg text-primary">
//                       <Info className="h-5 w-5 mr-2" /> Anomaly Summary
//                    </h4>
//                    {isHeatmapLoading ? ( <Loader2 className="h-5 w-5 animate-spin mx-auto mt-4 text-primary" />
//                    ) : anomalySummary ? (
//                      <div className="space-y-4 text-sm">
//                         <div className='flex items-center gap-2'>
//                            {anomalySummary.totalAnomalies > 0 ? <AlertTriangle className="h-5 w-5 text-orange-500" /> : <CheckCircle className="h-5 w-5 text-green-500" />}
//                            <p>Total anomalies detected across all stations: <span className="font-bold">{anomalySummary.totalAnomalies}</span></p>
//                         </div>

//                        {anomalySummary.stationWithMost && anomalySummary.stationWithMost.count > 0 && (
//                           <p>Station with most anomalies: <span className="font-semibold text-foreground">Station {anomalySummary.stationWithMost.station}</span> ({anomalySummary.stationWithMost.count} anomalies)</p>
//                        )}

//                        {anomalySummary.parameterWithMost && anomalySummary.parameterWithMost.count > 0 && (
//                           <p>Parameter with most anomalies overall: <span className="font-semibold text-foreground">{formatParamName(anomalySummary.parameterWithMost.parameter)}</span> ({anomalySummary.parameterWithMost.count} anomalies)</p>
//                        )}

//                        {anomalySummary.topHotspots && anomalySummary.topHotspots.length > 0 && (
//                          <div>
//                            <h5 className="font-medium mt-3 mb-1 border-b pb-1">Top 5 Anomaly Hotspots:</h5>
//                            <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-2">
//                              {anomalySummary.topHotspots.map((spot, idx) => (
//                                <li key={idx}>
//                                  <span className="font-medium text-foreground">Station {spot.station}</span> / <span className="font-medium text-foreground">{formatParamName(spot.parameter)}</span>: <span className="font-semibold text-red-600">{spot.count}</span> anomalies
//                                </li>
//                              ))}
//                            </ul>
//                          </div>
//                        )}

//                      </div>
//                    ) : ( <p className="text-sm text-muted-foreground italic">Anomaly summary could not be generated.</p> )}
//                  </div>
//                  {/* --- (END MODIFIED) --- */}
//               </Card>
//             </TabsContent>

//           </Tabs>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Analysis;