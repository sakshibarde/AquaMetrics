// import { useState } from 'react';
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
// import { LineChart, Activity, TrendingUp } from 'lucide-react';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { ResponsiveContainer, LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// const Analysis = () => {
//   const [selectedStation, setSelectedStation] = useState('station-1');

//   const stations = Array.from({ length: 40 }, (_, i) => ({
//     id: `station-${i + 1}`,
//     name: `Monitoring Station ${i + 1}`,
//   }));

//   // Mock data for charts
//   const dayNightData = [
//     { parameter: 'BOD', day: 8.5, night: 6.2 },
//     { parameter: 'COD', day: 45, night: 38 },
//     { parameter: 'pH', day: 7.2, night: 7.4 },
//     { parameter: 'DO', day: 6.8, night: 5.5 },
//     { parameter: 'Temp', day: 25, night: 22 },
//   ];

//   const anomalyData = Array.from({ length: 30 }, (_, i) => ({
//     day: i + 1,
//     value: Math.random() * 100 + 50 + (i > 20 ? Math.random() * 50 : 0),
//     anomaly: i > 20 && Math.random() > 0.7,
//   }));

//   const correlationMatrix = [
//     ['BOD', 'COD', 'pH', 'DO', 'Temp'],
//     [1.0, 0.85, -0.32, -0.65, 0.28],
//     [0.85, 1.0, -0.28, -0.72, 0.35],
//     [-0.32, -0.28, 1.0, 0.42, -0.15],
//     [-0.65, -0.72, 0.42, 1.0, -0.48],
//     [0.28, 0.35, -0.15, -0.48, 1.0],
//   ];

//   return (
//     <div className="min-h-screen bg-background">
//       <Header />
      
//       <div className="pt-24 pb-16 px-4">
//         <div className="container mx-auto max-w-7xl">
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
//           </div>

//           <Card className="p-8 shadow-medium border-2 mb-8">
//             <div className="max-w-md">
//               <Label htmlFor="station-select" className="text-sm font-medium mb-2 block">
//                 Select Monitoring Station
//               </Label>
//               <Select value={selectedStation} onValueChange={setSelectedStation}>
//                 <SelectTrigger id="station-select" className="w-full">
//                   <SelectValue />
//                 </SelectTrigger>
//                 <SelectContent className="max-h-64">
//                   {stations.map((station) => (
//                     <SelectItem key={station.id} value={station.id}>
//                       {station.name}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>
//           </Card>

//           <Tabs defaultValue="day-night" className="space-y-8">
//             <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto">
//               <TabsTrigger value="day-night">Day-Night Analysis</TabsTrigger>
//               <TabsTrigger value="anomaly">Anomaly Detection</TabsTrigger>
//               <TabsTrigger value="correlation">Correlation Matrix</TabsTrigger>
//             </TabsList>

//             <TabsContent value="day-night" className="space-y-6 animate-fade-in">
//               <Card className="p-8 shadow-medium border-2">
//                 <div className="flex items-center gap-3 mb-6">
//                   <LineChart className="h-6 w-6 text-primary" />
//                   <h2 className="text-2xl font-bold">Day vs Night Parameter Comparison</h2>
//                 </div>
//                 <p className="text-muted-foreground mb-6">
//                   Average values of water parameters during day and night periods for {selectedStation}
//                 </p>
                
//                 <ResponsiveContainer width="100%" height={400}>
//                   <RechartsLine data={dayNightData}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="parameter" />
//                     <YAxis />
//                     <Tooltip />
//                     <Legend />
//                     <Line type="monotone" dataKey="day" stroke="hsl(var(--primary))" strokeWidth={2} name="Day" />
//                     <Line type="monotone" dataKey="night" stroke="hsl(var(--accent))" strokeWidth={2} name="Night" />
//                   </RechartsLine>
//                 </ResponsiveContainer>
//               </Card>
//             </TabsContent>

//             <TabsContent value="anomaly" className="space-y-6 animate-fade-in">
//               <Card className="p-8 shadow-medium border-2">
//                 <div className="flex items-center gap-3 mb-6">
//                   <TrendingUp className="h-6 w-6 text-primary" />
//                   <h2 className="text-2xl font-bold">Anomaly Detection Time Series</h2>
//                 </div>
//                 <p className="text-muted-foreground mb-6">
//                   Detected anomalies are highlighted in red. Analysis based on statistical deviation from baseline.
//                 </p>
                
