import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function Imports() {
  const { data: imports = [], isLoading } = useQuery({
    queryKey: ['imports'],
    queryFn: () => base44.entities.Import.list('-created_date', 100)
  });

  const statusConfig = {
    'Pending': { icon: Clock, color: 'bg-yellow-100 text-yellow-700', iconColor: 'text-yellow-600' },
    'Processing': { icon: Clock, color: 'bg-blue-100 text-blue-700', iconColor: 'text-blue-600' },
    'Completed': { icon: CheckCircle, color: 'bg-green-100 text-green-700', iconColor: 'text-green-600' },
    'Failed': { icon: XCircle, color: 'bg-red-100 text-red-700', iconColor: 'text-red-600' }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Import History</h1>
          <p className="text-slate-600 mt-1">Track all your trade imports</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : imports.length === 0 ? (
          <Card className="p-12 text-center">
            <Upload className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No imports yet</h3>
            <p className="text-slate-600">
              Import trades from your trading platform to get started
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {imports.map((imp) => {
              const config = statusConfig[imp.status] || statusConfig['Pending'];
              const Icon = config.icon;

              return (
                <Card key={imp.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-full ${config.color.replace('text-', 'bg-').replace('-700', '-100')} flex items-center justify-center`}>
                          <Icon className={`h-6 w-6 ${config.iconColor}`} />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-slate-900">{imp.filename}</h3>
                            <Badge className={config.color}>{imp.status}</Badge>
                            {imp.platform && <Badge variant="outline">{imp.platform}</Badge>}
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                            <span>Type: {imp.import_type}</span>
                            {imp.trades_imported > 0 && (
                              <span className="text-green-600 font-medium">
                                ✓ {imp.trades_imported} trades imported
                              </span>
                            )}
                            <span>{format(new Date(imp.created_date), 'MMM dd, yyyy HH:mm')}</span>
                          </div>

                          {imp.error_message && (
                            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                              {imp.error_message}
                            </div>
                          )}
                        </div>
                      </div>

                      {imp.file_url && (
                        <a 
                          href={imp.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View File
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}