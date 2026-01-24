import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, CheckCheck, Trash2, Search, Filter, ExternalLink, AlertCircle, MessageSquare, Target, TrendingUp, Shield, Calendar, Users, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { formatInTimezone } from '@/components/utils/timezoneHelper';

export default function NotificationsPage() {
  const darkMode = document.documentElement.classList.contains('dark');
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['allNotifications'],
    queryFn: () => base44.entities.Notification.list('-created_date')
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['allNotifications']);
      queryClient.invalidateQueries(['notifications']);
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allNotifications']);
      queryClient.invalidateQueries(['notifications']);
      toast.success('All notifications marked as read');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['allNotifications']);
      queryClient.invalidateQueries(['notifications']);
      toast.success('Notification deleted');
    }
  });

  const filteredNotifications = notifications.filter(n => {
    if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase()) && !n.message.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    if (priorityFilter !== 'all' && n.priority !== priorityFilter) return false;
    if (readFilter === 'unread' && n.is_read) return false;
    if (readFilter === 'read' && !n.is_read) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const typeIcons = {
    system: MessageSquare,
    user_alert: Bell,
    trade_alert: TrendingUp,
    goal_achieved: Target,
    risk_warning: Shield,
    plan_reminder: Calendar,
    access_granted: UserCheck,
    access_request: Users,
    message: MessageSquare
  };

  const priorityColors = {
    low: darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700',
    medium: darkMode ? 'bg-cyan-900 text-cyan-300' : 'bg-cyan-100 text-cyan-700',
    high: darkMode ? 'bg-orange-900 text-orange-300' : 'bg-orange-100 text-orange-700',
    urgent: darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Notifications
            </h1>
            <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
              {unreadCount > 0 ? `${unreadCount} unread notification(s)` : 'All caught up!'}
            </p>
          </div>
          <Button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={unreadCount === 0}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Mark All Read
          </Button>
        </div>

        {/* Filters */}
        <Card className={`mb-6 ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}`}>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notifications..."
                  className={`pl-10 ${darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}`}
                />
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="trade_alert">Trade Alert</SelectItem>
                  <SelectItem value="goal_achieved">Goal Achieved</SelectItem>
                  <SelectItem value="risk_warning">Risk Warning</SelectItem>
                  <SelectItem value="plan_reminder">Plan Reminder</SelectItem>
                  <SelectItem value="access_granted">Access Granted</SelectItem>
                  <SelectItem value="message">Message</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>

              <Select value={readFilter} onValueChange={setReadFilter}>
                <SelectTrigger className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12">
              <div className={`text-lg ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Loading notifications...
              </div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className={`h-16 w-16 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
              <div className={`text-lg ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {searchQuery || typeFilter !== 'all' || priorityFilter !== 'all' || readFilter !== 'all'
                  ? 'No notifications match your filters'
                  : 'No notifications yet'}
              </div>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const Icon = typeIcons[notification.type] || Bell;
              
              return (
                <Card
                  key={notification.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    !notification.is_read
                      ? darkMode
                        ? 'bg-slate-900/80 border-cyan-500/30 shadow-cyan-500/10'
                        : 'bg-cyan-50/50 border-cyan-500/40'
                      : darkMode
                      ? 'bg-slate-950/60 border-slate-700/30'
                      : 'bg-white border-slate-200'
                  }`}
                  onClick={() => {
                    if (!notification.is_read) {
                      markAsReadMutation.mutate(notification.id);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${
                        !notification.is_read
                          ? 'bg-gradient-to-br from-cyan-500 to-purple-600'
                          : darkMode
                          ? 'bg-slate-800'
                          : 'bg-slate-100'
                      }`}>
                        <Icon className={`h-5 w-5 ${!notification.is_read ? 'text-white' : darkMode ? 'text-slate-400' : 'text-slate-600'}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className={`font-semibold ${
                            darkMode ? 'text-white' : 'text-slate-900'
                          } ${!notification.is_read && 'font-bold'}`}>
                            {notification.title}
                          </h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={priorityColors[notification.priority]}>
                              {notification.priority}
                            </Badge>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                            )}
                          </div>
                        </div>

                        <p className={`text-sm mb-3 ${
                          darkMode ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                              {formatInTimezone(notification.created_date)}
                            </span>
                            {notification.sender_email && (
                              <Badge variant="outline" className="text-xs">
                                From: {notification.sender_email}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {notification.link && (
                              <a
                                href={notification.link}
                                target={notification.link.startsWith('http') ? '_blank' : '_self'}
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button variant="ghost" size="sm" className="gap-1">
                                  <ExternalLink className="h-3 w-3" />
                                  View
                                </Button>
                              </a>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMutation.mutate(notification.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}