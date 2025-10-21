import { useState } from 'react';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { MapPin, Info } from 'lucide-react';
import QualityBadge from '@/components/QualityBadge';

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
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  // Mock stations data with approximate coordinates across India
  const stations: Station[] = [
    { id: 1, name: 'Delhi Station 1', lat: 28.6139, lng: 77.2090, quality: 'Bad', location: 'Delhi NCR' },
    { id: 2, name: 'Mumbai Station 1', lat: 19.0760, lng: 72.8777, quality: 'Medium', location: 'Mumbai' },
    { id: 3, name: 'Bangalore Station 1', lat: 12.9716, lng: 77.5946, quality: 'Good', location: 'Bangalore' },
    { id: 4, name: 'Chennai Station 1', lat: 13.0827, lng: 80.2707, quality: 'Medium', location: 'Chennai' },
    { id: 5, name: 'Kolkata Station 1', lat: 22.5726, lng: 88.3639, quality: 'Bad', location: 'Kolkata' },
    { id: 6, name: 'Hyderabad Station 1', lat: 17.3850, lng: 78.4867, quality: 'Good', location: 'Hyderabad' },
    { id: 7, name: 'Pune Station 1', lat: 18.5204, lng: 73.8567, quality: 'Medium', location: 'Pune' },
    { id: 8, name: 'Ahmedabad Station 1', lat: 23.0225, lng: 72.5714, quality: 'Bad', location: 'Ahmedabad' },
    { id: 9, name: 'Jaipur Station 1', lat: 26.9124, lng: 75.7873, quality: 'Medium', location: 'Jaipur' },
    { id: 10, name: 'Lucknow Station 1', lat: 26.8467, lng: 80.9462, quality: 'Bad', location: 'Lucknow' },
    { id: 11, name: 'Kanpur Station 1', lat: 26.4499, lng: 80.3319, quality: 'Very Bad', location: 'Kanpur' },
    { id: 12, name: 'Nagpur Station 1', lat: 21.1458, lng: 79.0882, quality: 'Medium', location: 'Nagpur' },
    { id: 13, name: 'Indore Station 1', lat: 22.7196, lng: 75.8577, quality: 'Good', location: 'Indore' },
    { id: 14, name: 'Bhopal Station 1', lat: 23.2599, lng: 77.4126, quality: 'Medium', location: 'Bhopal' },
    { id: 15, name: 'Visakhapatnam Station 1', lat: 17.6868, lng: 83.2185, quality: 'Good', location: 'Visakhapatnam' },
    { id: 16, name: 'Patna Station 1', lat: 25.5941, lng: 85.1376, quality: 'Bad', location: 'Patna' },
    { id: 17, name: 'Vadodara Station 1', lat: 22.3072, lng: 73.1812, quality: 'Medium', location: 'Vadodara' },
    { id: 18, name: 'Ghaziabad Station 1', lat: 28.6692, lng: 77.4538, quality: 'Bad', location: 'Ghaziabad' },
    { id: 19, name: 'Ludhiana Station 1', lat: 30.9010, lng: 75.8573, quality: 'Medium', location: 'Ludhiana' },
    { id: 20, name: 'Agra Station 1', lat: 27.1767, lng: 78.0081, quality: 'Bad', location: 'Agra' },
    { id: 21, name: 'Nashik Station 1', lat: 19.9975, lng: 73.7898, quality: 'Good', location: 'Nashik' },
    { id: 22, name: 'Faridabad Station 1', lat: 28.4089, lng: 77.3178, quality: 'Bad', location: 'Faridabad' },
    { id: 23, name: 'Meerut Station 1', lat: 28.9845, lng: 77.7064, quality: 'Medium', location: 'Meerut' },
    { id: 24, name: 'Rajkot Station 1', lat: 22.3039, lng: 70.8022, quality: 'Good', location: 'Rajkot' },
    { id: 25, name: 'Varanasi Station 1', lat: 25.3176, lng: 82.9739, quality: 'Very Bad', location: 'Varanasi' },
    { id: 26, name: 'Srinagar Station 1', lat: 34.0837, lng: 74.7973, quality: 'Excellent', location: 'Srinagar' },
    { id: 27, name: 'Amritsar Station 1', lat: 31.6340, lng: 74.8723, quality: 'Good', location: 'Amritsar' },
    { id: 28, name: 'Allahabad Station 1', lat: 25.4358, lng: 81.8463, quality: 'Bad', location: 'Allahabad' },
    { id: 29, name: 'Ranchi Station 1', lat: 23.3441, lng: 85.3096, quality: 'Medium', location: 'Ranchi' },
    { id: 30, name: 'Howrah Station 1', lat: 22.5958, lng: 88.2636, quality: 'Bad', location: 'Howrah' },
    { id: 31, name: 'Coimbatore Station 1', lat: 11.0168, lng: 76.9558, quality: 'Good', location: 'Coimbatore' },
    { id: 32, name: 'Jodhpur Station 1', lat: 26.2389, lng: 73.0243, quality: 'Medium', location: 'Jodhpur' },
    { id: 33, name: 'Madurai Station 1', lat: 9.9252, lng: 78.1198, quality: 'Good', location: 'Madurai' },
    { id: 34, name: 'Raipur Station 1', lat: 21.2514, lng: 81.6296, quality: 'Medium', location: 'Raipur' },
    { id: 35, name: 'Kota Station 1', lat: 25.2138, lng: 75.8648, quality: 'Bad', location: 'Kota' },
    { id: 36, name: 'Guwahati Station 1', lat: 26.1445, lng: 91.7362, quality: 'Medium', location: 'Guwahati' },
    { id: 37, name: 'Chandigarh Station 1', lat: 30.7333, lng: 76.7794, quality: 'Good', location: 'Chandigarh' },
    { id: 38, name: 'Solapur Station 1', lat: 17.6599, lng: 75.9064, quality: 'Medium', location: 'Solapur' },
    { id: 39, name: 'Hubli Station 1', lat: 15.3647, lng: 75.1240, quality: 'Good', location: 'Hubli' },
    { id: 40, name: 'Mysore Station 1', lat: 12.2958, lng: 76.6394, quality: 'Excellent', location: 'Mysore' },
  ];

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
          <div className="text-center mb-12 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-6 py-2 mb-4">
              <MapPin className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Geographic Monitoring</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-water bg-clip-text text-transparent">
              Interactive Station Map
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Real-time water quality status across ~40 monitoring stations nationwide
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="p-8 shadow-medium border-2 h-[600px] relative overflow-hidden">
                {/* Embedded Map */}
                <iframe
                  src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15282225.79979123!2d73.7250245393691!3d20.750301298393563!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30635ff06b92b791%3A0xd78c4fa1854213a6!2sIndia!5e0!3m2!1sen!2sin!4v1234567890123!5m2!1sen!2sin`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="rounded-lg"
                  title="Water Quality Monitoring Stations Map"
                />
                
                <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm p-3 rounded-lg shadow-medium border">
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

            <div className="lg:col-span-1">
              <Card className="p-6 shadow-medium border-2 sticky top-24">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  All Stations ({stations.length})
                </h3>
                
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-2">
                  {stations.map((station) => (
                    <div
                      key={station.id}
                      onClick={() => setSelectedStation(station)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-soft ${
                        selectedStation?.id === station.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-semibold text-sm">{station.name}</h4>
                          <p className="text-xs text-muted-foreground">{station.location}</p>
                        </div>
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                          style={{ backgroundColor: getMarkerColor(station.quality) }}
                        />
                      </div>
                      <QualityBadge quality={station.quality} className="text-xs px-2 py-1" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          {selectedStation && (
            <Card className="mt-8 p-8 shadow-medium border-2 animate-scale-in">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedStation.name}</h2>
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
