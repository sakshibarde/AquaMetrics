

import { useState } from 'react';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import QualityBadge from '@/components/QualityBadge';
import { Loader2, Droplet, AlertCircle, CheckCircle2, Percent } from 'lucide-react';
import { toast } from 'sonner';

// --- (NEW) Define the API response types ---
type QualityLevel = 'Excellent' | 'Good' | 'Medium' | 'Bad' | 'Very Bad';

interface AnalysisResult {
  status: 'success' | 'error';
  class: QualityLevel;
  insights: string;
  probabilities: Record<string, number>;
  message?: string; // For errors
}
// ------------------------------------------

const Classification = () => {
  const [isLoading, setIsLoading] = useState(false);
  // --- (MODIFIED) Store the full API response ---
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // --- (MODIFIED) Added 'backendName' to match your Python model ---
  const parameters = [
    { name: 'bod', label: 'Biochemical Oxygen Demand (mg/L)', backendName: 'Biochemical Oxygen Demand', min: 0, max: 100 },
    { name: 'cod', label: 'Chemical Oxygen Demand (mg/L)', backendName: 'Chemical Oxygen Demand', min: 0, max: 500 },
    { name: 'chloride', label: 'Chloride (mg/L)', backendName: 'Chloride', min: 0, max: 1000 },
    { name: 'conductivity', label: 'Conductivity (μS/cm)', backendName: 'Conductivity', min: 0, max: 5000 },
    { name: 'depth', label: 'Depth (m)', backendName: 'Depth', min: 0, max: 50 },
    { name: 'dissolvedOxygen', label: 'Dissolved Oxygen (mg/L)', backendName: 'Dissolved Oxygen', min: 0, max: 20 },
    { name: 'nitrate', label: 'Nitrate (mg/L)', backendName: 'Nitrate', min: 0, max: 100 },
    { name: 'toc', label: 'Total Organic Carbon (mg/L)', backendName: 'Total Organic Carbon', min: 0, max: 50 },
    { name: 'waterLevel', label: 'Water Level (m)', backendName: 'Water Level', min: 0, max: 100 },
    { name: 'temperature', label: 'Water Temperature (°C)', backendName: 'Water Temperature', min: 0, max: 50 },
    { name: 'turbidity', label: 'Water Turbidity (NTU)', backendName: 'Water Turbidity', min: 0, max: 1000 },
    { name: 'ph', label: 'pH', backendName: 'pH', min: 0, max: 14, step: 0.1 },
  ];

  const [formData, setFormData] = useState<Record<string, string>>(
    parameters.reduce((acc, param) => ({ ...acc, [param.name]: '' }), {})
  );

  // --- (MODIFIED) This now calls your real backend ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null); // Clear previous results

    // 1. Build the payload with the correct backend names
    const payload: Record<string, number> = {};
    for (const param of parameters) {
      if (formData[param.name] === '') {
         toast.error(`Please fill in ${param.label}`);
         setIsLoading(false);
         return;
      }
      payload[param.backendName] = parseFloat(formData[param.name]);
    }

    // 2. Make the API call
    try {
      const response = await fetch('http://localhost:5000/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data: AnalysisResult = await response.json();

      if (!response.ok) {
        // Handle backend errors (e.g., validation)
        throw new Error(data.message || 'An error occurred during analysis.');
      }
      
      // 3. Set the result from the API
      setResult(data);
      toast.success('Water quality analysis complete!');

    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error(error.message || 'Failed to connect to the backend.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // --- (MODIFIED) This helper gets UI details. The insight text comes from the backend ---
  const getQualityUI = (quality: QualityLevel) => {
    switch (quality) {
      case 'Excellent':
        return { icon: CheckCircle2, color: 'text-emerald-600', title: 'Excellent Quality' };
      case 'Good':
        return { icon: CheckCircle2, color: 'text-green-600', title: 'Good Quality' };
      case 'Medium':
        return { icon: AlertCircle, color: 'text-yellow-600', title: 'Medium Quality' };
      case 'Bad':
        return { icon: AlertCircle, color: 'text-orange-600', title: 'Bad Quality' };
      case 'Very Bad':
        return { icon: AlertCircle, color: 'text-red-600', title: 'Very Bad Quality' };
    }
  };
  
  // Helper to format probabilities
  const sortedProbabilities = result?.probabilities 
    ? Object.entries(result.probabilities).sort(([,a], [,b]) => b - a) 
    : [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-6 py-2 mb-4">
              <Droplet className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Analysis</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-water bg-clip-text text-transparent">
              Water Quality Classification
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Enter water parameters for instant AI-driven quality assessment
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="p-8 shadow-medium border-2">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {parameters.map((param) => (
                      <div key={param.name} className="space-y-2">
                        <Label htmlFor={param.name} className="text-sm font-medium">
                          {param.label}
                        </Label>
                        <Input
                          id={param.name}
                          type="number"
                          min={param.min}
                          max={param.max}
                          step={param.step || "any"}
                          value={formData[param.name]}
                          onChange={(e) => handleInputChange(param.name, e.target.value)}
                          required
                          className="transition-all duration-200 focus:ring-2 focus:ring-primary"
                          placeholder={`${param.min} - ${param.max}`}
                        />
                      </div>
                    ))}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-water hover:opacity-90 transition-opacity text-lg py-6 shadow-medium"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Analyzing Water Quality...
                      </>
                    ) : (
                      'Analyze Water Quality'
                    )}
                  </Button>
                </form>
              </Card>
            </div>

            <div className="lg:col-span-1">
              {/* --- (MODIFIED) This section now reads the full result object --- */}
              {result && result.status === 'success' ? (
                <Card className="p-8 shadow-medium border-2 animate-scale-in sticky top-24">
                  <h3 className="text-2xl font-bold mb-6 text-center">Analysis Result</h3>
                  
                  <div className="flex justify-center mb-6">
                    <QualityBadge quality={result.class} className="text-lg px-6 py-3" />
                  </div>

                  {(() => {
                    const ui = getQualityUI(result.class);
                    const Icon = ui.icon;
                    return (
                      <div className="space-y-6">
                        {/* Use the Insight from the backend */}
                        <div className={`flex items-start gap-3 p-4 rounded-lg bg-muted/50`}>
                          <Icon className={`h-6 w-6 mt-0.5 flex-shrink-0 ${ui.color}`} />
                          <div>
                            <h4 className="font-semibold mb-1">{ui.title}</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {result.insights}
                            </p>
                          </div>
                        </div>

                        {/* --- (NEW) Display Probabilities --- */}
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center">
                            <Percent className="h-4 w-4 mr-2" />
                            Model Confidence
                          </h4>
                          <ul className="space-y-2">
                            {sortedProbabilities.map(([name, prob]) => (
                              <li key={name} className="text-sm">
                                <div className="flex justify-between items-center mb-1">
                                  <span>{name}</span>
                                  <span className="font-medium text-muted-foreground">
                                    {(prob * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-1.5">
                                  <div 
                                    className="bg-primary h-1.5 rounded-full" 
                                    style={{ width: `${prob * 100}%` }}
                                  ></div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>

                      </div>
                    );
                  })()}
                </Card>
              ) : (
                <Card className="p-8 shadow-medium border-2 border-dashed sticky top-24">
                  <div className="text-center text-muted-foreground">
                    <Droplet className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-sm">
                      Fill in the water parameters and click "Analyze" to see the quality classification
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Classification;