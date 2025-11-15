import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen, TrendingUp, Target } from 'lucide-react';
import StrategyForm from '@/components/strategies/StrategyForm';
import StrategyCard from '@/components/strategies/StrategyCard';

export default function Strategies() {
  const [showForm, setShowForm] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState(null);

  const queryClient = useQueryClient();

  const { data: strategies = [], isLoading } = useQuery({
    queryKey: ['strategies'],
    queryFn: () => base44.entities.Strategy.list('-created_date', 100)
  });

  const { data: trades = [] } = useQuery({
    queryKey: ['trades'],
    queryFn: () => base44.entities.Trade.list('-entry_date', 1000)
  });

  const createStrategyMutation = useMutation({
    mutationFn: (data) => base44.entities.Strategy.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['strategies']);
      setShowForm(false);
      setEditingStrategy(null);
    }
  });

  const updateStrategyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Strategy.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['strategies']);
      setShowForm(false);
      setEditingStrategy(null);
    }
  });

  const deleteStrategyMutation = useMutation({
    mutationFn: (id) => base44.entities.Strategy.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['strategies']);
    }
  });

  const handleSubmit = (data) => {
    if (editingStrategy) {
      updateStrategyMutation.mutate({ id: editingStrategy.id, data });
    } else {
      createStrategyMutation.mutate(data);
    }
  };

  const handleEdit = (strategy) => {
    setEditingStrategy(strategy);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this strategy?')) {
      deleteStrategyMutation.mutate(id);
    }
  };

  const activeStrategies = strategies.filter(s => s.active);
  const inactiveStrategies = strategies.filter(s => !s.active);

  // Calculate overall stats
  const stats = useMemo(() => {
    return {
      total: strategies.length,
      active: activeStrategies.length,
      avgWinRate: strategies.length > 0 
        ? strategies.reduce((sum, s) => {
            const stratTrades = trades.filter(t => t.strategy === s.name);
            if (stratTrades.length === 0) return sum;
            const wins = stratTrades.filter(t => t.pnl > 0).length;
            return sum + (wins / stratTrades.length * 100);
          }, 0) / strategies.length
        : 0
    };
  }, [strategies, trades]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Trading Strategies</h1>
            <p className="text-slate-600 mt-1">Manage your trading playbook</p>
          </div>
          <Button
            onClick={() => {
              setEditingStrategy(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Strategy
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Strategies</CardTitle>
              <BookOpen className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Active</CardTitle>
              <Target className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Avg Win Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {stats.avgWinRate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Strategies */}
        {activeStrategies.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Active Strategies</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activeStrategies.map((strategy) => (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  trades={trades}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}

        {/* Inactive Strategies */}
        {inactiveStrategies.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Inactive Strategies</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {inactiveStrategies.map((strategy) => (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  trades={trades}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {strategies.length === 0 && (
          <Card className="p-12 text-center">
            <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No strategies yet</h3>
            <p className="text-slate-600 mb-6">
              Create your first trading strategy to organize your approach
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Create Your First Strategy
            </Button>
          </Card>
        )}

        {/* Strategy Form Modal */}
        {showForm && (
          <StrategyForm
            strategy={editingStrategy}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingStrategy(null);
            }}
          />
        )}
      </div>
    </div>
  );
}