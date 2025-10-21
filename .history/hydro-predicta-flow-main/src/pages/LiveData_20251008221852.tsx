import { useState } from 'react';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Database, Loader2, Download, Search, Clock } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const LiveData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [data, setData] = useState<any[]>([]);

  const handleFetch = async () => {
    setIsLoading(true);
    toast.info('Scraping CPCB data...');

    // Simulate data fetching
    setTimeout(() => {
      const mockData = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        station: `Station ${i + 1}`,
        location: `Location ${i + 1}`,
        bod: (Math.random() * 50).toFixed(2),
        cod: (Math.random() * 200).toFixed(2),
        ph: (6 + Math.random() * 2).toFixed(1),
        dissolvedOxygen: (Math.random() * 10).toFixed(2),
        temperature: (15 + Math.random() * 15).toFixed(1),
        timestamp: new Date().toISOString(),
      }));
      
      setData(mockData);
      setLastFetch(new Date());
      setIsLoading(false);
      toast.success('Data fetched successfully!');
    }, 2500);
  };

  const handleDownload = () => {
    if (data.length === 0) {
      toast.error('No data to download');
      return;
    }

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `water-data-${new Date().toISOString()}.csv`;
    a.click();
    toast.success('Dataset downloaded!');
  };

  const filteredData = data.filter(
    (row) =>
      row.station.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-6 py-2 mb-4">
              <Database className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Real-Time Data</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-water bg-clip-text text-transparent">
              Live CPCB Data Scraping
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Fetch and analyze real-time water quality data from CPCB monitoring stations
            </p>
          </div>

          <Card className="p-8 shadow-medium border-2 mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <Button
                onClick={handleFetch}
                disabled={isLoading}
                size="lg"
                className="bg-gradient-water hover:opacity-90 transition-opacity shadow-medium w-full md:w-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Fetching Data...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-5 w-5" />
                    Fetch Latest Water Parameters Data
                  </>
                )}
              </Button>

              {lastFetch && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Last fetched: {lastFetch.toLocaleString()}
                </div>
              )}
            </div>
          </Card>

          {data.length > 0 && (
            <Card className="p-8 shadow-medium border-2 animate-fade-in">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
                <h2 className="text-2xl font-bold">Dataset ({data.length} records)</h2>
                
                <div className="flex gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search station or location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleDownload} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Download CSV
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Station</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>BOD (mg/L)</TableHead>
                      <TableHead>COD (mg/L)</TableHead>
                      <TableHead>pH</TableHead>
                      <TableHead>DO (mg/L)</TableHead>
                      <TableHead>Temp (°C)</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{row.station}</TableCell>
                        <TableCell>{row.location}</TableCell>
                        <TableCell>{row.bod}</TableCell>
                        <TableCell>{row.cod}</TableCell>
                        <TableCell>{row.ph}</TableCell>
                        <TableCell>{row.dissolvedOxygen}</TableCell>
                        <TableCell>{row.temperature}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(row.timestamp).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredData.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No results found for "{searchQuery}"
                </div>
              )}
            </Card>
          )}

          {data.length === 0 && !isLoading && (
            <Card className="p-12 text-center border-2 border-dashed">
              <Database className="h-20 w-20 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-lg text-muted-foreground">
                Click the button above to fetch the latest water quality data from CPCB
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveData;
