import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CompoundCalculator from '@/components/calculators/CompoundCalculator';
import ProfitTargetCalculator from '@/components/calculators/ProfitTargetCalculator';
import RiskCalculator from '@/components/risk/RiskCalculator';
import { Calculator, TrendingUp, Target, Shield } from 'lucide-react';

export default function Calculators() {
  const darkMode = document.documentElement.classList.contains('dark');

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
            darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
          } bg-clip-text text-transparent`}>
            Trading Calculators
          </h1>
          <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-cyan-700/70 mt-1'}>
            Essential tools to plan your trading goals and manage risk
          </p>
        </div>

        <Tabs defaultValue="compound" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-6">
            <TabsTrigger value="compound" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden md:inline">Compound Calculator</span>
              <span className="md:hidden">Compound</span>
            </TabsTrigger>
            <TabsTrigger value="profit" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden md:inline">Profit Target</span>
              <span className="md:hidden">Target</span>
            </TabsTrigger>
            <TabsTrigger value="risk" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden md:inline">Position Size</span>
              <span className="md:hidden">Risk</span>
            </TabsTrigger>
            <TabsTrigger value="more" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              <span className="hidden md:inline">More Tools</span>
              <span className="md:hidden">More</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compound">
            <CompoundCalculator />
          </TabsContent>

          <TabsContent value="profit">
            <ProfitTargetCalculator />
          </TabsContent>

          <TabsContent value="risk">
            <RiskCalculator />
          </TabsContent>

          <TabsContent value="more">
            <div className={`text-center py-12 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              <Calculator className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>More calculators coming soon!</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}