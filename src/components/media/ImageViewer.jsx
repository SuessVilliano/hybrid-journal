import React from 'react';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ImageViewer({ imageUrl, onClose }) {
  const [zoom, setZoom] = React.useState(1);
  const darkMode = document.documentElement.classList.contains('dark');

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `chart-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
          variant="outline"
          size="icon"
          className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => setZoom(Math.min(3, zoom + 0.25))}
          variant="outline"
          size="icon"
          className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          onClick={handleDownload}
          variant="outline"
          size="icon"
          className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''}
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          onClick={onClose}
          variant="outline"
          size="icon"
          className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="max-w-7xl max-h-[90vh] overflow-auto">
        <img
          src={imageUrl}
          alt="Chart"
          className="w-full h-auto rounded-lg shadow-2xl transition-transform"
          style={{ transform: `scale(${zoom})` }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}