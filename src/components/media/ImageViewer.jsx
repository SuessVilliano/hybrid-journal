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
    <div 
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            setZoom(Math.max(0.5, zoom - 0.25));
          }}
          variant="outline"
          size="icon"
          className="bg-slate-900 border-cyan-500/30 text-white hover:bg-slate-800"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            setZoom(Math.min(3, zoom + 0.25));
          }}
          variant="outline"
          size="icon"
          className="bg-slate-900 border-cyan-500/30 text-white hover:bg-slate-800"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          variant="outline"
          size="icon"
          className="bg-slate-900 border-cyan-500/30 text-white hover:bg-slate-800"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          variant="outline"
          size="icon"
          className="bg-slate-900 border-cyan-500/30 text-white hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="max-w-7xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <img
          src={imageUrl}
          alt="Chart"
          className="w-auto h-auto max-w-full max-h-[90vh] rounded-lg shadow-2xl transition-transform"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
        />
      </div>
    </div>
  );
}