import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, Lightbulb, MessageSquare, Plus } from 'lucide-react';
import PostCard from '@/components/social/PostCard';
import CreatePostModal from '@/components/social/CreatePostModal';
import TraderCard from '@/components/social/TraderCard';

export default function SocialFeed() {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(null);
  const queryClient = useQueryClient();
  const darkMode = document.documentElement.classList.contains('dark');

  useEffect(() => {
    const loadProfile = async () => {
      const user = await base44.auth.me();
      const profiles = await base44.entities.TraderProfile.list();
      const userProfile = profiles.find(p => p.created_by === user.email);
      setCurrentProfile(userProfile);
    };
    loadProfile();
  }, []);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: () => base44.entities.Post.list('-created_date', 100)
  });

  const { data: traderProfiles = [] } = useQuery({
    queryKey: ['traderProfiles'],
    queryFn: async () => {
      const profiles = await base44.entities.TraderProfile.list();
      return profiles.filter(p => p.is_public);
    }
  });

  const { data: follows = [] } = useQuery({
    queryKey: ['follows'],
    queryFn: () => base44.entities.Follow.list()
  });

  const followingIds = currentProfile 
    ? follows.filter(f => f.follower_profile_id === currentProfile.id).map(f => f.following_profile_id)
    : [];

  const feedPosts = posts.filter(post => 
    !currentProfile || followingIds.includes(post.trader_profile_id) || post.trader_profile_id === currentProfile?.id
  );

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
              darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
            } bg-clip-text text-transparent`}>
              Trading Community
            </h1>
            <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-cyan-700/70 mt-1'}>
              Share ideas, follow traders, and learn together
            </p>
          </div>
          {currentProfile && (
            <Button 
              onClick={() => setShowCreatePost(true)}
              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Share an Idea
            </Button>
          )}
        </div>

        {!currentProfile && (
          <Card className={`border-cyan-500/30 ${darkMode ? 'bg-slate-950/80' : 'bg-white'}`}>
            <CardContent className="p-6">
              <div className="text-center">
                <Users className={`h-12 w-12 mx-auto mb-4 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Create Your Trader Profile
                </h3>
                <p className={`mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Set up your profile to share ideas and follow other traders
                </p>
                <Button 
                  onClick={() => window.location.href = '/app/TraderProfile'}
                  className="bg-gradient-to-r from-cyan-500 to-purple-600"
                >
                  Create Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="following" className="space-y-6">
              <TabsList className={darkMode ? 'bg-slate-950/80 border border-cyan-500/20' : 'bg-white border border-cyan-500/30'}>
                <TabsTrigger value="following" className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600 data-[state=active]:text-white ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
                  <Users className="h-4 w-4 mr-2" />
                  Following
                </TabsTrigger>
                <TabsTrigger value="trending" className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600 data-[state=active]:text-white ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Trending
                </TabsTrigger>
                <TabsTrigger value="ideas" className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600 data-[state=active]:text-white ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Ideas
                </TabsTrigger>
              </TabsList>

              <TabsContent value="following" className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
                  </div>
                ) : feedPosts.length > 0 ? (
                  feedPosts.map(post => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      currentProfile={currentProfile}
                      traderProfiles={traderProfiles}
                    />
                  ))
                ) : (
                  <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
                    <CardContent className="p-12 text-center">
                      <MessageSquare className={`h-12 w-12 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
                      <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                        No posts yet. Follow traders to see their ideas here!
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="trending" className="space-y-4">
                {posts.sort((a, b) => (b.likes_count + b.comments_count) - (a.likes_count + a.comments_count)).slice(0, 20).map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    currentProfile={currentProfile}
                    traderProfiles={traderProfiles}
                  />
                ))}
              </TabsContent>

              <TabsContent value="ideas" className="space-y-4">
                {posts.filter(p => p.post_type === 'Idea' || p.post_type === 'Strategy').map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    currentProfile={currentProfile}
                    traderProfiles={traderProfiles}
                  />
                ))}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
              <CardHeader>
                <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
                  Top Traders
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {traderProfiles.sort((a, b) => b.followers_count - a.followers_count).slice(0, 5).map(profile => (
                  <TraderCard 
                    key={profile.id} 
                    profile={profile} 
                    currentProfile={currentProfile}
                    follows={follows}
                    compact
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {showCreatePost && (
          <CreatePostModal 
            currentProfile={currentProfile}
            onClose={() => setShowCreatePost(false)}
          />
        )}
      </div>
    </div>
  );
}