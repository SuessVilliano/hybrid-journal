import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Shield, Eye, Edit, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export default function SharedAccess() {
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [grantForm, setGrantForm] = useState({
    shared_with_email: '',
    permission_level: 'view',
    access_type: 'observer',
    note: ''
  });
  const queryClient = useQueryClient();
  const darkMode = document.documentElement.classList.contains('dark');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: grantedAccess = [] } = useQuery({
    queryKey: ['grantedAccess'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.SharedAccess.filter({ owner_email: user.email }, '-created_date', 50);
    }
  });

  const { data: receivedAccess = [] } = useQuery({
    queryKey: ['receivedAccess'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.SharedAccess.filter({ shared_with_email: user.email }, '-created_date', 50);
    }
  });

  const grantAccessMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      await base44.entities.SharedAccess.create({
        owner_email: user.email,
        ...data
      });
      // Send notification to recipient
      await base44.entities.Notification.create({
        recipient_email: data.shared_with_email,
        sender_email: user.email,
        type: 'access_granted',
        title: 'New Access Granted',
        message: `${user.full_name || user.email} has granted you ${data.permission_level} access to their trading journal`,
        priority: 'high'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['grantedAccess']);
      setShowGrantForm(false);
      setGrantForm({ shared_with_email: '', permission_level: 'view', access_type: 'observer', note: '' });
      alert('Access granted successfully!');
    },
    onError: (error) => {
      console.error('Grant access error:', error);
      alert(`Failed to grant access: ${error.message}`);
    }
  });

  const updateAccessMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.SharedAccess.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['grantedAccess', 'receivedAccess']);
    }
  });

  const deleteAccessMutation = useMutation({
    mutationFn: (id) => base44.entities.SharedAccess.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['grantedAccess']);
    }
  });

  const permissionIcons = {
    view: Eye,
    edit: Edit,
    manage: Shield
  };

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    active: 'bg-green-500/20 text-green-400',
    revoked: 'bg-red-500/20 text-red-400',
    declined: 'bg-slate-500/20 text-slate-400'
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
            darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
          } bg-clip-text text-transparent`}>
            Shared Access
          </h1>
          <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-cyan-700/70 mt-1'}>
            Share your trading journal with mentors, students, or team members
          </p>
        </div>

        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Users className={`h-5 w-5 mt-0.5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
              <div>
                <h3 className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Collaborate & Learn
                </h3>
                <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Grant access to others without sharing login credentials. Perfect for mentorship, team trading, or accountability partnerships.
                </p>
                <div className="mt-3 space-y-1">
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    <strong>View:</strong> Read-only access to your trades, plans, and analytics
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    <strong>Edit:</strong> Can modify your trades and plans
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    <strong>Manage:</strong> Full control including settings and access management
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {!showGrantForm && (
          <Button
            onClick={() => setShowGrantForm(true)}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-600"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Grant Access to Another Trader
          </Button>
        )}

        {showGrantForm && (
          <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
            <CardHeader>
              <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>Grant Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Trader Email
                </label>
                <Input
                  type="email"
                  value={grantForm.shared_with_email}
                  onChange={(e) => setGrantForm({ ...grantForm, shared_with_email: e.target.value })}
                  placeholder="trader@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Permission Level
                  </label>
                  <Select value={grantForm.permission_level} onValueChange={(v) => setGrantForm({ ...grantForm, permission_level: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">View (Read Only)</SelectItem>
                      <SelectItem value="edit">Edit</SelectItem>
                      <SelectItem value="manage">Manage (Full Control)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Relationship Type
                  </label>
                  <Select value={grantForm.access_type} onValueChange={(v) => setGrantForm({ ...grantForm, access_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mentor">Mentor</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="team_member">Team Member</SelectItem>
                      <SelectItem value="observer">Observer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Note (Optional)
                </label>
                <Textarea
                  value={grantForm.note}
                  onChange={(e) => setGrantForm({ ...grantForm, note: e.target.value })}
                  placeholder="Add a note about this access grant..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowGrantForm(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!grantForm.shared_with_email?.trim()) {
                      alert('Please enter an email address');
                      return;
                    }
                    grantAccessMutation.mutate(grantForm);
                  }}
                  disabled={!grantForm.shared_with_email || grantAccessMutation.isPending}
                  className="bg-gradient-to-r from-cyan-500 to-purple-600"
                >
                  {grantAccessMutation.isPending ? 'Granting...' : 'Grant Access'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
          <CardHeader>
            <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>Access I've Granted</CardTitle>
          </CardHeader>
          <CardContent>
            {grantedAccess.length === 0 ? (
              <p className={`text-center py-8 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                You haven't granted access to anyone yet
              </p>
            ) : (
              <div className="space-y-3">
                {grantedAccess.map(access => {
                  const PermIcon = permissionIcons[access.permission_level];
                  return (
                    <div key={access.id} className={`p-4 rounded-lg border ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              {access.shared_with_email}
                            </span>
                            <Badge className={statusColors[access.status]}>
                              {access.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="flex items-center gap-1">
                              <PermIcon className="h-3 w-3" />
                              <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                                {access.permission_level}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {access.access_type}
                            </Badge>
                          </div>
                          {access.note && (
                            <p className={`text-xs mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                              {access.note}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {access.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateAccessMutation.mutate({ id: access.id, status: 'revoked' })}
                              className="text-red-500 hover:text-red-600"
                            >
                              Revoke
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteAccessMutation.mutate(access.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
          <CardHeader>
            <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>Access I've Received</CardTitle>
          </CardHeader>
          <CardContent>
            {receivedAccess.length === 0 ? (
              <p className={`text-center py-8 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                No one has shared access with you yet
              </p>
            ) : (
              <div className="space-y-3">
                {receivedAccess.map(access => {
                  const PermIcon = permissionIcons[access.permission_level];
                  return (
                    <div key={access.id} className={`p-4 rounded-lg border ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              {access.owner_email}
                            </span>
                            <Badge className={statusColors[access.status]}>
                              {access.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="flex items-center gap-1">
                              <PermIcon className="h-3 w-3" />
                              <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                                {access.permission_level} access
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              as {access.access_type}
                            </Badge>
                          </div>
                        </div>
                        {access.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateAccessMutation.mutate({ id: access.id, status: 'active' })}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateAccessMutation.mutate({ id: access.id, status: 'declined' })}
                              className="text-red-500"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}