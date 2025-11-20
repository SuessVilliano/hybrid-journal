import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Upload, Loader2 } from 'lucide-react';

export default function CreatePostModal({ currentProfile, onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    post_type: 'Idea',
    symbols: '',
    tags: '',
    image_url: ''
  });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const darkMode = document.documentElement.classList.contains('dark');

  const createPostMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Post.create({
        ...data,
        trader_profile_id: currentProfile.id,
        symbols: data.symbols ? data.symbols.split(',').map(s => s.trim()) : [],
        tags: data.tags ? data.tags.split(',').map(t => t.trim()) : []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      onClose();
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, image_url: file_url });
    } catch (error) {
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className={`max-w-2xl w-full ${darkMode ? 'bg-slate-950 border-cyan-500/30' : 'bg-white'}`}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className={darkMode ? 'text-white' : 'text-slate-900'}>
            Share Your Idea
          </CardTitle>
          <button onClick={onClose} className={darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}>
            <X className="h-6 w-6" />
          </button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Post Type
            </label>
            <Select value={formData.post_type} onValueChange={(v) => setFormData({...formData, post_type: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Idea">Trading Idea</SelectItem>
                <SelectItem value="Analysis">Market Analysis</SelectItem>
                <SelectItem value="Strategy">Strategy</SelectItem>
                <SelectItem value="Question">Question</SelectItem>
                <SelectItem value="Achievement">Achievement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Title (optional)
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Give your post a title..."
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Content *
            </label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              placeholder="Share your analysis, setup, or question..."
              rows={6}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Symbols (comma separated)
            </label>
            <Input
              value={formData.symbols}
              onChange={(e) => setFormData({...formData, symbols: e.target.value})}
              placeholder="EURUSD, GBPUSD, BTCUSD"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Tags (comma separated)
            </label>
            <Input
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
              placeholder="forex, daytrading, technical-analysis"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Chart/Image
            </label>
            <div className="flex gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="flex-1"
              />
              {uploading && <Loader2 className="h-5 w-5 animate-spin" />}
            </div>
            {formData.image_url && (
              <img src={formData.image_url} alt="Preview" className="mt-2 rounded-lg max-h-40 object-cover" />
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={() => createPostMutation.mutate(formData)}
              disabled={!formData.content.trim() || createPostMutation.isLoading}
              className="bg-gradient-to-r from-cyan-500 to-purple-600"
            >
              {createPostMutation.isLoading ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}