'use client';

import React,{ useState,useRef } from 'react';
import { Loader2,CheckCircle2,AlertCircle,Trash2,Mic } from '@/components/ui/icons';
import { useToast } from '@/components/ui/use-toast';
import * as adminApi from '@/lib/api/adminApi';

interface UploadSlotProps {
  bookId: string;
  sectionId: string;
  gender: 'MALE' | 'FEMALE';
  track?: { id: string; fileUrl: string; durationMs: number | null };
  onUploadSuccess: (trackInfo: any) => void;
  onClearTrack?: (gender: 'MALE' | 'FEMALE') => void; // Optional if we implement delete
}

export function UploadSlot({ bookId, sectionId, gender, track, onUploadSuccess, onClearTrack }: UploadSlotProps) {
  const [uploadStatus, setUploadStatus] = useState<'IDLE' | 'READING' | 'UPLOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
        URL.revokeObjectURL(objectUrl);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Error loading audio. Is it a valid audio file?'));
      };
      audio.src = objectUrl;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) fileInputRef.current.value = '';

    if (!file.type.startsWith('audio/')) {
      toast({ title: 'Invalid file', description: 'Please select an audio file', variant: 'destructive' });
      return;
    }

    try {
      // Normalize non-standard MIME types to bypass aggressive backend validation
      let normalizedType = file.type;
      if (normalizedType === 'audio/x-m4a') normalizedType = 'audio/m4a';
      if (normalizedType === 'audio/mp3') normalizedType = 'audio/mpeg';

      setUploadStatus('READING');
      setProgress(0);
      const durationSeconds = await getAudioDuration(file);

      setUploadStatus('UPLOADING');
      // 1. Get Pre-signed URL
      const urlRes = await adminApi.getAudioUploadUrl(bookId, sectionId, {
        gender,
        filename: file.name,
        mimeType: normalizedType,
      });

      if (!urlRes.success || !urlRes.data?.uploadUrl) {
        throw new Error(urlRes.error || 'Failed to get upload URL');
      }

      const { uploadUrl, publicUrl } = urlRes.data;

      // 2. Upload to R2 via XMLHttpRequest to track progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error('Upload failed with status ' + xhr.status));
        };
        xhr.onerror = () => reject(new Error('Upload network error'));
        xhr.open('PUT', uploadUrl);
        // Important: Setting Content-Type matches the presigned URL requirement
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // 3. Save track details to backend
      const saveRes = await adminApi.saveAudioTracks(bookId, sectionId, {
        gender,
        fileUrl: publicUrl,
        durationSeconds: durationSeconds,
        fileSizeBytes: file.size,
      });

      if (!saveRes.success) {
        throw new Error(saveRes.error || 'Failed to save track');
      }

      setUploadStatus('SUCCESS');
      toast({ title: 'Success', description: 'Audio track uploaded successfully' });
      
      onUploadSuccess({
        id: saveRes.data.id || 'new', // Best guess if id is returned, otherwise fallback
        gender,
        fileUrl: publicUrl,
        durationMs: durationSeconds * 1000,
      });

      setTimeout(() => setUploadStatus('IDLE'), 2000);
    } catch (err: any) {
      console.error(err);
      setUploadStatus('ERROR');
      toast({ title: 'Upload Failed', description: err.message || 'An error occurred', variant: 'destructive' });
      setTimeout(() => setUploadStatus('IDLE'), 3000);
    }
  };

  const getFormatDuration = (ms: number | null | undefined) => {
    if (!ms) return '';
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const hasTrack = !!track?.fileUrl;

  return (
    <div className={`relative flex items-center justify-between p-3 rounded-lg border transition-all
      ${hasTrack ? 'bg-bb-success-soft/50 border-bb-success/30' : 'bg-bb-surface-2 border-dashed border-bb-border'} 
    `}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${gender === 'MALE' ? 'bg-bb-info-soft text-bb-info-ink' : 'bg-bb-info-soft text-bb-info-ink'}`}>
          {gender === 'MALE' ? <Mic className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </div>
        <div>
          <p className="text-sm font-semibold text-bb-text">
            {gender === 'MALE' ? 'Male Voice' : 'Female Voice'}
          </p>
          {hasTrack && uploadStatus === 'IDLE' && (
            <p className="text-xs text-bb-success-ink flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Uploaded {getFormatDuration(track.durationMs)}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {uploadStatus === 'IDLE' && (
          <>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                ${hasTrack
                  ? 'bg-bb-surface text-bb-muted border border-bb-border hover:bg-bb-surface-2'
                  : 'bg-bb-info-soft text-bb-info-ink hover:bg-bb-info-soft'
                }
              `}
            >
              {hasTrack ? 'Replace' : 'Upload'}
            </button>
            {hasTrack && onClearTrack && (
              <button
                onClick={() => onClearTrack(gender)}
                className="p-1.5 text-bb-faint hover:text-bb-danger-ink hover:bg-bb-danger-soft rounded-md transition-colors"
                title="Remove track"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </>
        )}

        {(uploadStatus === 'READING' || uploadStatus === 'UPLOADING') && (
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-xs font-medium text-bb-muted">
                {uploadStatus === 'READING' ? 'Processing audio...' : `Uploading ${progress}%`}
              </span>
              {uploadStatus === 'UPLOADING' && (
                <div className="w-24 h-1.5 bg-bb-surface-2 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-bb-info transition-all duration-200 ease-out" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
            <Loader2 className="w-4 h-4 text-bb-info-ink animate-spin" />
          </div>
        )}

        {uploadStatus === 'SUCCESS' && (
          <span className="text-xs font-medium text-bb-success-ink flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Done
          </span>
        )}

        {uploadStatus === 'ERROR' && (
          <span className="text-xs font-medium text-bb-danger-ink flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> Error
          </span>
        )}
      </div>
    </div>
  );
}
