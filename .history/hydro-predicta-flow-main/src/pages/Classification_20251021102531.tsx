// import { useState } from 'react';
// import Header from '@/components/Header';
// import { Card } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import QualityBadge from '@/components/QualityBadge';
// import { Loader2, Droplet, AlertCircle, CheckCircle2 } from 'lucide-react';
// import { toast } from 'sonner';

// type QualityLevel = 'Excellent' | 'Good' | 'Medium' | 'Bad' | 'Very Bad';

// const Classification = () => {
//   const [isLoading, setIsLoading] = useState(false);
//   const [result, setResult] = useState<QualityLevel | null>(null);

//   const parameters = [
//     { name: 'bod', label: 'Biochemical Oxygen Demand (mg/L)', min: 0, max: 100 },
//     { name: 'cod', label: 'Chemical Oxygen Demand (mg/L)', min: 0, max: 500 },
//     { name: 'chloride', label: 'Chloride (mg/L)', min: 0, max: 1000 },
//     { name: 'conductivity', label: 'Conductivity (μS/cm)', min: 0, max: 5000 },
//     { name: 'depth', label: 'Depth (m)', min: 0, max: 50 },
//     { name: 'dissolvedOxygen', label: 'Dissolved Oxygen (mg/L)', min: 0, max: 20 },
//     { name: 'nitrate', label: 'Nitrate (mg/L)', min: 0, max: 100 },
//     { name: 'toc', label: 'Total Organic Carbon (mg/L)', min: 0, max: 50 },
//     { name: 'waterLevel', label: 'Water Level (m)', min: 0, max: 100 },
//     { name: 'temperature', label: 'Water Temperature (°C)', min: 0, max: 50 },
//     { name: 'turbidity', label: 'Water Turbidity (NTU)', min: 0, max: 1000 },
//     { name: 'ph', label: 'pH', min: 0, max: 14, step: 0.1 },
//   ];

//   const [formData, setFormData] = useState<Record<string, string>>(
//     parameters.reduce((acc, param) => ({ ...acc, [param.name]: '' }), {})
//   );

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsLoading(true);

//     // Simulate AI classification
//     setTimeout(() => {
//       const qualities: QualityLevel[] = ['Excellent', 'Good', 'Medium', 'Bad', 'Very Bad'];
//       const randomQuality = qualities[Math.floor(Math.random() * qualities.length)];
//       setResult(randomQuality);
//       setIsLoading(false);
//       toast.success('Water quality analysis complete!');
//     }, 2000);
//   };

//   const handleInputChange = (name: string, value: string) => {
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const getRecommendations = (quality: QualityLevel) => {
//     switch (quality) {
//       case 'Excellent':
//         return {
//           icon: CheckCircle2,
//           color: 'text-emerald-600',
//           title: 'Safe for Drinking',
//           description: 'Water quality exceeds all safety standards. Suitable for drinking and all domestic uses.',
//         };
//       case 'Good':
//         return {
//           icon: CheckCircle2,
//           color: 'text-green-600',
//           title: 'Safe for Most Uses',
//           description: 'Water quality is good. Safe for domestic use with minimal treatment.',
//         };
//       case 'Medium':
//         return {
//           icon: AlertCircle,
//           color: 'text-yellow-600',
//           title: 'Treatment Recommended',
//           description: 'Water quality is acceptable but requires treatment before consumption. Safe for non-drinking purposes.',
//         };
//       case 'Bad':
//         return {
//           icon: AlertCircle,
//           color: 'text-orange-600',
//           title: 'Not Suitable for Drinking',
//           description: 'Water quality is poor. Not recommended for drinking. Requires significant treatment. Avoid direct contact.',
//         };
//       case 'Very Bad':
//         return {
//           icon: AlertCircle,
//           color: 'text-red-600',
//           title: 'Hazardous - Avoid Contact',
//           description: 'Water quality is severely compromised. Hazardous for all uses. Immediate remediation required.',
//         };
//     }
//   };

//   return (
//     <div className="min-h-screen bg-background">
//       <Header />
      
//       <div className="pt-24 pb-16 px-4">
//         <div className="container mx-auto max-w-6xl">
//           <div className="text-center mb-12 animate-fade-in-up">
//             <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-6 py-2 mb-4">
//               <Droplet className="h-5 w-5 text-primary" />
//               <span className="text-sm font-medium text-primary">AI-Powered Analysis</span>
//             </div>
//             <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-water bg-clip-text text-transparent">
//               Water Quality Classification
//             </h1>
//             <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
//               Enter water parameters for instant AI-driven quality assessment
//             </p>
//           </div>

//           <div className="grid lg:grid-cols-3 gap-8">
//             <div className="lg:col-span-2">
//               <Card className="p-8 shadow-medium border-2">
//                 <form onSubmit={handleSubmit} className="space-y-6">
//                   <div className="grid md:grid-cols-2 gap-6">
//                     {parameters.map((param) => (
//                       <div key={param.name} className="space-y-2">
//                         <Label htmlFor={param.name} className="text-sm font-medium">
//                           {param.label}
//                         </Label>
//                         <Input
//                           id={param.name}
//                           type="number"
//                           min={param.min}
//                           max={param.max}
//                           step={param.step || 1}
//                           value={formData[param.name]}
//                           onChange={(e) => handleInputChange(param.name, e.target.value)}
//                           required
//                           className="transition-all duration-200 focus:ring-2 focus:ring-primary"
//                           placeholder={`${param.min} - ${param.max}`}
//                         />
//                       </div>
//                     ))}
//                   </div>

//                   <Button
//                     type="submit"
//                     disabled={isLoading}
//                     className="w-full bg-gradient-water hover:opacity-90 transition-opacity text-lg py-6 shadow-medium"
//                   >
//                     {isLoading ? (
//                       <>
//                         <Loader2 className="mr-2 h-5 w-5 animate-spin" />
//                         Analyzing Water Quality...
//                       </>
//                     ) : (
//                       'Analyze Water Quality'
//                     )}
//                   </Button>
//                 </form>
//               </Card>
//             </div>

//             <div className="lg:col-span-1">
//               {result ? (
//                 <Card className="p-8 shadow-medium border-2 animate-scale-in sticky top-24">
//                   <h3 className="text-2xl font-bold mb-6 text-center">Analysis Result</h3>
                  
//                   <div className="flex justify-center mb-6">
//                     <QualityBadge quality={result} className="text-lg px-6 py-3" />
//                   </div>

//                   {(() => {
//                     const rec = getRecommendations(result);
//                     const Icon = rec.icon;
//                     return (
//                       <div className="space-y-4">
//                         <div className={`flex items-start gap-3 p-4 rounded-lg bg-muted/50`}>
//                           <Icon className={`h-6 w-6 mt-0.5 flex-shrink-0 ${rec.color}`} />
//                           <div>
//                             <h4 className="font-semibold mb-1">{rec.title}</h4>
//                             <p className="text-sm text-muted-foreground leading-relaxed">
//                               {rec.description}
//                             </p>
//                           </div>
//                         </div>
//                       </div>
//                     );
//                   })()}
//                 </Card>
//               ) : (
//                 <Card className="p-8 shadow-medium border-2 border-dashed sticky top-24">
//                   <div className="text-center text-muted-foreground">
//                     <Droplet className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
//                     <p className="text-sm">
//                       Fill in the water parameters and click "Analyze" to see the quality classification
//                     </p>
//                   </div>
//                 </Card>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Classification;



