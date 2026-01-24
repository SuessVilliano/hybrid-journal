import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Volume2, X, Play } from 'lucide-react';

export default function CustomAudioSettings() {
  const [uploading, setUploading] = useState(false);
  const [testPlaying, setTestPlaying] = useState(false);
  const queryClient = useQueryClient();
  const darkMode = document.documentElement.classList.contains('dark');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const updateAudioMutation = useMutation({
    mutationFn: async (audioUrl) => {
      await base44.auth.updateMe({
        notification_preferences: {
          ...(user.notification_preferences || {}),
          custom_audio_url: audioUrl
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user']);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      alert('Please upload an audio file (MP3, WAV, OGG)');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await updateAudioMutation.mutateAsync(file_url);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload audio file');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAudio = async () => {
    await updateAudioMutation.mutateAsync(null);
  };

  const playTestAlert = () => {
    const audioUrl = user?.notification_preferences?.custom_audio_url;
    if (!audioUrl) return;

    setTestPlaying(true);
    const audio = new Audio(audioUrl);
    audio.play();
    audio.onended = () => setTestPlaying(false);
  };

  const customAudioUrl = user?.notification_preferences?.custom_audio_url;

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          <Volume2 className="h-5 w-5" />
          Custom Alert Sound
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Upload your own audio file to use for signal and message alerts
        </p>

        {customAudioUrl ? (
          <div className="space-y-3">
            <div className={`flex items-center justify-between p-3 rounded-lg ${
              darkMode ? 'bg-slate-900/50 border border-cyan-500/20' : 'bg-cyan-50 border border-cyan-200'
            }`}>
              <span className={`text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Custom alert sound uploaded
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={playTestAlert}
                  disabled={testPlaying}
                >
                  <Play className="h-4 w-4 mr-1" />
                  {testPlaying ? 'Playing...' : 'Test'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRemoveAudio}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
              id="audio-upload"
            />
            <label htmlFor="audio-upload">
              <Button
                as="span"
                disabled={uploading}
                className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Audio File
                  </>
                )}
              </Button>
            </label>
          </div>
        )}

        <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
          Supported formats: MP3, WAV, OGG
        </div>
      </CardContent>
    </Card>
  );
}