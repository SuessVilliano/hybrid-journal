import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter, Upload, Download } from 'lucide-react';
import TradeForm from '@/components/trading/TradeForm';
import TradeList from '@/components/trading/TradeList';
import TradeFilters from '@/components/trading/TradeFilters';
import ImportModal from '@/components/trading/ImportModal';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Trades() {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});

  const queryClient = useQueryClient();

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['trades'],
    queryFn: () => base44.entities.Trade.list('-entry_date', 500)
  });

  const createTradeMutation = useMutation({
    mutationFn: (data) => base44.entities.Trade.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['trades']);
      setShowForm(false);
      setEditingTrade(null);
    }
  });

  const updateTradeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Trade.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['trades']);
      setShowForm(false);
      setEditingTrade(null);
    }
  });

  const deleteTradeMutation = useMutation({
    mutationFn: (id) => base44.entities.Trade.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['trades']);
    }
  });

  const handleSubmit = (data) => {
    if (editingTrade) {
      updateTradeMutation.mutate({ id: editingTrade.id, data });
    } else {
      createTradeMutation.mutate(data);
    }
  };

  const handleEdit = (trade) => {
    setEditingTrade(trade);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this trade?')) {
      deleteTradeMutation.mutate(id);
    }
  };

  const filteredTrades = trades.filter(trade => {
    if (searchQuery && !trade.symbol?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filters.platform && trade.platform !== filters.platform) return false;
    if (filters.instrument_type && trade.instrument_type !== filters.instrument_type) return false;
    if (filters.side && trade.side !== filters.side) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Trade Journal</h1>
            <p className="text-slate-600 mt-1">Record and analyze every trade</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button
              onClick={() => {
                setEditingTrade(null);
                setShowForm(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Trade
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <TradeFilters filters={filters} onFilterChange={setFilters} />
          </div>
        </div>

        {/* Trade List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-slate-600 text-lg mb-4">No trades yet</p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Add Your First Trade
            </Button>
          </div>
        ) : (
          <TradeList
            trades={filteredTrades}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        {/* Trade Form Modal */}
        {showForm && (
          <TradeForm
            trade={editingTrade}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingTrade(null);
            }}
          />
        )}

        {/* Import Modal */}
        {showImport && (
          <ImportModal
            onClose={() => setShowImport(false)}
          />
        )}
      </div>
    </div>
  );
}