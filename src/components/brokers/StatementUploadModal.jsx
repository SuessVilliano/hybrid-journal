import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function StatementUploadModal({ isOpen, onClose, connectionId, provider }) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState('');

  // Internal journal accounts — imported trades are stamped with the selected
  // account_id so the Accounts page includes them in balance/win-rate stats.
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Process statement ingest
      const result = await base44.functions.invoke('statementIngest', {
        fileUrl: file_url,
        connectionId,
        provider,
        accountId: selectedAccount || undefined
      });

      toast.success(
        `Import complete: ${result.data.tradesCreated} new, ${result.data.tradesUpdated} updated, ${result.data.tradesSkipped} skipped`
      );

      setFile(null);
      onClose();
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Trade Statement</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Import to journal account — trades are stamped with this id */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Import to Account
            </label>
            <Select value={selectedAccount || ''} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Select account..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                    {acc.account_number && ` — #${acc.account_number}`}
                    {acc.account_type && ` (${acc.account_type})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {accounts.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ No accounts found. Create an account first on the Accounts page so imported trades count in your stats.
              </p>
            )}
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
            <input
              type="file"
              id="statement-file"
              className="hidden"
              accept=".csv,.pdf,.html,.xlsx"
              onChange={handleFileChange}
            />
            <label htmlFor="statement-file" className="cursor-pointer">
              <Upload className="h-12 w-12 mx-auto mb-4 text-slate-400" />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-cyan-600" />
                  <p className="text-sm font-medium">{file.name}</p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium mb-1">Click to upload statement</p>
                  <p className="text-xs text-slate-500">CSV, PDF, HTML, or Excel</p>
                </>
              )}
            </label>
          </div>

          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-cyan-600 shrink-0 mt-0.5" />
              <div className="text-sm text-slate-700">
                <p className="font-medium mb-1">Supported Formats</p>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>• Standard broker CSV exports</li>
                  <li>• MT4/MT5 account history</li>
                  <li>• PDF trade confirmations</li>
                  <li>• Excel spreadsheets</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600"
            >
              {uploading ? 'Uploading...' : 'Import Trades'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}