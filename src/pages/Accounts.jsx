import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Wallet, TrendingUp, Edit2, Trash2, X, CheckCircle, DollarSign } from 'lucide-react';

export default function Accounts() {
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const queryClient = useQueryClient();

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const { data: trades = [] } = useQuery({
    queryKey: ['trades'],
    queryFn: () => base44.entities.Trade.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Account.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts']);
      setShowForm(false);
      setEditingAccount(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Account.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts']);
      setShowForm(false);
      setEditingAccount(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Account.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['accounts'])
  });

  const getAccountStats = (accountId) => {
    const accountTrades = trades.filter(t => t.account_id === accountId);
    const totalPnl = accountTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = accountTrades.length > 0 
      ? (accountTrades.filter(t => t.pnl > 0).length / accountTrades.length) * 100 
      : 0;
    return { trades: accountTrades.length, pnl: totalPnl, winRate };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Trading Accounts
            </h1>
            <p className="text-cyan-400/70 mt-2">Manage multiple accounts and track performance separately</p>
          </div>
          <Button
            onClick={() => {
              setEditingAccount(null);
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white shadow-lg shadow-cyan-500/20"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Account
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => {
            const stats = getAccountStats(account.id);
            return (
              <Card key={account.id} className="bg-slate-950/80 backdrop-blur-xl border-cyan-500/20 hover:border-cyan-500/40 transition-all shadow-lg hover:shadow-cyan-500/20">
                <CardHeader className="border-b border-cyan-500/20">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        account.is_active 
                          ? 'bg-gradient-to-br from-cyan-500 to-purple-600 shadow-lg shadow-cyan-500/50' 
                          : 'bg-slate-800'
                      }`}>
                        <Wallet className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-white">{account.name}</CardTitle>
                        <p className="text-xs text-cyan-400/70">{account.account_type}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingAccount(account);
                          setShowForm(true);
                        }}
                        className="p-1.5 hover:bg-cyan-500/10 rounded text-cyan-400 transition"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this account?')) {
                            deleteMutation.mutate(account.id);
                          }
                        }}
                        className="p-1.5 hover:bg-red-500/10 rounded text-red-400 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Broker</span>
                      <span className="text-white font-medium">{account.broker || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Account #</span>
                      <span className="text-cyan-400 font-mono">{account.account_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Initial Balance</span>
                      <span className="text-white font-medium">${account.initial_balance?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Total Trades</span>
                      <span className="text-2xl font-bold text-white">{stats.trades}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">P&L</span>
                      <span className={`text-2xl font-bold ${stats.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stats.pnl >= 0 ? '+' : ''}${stats.pnl.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Win Rate</span>
                      <span className="text-xl font-bold text-purple-400">{stats.winRate.toFixed(1)}%</span>
                    </div>
                  </div>

                  {account.is_active && (
                    <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">
                      <CheckCircle className="h-3 w-3" />
                      Active Account
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {showForm && <AccountForm account={editingAccount} onClose={() => { setShowForm(false); setEditingAccount(null); }} onSubmit={(data) => {
          if (editingAccount) {
            updateMutation.mutate({ id: editingAccount.id, data });
          } else {
            createMutation.mutate(data);
          }
        }} />}
      </div>
    </div>
  );
}

function AccountForm({ account, onClose, onSubmit }) {
  const [formData, setFormData] = useState(account || {
    name: '',
    broker: '',
    account_number: '',
    account_type: 'Live',
    currency: 'USD',
    initial_balance: 0,
    is_active: true
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full bg-slate-950 border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
        <CardHeader className="border-b border-cyan-500/20">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl text-white">
              {account ? 'Edit Account' : 'Add New Account'}
            </CardTitle>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition">
              <X className="h-6 w-6" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cyan-400 mb-2">Account Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Main Trading Account"
                  required
                  className="bg-slate-900 border-cyan-500/30 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cyan-400 mb-2">Account Type</label>
                <Select value={formData.account_type} onValueChange={(value) => setFormData({...formData, account_type: value})}>
                  <SelectTrigger className="bg-slate-900 border-cyan-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Live">Live</SelectItem>
                    <SelectItem value="Demo">Demo</SelectItem>
                    <SelectItem value="Prop Firm">Prop Firm</SelectItem>
                    <SelectItem value="Paper">Paper</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cyan-400 mb-2">Broker</label>
                <Input
                  value={formData.broker}
                  onChange={(e) => setFormData({...formData, broker: e.target.value})}
                  placeholder="Broker Name"
                  className="bg-slate-900 border-cyan-500/30 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cyan-400 mb-2">Account Number</label>
                <Input
                  value={formData.account_number}
                  onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                  placeholder="123456789"
                  className="bg-slate-900 border-cyan-500/30 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cyan-400 mb-2">Currency</label>
                <Input
                  value={formData.currency}
                  onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  placeholder="USD"
                  className="bg-slate-900 border-cyan-500/30 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cyan-400 mb-2">Initial Balance</label>
                <Input
                  type="number"
                  value={formData.initial_balance}
                  onChange={(e) => setFormData({...formData, initial_balance: parseFloat(e.target.value)})}
                  placeholder="10000"
                  className="bg-slate-900 border-cyan-500/30 text-white"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-4 h-4 accent-cyan-500"
              />
              <span className="text-sm text-white">Active Account</span>
            </label>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="border-slate-700 text-white hover:bg-slate-800">
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white">
                {account ? 'Update' : 'Create'} Account
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}