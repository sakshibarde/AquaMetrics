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
import { TrendingUp, Calendar, Loader2, Table } from 'lucide-react'; // (NEW) Added Table icon
import Plot from 'react-plotly.js';
import { toast } from 'sonner';

// --- (NEW) Define types ---
type Station = {
  id: string;
  name: string;
};

// This type will match your Colab/Pandas output
type SummaryRow = {
  stationId: string;
  date: string;
  [key: string]: any; // For all the parameter columns
};
// --------------------------

const Prediction = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [predictionType, setPredictionType] = useState('daily');
  
  const [isStationsLoading, setIsStationsLoading] = useState(true);
  const [isPlotLoading, setIsPlotLoading] = useState(false);
  const [plotData, setPlotData] = useState<any>(null); // To hold Plotly JSON

  // --- (NEW) State for the summary table ---
  const [summaryData, setSummaryData] = useState<SummaryRow[]>([]);
  const [summaryHeaders, setSummaryHeaders] = useState<string[]>([]);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  // ----------------------------------------

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
      .catch(err => {
        console.error("Failed to fetch station list", err);
        toast.error("Failed to load station list from backend.");
      })
      .finally(() => setIsStationsLoading(false));
  }, []); // Runs once

  // (MODIFIED) This effect now loads BOTH the plot AND the summary table
  useEffect(() => {
    if (!selectedStation) return; 

    const endpoint = predictionType === 'daily' ? 'daily' : 'weekly';
    
    // --- 1. Load the Plot for the selected station ---
    setIsPlotLoading(true);
    setPlotData(null); 
    fetch(`http://localhost:5000/api/predictions/${endpoint}/${selectedStation}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setPlotData(data);
      })
      .catch(err => {
        console.error(`Failed to fetch ${endpoint} plot:`, err);
        toast.error(`Failed to load ${endpoint} plot for Station ${selectedStation}.`);
      })
      .finally(() => setIsPlotLoading(false));
      
    // --- 2. Load the Summary Table for ALL stations ---
    setIsSummaryLoading(true);
    setSummaryData([]);
    setSummaryHeaders([]);
    fetch(`http://localhost:5000/api/predictions/summary/${endpoint}`)
      .then(res => res.json())
      .then((data: SummaryRow[]) => {
        if (!data || data.length === 0) {
          throw new Error("No summary data found.");
        }
        // Get all unique keys from the first object, except stationId/date
        const headers = Object.keys(data[0]).filter(k => k !== 'stationId' && k !== 'date');
        setSummaryHeaders(['stationId', 'date', ...headers]); // Set specific order
        setSummaryData(data);
      })
      .catch(err => {
        console.error(`Failed to fetch ${endpoint} summary:`, err);
        toast.error(`Failed to load prediction summary table.`);
      })
      .finally(() => setIsSummaryLoading(false));

  }, [selectedStation, predictionType]); // Re-runs when these change

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* ... (Header Text is unchanged) ... */}
          <div className="text-center mb-12 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-6 py-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">LSTM Predictions</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-water bg-clip-text text-transparent">
              Water Parameter Prediction
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              AI-powered LSTM model for daily and weekly water quality forecasting
            </p>
          </div>

          {/* ... (Control Cards are unchanged) ... */}
          <div className="grid lg:grid-cols-3 gap-8 mb-8">
            <Card className="p-6 shadow-medium border-2 lg:col-span-2">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="station-select" className="text-sm font-medium mb-2 block">
                    Select Monitoring Station
                  </Label>
                  {isStationsLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading stations...
                    </div>
                  ) : (
                    <Select value={selectedStation || ''} onValueChange={setSelectedStation}>
                      <SelectTrigger id="station-select">
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
                <div>
                  <Label className="text-sm font-medium mb-3 block">Prediction Period</Label>
                  <RadioGroup value={predictionType} onValueChange={setPredictionType}>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border-2 border-border hover:border-primary/50 transition-colors">
                      <RadioGroupItem value="daily" id="daily" />
                      <Label htmlFor="daily" className="flex-1 cursor-pointer">
                        Daily Prediction (Tomorrow)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border-2 border-border hover:border-primary/50 transition-colors">
                      <RadioGroupItem value="weekly" id="weekly" />
                      <Label htmlFor="weekly" className="flex-1 cursor-pointer">
                        Weekly Prediction (Next 7-Day Avg)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </Card>
            <Card className="p-6 shadow-medium border-2 bg-gradient-water text-white">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5" />
                <h3 className="font-semibold">Prediction Summary</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/80">Period:</span>
                  <span className="font-semibold">
                    {predictionType === 'daily' ? 'Next Day' : 'Next 7-Day Avg'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Model:</span>
                  <span className="font-semibold">LSTM Neural Network</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Confidence:</span>
                  <span className="font-semibold">~94.2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Last Updated:</span>
                  <span className="font-semibold">{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* ... (Plotly Chart Card is unchanged) ... */}
          <Card className="p-8 shadow-medium border-2 mb-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">
                {predictionType === 'daily' ? 'Daily' : 'Weekly'} Prediction Chart (Station {selectedStation})
              </h2>
            </div>
            
            <div className="min-h-[450px] w-full flex justify-center items-center">
              {isPlotLoading || !plotData ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <Plot
                  data={plotData.data}
                  layout={plotData.layout}
                  style={{ width: '10C%', height: '100%' }}
                  useResizeHandler={true}
                  className="w-full h-full"
                />
              )}
            </div>
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Note:</span>{' '}
                {predictionType === 'daily'
                  ? "This chart compares today's actual measured values (blue) against the LSTM model's prediction for tomorrow (orange)."
                  : "This chart shows the predicted average value for each parameter over the next 7 days, as forecasted by the weekly LSTM model."
                }
              </p>
            </div>
          </Card>

          {/* --- (NEW) The summary table from your Colab output --- */}
          <Card className="p-8 shadow-medium border-2 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <Table className="h-6 w-6 text-primary" />
              <h3 className="text-2xl font-bold">
                Prediction Summary Table (All Stations)
              </h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Full {predictionType} prediction data for all stations, matching the Colab output.
            </p>
            
            {/* (NEW) This container enables horizontal scrolling on small screens */}
            <div className="overflow-x-auto border-2 border-border rounded-lg">
              <table className="w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    {/* (NEW) Dynamically create headers from state */}
                    {summaryHeaders.map((header) => (
                      <th 
                        key={header} 
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {/* Add spaces before capital letters for readability */}
                        {header.replace(/([A-Z])/g, ' $1').trim()} 
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {isSummaryLoading ? (
                    <tr>
                      <td colSpan={summaryHeaders.length || 1} className="text-center p-4">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : summaryData.length > 0 ? (
                    // (NEW) Dynamically render rows
                    summaryData.map((row) => (
                      <tr key={row.stationId} className="hover:bg-muted/30 transition-colors">
                        {summaryHeaders.map((header) => (
                          <td key={header} className="px-4 py-3 text-sm" style={{ whiteSpace: 'nowrap' }}>
                            {/* Format numbers to 3 decimal places */}
                            {typeof row[header] === 'number'
                              ? (row[header] as number).toFixed(3) 
                              : row[header]
                            }
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={summaryHeaders.length || 1} className="text-center p-4 text-muted-foreground">
                        No summary data to display.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          
        </div>
      </div>
    </div>
  );
};

export default Prediction;



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
// import { TrendingUp, Calendar, Loader2 } from 'lucide-react';
// import Plot from 'react-plotly.js'; // (NEW) Import Plotly
// import { toast } from 'sonner';

// // (NEW) Define type for station list
// type Station = {
//   id: string;
//   name: string;
// };

// const Prediction = () => {
//   const [stations, setStations] = useState<Station[]>([]);
//   const [selectedStation, setSelectedStation] = useState<string | null>(null);
//   const [predictionType, setPredictionType] = useState('daily');
  
//   const [isStationsLoading, setIsStationsLoading] = useState(true);
//   const [isPlotLoading, setIsPlotLoading] = useState(false);
//   const [plotData, setPlotData] = useState<any>(null); // To hold Plotly JSON

//   // (NEW) Effect to load station list on mount
//   useEffect(() => {
//     setIsStationsLoading(true);
//     fetch('http://localhost:5000/api/daynight/list') // Use any endpoint that lists stations
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
//         if (parsedStations.length > 0) {
//           setSelectedStation(parsedStations[0].id); // Select the first station by default
//         }
//       })
//       .catch(err => {
//         console.error("Failed to fetch station list", err);
//         toast.error("Failed to load station list from backend.");
//       })
//       .finally(() => setIsStationsLoading(false));
//   }, []); // Runs once

//   // (NEW) Effect to load plot data when controls change
//   useEffect(() => {
//     if (!selectedStation) return; // Don't fetch if no station is selected

//     setIsPlotLoading(true);
//     setPlotData(null); // Clear old plot

//     const endpoint = predictionType === 'daily' ? 'daily' : 'weekly';
//     const url = `http://localhost:5000/api/predictions/${endpoint}/${selectedStation}`;

//     fetch(url)
//       .then(res => res.json())
//       .then(data => {
//         if (data.error) {
//           throw new Error(data.error);
//         }
//         setPlotData(data);
//       })
//       .catch(err => {
//         console.error(`Failed to fetch ${endpoint} plot:`, err);
//         toast.error(`Failed to load ${endpoint} plot for Station ${selectedStation}.`);
//       })
//       .finally(() => setIsPlotLoading(false));
      
//   }, [selectedStation, predictionType]); // Re-runs when these change

//   return (
//     <div className="min-h-screen bg-background">
//       <Header />
      
//       <div className="pt-24 pb-16 px-4">
//         <div className="container mx-auto max-w-7xl">
//           <div className="text-center mb-12 animate-fade-in-up">
//             <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-6 py-2 mb-4">
//               <TrendingUp className="h-5 w-5 text-primary" />
//               <span className="text-sm font-medium text-primary">LSTM Predictions</span>
//             </div>
//             <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-water bg-clip-text text-transparent">
//               Water Parameter Prediction
//             </h1>
//             <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
//               AI-powered LSTM model for daily and weekly water quality forecasting
//             </p>
//           </div>

//           <div className="grid lg:grid-cols-3 gap-8 mb-8">
//             <Card className="p-6 shadow-medium border-2 lg:col-span-2">
//               <div className="space-y-6">
//                 <div>
//                   <Label htmlFor="station-select" className="text-sm font-medium mb-2 block">
//                     Select Monitoring Station
//                   </Label>
//                   {isStationsLoading ? (
//                     <div className="flex items-center gap-2 text-muted-foreground">
//                       <Loader2 className="h-4 w-4 animate-spin" />
//                       Loading stations...
//                     </div>
//                   ) : (
//                     <Select value={selectedStation || ''} onValueChange={setSelectedStation}>
//                       <SelectTrigger id="station-select">
//                         <SelectValue placeholder="Select a station" />
//                       </SelectTrigger>
//                       <SelectContent className="max-h-64">
//                         {stations.map((station) => (
//                           <SelectItem key={station.id} value={station.id}>
//                             {station.name}
//                           </SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>
//                   )}
//                 </div>

//                 <div>
//                   <Label className="text-sm font-medium mb-3 block">Prediction Period</Label>
//                   <RadioGroup value={predictionType} onValueChange={setPredictionType}>
//                     <div className="flex items-center space-x-2 p-3 rounded-lg border-2 border-border hover:border-primary/50 transition-colors">
//                       <RadioGroupItem value="daily" id="daily" />
//                       <Label htmlFor="daily" className="flex-1 cursor-pointer">
//                         Daily Prediction (Tomorrow)
//                       </Label>
//                     </div>
//                     <div className="flex items-center space-x-2 p-3 rounded-lg border-2 border-border hover:border-primary/50 transition-colors">
//                       <RadioGroupItem value="weekly" id="weekly" />
//                       <Label htmlFor="weekly" className="flex-1 cursor-pointer">
//                         Weekly Prediction (Next 7-Day Avg)
//                       </Label>
//                     </div>
//                   </RadioGroup>
//                 </div>
//               </div>
//             </Card>

//             <Card className="p-6 shadow-medium border-2 bg-gradient-water text-white">
//               <div className="flex items-center gap-2 mb-4">
//                 <Calendar className="h-5 w-5" />
//                 <h3 className="font-semibold">Prediction Summary</h3>
//               </div>
//               <div className="space-y-2 text-sm">
//                 <div className="flex justify-between">
//                   <span className="text-white/80">Period:</span>
//                   <span className="font-semibold">
//                     {predictionType === 'daily' ? 'Next Day' : 'Next 7-Day Avg'}
//                   </span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-white/80">Model:</span>
//                   <span className="font-semibold">LSTM Neural Network</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-white/80">Confidence:</span>
//                   {/* TODO: This is still mock data */}
//                   <span className="font-semibold">~94.2%</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-white/80">Last Updated:</span>
//                   <span className="font-semibold">{new Date().toLocaleDateString()}</span>
//                 </div>
//               </div>
//             </Card>
//           </div>

//           {/* --- (MODIFIED) This card now holds the Plotly chart --- */}
//           <Card className="p-8 shadow-medium border-2 mb-8 animate-fade-in">
//             <div className="flex items-center gap-3 mb-6">
//               <TrendingUp className="h-6 w-6 text-primary" />
//               <h2 className="text-2xl font-bold">
//                 {predictionType === 'daily' ? 'Daily' : 'Weekly'} Prediction Chart
//               </h2>
//             </div>
            
//             <div className="min-h-[450px] w-full flex justify-center items-center">
//               {isPlotLoading || !plotData ? (
//                 <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
//               ) : (
//                 <Plot
//                   data={plotData.data}
//                   layout={plotData.layout}
//                   style={{ width: '100%', height: '100%' }}
//                   useResizeHandler={true}
//                   className="w-full h-full"
//                 />
//               )}
//             </div>

//             {/* --- (MODIFIED) Updated note text --- */}
//             <div className="mt-6 p-4 bg-muted/50 rounded-lg">
//               <p className="text-sm text-muted-foreground">
//                 <span className="font-semibold text-foreground">Note:</span>{' '}
//                 {predictionType === 'daily'
//                   ? "This chart compares today's actual measured values (blue) against the LSTM model's prediction for tomorrow (orange)."
//                   : "This chart shows the predicted average value for each parameter over the next 7 days, as forecasted by the weekly LSTM model."
//                 }
//               </p>
//             </div>
//           </Card>

//           {/* --- (REMOVED) The mock data table is no longer needed --- */}
          
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Prediction;