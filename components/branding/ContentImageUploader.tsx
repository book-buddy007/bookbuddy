'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { UploadCloud, Check, AlertCircle } from 'lucide-react';
import Image from 'next/image';

interface ImageUploaderProps {
  label?: string;
  currentImage?: string;
  onUpload: (file: File) => Promise<string>;
  aspectRatio: string;
  recommendedSize: string;
  formats: string[];
  value: string;
  onChange: (value: string) => void;
  maxSize?: number; // in KB
  error?: string;
}

export function ImageUploader({
  label = 'Image',
  currentImage,
  onUpload,
  aspectRatio,
  recommendedSize,
  formats,
  value,
  onChange,
  maxSize = 2048, // 2MB default
  error
}: ImageUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Calculate aspect ratio for preview
  const [width, height] = aspectRatio.split(':').map(Number);
  const aspectRatioPct = (height / width) * 100;
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setUploadError(null);
    setUploadSuccess(false);
    
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    
    // Validate file type
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const acceptedFormats = formats.map(f => f.toLowerCase());
    if (!acceptedFormats.includes(fileExt)) {
      setUploadError(`Invalid file format. Please use ${formats.join(', ')}.`);
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    
    // Validate file size
    if (file.size > maxSize * 1024) {
      setUploadError(`File size exceeds ${maxSize / 1024}MB limit.`);
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    
    // Create preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setSelectedFile(file);
  };
  
  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setUploadError(null);
    
    try {
      const imageUrl = await onUpload(selectedFile);
      onChange(imageUrl);
      setUploadSuccess(true);
      
      // Reset form after successful upload
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFile(null);
    } catch (err) {
      setUploadError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      {label && <Label>{label}</Label>}
      
      {/* Current image preview */}
      {value && (
        <div className="relative overflow-hidden border rounded-md bg-muted/30" style={{ paddingBottom: `${aspectRatioPct}%` }}>
          <Image 
            src={value} 
            alt="Current image" 
            fill
            className="object-cover"
          />
        </div>
      )}
      
      {/* Upload controls */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept={formats.map(f => `.${f}`).join(',')}
            onChange={handleFileChange}
            disabled={isUploading}
            className="flex-1"
          />
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Uploading...
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </div>
        
        {/* File information */}
        {selectedFile && !uploadError && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Check className="h-4 w-4 mr-2 text-green-500" />
            Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)}KB)
          </div>
        )}
        
        {/* Preview */}
        {previewUrl && (
          <div className="relative overflow-hidden border rounded-md bg-muted/30" style={{ paddingBottom: `${aspectRatioPct}%` }}>
            <Image 
              src={previewUrl} 
              alt="Preview" 
              fill
              className="object-cover"
            />
          </div>
        )}
        
        {/* Error message */}
        {(uploadError || error) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{uploadError || error}</AlertDescription>
          </Alert>
        )}
        
        {/* Success message */}
        {uploadSuccess && (
          <Alert variant="default" className="bg-green-50 text-green-800 border-green-200">
            <Check className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>Image uploaded successfully!</AlertDescription>
          </Alert>
        )}
        
        {/* Requirements */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Recommended size: {recommendedSize}</p>
          <p>• Aspect ratio: {aspectRatio}</p>
          <p>• Allowed formats: {formats.join(', ')}</p>
          <p>• Max size: {maxSize / 1024}MB</p>
        </div>
      </div>
    </div>
  );
} 