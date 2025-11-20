import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageSquare, Share2, TrendingUp, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function PostCard({ post, currentProfile, traderProfiles }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const queryClient = useQueryClient();
  const darkMode = document.documentElement.classList.contains('dark');

  const author = traderProfiles.find(p => p.id === post.trader_profile_id);

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', post.id],
    queryFn: () => base44.entities.Comment.filter({ post_id: post.id }),
    enabled: showComments
  });

  const { data: likes = [] } = useQuery({
    queryKey: ['postLikes', post.id],
    queryFn: () => base44.entities.PostLike.filter({ post_id: post.id })
  });

  const hasLiked = currentProfile && likes.some(l => l.trader_profile_id === currentProfile.id);

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (hasLiked) {
        const like = likes.find(l => l.trader_profile_id === currentProfile.id);
        await base44.entities.PostLike.delete(like.id);
        await base44.entities.Post.update(post.id, { likes_count: Math.max(0, post.likes_count - 1) });
      } else {
        await base44.entities.PostLike.create({ post_id: post.id, trader_profile_id: currentProfile.id });
        await base44.entities.Post.update(post.id, { likes_count: post.likes_count + 1 });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['postLikes', post.id] });
    }
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Comment.create({
        post_id: post.id,
        trader_profile_id: currentProfile.id,
        content: commentText
      });
      await base44.entities.Post.update(post.id, { comments_count: post.comments_count + 1 });
      setCommentText('');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['comments', post.id] });
    }
  });

  const typeColors = {
    Idea: 'bg-blue-500/20 text-blue-400',
    Analysis: 'bg-purple-500/20 text-purple-400',
    Strategy: 'bg-green-500/20 text-green-400',
    Question: 'bg-yellow-500/20 text-yellow-400',
    Achievement: 'bg-pink-500/20 text-pink-400'
  };

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardContent className="p-6">
        {/* Author Info */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
            darkMode ? 'bg-gradient-to-br from-cyan-500 to-purple-600' : 'bg-gradient-to-br from-cyan-400 to-purple-500'
          } text-white`}>
            {author?.display_name?.charAt(0) || '?'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {author?.display_name || 'Anonymous'}
              </span>
              {author?.verified && <CheckCircle2 className="h-4 w-4 text-cyan-500" />}
              <Badge className={typeColors[post.post_type]}>{post.post_type}</Badge>
            </div>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Content */}
        {post.title && (
          <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {post.title}
          </h3>
        )}
        <p className={`mb-4 whitespace-pre-wrap ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          {post.content}
        </p>

        {/* Image */}
        {post.image_url && (
          <img 
            src={post.image_url} 
            alt="Post" 
            className="rounded-lg mb-4 w-full max-h-96 object-cover"
          />
        )}

        {/* Symbols */}
        {post.symbols?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.symbols.map(symbol => (
              <Badge key={symbol} variant="outline" className={darkMode ? 'border-cyan-500/30 text-cyan-400' : 'border-cyan-500/40 text-cyan-700'}>
                <TrendingUp className="h-3 w-3 mr-1" />
                {symbol}
              </Badge>
            ))}
          </div>
        )}

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map(tag => (
              <Badge key={tag} variant="outline" className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4 border-t border-cyan-500/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => currentProfile && likeMutation.mutate()}
            disabled={!currentProfile}
            className={hasLiked ? 'text-red-500' : ''}
          >
            <Heart className={`h-4 w-4 mr-2 ${hasLiked ? 'fill-red-500' : ''}`} />
            {post.likes_count}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {post.comments_count}
          </Button>
          <Button variant="ghost" size="sm">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-cyan-500/20' : 'border-cyan-500/30'} space-y-4`}>
            {currentProfile && (
              <div className="flex gap-2">
                <Textarea
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1"
                  rows={2}
                />
                <Button 
                  onClick={() => commentMutation.mutate()}
                  disabled={!commentText.trim()}
                  className="bg-gradient-to-r from-cyan-500 to-purple-600"
                >
                  Post
                </Button>
              </div>
            )}

            {comments.map(comment => {
              const commentAuthor = traderProfiles.find(p => p.id === comment.trader_profile_id);
              return (
                <div key={comment.id} className={`p-3 rounded-lg ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      darkMode ? 'bg-gradient-to-br from-cyan-500 to-purple-600' : 'bg-gradient-to-br from-cyan-400 to-purple-500'
                    } text-white`}>
                      {commentAuthor?.display_name?.charAt(0) || '?'}
                    </div>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {commentAuthor?.display_name || 'Anonymous'}
                    </span>
                    <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                      {formatDistanceToNow(new Date(comment.created_date), { addSuffix: true })}
                    </span>
                  </div>
                  <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {comment.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}