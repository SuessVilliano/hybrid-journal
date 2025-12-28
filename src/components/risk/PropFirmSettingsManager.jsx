import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Shield, Plus, Edit, Trash2, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export default function PropFirmSettingsManager({ onSettingsSaved }) {
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const darkMode = document.documentElement.classList.contains('dark');

  const { data: settings = [] } = useQuery({
    queryKey: ['propFirmSettings'],
    queryFn: () => base44.entities.PropFirmSettings.list('-created_date', 50)
  });

  const [formData, setFormData] = useState({
    firm_name: '',
    account_size: '',
    max_daily_loss_percent: 5,
    max_total_loss_percent: 10,
    trailing_drawdown_percent: 10,
    profit_target_percent: 10,
    phase: 'Challenge',
    is_active: true,
    weekend_holding: false,
    news_trading_allowed: true
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editing) {
        return base44.entities.PropFirmSettings.update(editing.id, data);
      }
      return base44.entities.PropFirmSettings.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['propFirmSettings']);
      setShowForm(false);
      setEditing(null);
      setFormData({
        firm_name: '',
        account_size: '',
        max_daily_loss_percent: 5,
        max_total_loss_percent: 10,
        trailing_drawdown_percent: 10,
        profit_target_percent: 10,
        phase: 'Challenge',
        is_active: true,
        weekend_holding: false,
        news_trading_allowed: true
      });
      if (onSettingsSaved) onSettingsSaved();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PropFirmSettings.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['propFirmSettings'])
  });

  const handleEdit = (setting) => {
    setEditing(setting);
    setFormData(setting);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          Prop Firm Settings
        </h3>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            setEditing(null);
            setFormData({
              firm_name: '',
              account_size: '',
              max_daily_loss_percent: 5,
              max_total_loss_percent: 10,
              trailing_drawdown_percent: 10,
              profit_target_percent: 10,
              phase: 'Challenge',
              is_active: true,
              weekend_holding: false,
              news_trading_allowed: true
            });
          }}
          size="sm"
          className="bg-gradient-to-r from-cyan-500 to-purple-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Prop Firm
        </Button>
      </div>

      {showForm && (
        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
          <CardHeader>
            <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
              {editing ? 'Edit' : 'Add'} Prop Firm Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Firm Name</Label>
                  <Input
                    value={formData.firm_name}
                    onChange={(e) => setFormData({...formData, firm_name: e.target.value})}
                    placeholder="e.g., FTMO, MyForexFunds"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Size ($)</Label>
                  <Input
                    type="number"
                    value={formData.account_size}
                    onChange={(e) => setFormData({...formData, account_size: parseFloat(e.target.value)})}
                    placeholder="100000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Daily Loss (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.max_daily_loss_percent}
                    onChange={(e) => setFormData({...formData, max_daily_loss_percent: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Total Loss (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.max_total_loss_percent}
                    onChange={(e) => setFormData({...formData, max_total_loss_percent: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Trailing Drawdown (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.trailing_drawdown_percent}
                    onChange={(e) => setFormData({...formData, trailing_drawdown_percent: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Profit Target (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.profit_target_percent}
                    onChange={(e) => setFormData({...formData, profit_target_percent: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phase</Label>
                  <Select value={formData.phase} onValueChange={(val) => setFormData({...formData, phase: val})}>
                    <SelectTrigger>
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

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Active Account</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(val) => setFormData({...formData, is_active: val})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Weekend Holding Allowed</Label>
                  <Switch
                    checked={formData.weekend_holding}
                    onCheckedChange={(val) => setFormData({...formData, weekend_holding: val})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>News Trading Allowed</Label>
                  <Switch
                    checked={formData.news_trading_allowed}
                    onCheckedChange={(val) => setFormData({...formData, news_trading_allowed: val})}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-cyan-500 to-purple-600">
                  {editing ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {settings.map((setting) => (
          <Card key={setting.id} className={`${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'} ${setting.is_active ? 'ring-2 ring-cyan-500' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className={`h-5 w-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                    <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {setting.firm_name}
                    </h4>
                    {setting.is_active && (
                      <span className="px-2 py-0.5 text-xs bg-cyan-500 text-white rounded-full flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Active
                      </span>
                    )}
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      setting.phase === 'Funded' ? 'bg-green-500/20 text-green-400' :
                      setting.phase === 'Verification' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {setting.phase}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Account Size</div>
                      <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        ${setting.account_size?.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Daily Loss</div>
                      <div className={`font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                        {setting.max_daily_loss_percent}%
                      </div>
                    </div>
                    <div>
                      <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Total Loss</div>
                      <div className={`font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                        {setting.max_total_loss_percent}%
                      </div>
                    </div>
                    <div>
                      <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Profit Target</div>
                      <div className={`font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                        {setting.profit_target_percent}%
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(setting)}
                    className="h-8 w-8"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(setting.id)}
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}