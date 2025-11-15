import React from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ImportResults({ result }) {
  if (!result) return null;

  const { status, message, format, totalParsed, imported, failed, errors, progress } = result;

  if (status === 'processing' || status === 'parsed') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-blue-900">{message}</p>
          {format && (
            <p className="text-sm text-blue-700 mt-1">Format: {format}</p>
          )}
        </div>
      </div>
    );
  }

  if (status === 'importing') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mt-0.5" />
          <p className="font-medium text-blue-900">{message}</p>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress || 0}%` }}
          />
        </div>
      </div>
    );
  }

  if (status === 'complete') {
    const hasErrors = errors && errors.length > 0;
    
    return (
      <div className="space-y-4">
        <div className={`${hasErrors ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
          <div className="flex items-start gap-3">
            {hasErrors ? (
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-medium text-slate-900 mb-2">
                {hasErrors ? 'Import Completed with Warnings' : 'Import Successful!'}
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <Badge className="bg-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {imported} imported
                </Badge>
                {format && <Badge variant="outline">{format}</Badge>}
                {failed > 0 && (
                  <Badge className="bg-red-600">
                    {failed} failed
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {hasErrors && (
          <details className="bg-slate-50 border border-slate-200 rounded-lg">
            <summary className="p-4 cursor-pointer font-medium text-slate-900 hover:bg-slate-100 rounded-lg">
              ⚠️ View Errors & Warnings ({errors.length})
            </summary>
            <div className="p-4 pt-0 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {errors.slice(0, 20).map((err, idx) => (
                  <div key={idx} className="text-sm p-3 bg-red-50 border border-red-200 rounded">
                    {err.line && <div className="font-medium text-red-900">Line {err.line}</div>}
                    <div className="text-red-700">{err.error || JSON.stringify(err)}</div>
                  </div>
                ))}
                {errors.length > 20 && (
                  <p className="text-sm text-slate-500 italic">
                    ... and {errors.length - 20} more errors
                  </p>
                )}
              </div>
            </div>
          </details>
        )}

        {!hasErrors && (
          <div className="bg-white border border-green-200 rounded-lg p-4">
            <p className="text-sm text-slate-700">
              ✅ All trades imported successfully. You can now view them in your trade journal.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-900 mb-2">{message}</p>
            {errors && errors.length > 0 && (
              <div className="mt-3 space-y-1">
                {errors.slice(0, 5).map((err, idx) => (
                  <div key={idx} className="text-sm text-red-700">
                    {err.line && `Line ${err.line}: `}{err.error}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 text-sm text-red-700">
              💡 Try checking your file format or use the Generic CSV format with required columns.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}