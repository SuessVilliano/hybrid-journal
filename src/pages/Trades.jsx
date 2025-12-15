import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, Upload, Download, Trash2, FolderInput, CheckSquare, XSquare } from 'lucide-react';
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
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedTrades, setSelectedTrades] = useState([]);

  const queryClient = useQueryClient();

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['trades'],
    queryFn: () => base44.entities.Trade.list('-entry_date', 500)
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const createTradeMutation = useMutation({
    mutationFn: (data) => base44.entities.Trade.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      setShowForm(false);
      setEditingTrade(null);
    }
  });

  const updateTradeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Trade.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      setShowForm(false);
      setEditingTrade(null);
    }
  });

  const deleteTradeMutation = useMutation({
    mutationFn: (id) => base44.entities.Trade.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (tradeIds) => {
      await Promise.all(tradeIds.map(id => base44.entities.Trade.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      setSelectedTrades([]);
      setBulkMode(false);
    }
  });

  const bulkMoveToAccountMutation = useMutation({
    mutationFn: async ({ tradeIds, accountId }) => {
      await Promise.all(tradeIds.map(id => base44.entities.Trade.update(id, { account_id: accountId })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      setSelectedTrades([]);
      setBulkMode(false);
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

  const handleBulkDelete = () => {
    if (selectedTrades.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedTrades.length} trades?`)) {
      bulkDeleteMutation.mutate(selectedTrades);
    }
  };

  const handleBulkMoveToAccount = (accountId) => {
    if (selectedTrades.length === 0 || !accountId) return;
    bulkMoveToAccountMutation.mutate({ tradeIds: selectedTrades, accountId });
  };

  const handleSelectTrade = (tradeId, checked) => {
    if (checked) {
      setSelectedTrades([...selectedTrades, tradeId]);
    } else {
      setSelectedTrades(selectedTrades.filter(id => id !== tradeId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedTrades(filteredTrades.map(t => t.id));
    } else {
      setSelectedTrades([]);
    }
  };

  const filteredTrades = trades.filter(trade => {
    if (searchQuery && !trade.symbol?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filters.platform && filters.platform !== 'all' && trade.platform !== filters.platform) return false;
    if (filters.instrument_type && filters.instrument_type !== 'all' && trade.instrument_type !== filters.instrument_type) return false;
    if (filters.side && filters.side !== 'all' && trade.side !== filters.side) return false;
    return true;
  });

  const darkMode = document.documentElement.classList.contains('dark');

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className={`text-4xl font-bold bg-gradient-to-r ${
              darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
            } bg-clip-text text-transparent`}>
              Trade Journal
            </h1>
            <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-cyan-700/70 mt-1'}>
              Record and analyze every trade
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setBulkMode(!bulkMode)}
              className={bulkMode ? 'bg-cyan-500/20 border-cyan-500/30' : ''}
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              {bulkMode ? 'Exit Bulk Mode' : 'Bulk Select'}
            </Button>
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
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
            >
              <Plus className="h-4 w-4" />
              Add Trade
            </Button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {bulkMode && selectedTrades.length > 0 && (
          <div className={`rounded-xl shadow-lg p-4 flex items-center justify-between ${
            darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'
          }`}>
            <div className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
              {selectedTrades.length} trade{selectedTrades.length > 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-3">
              <Select onValueChange={handleBulkMoveToAccount}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Move to Account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedTrades([])}
              >
                <XSquare className="h-4 w-4 mr-2" />
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className={`rounded-xl shadow-sm p-4 backdrop-blur-xl ${
          darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'
        }`}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                darkMode ? 'text-slate-500' : 'text-slate-400'
              }`} />
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className={`rounded-xl shadow-sm p-12 text-center backdrop-blur-xl ${
            darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'
          }`}>
            <p className={`text-lg mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              No trades yet
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
            >
              Add Your First Trade
            </Button>
          </div>
        ) : (
          <TradeList
            trades={filteredTrades}
            onEdit={handleEdit}
            onDelete={handleDelete}
            bulkMode={bulkMode}
            selectedTrades={selectedTrades}
            onSelectTrade={handleSelectTrade}
            onSelectAll={handleSelectAll}
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