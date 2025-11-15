import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function ImportResults({ result }) {
  if (!result) return null;

  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <h3 className="font-medium text-slate-900 mb-3">Import Summary</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-600">Format Detected:</span>
          <span className="font-medium">{result.format}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Trades Imported:</span>
          <span className="font-medium text-green-600">{result.imported}</span>
        </div>
        {result.failed > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-600">Failed:</span>
            <span className="font-medium text-red-600">{result.failed}</span>
          </div>
        )}
      </div>
    </div>
  );
}