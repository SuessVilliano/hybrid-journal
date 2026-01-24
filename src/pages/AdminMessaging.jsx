import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Send, Users, UserCheck, Filter, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminMessaging() {
  const darkMode = document.documentElement.classList.contains('dark');
  
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: currentUser?.role === 'admin'
  });

  const [targetType, setTargetType] = useState('all');
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [filterRoles, setFilterRoles] = useState([]);
  const [filterEmailContains, setFilterEmailContains] = useState('');
  const [emailInput, setEmailInput] = useState('');
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [priority, setPriority] = useState('medium');

  const sendMessageMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await base44.functions.invoke('sendAdminMessage', payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Message sent to ${data.count} user(s)!`);
      setTitle('');
      setMessage('');
      setLink('');
      setSelectedEmails([]);
    },
    onError: (error) => {
      toast.error('Failed to send message: ' + error.message);
    }
  });

  const handleSend = () => {
    const target = {
      type: targetType,
      emails: targetType === 'specific' ? selectedEmails : undefined,
      roles: targetType === 'filter' ? filterRoles : undefined,
      email_contains: targetType === 'filter' ? filterEmailContains : undefined
    };

    sendMessageMutation.mutate({ title, message, link, priority, target });
  };

  const addEmail = () => {
    if (emailInput && !selectedEmails.includes(emailInput)) {
      setSelectedEmails([...selectedEmails, emailInput]);
      setEmailInput('');
    }
  };

  const toggleRole = (role) => {
    if (filterRoles.includes(role)) {
      setFilterRoles(filterRoles.filter(r => r !== role));
    } else {
      setFilterRoles([...filterRoles, role]);
    }
  };

  const recipientCount = targetType === 'all' 
    ? allUsers.length 
    : targetType === 'specific' 
    ? selectedEmails.length 
    : allUsers.filter(u => {
        if (filterRoles.length > 0 && !filterRoles.includes(u.role)) return false;
        if (filterEmailContains && !u.email.toLowerCase().includes(filterEmailContains.toLowerCase())) return false;
        return true;
      }).length;

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Access Denied
            </h2>
            <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
              This page is only accessible to admin users.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Admin Messaging
          </h1>
          <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
            Send messages to users via notifications
          </p>
        </div>

        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
          <CardHeader>
            <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
              Compose Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Message Content */}
            <div className="space-y-4">
              <div>
                <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Message title"
                  className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
                />
              </div>

              <div>
                <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Message</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Your message to users"
                  rows={6}
                  className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
                />
              </div>

              <div>
                <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Link (optional)</Label>
                <Input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="e.g., /Help or https://..."
                  className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
                />
              </div>

              <div>
                <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Recipients */}
            <div className={`border-t pt-6 ${darkMode ? 'border-cyan-500/20' : 'border-cyan-500/30'}`}>
              <Label className={`${darkMode ? 'text-slate-300' : 'text-slate-700'} mb-3 block`}>Recipients</Label>
              
              <div className="flex gap-2 mb-4">
                <Button
                  variant={targetType === 'all' ? 'default' : 'outline'}
                  onClick={() => setTargetType('all')}
                  size="sm"
                  className="gap-2"
                >
                  <Users className="h-4 w-4" />
                  All Users
                </Button>
                <Button
                  variant={targetType === 'specific' ? 'default' : 'outline'}
                  onClick={() => setTargetType('specific')}
                  size="sm"
                  className="gap-2"
                >
                  <UserCheck className="h-4 w-4" />
                  Specific Users
                </Button>
                <Button
                  variant={targetType === 'filter' ? 'default' : 'outline'}
                  onClick={() => setTargetType('filter')}
                  size="sm"
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filter Users
                </Button>
              </div>

              {targetType === 'specific' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addEmail()}
                      placeholder="Enter email address"
                      className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
                    />
                    <Button onClick={addEmail} size="icon" variant="outline">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmails.map((email) => (
                      <Badge key={email} className="flex items-center gap-1">
                        {email}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setSelectedEmails(selectedEmails.filter(e => e !== email))}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {targetType === 'filter' && (
                <div className="space-y-3">
                  <div>
                    <Label className={`${darkMode ? 'text-slate-300' : 'text-slate-700'} text-sm mb-2 block`}>
                      Filter by Role
                    </Label>
                    <div className="flex gap-2">
                      {['admin', 'user'].map((role) => (
                        <Button
                          key={role}
                          onClick={() => toggleRole(role)}
                          variant={filterRoles.includes(role) ? 'default' : 'outline'}
                          size="sm"
                        >
                          {role}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className={`${darkMode ? 'text-slate-300' : 'text-slate-700'} text-sm`}>
                      Email Contains
                    </Label>
                    <Input
                      value={filterEmailContains}
                      onChange={(e) => setFilterEmailContains(e.target.value)}
                      placeholder="e.g., @gmail.com"
                      className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
                    />
                  </div>
                </div>
              )}

              <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-slate-900/50' : 'bg-cyan-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Recipients: <span className="font-bold text-cyan-500">{recipientCount}</span> user(s)
                </p>
              </div>
            </div>

            <Button
              onClick={handleSend}
              disabled={!title || !message || recipientCount === 0 || sendMessageMutation.isPending}
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-600"
            >
              {sendMessageMutation.isPending ? 'Sending...' : `Send to ${recipientCount} User(s)`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}