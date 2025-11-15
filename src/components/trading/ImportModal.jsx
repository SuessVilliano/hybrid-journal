import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { X, Upload, FileText, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { parseTradeFile } from '@/utils/tradeParsers';
import ImportResults from './ImportResults';

export default function ImportModal({ onClose }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const queryClient = useQueryClient();

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setImportResult({ status: 'processing', message: 'Processing file...' });

      // Upload file to storage first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Parse the file based on format
      const parseResult = await parseTradeFile(file);
      const { trades: parsedTrades, errors, format } = parseResult;

      setImportResult({
        status: 'parsed',
        format,
        totalParsed: parsedTrades.length,
        errors: errors.length,
        message: `Detected ${format} format. Found ${parsedTrades.length} trades.`
      });

      if (parsedTrades.length === 0) {
        setImportResult({
          status: 'error',
          message: 'No valid trades found in file. Please check the format.',
          errors: errors
        });
        setUploading(false);
        return;
      }

      // Create import record
      const importRecord = await base44.entities.Import.create({
        filename: file.name,
        file_url: file_url,
        platform: format,
        import_type: file.name.endsWith('.html') || file.name.endsWith('.htm') ? 'MT4 Statement' : 'CSV',
        status: 'Processing',
        trades_imported: 0
      });

      // Import trades to database
      setImportResult({
        status: 'importing',
        message: `Importing ${parsedTrades.length} trades...`,
        progress: 0
      });

      const imported = [];
      const failed = [];

      for (let i = 0; i < parsedTrades.length; i++) {
        try {
          const created = await base44.entities.Trade.create(parsedTrades[i]);
          imported.push(created);
          
          // Update progress
          setImportResult({
            status: 'importing',
            message: `Importing trades... ${i + 1}/${parsedTrades.length}`,
            progress: ((i + 1) / parsedTrades.length) * 100
          });
        } catch (error) {
          failed.push({
            trade: parsedTrades[i],
            error: error.message
          });
        }
      }

      // Update import record
      await base44.entities.Import.update(importRecord.id, {
        status: failed.length === 0 ? 'Completed' : 'Completed',
        trades_imported: imported.length,
        error_message: failed.length > 0 ? `${failed.length} trades failed to import` : null
      });

      // Show final results
      setImportResult({
        status: 'complete',
        format,
        imported: imported.length,
        failed: failed.length,
        errors: [...errors, ...failed],
        trades: imported
      });

      queryClient.invalidateQueries(['trades']);
      queryClient.invalidateQueries(['imports']);

    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        status: 'error',
        message: error.message || 'Import failed. Please try again.',
        errors: [{ error: error.message }]
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (importResult?.status === 'complete') {
      queryClient.invalidateQueries(['trades']);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-slate-900">Import Trades</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* File Upload Area */}
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              file ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'
            }`}
          >
            <input
              type="file"
              accept=".csv,.txt,.html,.htm,.xlsx,.xls,.pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              disabled={uploading}
            />
            <label htmlFor="file-upload" className={uploading ? 'cursor-not-allowed' : 'cursor-pointer'}>
              {file ? (
                <div className="space-y-2">
                  <FileText className="h-12 w-12 text-blue-600 mx-auto" />
                  <p className="font-medium text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500">
                    {(file.size / 1024).toFixed(2)} KB
                    {!uploading && ' • Click to change'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 text-slate-400 mx-auto" />
                  <p className="font-medium text-slate-900">Click to upload</p>
                  <p className="text-sm text-slate-500">CSV, TXT, HTML, Excel files</p>
                </div>
              )}
            </label>
          </div>

          {/* Supported Platforms */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              Supported Platforms & Formats
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-slate-700">MetaTrader 4/5 (HTML, CSV)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-slate-700">cTrader (CSV)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-slate-700">DXTrade (CSV)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-slate-700">MatchTrader (CSV)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-slate-700">Tradovate (CSV)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-slate-700">Generic CSV</span>
              </div>
            </div>
          </div>

          {/* Expected Format Guide */}
          <details className="bg-slate-50 rounded-lg">
            <summary className="p-4 cursor-pointer font-medium text-slate-900 hover:bg-slate-100 rounded-lg">
              📋 CSV Column Requirements
            </summary>
            <div className="p-4 pt-0 space-y-2 text-sm text-slate-600">
              <div><strong>Required:</strong> symbol, pnl (or profit)</div>
              <div><strong>Recommended:</strong> entry_date, entry_price, exit_price, side, quantity</div>
              <div><strong>Optional:</strong> stop_loss, take_profit, commission, swap, strategy, notes</div>
              <div className="pt-2 text-xs text-slate-500">
                💡 Column names are flexible - we auto-detect common variations
              </div>
            </div>
          </details>

          {/* Import Results */}
          {importResult && (
            <ImportResults result={importResult} />
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={uploading && importResult?.status === 'importing'}
            >
              {importResult?.status === 'complete' ? 'Close' : 'Cancel'}
            </Button>
            {importResult?.status !== 'complete' && (
              <Button 
                onClick={handleImport} 
                disabled={!file || uploading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    {importResult?.status === 'importing' ? 'Importing...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}