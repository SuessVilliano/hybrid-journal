import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { User, Save, Calendar, Plus, Clock } from 'lucide-react';
import WebhookSettings from '@/components/profile/WebhookSettings';

export default function MyProfile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    trading_style: 'Day Trading',
    is_public: false,
    show_pnl: false,
    show_win_rate: true,
    show_trades: true
  });
  const [showCalendarDialog, setShowCalendarDialog] = useState(false);
  const [calendarEvent, setCalendarEvent] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: ''
  });
  const [calendarConnected, setCalendarConnected] = useState(false);
  const queryClient = useQueryClient();
  const darkMode = document.documentElement.classList.contains('dark');

  useEffect(() => {
    const loadProfile = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const profiles = await base44.entities.TraderProfile.list();
      const userProfile = profiles.find(p => p.created_by === currentUser.email);
      
      if (userProfile) {
        setProfile(userProfile);
        setFormData(userProfile);
      }
    };
    loadProfile();
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (profile) {
        return base44.entities.TraderProfile.update(profile.id, data);
      } else {
        return base44.entities.TraderProfile.create(data);
      }
    },
    onSuccess: (newProfile) => {
      setProfile(newProfile);
      queryClient.invalidateQueries({ queryKey: ['traderProfiles'] });
      alert('Profile saved!');
    }
  });

  const createCalendarEventMutation = useMutation({
    mutationFn: async (eventData) => {
      const response = await base44.functions.invoke('syncGoogleCalendar', {
        action: 'createEvent',
        eventData
      });
      return response.data;
    },
    onSuccess: () => {
      setShowCalendarDialog(false);
      setCalendarEvent({ title: '', description: '', startTime: '', endTime: '' });
      alert('Trading session added to your Google Calendar!');
    },
    onError: (error) => {
      alert(error.message || 'Failed to create calendar event');
    }
  });

  const handleConnectCalendar = () => {
    setCalendarConnected(true);
    alert('Google Calendar connected! You can now schedule trading sessions.');
  };

  const handleCreateSession = () => {
    if (!calendarEvent.title || !calendarEvent.startTime || !calendarEvent.endTime) {
      alert('Please fill in all required fields');
      return;
    }
    createCalendarEventMutation.mutate(calendarEvent);
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
            darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
          } bg-clip-text text-transparent`}>
            My Trader Profile
          </h1>
          <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-cyan-700/70 mt-1'}>
            Manage your public trading profile
          </p>
        </div>

        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
          <CardHeader>
            <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
              <User className="h-5 w-5 inline mr-2" />
              Profile Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Display Name *
              </label>
              <Input
                value={formData.display_name}
                onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                placeholder="Your trading name"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Bio
              </label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="Tell others about your trading journey..."
                rows={4}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Trading Style
              </label>
              <Select value={formData.trading_style} onValueChange={(v) => setFormData({...formData, trading_style: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scalping">Scalping</SelectItem>
                  <SelectItem value="Day Trading">Day Trading</SelectItem>
                  <SelectItem value="Swing Trading">Swing Trading</SelectItem>
                  <SelectItem value="Options">Options</SelectItem>
                  <SelectItem value="Futures">Futures</SelectItem>
                  <SelectItem value="Crypto">Crypto</SelectItem>
                  <SelectItem value="Forex">Forex</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={`space-y-4 p-4 rounded-lg ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Privacy Settings</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Public Profile</p>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Make your profile visible to others</p>
                </div>
                <Switch
                  checked={formData.is_public}
                  onCheckedChange={(v) => setFormData({...formData, is_public: v})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Show P&L</p>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Display actual profit/loss numbers</p>
                </div>
                <Switch
                  checked={formData.show_pnl}
                  onCheckedChange={(v) => setFormData({...formData, show_pnl: v})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Show Win Rate</p>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Display your win rate percentage</p>
                </div>
                <Switch
                  checked={formData.show_win_rate}
                  onCheckedChange={(v) => setFormData({...formData, show_win_rate: v})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Show Trade Count</p>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Display total number of trades</p>
                </div>
                <Switch
                  checked={formData.show_trades}
                  onCheckedChange={(v) => setFormData({...formData, show_trades: v})}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                onClick={() => saveMutation.mutate(formData)}
                disabled={!formData.display_name.trim() || saveMutation.isLoading}
                className="bg-gradient-to-r from-cyan-500 to-purple-600"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isLoading ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  );
}