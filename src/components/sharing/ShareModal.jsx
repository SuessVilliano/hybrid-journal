import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { X, Copy, Check, Eye, EyeOff, ExternalLink } from 'lucide-react';

export default function ShareModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data: shareSettings } = useQuery({
    queryKey: ['shareSettings'],
    queryFn: async () => {
      const settings = await base44.entities.ShareSettings.list();
      return settings[0];
    }
  });

  const [formData, setFormData] = useState({
    is_public: shareSettings?.is_public || false,
    hide_dollar_amounts: shareSettings?.hide_dollar_amounts || false,
    show_individual_trades: shareSettings?.show_individual_trades !== false,
    custom_title: shareSettings?.custom_title || 'Trading Performance Dashboard'
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (shareSettings?.id) {
        return await base44.entities.ShareSettings.update(shareSettings.id, {
          ...data,
          last_updated: new Date().toISOString()
        });
      } else {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        return await base44.entities.ShareSettings.create({
          ...data,
          share_token: token,
          last_updated: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shareSettings']);
    }
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleCopyLink = () => {
    if (shareSettings?.share_token) {
      const link = `${window.location.origin}/public-dashboard?token=${shareSettings.share_token}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLink = shareSettings?.share_token 
    ? `${window.location.origin}/public-dashboard?token=${shareSettings.share_token}`
    : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Share Your Performance</CardTitle>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Enable Sharing */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              {formData.is_public ? <Eye className="h-5 w-5 text-green-600" /> : <EyeOff className="h-5 w-5 text-slate-400" />}
              <div>
                <div className="font-medium text-slate-900">Public Sharing</div>
                <div className="text-sm text-slate-600">
                  {formData.is_public ? 'Your dashboard is publicly accessible' : 'Your dashboard is private'}
                </div>
              </div>
            </div>
            <Switch
              checked={formData.is_public}
              onCheckedChange={(checked) => setFormData({...formData, is_public: checked})}
            />
          </div>

          {/* Share Link */}
          {formData.is_public && shareLink && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Public Link</label>
              <div className="flex gap-2">
                <Input value={shareLink} readOnly className="flex-1 font-mono text-sm" />
                <Button onClick={handleCopyLink} variant="outline">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button onClick={() => window.open(shareLink, '_blank')} variant="outline">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Custom Title */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Dashboard Title</label>
            <Input
              value={formData.custom_title}
              onChange={(e) => setFormData({...formData, custom_title: e.target.value})}
              placeholder="My Trading Performance"
            />
          </div>

          {/* Privacy Options */}
          <div className="space-y-4">
            <h3 className="font-medium text-slate-900">Privacy Settings</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-900">Hide Dollar Amounts</div>
                <div className="text-xs text-slate-600">Show percentages and ratios only</div>
              </div>
              <Switch
                checked={formData.hide_dollar_amounts}
                onCheckedChange={(checked) => setFormData({...formData, hide_dollar_amounts: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-900">Show Individual Trades</div>
                <div className="text-xs text-slate-600">Display detailed trade history</div>
              </div>
              <Switch
                checked={formData.show_individual_trades}
                onCheckedChange={(checked) => setFormData({...formData, show_individual_trades: checked})}
              />
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              💡 Your public dashboard updates in real-time as you add trades. Perfect for sharing with investors, mentors, or accountability partners.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}