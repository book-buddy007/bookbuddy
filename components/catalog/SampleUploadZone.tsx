'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, X, Loader2, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface SampleUploadZoneProps {
  label: string;
  file: File | null;
  progress: number;
  status: 'idle' | 'uploading' | 'done' | 'error';
  error?: string;
  onFileSelect: (file: File | null) => void;
}

export function SampleUploadZone({
  label,
  file,
  progress,
  status,
  error,
  onFileSelect,
}: SampleUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: false,
    disabled: status === 'uploading' || status === 'done',
  });

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status === 'uploading' || status === 'done') return;
    onFileSelect(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline mb-1">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
        {status === 'done' && <Badge className="bg-emerald-500 hover:bg-emerald-600"><Check className="w-3 h-3 mr-1" /> Attached</Badge>}
      </div>

      <div
        {...getRootProps()}
        className={`group relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer min-h-[160px]
          ${isDragActive ? 'border-indigo-500 bg-indigo-50/50' : isDragReject ? 'border-red-500 bg-red-50/50' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50 dark:bg-slate-900'}
          ${(status === 'uploading' || status === 'done') ? 'cursor-default opacity-90' : ''}
          ${file && status !== 'uploading' && status !== 'done' ? 'border-indigo-400 bg-indigo-50/20' : ''}
        `}
      >
        <input {...getInputProps()} />

        {status === 'uploading' ? (
          <div className="flex flex-col items-center w-full max-w-xs">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mb-3" />
            <div className="flex justify-between w-full text-xs font-medium mb-1.5 text-slate-700">
              <span className="truncate max-w-[150px]">{file?.name}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : status === 'done' && file ? (
          <div className="flex flex-col items-center text-emerald-600">
            <Check className="w-8 h-8 mb-2" />
            <span className="text-sm font-bold">{file.name}</span>
            <span className="text-xs opacity-80">{formatFileSize(file.size)}</span>
          </div>
        ) : file ? (
          <div className="flex flex-col items-center">
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-full mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 text-center truncate max-w-[200px]">{file.name}</span>
            <Badge variant="secondary" className="mt-1">{formatFileSize(file.size)}</Badge>
          </div>
        ) : (
          <div className="flex flex-col items-center text-slate-500 dark:text-slate-400">
            <div className="p-3 bg-slate-200 dark:bg-slate-800 rounded-full mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <p className="font-semibold text-sm mb-1">Click or drag sample preview</p>
            <p className="text-xs">PDF only (Max 50MB)</p>
          </div>
        )}

        {/* Clear Button */}
        {file && status !== 'uploading' && status !== 'done' && (
          <button
            onClick={clearFile}
            className="absolute top-3 right-3 z-20 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-md transition-colors opacity-0 group-hover:opacity-100"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      
      {error && <p className="text-xs text-red-500 font-medium mt-1">{error}</p>}
    </div>
  );
}
