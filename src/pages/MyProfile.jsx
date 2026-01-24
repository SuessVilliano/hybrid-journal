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
import NotificationPreferences from '@/components/profile/NotificationPreferences';
import APIKeyManager from '@/components/profile/APIKeyManager';
import CustomAudioSettings from '@/components/profile/CustomAudioSettings';

export default function MyProfile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    preferred_name: '',
    location: '',
    trader_type: '',
    experience_level: '',
    primary_markets: [],
    primary_goals: [],
    risk_tolerance: '',
    account_size: '',
    strategies: [],
    main_challenges: [],
    prop_firm_trader: false,
    prop_firm_name: ''
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
            Update your trading preferences and profile settings
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Preferred Name *
                </label>
                <Input
                  value={formData.preferred_name}
                  onChange={(e) => setFormData({...formData, preferred_name: e.target.value})}
                  placeholder="What should we call you?"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Location
                </label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="City, Country"
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Trading Style
              </label>
              <Select value={formData.trader_type} onValueChange={(v) => setFormData({...formData, trader_type: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your trading style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Day Trader">Day Trader</SelectItem>
                  <SelectItem value="Swing Trader">Swing Trader</SelectItem>
                  <SelectItem value="Scalper">Scalper</SelectItem>
                  <SelectItem value="Position Trader">Position Trader</SelectItem>
                  <SelectItem value="Algorithmic Trader">Algorithmic Trader</SelectItem>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Experience Level
              </label>
              <Select value={formData.experience_level} onValueChange={(v) => setFormData({...formData, experience_level: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner (0-6 months)">Beginner (0-6 months)</SelectItem>
                  <SelectItem value="Intermediate (6 months - 2 years)">Intermediate (6 months - 2 years)</SelectItem>
                  <SelectItem value="Advanced (2-5 years)">Advanced (2-5 years)</SelectItem>
                  <SelectItem value="Expert (5+ years)">Expert (5+ years)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Risk Tolerance
              </label>
              <Select value={formData.risk_tolerance} onValueChange={(v) => setFormData({...formData, risk_tolerance: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your risk tolerance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Conservative (0.5-1% per trade)">Conservative (0.5-1% per trade)</SelectItem>
                  <SelectItem value="Moderate (1-2% per trade)">Moderate (1-2% per trade)</SelectItem>
                  <SelectItem value="Aggressive (2-3% per trade)">Aggressive (2-3% per trade)</SelectItem>
                  <SelectItem value="Very Aggressive (3%+ per trade)">Very Aggressive (3%+ per trade)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-600/10 border border-cyan-500/20">
              <div>
                <p className={`font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Prop Firm Trader</p>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Are you trading with a prop firm?</p>
              </div>
              <Switch
                checked={formData.prop_firm_trader}
                onCheckedChange={(v) => setFormData({...formData, prop_firm_trader: v})}
              />
            </div>

            {formData.prop_firm_trader && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Prop Firm Name
                </label>
                <Input
                  value={formData.prop_firm_name}
                  onChange={(e) => setFormData({...formData, prop_firm_name: e.target.value})}
                  placeholder="e.g., FTMO, MyForexFunds"
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button 
                onClick={() => saveMutation.mutate(formData)}
                disabled={!formData.preferred_name?.trim() || saveMutation.isPending}
                className="bg-gradient-to-r from-cyan-500 to-purple-600"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <WebhookSettings />

        <NotificationPreferences />

        <CustomAudioSettings />

        <APIKeyManager />
      </div>
    </div>
  );
}