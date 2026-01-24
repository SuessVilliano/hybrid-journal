import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Volume2, X, Play, Mic, Square, Loader2 } from 'lucide-react';

export default function CustomAudioSettings() {
  const [uploading, setUploading] = useState(false);
  const [testPlaying, setTestPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordedBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Failed to access microphone. Please grant permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const playRecordedAudio = () => {
    if (!recordedBlob) return;
    const audioUrl = URL.createObjectURL(recordedBlob);
    const audio = new Audio(audioUrl);
    audio.play();
  };

  const saveRecording = async () => {
    if (!recordedBlob) return;

    setUploading(true);
    try {
      const file = new File([recordedBlob], 'custom-alert.wav', { type: 'audio/wav' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await updateAudioMutation.mutateAsync(file_url);
      setRecordedBlob(null);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to save recording');
    } finally {
      setUploading(false);
    }
  };

  const discardRecording = () => {
    setRecordedBlob(null);
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
          Upload or record your own audio to use for signal and message alerts
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
        ) : recordedBlob ? (
          <div className="space-y-3">
            <div className={`p-4 rounded-lg border-2 border-dashed ${
              darkMode ? 'bg-green-900/20 border-green-500/30' : 'bg-green-50 border-green-300'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                  Recording ready to save
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={playRecordedAudio}
                  className={darkMode ? 'text-green-400 hover:bg-green-900/30' : 'text-green-700 hover:bg-green-100'}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Preview
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={saveRecording}
                  disabled={uploading}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Recording'
                  )}
                </Button>
                <Button
                  onClick={discardRecording}
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Record Button */}
            <Button
              onClick={recording ? stopRecording : startRecording}
              className={`w-full ${
                recording 
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                  : 'bg-gradient-to-r from-pink-500 to-red-600 hover:from-pink-600 hover:to-red-700'
              }`}
            >
              {recording ? (
                <>
                  <Square className="h-4 w-4 mr-2 fill-current" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Record Audio
                </>
              )}
            </Button>

            {/* Upload Button */}
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
              />
              <Button
                disabled={uploading}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 pointer-events-none"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Audio File
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
          Record using your mic or upload MP3, WAV, OGG files
        </div>
      </CardContent>
    </Card>
  );
}