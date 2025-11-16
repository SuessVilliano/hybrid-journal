import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, TrendingUp } from 'lucide-react';

export default function StrategySelector({ strategies, onSelect }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {strategies.map((strategy) => (
        <Card 
          key={strategy.id}
          className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-400"
          onClick={() => onSelect(strategy)}
        >
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>{strategy.name}</span>
              {strategy.active && (
                <Badge className="bg-green-600">Active</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-3">{strategy.description}</p>
            
            <div className="space-y-2 text-sm">
              {strategy.entry_criteria && (
                <div>
                  <span className="font-medium text-slate-700">Entry: </span>
                  <span className="text-slate-600">{strategy.entry_criteria}</span>
                </div>
              )}
              
              {strategy.instruments?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {strategy.instruments.map((inst, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {inst}
                    </Badge>
                  ))}
                </div>
              )}
              
              {strategy.win_rate_target && (
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                  <Target className="h-3 w-3" />
                  Target: {strategy.win_rate_target}% WR
                </div>
              )}
            </div>
            
            <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
              Backtest This Strategy
            </Button>
          </CardContent>
        </Card>
      ))}
      
      {strategies.length === 0 && (
        <div className="col-span-2 text-center py-8 text-slate-500">
          <p>No strategies found. Create a strategy first or start with custom rules.</p>
        </div>
      )}
    </div>
  );
}