//                 <ResponsiveContainer width="100%" height={400}>
//                   <RechartsLine data={anomalyData}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="day" label={{ value: 'Day', position: 'insideBottom', offset: -5 }} />
//                     <YAxis label={{ value: 'Parameter Value', angle: -90, position: 'insideLeft' }} />
//                     <Tooltip />
//                     <Line
//                       type="monotone"
//                       dataKey="value"
//                       stroke="hsl(var(--primary))"
//                       strokeWidth={2}
//                       dot={(props: any) => {
//                         const { cx, cy, payload } = props;
//                         return payload.anomaly ? (
//                           <circle cx={cx} cy={cy} r={6} fill="hsl(0 75% 50%)" stroke="white" strokeWidth={2} />
//                         ) : (
//                           <circle cx={cx} cy={cy} r={3} fill="hsl(var(--primary))" />
//                         );
//                       }}
//                     />
//                   </RechartsLine>
//                 </ResponsiveContainer>
//               </Card>
//             </TabsContent>

//             <TabsContent value="correlation" className="space-y-6 animate-fade-in">
//               <Card className="p-8 shadow-medium border-2">
//                 <div className="flex items-center gap-3 mb-6">
//                   <Activity className="h-6 w-6 text-primary" />
//                   <h2 className="text-2xl font-bold">Inter-Parameter Correlation Heatmap</h2>
//                 </div>
//                 <p className="text-muted-foreground mb-6">
//                   Correlation matrix showing relationships between different water quality parameters. 
//                   Values range from -1 (negative correlation) to +1 (positive correlation).
//                 </p>
                
//                 <div className="overflow-x-auto">
//                   <div className="inline-block min-w-full">
//                     <div className="grid grid-cols-6 gap-0 border-2 border-border rounded-lg overflow-hidden">
//                       {/* Header row */}
//                       <div className="bg-muted font-semibold p-3 border-b border-r border-border"></div>
//                       {correlationMatrix[0].map((param, i) => (
//                         <div key={i} className="bg-muted font-semibold p-3 text-center border-b border-border">
//                           {param}
//                         </div>
//                       ))}
                      
//                       {/* Data rows */}
//                       {correlationMatrix.slice(1).map((row, rowIndex) => (
//                         <>
//                           <div key={`label-${rowIndex}`} className="bg-muted font-semibold p-3 border-r border-border">
//                             {correlationMatrix[0][rowIndex]}
//                           </div>
//                           {row.map((value, colIndex) => {
//                             const numValue = typeof value === 'number' ? value : 0;
//                             const intensity = Math.abs(numValue);
//                             const isPositive = numValue >= 0;
//                             const bgColor = isPositive
//                               ? `rgba(16, 185, 129, ${intensity})`
//                               : `rgba(239, 68, 68, ${intensity})`;
                            
//                             return (
//                               <div
//                                 key={`cell-${rowIndex}-${colIndex}`}
//                                 className="p-3 text-center font-medium border-border"
//                                 style={{
//                                   backgroundColor: bgColor,
//                                   color: intensity > 0.5 ? 'white' : 'inherit',
//                                 }}
//                               >
//                                 {typeof value === 'number' ? value.toFixed(2) : value}
//                               </div>
//                             );
//                           })}
//                         </>
//                       ))}
//                     </div>
                    
//                     <div className="mt-6 flex items-center justify-center gap-8">
//                       <div className="flex items-center gap-2">
//                         <div className="w-8 h-8 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)' }}></div>
//                         <span className="text-sm">-1.0 (Strong Negative)</span>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <div className="w-8 h-8 rounded" style={{ backgroundColor: 'rgba(229, 231, 235, 1)' }}></div>
//                         <span className="text-sm">0.0 (No Correlation)</span>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <div className="w-8 h-8 rounded" style={{ backgroundColor: 'rgba(16, 185, 129, 0.8)' }}></div>
//                         <span className="text-sm">+1.0 (Strong Positive)</span>
//                       </div>
//                     </div>
//                   </div>
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
