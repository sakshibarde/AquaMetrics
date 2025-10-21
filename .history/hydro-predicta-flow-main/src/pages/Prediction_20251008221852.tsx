import { useState } from 'react';
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
import { TrendingUp, Calendar } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';

const Prediction = () => {
  const [selectedStation, setSelectedStation] = useState('station-1');
  const [predictionType, setPredictionType] = useState('daily');

  const stations = Array.from({ length: 40 }, (_, i) => ({
    id: `station-${i + 1}`,
    name: `Monitoring Station ${i + 1}`,
  }));

  // Mock prediction data
  const generatePredictionData = (type: string) => {
    const days = type === 'daily' ? 7 : 30;
    const historicalDays = 14;
    
    return Array.from({ length: historicalDays + days }, (_, i) => {
      const isPrediction = i >= historicalDays;
      const baseValue = 50 + Math.sin(i / 3) * 20;
      const randomVariation = Math.random() * 10 - 5;
      
      return {
        day: i - historicalDays + 1,
        actual: !isPrediction ? baseValue + randomVariation : null,
        predicted: isPrediction ? baseValue + randomVariation + (Math.random() * 5 - 2.5) : null,
        isPrediction,
      };
    });
  };

  const predictionData = generatePredictionData(predictionType);
  
  const predictedValues = predictionData
    .filter(d => d.predicted !== null)
    .map((d, i) => ({
      day: i + 1,
      value: d.predicted?.toFixed(2),
    }));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
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

          <div className="grid lg:grid-cols-3 gap-8 mb-8">
            <Card className="p-6 shadow-medium border-2 lg:col-span-2">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="station-select" className="text-sm font-medium mb-2 block">
                    Select Monitoring Station
                  </Label>
                  <Select value={selectedStation} onValueChange={setSelectedStation}>
                    <SelectTrigger id="station-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {stations.map((station) => (
                        <SelectItem key={station.id} value={station.id}>
                          {station.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-3 block">Prediction Period</Label>
                  <RadioGroup value={predictionType} onValueChange={setPredictionType}>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border-2 border-border hover:border-primary/50 transition-colors">
                      <RadioGroupItem value="daily" id="daily" />
                      <Label htmlFor="daily" className="flex-1 cursor-pointer">
                        Daily Prediction (Next 7 Days)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border-2 border-border hover:border-primary/50 transition-colors">
                      <RadioGroupItem value="weekly" id="weekly" />
                      <Label htmlFor="weekly" className="flex-1 cursor-pointer">
                        Weekly Prediction (Next 30 Days)
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
                  <span className="font-semibold">{predictionType === 'daily' ? '7 Days' : '30 Days'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Model:</span>
                  <span className="font-semibold">LSTM Neural Network</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Confidence:</span>
                  <span className="font-semibold">94.2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Last Updated:</span>
                  <span className="font-semibold">{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-8 shadow-medium border-2 mb-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">
                {predictionType === 'daily' ? 'Daily' : 'Weekly'} Prediction Chart
              </h2>
            </div>
            
            <ResponsiveContainer width="100%" height={450}>
              <LineChart data={predictionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="day" 
                  label={{ value: 'Days', position: 'insideBottom', offset: -5 }}
                />
                <YAxis label={{ value: 'Parameter Value', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <ReferenceLine x={0} stroke="hsl(var(--border))" strokeWidth={2} strokeDasharray="5 5" />
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Historical Data"
                  connectNulls={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="predicted" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Predicted Values"
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Note:</span> The vertical dashed line indicates the present day. 
                Historical data (solid line) shows actual measurements, while predicted values (dashed line) are 
                generated by the LSTM model based on historical patterns.
              </p>
            </div>
          </Card>

          <Card className="p-8 shadow-medium border-2 animate-fade-in">
            <h3 className="text-xl font-bold mb-4">Predicted Values Table</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="text-left p-3 font-semibold">Day</th>
                    <th className="text-left p-3 font-semibold">Predicted Value</th>
                    <th className="text-left p-3 font-semibold">Confidence</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {predictedValues.map((item, index) => (
                    <tr key={index} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-3">Day {item.day}</td>
                      <td className="p-3 font-medium">{item.value}</td>
                      <td className="p-3">
                        {(92 + Math.random() * 6).toFixed(1)}%
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Normal
                        </span>
                      </td>
                    </tr>
                  ))}
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
