import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { MapPin, Info, Loader2, Hash } from 'lucide-react'; // Import Hash icon
import QualityBadge from '@/components/QualityBadge';
import { toast } from 'sonner';

type QualityLevel = 'Excellent' | 'Good' | 'Medium' | 'Bad' | 'Very Bad';

interface Station {
  id: number;
  name: string;
  lat: number;
  lng: number;
  quality: QualityLevel;
  location: string;
}

const MapView = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch('http://localhost:5000/api/stations')
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => { throw new Error(err.error || 'Failed to fetch stations') });
        }
        return res.json();
      })
      .then((data: Station[]) => {
        if (!data || data.length === 0) {
          toast.warning("No station data found from backend.");
          setStations([]);
          return;
        }
        setStations(data);
        if (data.length > 0) {
          setSelectedStation(data[0]);
        }
      })
      .catch(err => {
        console.error("Failed to fetch stations:", err);
        toast.error(err.message || "Failed to load station data from backend.");
        setStations([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const getMarkerColor = (quality: QualityLevel) => {
    switch (quality) {
      case 'Excellent': return '#059669';
      case 'Good': return '#10b981';
      case 'Medium': return '#f59e0b';
      case 'Bad': return '#f97316';
      case 'Very Bad': return '#dc2626';
      default: return '#6b7280';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Header Text */}
          <div className="text-center mb-12 animate-fade-in-up">
            {/* ... (Header text unchanged) ... */}
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-6 py-2 mb-4">
              <MapPin className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Geographic Monitoring</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-water bg-clip-text text-transparent">
              Interactive Station Map
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Real-time water quality status across monitoring stations nationwide
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Map Section */}
            <div className="lg:col-span-2">
              <Card className="p-8 shadow-medium border-2 h-[600px] relative overflow-hidden">
                {/* Placeholder Map */}
                <iframe
                  src={selectedStation
                       ? `https://maps.google.com/maps?q=${selectedStation.lat},${selectedStation.lng}&hl=en&z=12&output=embed` // Correct Google Maps Embed URL
                       : `https://maps.google.com/maps?q=India&hl=en&z=5&output=embed`} // Overview of India
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="rounded-lg"
                  title="Water Quality Monitoring Stations Map"
                />
                {/* Legend */}
                <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm p-3 rounded-lg shadow-medium border">
                  {/* ... (Legend unchanged) ... */}
                   <div className="flex items-center gap-2 mb-2">
                     <Info className="h-4 w-4 text-primary" />
                     <span className="text-sm font-semibold">Map Legend</span>
                   </div>
                   <div className="space-y-1 text-xs">
                     <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getMarkerColor('Excellent') }} />
                       <span>Excellent</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getMarkerColor('Good') }} />
                       <span>Good</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getMarkerColor('Medium') }} />
                       <span>Medium</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getMarkerColor('Bad') }} />
                       <span>Bad</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getMarkerColor('Very Bad') }} />
                       <span>Very Bad</span>
                     </div>
                   </div>
                </div>
              </Card>
            </div>

            {/* Station List Sidebar */}
            <div className="lg:col-span-1">
              <Card className="p-6 shadow-medium border-2 sticky top-24">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  All Stations ({isLoading ? '...' : stations.length})
                </h3>

                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-2">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : stations.length > 0 ? (
                    stations.map((station) => (
                      <div
                        key={station.id}
                        onClick={() => setSelectedStation(station)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-soft ${
                          selectedStation?.id === station.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div>
                            {/* --- (MODIFIED) Show ID next to name --- */}
                            <h4 className="font-semibold text-sm">{`${station.name} (#${station.id})`}</h4>
                            <p className="text-xs text-muted-foreground">{station.location}</p>
                          </div>
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getMarkerColor(station.quality) }}
                          />
                        </div>
                         <QualityBadge quality={station.quality} className="text-xs px-2 py-0.5" />
                      </div>
                    ))
                  ) : (
                     <p className="text-center text-muted-foreground py-10">No stations found.</p>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Selected Station Details */}
          {selectedStation && (
            <Card className="mt-8 p-8 shadow-medium border-2 animate-scale-in">
              <div className="flex items-start justify-between mb-6">
                <div>
                  {/* --- (MODIFIED) Show ID in details header --- */}
                  <h2 className="text-2xl font-bold mb-2">{selectedStation.name} (#{selectedStation.id})</h2>
                  <p className="text-muted-foreground">{selectedStation.location}</p>
                </div>
                <QualityBadge quality={selectedStation.quality} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Coordinates</p>
                  <p className="font-mono font-medium">
                    {selectedStation.lat.toFixed(4)}°N, {selectedStation.lng.toFixed(4)}°E
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
                  <p className="font-medium">{new Date().toLocaleString()}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapView;