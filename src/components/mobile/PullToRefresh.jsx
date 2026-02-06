import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef(null);
  const darkMode = document.documentElement.classList.contains('dark');

  const PULL_THRESHOLD = 80;
  const MAX_PULL = 120;

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (window.scrollY !== 0 || refreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    if (distance > 0) {
      setPulling(true);
      setPullDistance(Math.min(distance, MAX_PULL));
      
      // Prevent default scroll when pulling
      if (distance > 10) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
        setPulling(false);
      }
    } else {
      setPullDistance(0);
      setPulling(false);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, refreshing]);

  const rotation = (pullDistance / PULL_THRESHOLD) * 360;
  const scale = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <div ref={containerRef} className="relative">
      {/* Pull Indicator */}
      {(pulling || refreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-50 transition-all"
          style={{ 
            height: `${pullDistance}px`,
            opacity: scale 
          }}
        >
          <div className={`rounded-full p-2 ${
            darkMode ? 'bg-slate-950/90' : 'bg-white/90'
          } backdrop-blur-sm shadow-lg`}>
            <RefreshCw 
              className={`h-6 w-6 ${
                refreshing ? 'animate-spin' : ''
              } ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}
              style={{ 
                transform: refreshing ? 'none' : `rotate(${rotation}deg)`,
                transition: refreshing ? 'none' : 'transform 0.1s ease'
              }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div
        style={{
          transform: pulling ? `translateY(${pullDistance}px)` : 'translateY(0)',
          transition: pulling ? 'none' : 'transform 0.3s ease'
        }}
      >
        {children}
      </div>
    </div>
  );
}