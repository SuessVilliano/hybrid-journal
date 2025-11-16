import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Shield, Calculator, BarChart3 } from 'lucide-react';
import PortfolioRiskPanel from '@/components/risk/PortfolioRiskPanel';
import PositionSizeCalculator from '@/components/risk/PositionSizeCalculator';
import { Card, CardContent } from '@/components/ui/card';

export default function RiskManagement() {
  const { data: trades = [] } = useQuery({
    queryKey: ['trades'],
    queryFn: () => base44.entities.Trade.list('-entry_date', 500)
  });

  const accountBalance = 10000; // Could be fetched from user settings or broker connection

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Risk Management</h1>
          <p className="text-slate-600 mt-1">AI-powered portfolio risk analysis and position sizing</p>
        </div>

        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Advanced Risk Management</h3>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>✓ AI dynamically adjusts stop-loss and take-profit based on volatility</li>
                  <li>✓ Portfolio-level risk analysis with diversification scoring</li>
                  <li>✓ Intelligent position sizing recommendations</li>
                  <li>✓ Real-time exposure monitoring and daily risk limits</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PortfolioRiskPanel trades={trades} accountBalance={accountBalance} />
          <PositionSizeCalculator accountBalance={accountBalance} />
        </div>
      </div>
    </div>
  );
}