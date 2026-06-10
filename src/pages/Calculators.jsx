import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CompoundCalculator from '@/components/calculators/CompoundCalculator';
import ProfitTargetCalculator from '@/components/calculators/ProfitTargetCalculator';
import RiskCalculator from '@/components/risk/RiskCalculator';
import EVCalculator from '@/components/calculators/EVCalculator';
import DebtSnowballCalculator from '@/components/calculators/DebtSnowballCalculator';
import DebtAvalancheCalculator from '@/components/calculators/DebtAvalancheCalculator';
import { Calculator, TrendingUp, Target, Shield } from 'lucide-react';

export default function Calculators() {
  const darkMode = document.documentElement.classList.contains('dark');

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [accountBalance, setAccountBalance] = useState('');

  // Prefill from the first account once accounts load
  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
      if (accountBalance === '') {
        setAccountBalance(String(accounts[0].initial_balance ?? ''));
      }
    }
  }, [accounts, selectedAccountId, accountBalance]);

  const handleAccountChange = (accountId) => {
    setSelectedAccountId(accountId);
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      setAccountBalance(String(account.initial_balance ?? ''));
    }
  };

  const numericBalance = parseFloat(accountBalance) || 0;

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
            <div className="space-y-4">
              <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {accounts.length > 0 && (
                      <div className="space-y-2">
                        <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Account</Label>
                        <Select value={selectedAccountId} onValueChange={handleAccountChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name || account.account_name || account.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Account Balance ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={accountBalance}
                        onChange={(e) => setAccountBalance(e.target.value)}
                        placeholder="10000"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <RiskCalculator accountBalance={numericBalance} />
            </div>
          </TabsContent>

          <TabsContent value="more">
            <div className="space-y-6">
              <EVCalculator />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DebtSnowballCalculator />
                <DebtAvalancheCalculator />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}