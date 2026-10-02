'use client';

import { useCallback,useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus,X,Loader2,Check } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

export interface CoverUploadZoneProps {
  label: string;
  side: 'front' | 'back';
  file: File | null;
  progress: number;
  status: 'idle' | 'uploading' | 'done' | 'error';
  error?: string;
  onFileSelect: (file: File | null) => void;
}

export function CoverUploadZone({
  label,
  side,
  file,
  progress,
  status,
  error,
  onFileSelect,
}: CoverUploadZoneProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const selected = acceptedFiles[0];
        onFileSelect(selected);
        const objectUrl = URL.createObjectURL(selected);
        setPreviewUrl(objectUrl);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false,
    disabled: status === 'uploading' || status === 'done',
  });

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status === 'uploading' || status === 'done') return;
    onFileSelect(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline mb-1">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
        {status === 'done' && <Badge className="bg-emerald-500 hover:bg-emerald-600"><Check className="w-3 h-3 mr-1" /> Uploaded</Badge>}
      </div>

      <div
        {...getRootProps()}
        className={`group relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl overflow-hidden transition-all duration-200 cursor-pointer
          ${isDragActive ? 'border-indigo-500 bg-indigo-50/50' : isDragReject ? 'border-red-500 bg-red-50/50' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50 dark:bg-slate-900'}
          ${(status === 'uploading' || status === 'done') ? 'cursor-default opacity-90' : ''}
        `}
        style={{ aspectRatio: '2/3', minHeight: '300px' }} // Standard book ratio
      >
        <input {...getInputProps()} />

        {/* Image Preview */}
        {previewUrl && (
          <div className="absolute inset-0 z-0">
            <img src={previewUrl} alt={`${side} cover preview`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {/* Upload State Overlays */}
        <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center h-full w-full">
          {status === 'uploading' ? (
            <div className="flex flex-col items-center bg-white/90 dark:bg-slate-900/90 p-4 rounded-xl shadow-lg backdrop-blur-sm">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Uploading Cover...</span>
              <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : status === 'done' ? (
            <div className="flex flex-col items-center bg-emerald-500/90 p-4 rounded-xl shadow-lg backdrop-blur-sm text-white">
              <Check className="w-8 h-8 mb-2" />
              <span className="text-sm font-bold">Upload Complete</span>
            </div>
          ) : (
            // Idle State
            <div className={`flex flex-col items-center ${previewUrl ? 'opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md text-white' : 'text-slate-500 dark:text-slate-400'}`}>
              <div className={`p-4 rounded-full mb-3 ${previewUrl ? 'bg-black/50 backdrop-blur-md' : 'bg-slate-200 dark:bg-slate-800'}`}>
                <ImagePlus className="w-8 h-8" />
              </div>
              <p className="font-semibold text-sm mb-1">Drop image or click</p>
              <div className={`text-xs space-y-1 ${previewUrl ? 'text-slate-200' : 'text-slate-400'}`}>
                <p>JPG, PNG, WebP (Max 5MB)</p>
                <p>Ratio 2:3 (e.g. 1600 × 2560px)</p>
              </div>
            </div>
          )}
        </div>

        {/* Clear Button */}
        {file && status !== 'uploading' && status !== 'done' && (
          <button
            onClick={clearFile}
            className="absolute top-3 right-3 z-20 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {error && <p className="text-xs text-red-500 font-medium mt-1">{error}</p>}
    </div>
  );
}
