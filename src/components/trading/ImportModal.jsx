import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { X, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function ImportModal({ onClose }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const queryClient = useQueryClient();

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setStatus({ type: 'loading', message: 'Uploading file...' });

      // Upload file to Base44 storage
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Create import record
      await base44.entities.Import.create({
        filename: file.name,
        file_url: file_url,
        import_type: file.name.endsWith('.csv') ? 'CSV' : 
                     file.name.endsWith('.xlsx') ? 'Excel' : 'PDF',
        status: 'Pending'
      });

      // For CSV files, try to parse and import trades
      if (file.name.endsWith('.csv')) {
        setStatus({ type: 'loading', message: 'Parsing trades...' });
        
        const text = await file.text();
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const trades = [];
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const values = lines[i].split(',');
          const trade = {};
          
          headers.forEach((header, index) => {
            const value = values[index]?.trim();
            if (!value) return;
            
            // Map common CSV headers to our schema
            if (header.includes('symbol') || header.includes('instrument')) {
              trade.symbol = value;
            } else if (header.includes('side') || header.includes('direction')) {
              trade.side = value.toLowerCase().includes('short') ? 'Short' : 'Long';
            } else if (header.includes('entry') && header.includes('price')) {
              trade.entry_price = parseFloat(value);
            } else if (header.includes('exit') && header.includes('price')) {
              trade.exit_price = parseFloat(value);
            } else if (header.includes('quantity') || header.includes('lots') || header.includes('volume')) {
              trade.quantity = parseFloat(value);
            } else if (header.includes('profit') || header.includes('pnl')) {
              trade.pnl = parseFloat(value);
            } else if (header.includes('entry') && (header.includes('date') || header.includes('time'))) {
              trade.entry_date = new Date(value).toISOString();
            } else if (header.includes('exit') && (header.includes('date') || header.includes('time'))) {
              trade.exit_date = new Date(value).toISOString();
            }
          });
          
          if (trade.symbol && trade.pnl !== undefined) {
            trade.import_source = 'CSV Import';
            trade.platform = trade.platform || 'Other';
            trades.push(trade);
          }
        }
        
        if (trades.length > 0) {
          setStatus({ type: 'loading', message: `Importing ${trades.length} trades...` });
          
          for (const trade of trades) {
            await base44.entities.Trade.create(trade);
          }
          
          setStatus({ 
            type: 'success', 
            message: `Successfully imported ${trades.length} trades!` 
          });
          
          queryClient.invalidateQueries(['trades']);
          
          setTimeout(() => {
            onClose();
          }, 2000);
        } else {
          setStatus({ 
            type: 'error', 
            message: 'No valid trades found in CSV. Check column names match expected format.' 
          });
        }
      } else {
        setStatus({ 
          type: 'success', 
          message: 'File uploaded! Manual review required for non-CSV files.' 
        });
        setTimeout(() => onClose(), 2000);
      }
    } catch (error) {
      console.error('Import error:', error);
      setStatus({ 
        type: 'error', 
        message: error.message || 'Import failed. Please try again.' 
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">Import Trades</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
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
              accept=".csv,.xlsx,.xls,.pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {file ? (
                <div className="space-y-2">
                  <FileText className="h-12 w-12 text-blue-600 mx-auto" />
                  <p className="font-medium text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500">Click to change file</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 text-slate-400 mx-auto" />
                  <p className="font-medium text-slate-900">Click to upload</p>
                  <p className="text-sm text-slate-500">CSV, Excel, or PDF files</p>
                </div>
              )}
            </label>
          </div>

          {/* Expected CSV Format */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="font-medium text-slate-900 mb-2">Expected CSV Columns:</h3>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• <span className="font-medium">symbol</span> - Trading symbol (required)</li>
              <li>• <span className="font-medium">side</span> - Long or Short</li>
              <li>• <span className="font-medium">entry_price, exit_price</span> - Prices</li>
              <li>• <span className="font-medium">quantity</span> - Position size</li>
              <li>• <span className="font-medium">pnl</span> - Profit/Loss (required)</li>
              <li>• <span className="font-medium">entry_date, exit_date</span> - Timestamps</li>
            </ul>
          </div>

          {/* Status Message */}
          {status && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              status.type === 'success' ? 'bg-green-50 text-green-800' :
              status.type === 'error' ? 'bg-red-50 text-red-800' :
              'bg-blue-50 text-blue-800'
            }`}>
              {status.type === 'success' && <CheckCircle className="h-5 w-5" />}
              {status.type === 'error' && <AlertCircle className="h-5 w-5" />}
              {status.type === 'loading' && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
              )}
              <p className="text-sm font-medium">{status.message}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!file || uploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploading ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}