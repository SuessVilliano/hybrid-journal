import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Zap, AlertTriangle } from 'lucide-react';
import StrategyBuilder from '@/components/automation/StrategyBuilder';
import StrategyCard from '@/components/automation/StrategyCard';

export default function Automation() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState(null);

  const queryClient = useQueryClient();

  const { data: strategies = [] } = useQuery({
    queryKey: ['automatedStrategies'],
    queryFn: () => base44.entities.AutomatedStrategy.list('-created_date', 50)
  });

  const { data: brokerConnections = [] } = useQuery({
    queryKey: ['brokerConnections'],
    queryFn: () => base44.entities.BrokerConnection.list('-created_date', 50)
  });

  const createStrategyMutation = useMutation({
    mutationFn: (data) => base44.entities.AutomatedStrategy.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['automatedStrategies']);
      setShowBuilder(false);
      setEditingStrategy(null);
    }
  });

  const updateStrategyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AutomatedStrategy.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['automatedStrategies']);
      setShowBuilder(false);
      setEditingStrategy(null);
    }
  });

  const handleSubmit = (data) => {
    if (editingStrategy) {
      updateStrategyMutation.mutate({ id: editingStrategy.id, data });
    } else {
      createStrategyMutation.mutate(data);
    }
  };

  const handleToggle = (strategy) => {
    const newStatus = strategy.status === 'active' ? 'paused' : 'active';
    updateStrategyMutation.mutate({
      id: strategy.id,
      data: { ...strategy, status: newStatus }
    });
  };

  const handleStop = (strategy) => {
    if (confirm('Stop this strategy permanently?')) {
      updateStrategyMutation.mutate({
        id: strategy.id,
        data: { ...strategy, status: 'stopped' }
      });
    }
  };

  const activeStrategies = strategies.filter(s => s.status === 'active');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Automated Trading</h1>
            <p className="text-slate-600 mt-1">AI-driven strategy execution with smart risk management</p>
          </div>
          <Button onClick={() => { setEditingStrategy(null); setShowBuilder(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Strategy
          </Button>
        </div>

        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Automated Trading Features</h3>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>✓ AI-powered strategy generation with technical indicators</li>
                  <li>✓ Automated trade execution (simulated & live)</li>
                  <li>✓ Dynamic stop-loss and take-profit management</li>
                  <li>✓ Advanced risk controls: max daily loss, position limits</li>
                  <li>✓ Multi-symbol trading with real-time monitoring</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {activeStrategies.length > 0 && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                {activeStrategies.length} active {activeStrategies.length === 1 ? 'strategy' : 'strategies'} running
              </span>
            </CardContent>
          </Card>
        )}

        {strategies.length === 0 ? (
          <Card className="p-12 text-center">
            <Zap className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No automated strategies yet</h3>
            <p className="text-slate-600 mb-6">Create your first AI-powered trading strategy</p>
            <Button onClick={() => setShowBuilder(true)} className="bg-blue-600 hover:bg-blue-700">
              Create Your First Strategy
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {strategies.map(strategy => (
              <StrategyCard
                key={strategy.id}
                strategy={strategy}
                onToggle={handleToggle}
                onEdit={(s) => { setEditingStrategy(s); setShowBuilder(true); }}
                onStop={handleStop}
              />
            ))}
          </div>
        )}

        {showBuilder && (
          <StrategyBuilder
            strategy={editingStrategy}
            brokerConnections={brokerConnections}
            onSubmit={handleSubmit}
            onCancel={() => { setShowBuilder(false); setEditingStrategy(null); }}
          />
        )}
      </div>
    </div>
  );
}