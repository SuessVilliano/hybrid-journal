import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { createPageUrl } from '../../utils';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const darkMode = document.documentElement.classList.contains('dark');

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Notification.filter({ recipient_email: user.email }, '-created_date', 50);
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
      setOpen(false);
    }
  };

  const priorityColors = {
    low: darkMode ? 'border-l-slate-500' : 'border-l-slate-400',
    medium: darkMode ? 'border-l-cyan-500' : 'border-l-cyan-600',
    high: darkMode ? 'border-l-yellow-500' : 'border-l-yellow-600',
    urgent: darkMode ? 'border-l-red-500' : 'border-l-red-600'
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-slate-800/50 transition">
          <Bell className={`h-5 w-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className={`w-96 p-0 ${darkMode ? 'bg-slate-950 border-cyan-500/20' : 'bg-white'}`}
        align="end"
      >
        <div className={`px-4 py-3 border-b ${darkMode ? 'border-cyan-500/20' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Notifications</h3>
            {unreadCount > 0 && (
              <span className={`text-xs ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                {unreadCount} unread
              </span>
            )}
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className={`h-12 w-12 mx-auto mb-3 ${darkMode ? 'text-slate-700' : 'text-slate-300'}`} />
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                No notifications yet
              </p>
            </div>
          ) : (
            <div>
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b border-l-4 cursor-pointer transition ${
                    darkMode ? 'border-b-slate-800 hover:bg-slate-900/50' : 'border-b-slate-100 hover:bg-slate-50'
                  } ${priorityColors[notification.priority]} ${
                    !notification.is_read ? (darkMode ? 'bg-cyan-900/10' : 'bg-cyan-50') : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <div className="h-2 w-2 bg-cyan-500 rounded-full" />
                        )}
                      </div>
                      <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {notification.message}
                      </p>
                      <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        {format(new Date(notification.created_date), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate(notification.id);
                          }}
                          className={`p-1 rounded hover:bg-slate-800 ${darkMode ? 'text-slate-400 hover:text-cyan-400' : 'text-slate-500 hover:text-cyan-600'}`}
                          title="Mark as read"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(notification.id);
                        }}
                        className={`p-1 rounded hover:bg-slate-800 ${darkMode ? 'text-slate-400 hover:text-red-400' : 'text-slate-500 hover:text-red-600'}`}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}