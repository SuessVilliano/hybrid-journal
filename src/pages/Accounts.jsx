import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Wallet, TrendingUp, Edit2, Trash2, X, CheckCircle, DollarSign, Shield, Link as LinkIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useSubscription } from '@/components/subscription/useSubscription';
import UpgradePrompt from '@/components/subscription/UpgradePrompt';
import BrokerSetupWizard from '@/components/brokers/BrokerSetupWizard';
import ConnectionStatusCard from '@/components/brokers/ConnectionStatusCard';

export default function Accounts() {
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [showBrokerWizard, setShowBrokerWizard] = useState(false);
  const queryClient = useQueryClient();
  const subscription = useSubscription();
  const darkMode = document.documentElement.classList.contains('dark');

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const { data: trades = [] } = useQuery({
    queryKey: ['trades'],
    queryFn: () => base44.entities.Trade.list()
  });

  const { data: brokerConnections = [] } = useQuery({
    queryKey: ['brokerConnections'],
    queryFn: () => base44.entities.BrokerConnection.list()
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

  const getAccountStats = (accountId, initialBalance) => {
    const accountTrades = trades.filter(t => t.account_id === accountId);
    const totalPnl = accountTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const currentBalance = (initialBalance || 0) + totalPnl;
    const winRate = accountTrades.length > 0 
      ? (accountTrades.filter(t => t.pnl > 0).length / accountTrades.length) * 100 
      : 0;
    
    // Check if account has broker connection
    const brokerConnection = brokerConnections.find(bc => bc.account_number === accountId);
    
    return { 
      trades: accountTrades.length, 
      pnl: totalPnl, 
      winRate, 
      currentBalance,
      brokerConnection
    };
  };

  const handleAddAccount = () => {
    const accountLimit = subscription.getAccountLimit();
    if (accounts.length >= accountLimit && accountLimit !== Infinity) {
      alert(`You've reached the limit of ${accountLimit} account(s) for your plan. Upgrade to add more accounts.`);
      return;
    }
    setEditingAccount(null);
    setShowForm(true);
  };

  return (
    <div className={`min-h-screen p-6 transition-colors ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className={`text-4xl font-bold bg-gradient-to-r ${
              darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
            } bg-clip-text text-transparent`}>
              Trading Accounts
            </h1>
            <p className={`mt-2 ${darkMode ? 'text-cyan-400/70' : 'text-cyan-700/70'}`}>
              Manage multiple accounts and track performance separately
              {subscription.tier !== 'team' && (
                <span className={`ml-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  ({accounts.length}/{subscription.getAccountLimit() === Infinity ? '∞' : subscription.getAccountLimit()} accounts used)
                </span>
              )}
            </p>
          </div>
          <Button
            onClick={handleAddAccount}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white shadow-lg shadow-cyan-500/20"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Account
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => {
            const stats = getAccountStats(account.id, account.initial_balance);
            return (
              <Card key={account.id} className={`backdrop-blur-xl transition-all shadow-lg ${
                darkMode 
                  ? 'bg-slate-950/80 border-cyan-500/20 hover:border-cyan-500/40 hover:shadow-cyan-500/20' 
                  : 'bg-white/80 border-cyan-500/30 hover:border-cyan-500/50'
              }`}>
                <CardHeader className={`border-b ${darkMode ? 'border-cyan-500/20' : 'border-cyan-500/30'}`}>
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
                        <CardTitle className={`text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>{account.name}</CardTitle>
                        <p className={`text-xs ${darkMode ? 'text-cyan-400/70' : 'text-cyan-600/70'}`}>{account.account_type}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingAccount(account);
                          setShowForm(true);
                        }}
                        className={`p-1.5 rounded transition ${
                          darkMode ? 'hover:bg-cyan-500/10 text-cyan-400' : 'hover:bg-cyan-100 text-cyan-600'
                        }`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this account?')) {
                            deleteMutation.mutate(account.id);
                          }
                        }}
                        className={`p-1.5 rounded transition ${
                          darkMode ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-100 text-red-600'
                        }`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Broker</span>
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{account.broker || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Account #</span>
                      <span className={`font-mono ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{account.account_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Initial Balance</span>
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>${account.initial_balance?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>

                  <div className={`h-px bg-gradient-to-r from-transparent ${darkMode ? 'via-cyan-500/30' : 'via-cyan-500/40'} to-transparent`} />

                  <div className="space-y-3">
                    {stats.brokerConnection && stats.brokerConnection.account_balance && (
                      <div className={`p-2 rounded border ${darkMode ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-cyan-50 border-cyan-500/40'}`}>
                        <div className="flex items-center justify-between text-xs">
                          <span className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>Broker Balance</span>
                          <span className={`font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>${stats.brokerConnection.account_balance.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className={darkMode ? 'text-cyan-400/70' : 'text-cyan-700/70'}>Last Synced</span>
                          <span className={darkMode ? 'text-cyan-400/70' : 'text-cyan-700/70'}>
                            {new Date(stats.brokerConnection.last_sync).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Current Balance</span>
                      <span className={`text-2xl font-bold ${stats.pnl >= 0 ? (darkMode ? 'text-cyan-400' : 'text-cyan-600') : (darkMode ? 'text-orange-400' : 'text-orange-600')}`}>
                        ${stats.currentBalance.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Total Trades</span>
                      <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats.trades}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>P&L</span>
                      <span className={`text-2xl font-bold ${stats.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {stats.pnl >= 0 ? '+' : ''}${stats.pnl.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Win Rate</span>
                      <span className={`text-xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{stats.winRate.toFixed(1)}%</span>
                    </div>
                  </div>

                  {account.is_active && (
                    <div className="flex items-center gap-2 text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded">
                      <CheckCircle className="h-3 w-3" />
                      Active Account
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {brokerConnections.length > 0 && (
          <div>
            <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Broker Connections
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {brokerConnections.map(conn => (
                <ConnectionStatusCard 
                  key={conn.id} 
                  connection={conn}
                  onSync={() => queryClient.invalidateQueries(['brokerConnections'])}
                />
              ))}
            </div>
          </div>
        )}

        {showBrokerWizard && (
          <BrokerSetupWizard
            isOpen={showBrokerWizard}
            onClose={() => setShowBrokerWizard(false)}
            onComplete={() => {
              queryClient.invalidateQueries(['brokerConnections']);
              setShowBrokerWizard(false);
            }}
          />
        )}

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
  const queryClient = useQueryClient();
  const darkMode = document.documentElement.classList.contains('dark');

  const [formData, setFormData] = useState(account || {
    name: '',
    broker: '',
    account_number: '',
    account_type: 'Live',
    currency: 'USD',
    initial_balance: 0,
    is_active: true
  });

  const [propFirmSettings, setPropFirmSettings] = useState({
    firm_name: '',
    account_size: 0,
    max_daily_loss_percent: 5,
    max_total_loss_percent: 10,
    trailing_drawdown_percent: 10,
    profit_target_percent: 10,
    phase: 'Challenge',
    weekend_holding: false,
    news_trading_allowed: true
  });

  const createPropFirmMutation = useMutation({
    mutationFn: (data) => base44.entities.PropFirmSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['propFirmSettings']);
    }
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className={`max-w-2xl w-full shadow-2xl ${
        darkMode 
          ? 'bg-slate-950 border-cyan-500/30 shadow-cyan-500/20' 
          : 'bg-white border-cyan-500/40'
      }`}>
        <CardHeader className={`border-b ${darkMode ? 'border-cyan-500/20' : 'border-cyan-500/30'}`}>
          <div className="flex justify-between items-center">
            <CardTitle className={`text-2xl ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {account ? 'Edit Account' : 'Add New Account'}
            </CardTitle>
            <button onClick={onClose} className={`transition ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
              <X className="h-6 w-6" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Account Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Main Trading Account"
                  required
                  className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : 'bg-white border-cyan-500/30 text-slate-900'}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Account Type</label>
                <Select value={formData.account_type} onValueChange={(value) => setFormData({...formData, account_type: value})}>
                  <SelectTrigger className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : 'bg-white border-cyan-500/30 text-slate-900'}>
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
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Broker</label>
                <Input
                  value={formData.broker}
                  onChange={(e) => setFormData({...formData, broker: e.target.value})}
                  placeholder="Broker Name"
                  className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : 'bg-white border-cyan-500/30 text-slate-900'}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Account Number</label>
                <Input
                  value={formData.account_number}
                  onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                  placeholder="123456789"
                  className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : 'bg-white border-cyan-500/30 text-slate-900'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Currency</label>
                <Input
                  value={formData.currency}
                  onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  placeholder="USD"
                  className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : 'bg-white border-cyan-500/30 text-slate-900'}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Initial Balance</label>
                <Input
                  type="number"
                  value={formData.initial_balance}
                  onChange={(e) => setFormData({...formData, initial_balance: parseFloat(e.target.value)})}
                  placeholder="10000"
                  className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : 'bg-white border-cyan-500/30 text-slate-900'}
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
              <span className={`text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>Active Account</span>
            </label>

            {formData.account_type === 'Prop Firm' && (
              <div className={`border-t pt-4 space-y-4 ${darkMode ? 'border-cyan-500/20' : 'border-cyan-500/30'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className={`h-5 w-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  <h3 className={`text-lg font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Prop Firm Settings</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Firm Name *</label>
                    <Input
                      value={propFirmSettings.firm_name}
                      onChange={(e) => setPropFirmSettings({...propFirmSettings, firm_name: e.target.value})}
                      placeholder="FTMO, MyForexFunds, etc."
                      className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : 'bg-white border-cyan-500/30 text-slate-900'}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Account Size ($)</label>
                    <Input
                      type="number"
                      value={propFirmSettings.account_size}
                      onChange={(e) => setPropFirmSettings({...propFirmSettings, account_size: parseFloat(e.target.value)})}
                      placeholder="100000"
                      className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : 'bg-white border-cyan-500/30 text-slate-900'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Max Daily Loss (%)</label>
                    <Input
                      type="number"
                      value={propFirmSettings.max_daily_loss_percent}
                      onChange={(e) => setPropFirmSettings({...propFirmSettings, max_daily_loss_percent: parseFloat(e.target.value)})}
                      placeholder="5"
                      className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : 'bg-white border-cyan-500/30 text-slate-900'}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Max Total Loss (%)</label>
                    <Input
                      type="number"
                      value={propFirmSettings.max_total_loss_percent}
                      onChange={(e) => setPropFirmSettings({...propFirmSettings, max_total_loss_percent: parseFloat(e.target.value)})}
                      placeholder="10"
                      className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : 'bg-white border-cyan-500/30 text-slate-900'}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Trailing Drawdown (%)</label>
                    <Input
                      type="number"
                      value={propFirmSettings.trailing_drawdown_percent}
                      onChange={(e) => setPropFirmSettings({...propFirmSettings, trailing_drawdown_percent: parseFloat(e.target.value)})}
                      placeholder="10"
                      className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : 'bg-white border-cyan-500/30 text-slate-900'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Profit Target (%)</label>
                    <Input
                      type="number"
                      value={propFirmSettings.profit_target_percent}
                      onChange={(e) => setPropFirmSettings({...propFirmSettings, profit_target_percent: parseFloat(e.target.value)})}
                      placeholder="10"
                      className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : 'bg-white border-cyan-500/30 text-slate-900'}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Phase</label>
                    <Select value={propFirmSettings.phase} onValueChange={(value) => setPropFirmSettings({...propFirmSettings, phase: value})}>
                      <SelectTrigger className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : 'bg-white border-cyan-500/30 text-slate-900'}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Challenge">Challenge</SelectItem>
                        <SelectItem value="Verification">Verification</SelectItem>
                        <SelectItem value="Funded">Funded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={propFirmSettings.weekend_holding}
                      onCheckedChange={(checked) => setPropFirmSettings({...propFirmSettings, weekend_holding: checked})}
                    />
                    <span className={`text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>Weekend Holding Allowed</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={propFirmSettings.news_trading_allowed}
                      onCheckedChange={(checked) => setPropFirmSettings({...propFirmSettings, news_trading_allowed: checked})}
                    />
                    <span className={`text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>News Trading Allowed</span>
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className={
                darkMode ? 'border-slate-700 text-white hover:bg-slate-800' : 'border-slate-300 text-slate-900 hover:bg-slate-100'
              }>
                Cancel
              </Button>
              <Button 
                type="submit" 
                onClick={async (e) => {
                  e.preventDefault();
                  onSubmit(formData);
                  
                  // If prop firm account, create prop firm settings too
                  if (formData.account_type === 'Prop Firm' && propFirmSettings.firm_name) {
                    await createPropFirmMutation.mutateAsync({
                      ...propFirmSettings,
                      is_active: true
                    });
                  }
                }}
                className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white"
              >
                {account ? 'Update' : 'Create'} Account
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}