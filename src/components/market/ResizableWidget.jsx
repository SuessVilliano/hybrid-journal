import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, Expand } from 'lucide-react';

export default function ResizableWidget({ 
  title, 
  children, 
  defaultHeight = '600px',
  minHeight = 400,
  maxHeight = 2000
}) {
  const [height, setHeight] = useState(parseInt(defaultHeight));
  const [isResizing, setIsResizing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const darkMode = document.documentElement.classList.contains('dark');

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
    startY.current = e.clientY;
    startHeight.current = height;
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    
    const delta = e.clientY - startY.current;
    const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight.current + delta));
    
    // Snap to grid (50px increments)
    const snapped = Math.round(newHeight / 50) * 50;
    setHeight(snapped);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, height]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
        <div className={`p-4 border-b flex items-center justify-between ${
          darkMode ? 'border-cyan-500/20 bg-slate-950' : 'border-cyan-500/30 bg-white'
        }`}>
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
            {title}
          </h2>
          <Button
            onClick={toggleFullscreen}
            variant="outline"
            size="sm"
            className={darkMode ? 'border-cyan-500/30 text-cyan-400' : ''}
          >
            <Minimize2 className="h-4 w-4 mr-2" />
            Exit Fullscreen
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {children}
        </div>
      </div>
    );
  }

  return (
    <Card 
      ref={containerRef}
      className={`relative ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'} ${
        isResizing ? 'shadow-2xl ring-2 ring-cyan-500' : ''
      }`}
      style={{ height: `${height}px` }}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
          {title}
        </CardTitle>
        <Button
          onClick={toggleFullscreen}
          variant="outline"
          size="sm"
          className={darkMode ? 'border-cyan-500/30 text-cyan-400' : ''}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="h-[calc(100%-80px)] overflow-hidden">
        {children}
      </CardContent>

      {/* Resize Handle */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize flex items-center justify-center group ${
          isResizing ? 'bg-cyan-500/20' : 'hover:bg-cyan-500/10'
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className={`w-12 h-1 rounded-full transition-all ${
          isResizing ? 'bg-cyan-500 scale-150' : 'bg-slate-400 group-hover:bg-cyan-500 group-hover:scale-125'
        }`} />
      </div>

      {/* Corner resize indicator */}
      <div 
        className="absolute bottom-1 right-1 pointer-events-none opacity-50"
      >
        <Expand className={`h-4 w-4 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
      </div>
    </Card>
  );
}