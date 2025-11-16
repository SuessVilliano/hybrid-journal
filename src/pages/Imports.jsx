import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Upload, FileText, CheckCircle, XCircle, Clock, Plus, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import ImportModal from '@/components/trading/ImportModal';
import ImportVisualization from '@/components/trading/ImportVisualization';

export default function Imports() {
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedImport, setSelectedImport] = useState(null);

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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Import Trades</h1>
            <p className="text-slate-600 mt-1">Import and analyze trades from any platform</p>
          </div>
          <Button 
            onClick={() => setShowImportModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Import Trades
          </Button>
        </div>

        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 mb-2">Supported File Types</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-slate-700">
                  <div>✓ MetaTrader 4/5 (CSV, HTML)</div>
                  <div>✓ cTrader (CSV)</div>
                  <div>✓ DXTrade (CSV)</div>
                  <div>✓ MatchTrader (CSV)</div>
                  <div>✓ Tradovate (CSV)</div>
                  <div>✓ Generic CSV</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedImport && (
          <ImportVisualization 
            importRecord={selectedImport}
            onClose={() => setSelectedImport(null)}
          />
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : imports.length === 0 ? (
          <Card className="p-12 text-center">
            <Upload className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No imports yet</h3>
            <p className="text-slate-600 mb-4">
              Import trades from your trading platform to get started
            </p>
            <Button 
              onClick={() => setShowImportModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Your First Trades
            </Button>
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

                      <div className="flex gap-2">
                        {imp.status === 'Completed' && imp.trades_imported > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedImport(imp)}
                          >
                            <BarChart3 className="h-4 w-4 mr-1" />
                            View Analysis
                          </Button>
                        )}
                        {imp.file_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                          >
                            <a href={imp.file_url} target="_blank" rel="noopener noreferrer">
                              View File
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {showImportModal && (
          <ImportModal onClose={() => setShowImportModal(false)} />
        )}
      </div>
    </div>
  );
}