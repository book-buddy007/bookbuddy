'use client';

import { useState,useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { UploadCloud,FileIcon,CheckCircle,AlertCircle } from '@/components/ui/icons';
import { Alert,AlertDescription,AlertTitle } from '@/components/ui/alert';

export interface FileUploadZoneProps {
  accept?: string;
  maxSizeBytes?: number;
  label?: string;
  description?: string;
  isUploading?: boolean;
  onUploadStart?: (file: File) => Promise<{ uploadUrl: string; fileKey: string }>;
  onUploadSuccess?: (fileKey: string, fileSizeBytes: number, mimeType: string) => void;
  onUploadError?: (error: string) => void;
}

export function FileUploadZone({
  accept = '*/*',
  maxSizeBytes = 50 * 1024 * 1024, // 50MB default
  label = 'Upload File',
  description = 'Drag and drop your file here, or click to browse',
  isUploading: externalIsUploading = false,
  onUploadStart,
  onUploadSuccess,
  onUploadError,
}: FileUploadZoneProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovering(true);
  };

  const handleDragLeave = () => {
    setIsHovering(false);
  };

  const validateFile = (selectedFile: File): boolean => {
    if (selectedFile.size > maxSizeBytes) {
      setErrorMessage(`File exceeds the maximum size of ${(maxSizeBytes / (1024 * 1024)).toFixed(2)} MB`);
      setStatus('error');
      return false;
    }
    // Simple extension/mime check could be added here based on `accept`
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovering(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        setStatus('idle');
        setErrorMessage(null);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        setStatus('idle');
        setErrorMessage(null);
      }
    }
  };

  const cancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
    }
    reset();
  };

  const reset = () => {
    setFile(null);
    setProgress(0);
    setStatus('idle');
    setErrorMessage(null);
    if (xhrRef.current) xhrRef.current = null;
  };

  const startUpload = async () => {
    if (!file || !onUploadStart) return;

    setStatus('uploading');
    setProgress(0);
    setErrorMessage(null);

    try {
      // 1. Get Presigned URL
      const { uploadUrl, fileKey } = await onUploadStart(file);

      if (!uploadUrl) {
        throw new Error('Failed to get upload URL from server');
      }

      // 2. Perform XHR Upload to track progress
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setStatus('success');
          setProgress(100);
          if (onUploadSuccess) {
            onUploadSuccess(fileKey, file.size, file.type || 'application/octet-stream');
          }
        } else {
          setStatus('error');
          const errorMsg = `Upload failed with status: ${xhr.status}`;
          setErrorMessage(errorMsg);
          if (onUploadError) onUploadError(errorMsg);
        }
      };

      xhr.onerror = () => {
        setStatus('error');
        setErrorMessage('Network error occurred during upload');
        if (onUploadError) onUploadError('Network error occurred during upload');
      };

      xhr.onabort = () => {
        setStatus('idle');
        setErrorMessage('Upload cancelled');
      };

      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    } catch (error: any) {
      console.error('Upload initiation error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Failed to initiate upload');
      if (onUploadError) onUploadError(error.message || 'Failed to initiate upload');
    }
  };

  const isActuallyUploading = status === 'uploading' || externalIsUploading;

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors ${
          isHovering ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
        } ${isActuallyUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileSelect}
          disabled={isActuallyUploading}
        />
        
        <div className="flex flex-col items-center text-center space-y-2 pointer-events-none">
          <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
          <h3 className="font-medium text-lg">{label}</h3>
          <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
        </div>
      </div>

      {file && status !== 'success' && (
        <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center space-x-3 truncate mr-4">
            <FileIcon className="h-8 w-8 text-primary flex-shrink-0" />
            <div className="truncate">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            {status === 'idle' && (
              <>
                <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={reset}>
                  Remove
                </Button>
                <Button size="sm" className="h-8" onClick={startUpload}>
                  Upload
                </Button>
              </>
            )}
            {status === 'uploading' && (
              <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={cancelUpload}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      {status === 'uploading' && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm font-medium">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {status === 'error' && errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Upload Failed</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {status === 'success' && (
        <Alert className="border-green-500 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-400">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Upload Successful</AlertTitle>
          <AlertDescription>Your file has been uploaded securely.</AlertDescription>
          <Button size="sm" variant="outline" className="mt-2" onClick={reset}>
            Upload Another
          </Button>
        </Alert>
      )}
    </div>
  );
}
