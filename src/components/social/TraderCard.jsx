import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, UserCheck, CheckCircle2 } from 'lucide-react';

export default function TraderCard({ profile, currentProfile, follows, compact = false }) {
  const queryClient = useQueryClient();
  const darkMode = document.documentElement.classList.contains('dark');

  const isFollowing = currentProfile && follows.some(f => 
    f.follower_profile_id === currentProfile.id && f.following_profile_id === profile.id
  );

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        const follow = follows.find(f => 
          f.follower_profile_id === currentProfile.id && f.following_profile_id === profile.id
        );
        await base44.entities.Follow.delete(follow.id);
        await base44.entities.TraderProfile.update(profile.id, { 
          followers_count: Math.max(0, profile.followers_count - 1) 
        });
        await base44.entities.TraderProfile.update(currentProfile.id, { 
          following_count: Math.max(0, currentProfile.following_count - 1) 
        });
      } else {
        await base44.entities.Follow.create({
          follower_profile_id: currentProfile.id,
          following_profile_id: profile.id
        });
        await base44.entities.TraderProfile.update(profile.id, { 
          followers_count: profile.followers_count + 1 
        });
        await base44.entities.TraderProfile.update(currentProfile.id, { 
          following_count: (currentProfile.following_count || 0) + 1 
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traderProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['follows'] });
    }
  });

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
          darkMode ? 'bg-gradient-to-br from-cyan-500 to-purple-600' : 'bg-gradient-to-br from-cyan-400 to-purple-500'
        } text-white`}>
          {profile.display_name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {profile.display_name}
            </span>
            {profile.verified && <CheckCircle2 className="h-3 w-3 text-cyan-500" />}
          </div>
          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {profile.followers_count} followers
          </p>
        </div>
        {currentProfile && currentProfile.id !== profile.id && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => followMutation.mutate()}
          >
            {isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
      <div className="flex items-start gap-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
          darkMode ? 'bg-gradient-to-br from-cyan-500 to-purple-600' : 'bg-gradient-to-br from-cyan-400 to-purple-500'
        } text-white`}>
          {profile.display_name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {profile.display_name}
            </h3>
            {profile.verified && <CheckCircle2 className="h-4 w-4 text-cyan-500" />}
          </div>
          {profile.trading_style && (
            <Badge className="mb-2">{profile.trading_style}</Badge>
          )}
          {profile.bio && (
            <p className={`text-sm mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {profile.bio}
            </p>
          )}
          <div className={`flex gap-4 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            <span><strong>{profile.followers_count}</strong> followers</span>
            <span><strong>{profile.following_count}</strong> following</span>
          </div>
        </div>
        {currentProfile && currentProfile.id !== profile.id && (
          <Button
            onClick={() => followMutation.mutate()}
            variant={isFollowing ? "outline" : "default"}
            className={!isFollowing ? 'bg-gradient-to-r from-cyan-500 to-purple-600' : ''}
          >
            {isFollowing ? (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                Following
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Follow
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}