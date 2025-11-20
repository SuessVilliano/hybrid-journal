import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ExportMenu({ trades, stats }) {
  const [exporting, setExporting] = useState(false);

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const prompt = `Generate a professional PDF trading performance report with the following data:

Total Trades: ${stats.totalTrades}
Win Rate: ${stats.winRate.toFixed(1)}%
Total P&L: $${stats.totalPnl.toFixed(2)}
Profit Factor: ${stats.profitFactor.toFixed(2)}
Average Win: $${stats.avgWin.toFixed(2)}
Average Loss: $${stats.avgLoss.toFixed(2)}
Winning Trades: ${stats.winningTrades}
Losing Trades: ${stats.losingTrades}

Create a well-formatted HTML document with professional styling, charts description, and summary that can be saved as PDF.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      // Create blob and download
      const blob = new Blob([result], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trading-report-${new Date().toISOString().split('T')[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Symbol', 'Side', 'Entry', 'Exit', 'Quantity', 'P&L', 'Commission', 'Platform'];
    const rows = trades.map(t => [
      new Date(t.entry_date).toLocaleDateString(),
      t.symbol,
      t.side,
      t.entry_price,
      t.exit_price || '',
      t.quantity || '',
      t.pnl,
      t.commission || 0,
      t.platform || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={exportToCSV}
        className="flex items-center gap-2"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Export CSV
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={exportToPDF}
        disabled={exporting}
        className="flex items-center gap-2"
      >
        {exporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        Export Report
      </Button>
    </div>
  );
}