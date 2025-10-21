import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Database, Loader2, Download, Search, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Define a type for the data row
interface ScrapedDataRow {
  stationId: string | number; // ID from DB/CSV
  stationName?: string; // Name from CSV merge
  location?: string; // State from CSV merge
  timestamp?: string | null; // Formatted timestamp from DB
  // Add other known parameter keys if possible for better type safety
  bod?: number | string | null;
  cod?: number | string | null;
  ph?: number | string | null;
  dissolvedOxygen?: number | string | null;
  temperature?: number | string | null;
  // Allow for any other columns from the DB
  [key: string]: any;
}

const LiveData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastFetch, setLastFetch] = useState<Date | null>(null); // Store timestamp from backend
  const [data, setData] = useState<ScrapedDataRow[]>([]);
  const [tableHeaders, setTableHeaders] = useState<string[]>([]);

  // Function to determine table headers dynamically
  const updateTableHeaders = (fetchedData: ScrapedDataRow[]) => {
      if (fetchedData.length > 0) {
          const allKeys = Object.keys(fetchedData[0]);
          // Define a preferred order, matching backend logic
          const preferredOrder = [
              'stationId', 'stationName', 'location', 'timestamp',
              'bod', 'cod', 'ph', 'dissolvedOxygen', 'temperature' // Add other key params if needed
          ];
          // Filter keys: preferred first, then others, exclude internal/duplicate keys
          const excludedKeys = ['id', 'timestampDate']; // Keys to definitely exclude
          const sortedHeaders = [
              ...preferredOrder.filter(key => allKeys.includes(key)),
              ...allKeys.filter(key => !preferredOrder.includes(key) && !excludedKeys.includes(key)).sort() // Sort remaining alphabetically
          ];
          setTableHeaders(sortedHeaders);
      } else {
          setTableHeaders([]); // Clear headers if no data
      }
  };

  // Function to fetch latest data from the database via the backend
  const handleFetch = async () => {
    setIsLoading(true);
    setData([]);
    setTableHeaders([]);
    toast.info('Fetching latest records from database...');

    try {
        const response = await fetch('http://localhost:5000/api/latest-cpcb-data');

        if (!response.ok) {
            let errorMsg = `Failed to fetch data: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (jsonError) {/* Ignore if response wasn't JSON */}
            throw new Error(errorMsg);
        }

        const result = await response.json();
        const fetchedData: ScrapedDataRow[] = result.data;
        const fetchedTimestamp: string | null = result.last_fetched; // Backend sends current server time

        if (!fetchedData || fetchedData.length === 0) {
            toast.warning('No records found in the database.');
            setData([]);
        } else {
            setData(fetchedData);
            updateTableHeaders(fetchedData); // Determine headers
            if (fetchedTimestamp) {
                setLastFetch(new Date(fetchedTimestamp)); // Use timestamp from backend
                toast.success(`Loaded ${fetchedData.length} latest station records!`);
            } else {
                setLastFetch(null);
                toast.success(`Loaded ${fetchedData.length} records! (Timestamp unknown)`);
            }
        }
    } catch (error) {
        console.error("Fetch latest DB data error:", error);
        toast.error(error instanceof Error ? error.message : 'An unknown error occurred.');
        setData([]); // Clear data on error
    } finally {
        setIsLoading(false);
    }
  };

  // Function to handle CSV download
  const handleDownload = () => {
    if (data.length === 0 || tableHeaders.length === 0) {
      toast.error('No data to download'); return;
    }
    const csvHeader = tableHeaders.join(',');
    const csvRows = data.map(row =>
        tableHeaders.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            // Quote values containing commas or quotes
            return stringValue.includes(',') || stringValue.includes('"') ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
        }).join(',')
    );

    const csv = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    // Use the fetch timestamp (or current date if null) in filename
    const dateSuffix = lastFetch ? lastFetch.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    a.download = `cpcb-db-latest-${dateSuffix}.csv`;
    a.click(); window.URL.revokeObjectURL(url); // Clean up blob URL
    toast.success('Dataset download started!');
  };

  // Filter data based on search query across all displayed columns
  const filteredData = data.filter(row => {
      if (!searchQuery) return true;
      return tableHeaders.some(header => {
          const value = row[header];
          return value !== null && value !== undefined &&
                 String(value).toLowerCase().includes(searchQuery.toLowerCase());
      });
  });

  // Helper to format table headers (e.g., add spaces before capitals)
  const formatHeader = (header: string) => header.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-6 py-2 mb-4">
                <Database className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-primary">Database Data</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-water bg-clip-text text-transparent">
                Latest Database Records
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                View the most recent record for each station stored in the database.
            </p>
          </div>

          {/* Fetch Button Card */}
          <Card className="p-8 shadow-medium border-2 mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <Button onClick={handleFetch} disabled={isLoading} size="lg" className="bg-gradient-water hover:opacity-90 transition-opacity shadow-medium w-full md:w-auto">
                {isLoading ? ( <> <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading Data... </> )
                           : ( <> <Database className="mr-2 h-5 w-5" /> Load Latest DB Records </> )}
              </Button>
              {lastFetch && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" /> Data retrieved: {lastFetch.toLocaleString()}
                </div>
              )}
            </div>
          </Card>

          {/* Data Table Card (only shown if data exists) */}
          {data.length > 0 && (
            <Card className="p-8 shadow-medium border-2 animate-fade-in">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
                <h2 className="text-2xl font-bold">Latest Records ({data.length} stations)</h2>
                <div className="flex gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search dataset..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                  </div>
                  <Button onClick={handleDownload} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" /> Download CSV
                  </Button>
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/60">
                       {tableHeaders.map((header) => (
                           <TableHead key={header} style={{ whiteSpace: 'nowrap' }}>{formatHeader(header)}</TableHead>
                       ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row, rowIndex) => (
                      <TableRow key={row.stationId || rowIndex} className="hover:bg-muted/30">
                        {tableHeaders.map((header) => (
                          <TableCell key={header} className={header === 'stationName' ? 'font-medium' : 'text-sm'} style={{ whiteSpace: 'nowrap' }}>
                              {/* Format specific columns like timestamp or numbers if needed */}
                              {header === 'timestamp' && row[header]
                                  ? new Date(row[header] as string).toLocaleString()
                                  // Add formatting for numeric columns if desired (e.g., toFixed(2))
                                  // : typeof row[header] === 'number' ? (row[header] as number).toFixed(2)
                                  : (row[header] !== null && row[header] !== undefined ? String(row[header]) : 'N/A')
                              }
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* No Results Message */}
              {filteredData.length === 0 && searchQuery && (
                <div className="text-center py-12 text-muted-foreground">
                    No results found for "{searchQuery}"
                </div>
              )}
            </Card>
          )}

          {/* Initial State / No Data Message */}
          {data.length === 0 && !isLoading && (
            <Card className="p-12 text-center border-2 border-dashed">
              <Database className="h-20 w-20 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-lg text-muted-foreground">
                Click the button above to load the latest records from the database.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveData;