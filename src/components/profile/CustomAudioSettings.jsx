import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Volume2, X, Play, Mic, Square, Loader2, Edit2, Trash2 } from 'lucide-react';

export default function CustomAudioSettings() {
  const [uploading, setUploading] = useState(false);
  const [testPlaying, setTestPlaying] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();
  const darkMode = document.documentElement.classList.contains('dark');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: audioAlerts = [] } = useQuery({
    queryKey: ['audioAlerts'],
    queryFn: () => base44.entities.CustomAudioAlert.list()
  });

  const createAlertMutation = useMutation({
    mutationFn: async (data) => base44.entities.CustomAudioAlert.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['audioAlerts']);
      setRecordedBlob(null);
      setEditingName('');
    }
  });

  const updateAlertMutation = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.CustomAudioAlert.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['audioAlerts']);
      setEditingId(null);
      setEditingName('');
    }
  });

  const deleteAlertMutation = useMutation({
    mutationFn: async (id) => base44.entities.CustomAudioAlert.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['audioAlerts'])
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
      const name = prompt('Enter a name for this alert sound:');
      if (!name) return;

      await createAlertMutation.mutateAsync({
        name,
        audio_url: file_url,
        notification_types: ['general']
      });
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload audio file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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

    const name = prompt('Enter a name for this recording:');
    if (!name) return;

    setUploading(true);
    try {
      const file = new File([recordedBlob], `${name}.wav`, { type: 'audio/wav' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await createAlertMutation.mutateAsync({
        name,
        audio_url: file_url,
        notification_types: ['general']
      });
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to save recording');
    } finally {
      setUploading(false);
    }
  };

  const playTestAlert = (alertId, audioUrl) => {
    if (!audioUrl) return;
    setTestPlaying(alertId);
    const audio = new Audio(audioUrl);
    audio.play();
    audio.onended = () => setTestPlaying(null);
  };

  const handleRename = (alert) => {
    setEditingId(alert.id);
    setEditingName(alert.name);
  };

  const saveRename = async (alertId) => {
    if (!editingName.trim()) return;
    await updateAlertMutation.mutateAsync({
      id: alertId,
      data: { name: editingName }
    });
  };

  const handleDelete = async (alertId) => {
    if (confirm('Delete this alert sound?')) {
      await deleteAlertMutation.mutateAsync(alertId);
    }
  };

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          <Volume2 className="h-5 w-5" />
          Custom Alert Sounds
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Upload or record your own audio alerts. Assign specific sounds to different notification types.
        </p>

        {/* Recording Section */}
        {recordedBlob ? (
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
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600"
              >
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 'Save Recording'}
              </Button>
              <Button onClick={() => setRecordedBlob(null)} variant="outline" className="text-red-600">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={recording ? stopRecording : startRecording}
              className={recording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-gradient-to-r from-pink-500 to-red-600'}
            >
              {recording ? <><Square className="h-4 w-4 mr-2 fill-current" />Stop</> : <><Mic className="h-4 w-4 mr-2" />Record</>}
            </Button>
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
              />
              <Button disabled={uploading} className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 pointer-events-none">
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <><Upload className="h-4 w-4 mr-2" />Upload</>}
              </Button>
            </div>
          </div>
        )}

        {/* Alert Sounds List */}
        {audioAlerts.length > 0 && (
          <div className="space-y-3">
            <h3 className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Your Alert Sounds
            </h3>
            {audioAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  darkMode ? 'bg-slate-900/50 border border-cyan-500/20' : 'bg-cyan-50 border border-cyan-200'
                }`}
              >
                <div className="flex-1">
                  {editingId === alert.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8"
                      />
                      <Button size="sm" onClick={() => saveRename(alert.id)}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <div>
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {alert.name}
                      </span>
                      {alert.notification_types?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {alert.notification_types.map((type) => (
                            <span key={type} className={`text-xs px-2 py-0.5 rounded ${
                              darkMode ? 'bg-cyan-900/30 text-cyan-400' : 'bg-cyan-100 text-cyan-700'
                            }`}>
                              {type.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => playTestAlert(alert.id, alert.audio_url)}
                    disabled={testPlaying === alert.id}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleRename(alert)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(alert.id)} className="text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
          Supported formats: MP3, WAV, OGG
        </div>
      </CardContent>
    </Card>
  );
}