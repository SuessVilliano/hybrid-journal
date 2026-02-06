import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MobileHeader({ title, showBack = false }) {
  const navigate = useNavigate();
  const darkMode = document.documentElement.classList.contains('dark');

  return (
    <div 
      className={`lg:hidden fixed top-0 left-0 right-0 z-40 ${
        darkMode ? 'bg-slate-950/95' : 'bg-white/95'
      } backdrop-blur-xl border-b ${
        darkMode ? 'border-cyan-500/20' : 'border-cyan-500/30'
      }`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className="flex items-center justify-between px-4 h-14">
        {showBack ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="min-h-[44px] min-w-[44px]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : (
          <div className="w-10" />
        )}
        
        <h1 className={`text-lg font-bold bg-gradient-to-r ${
          darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
        } bg-clip-text text-transparent truncate flex-1 text-center`}>
          {title}
        </h1>
        
        <div className="w-10" />
      </div>
    </div>
  );
}