'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { UploadCloud, Check, AlertCircle } from '@/components/ui/icons';
import Image from 'next/image';

interface LogoUploaderProps {
  currentLogo: string;
  onUpload: (file: File) => Promise<void>;
  constraints: {
    maxSize: number; // in KB
    acceptedFormats: string[];
  };
  preview?: React.ReactNode;
}

export function LogoUploader({
  currentLogo,
  onUpload,
  constraints,
  preview
}: LogoUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError(null);
    setSuccess(false);

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    // Validate file type
    const acceptedMimeTypes = constraints.acceptedFormats;
    if (!acceptedMimeTypes.includes(file.type)) {
      setError(`Invalid file format. Please use ${acceptedMimeTypes.map(f => f.split('/')[1].toUpperCase()).join(', ')}.`);
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    // Validate file size
    if (file.size > constraints.maxSize * 1024) {
      setError(`File size exceeds ${constraints.maxSize / 1024}MB limit`);
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
    setError(null);

    try {
      await onUpload(selectedFile);
      setSuccess(true);

      // Reset form after successful upload
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFile(null);
    } catch (err) {
      setError('Failed to upload logo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current logo display */}
      <div>
        <Label className="text-sm font-medium">Current Logo</Label>
        <div className="mt-2 border rounded-md p-4 flex items-center justify-center bg-muted/40 min-h-[100px]">
          {currentLogo ? (
            currentLogo.startsWith('<svg') ? (
              <div
                className="w-[160px] h-[53px] relative"
                dangerouslySetInnerHTML={{ __html: currentLogo }}
              />
            ) : (
              <Image
                src={currentLogo.trim()}
                alt="Current Logo"
                width={160}
                height={53}
                style={{ objectFit: 'contain' }}
              />
            )
          ) : (
            <span className="text-muted-foreground text-sm">No logo uploaded</span>
          )}
        </div>
      </div>

      {/* Upload section */}
      <div className="space-y-4">
        <Label htmlFor="logo-upload">Upload New Logo</Label>

        <div className="flex items-center space-x-2">
          <Input
            id="logo-upload"
            ref={fileInputRef}
            type="file"
            accept={constraints.acceptedFormats.join(',')}
            onChange={handleFileChange}
            disabled={isUploading}
            className="flex-1"
          />
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all"
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
        {selectedFile && !error && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Check className="h-4 w-4 mr-2 text-green-500" />
            Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)}KB)
          </div>
        )}

        {/* Error message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success message */}
        {success && (
          <Alert variant="default" className="bg-teal-50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-800/50">
            <Check className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>Logo uploaded successfully!</AlertDescription>
          </Alert>
        )}

        {/* Requirements and recommendations */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Allowed formats: {constraints.acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}</p>
          <p>• Max size: {constraints.maxSize / 1024}MB</p>
          <p>• <strong>Recommended:</strong> SVG format for sharper display on all screen sizes</p>
          <p>• Maintain an aspect ratio between 3:1 and 4:1 for best results</p>
        </div>
      </div>

      {/* Preview section */}
      {previewUrl && (
        <div className="space-y-2">
          <Label>Preview</Label>
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col items-center">
                  <span className="text-xs text-muted-foreground mb-2">Desktop (160px)</span>
                  <div className="border p-4 flex items-center justify-center bg-white w-full">
                    <Image
                      src={previewUrl}
                      alt="Desktop preview"
                      width={160}
                      height={53}
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xs text-muted-foreground mb-2">Mobile (120px)</span>
                  <div className="border p-4 flex items-center justify-center bg-white w-full">
                    <Image
                      src={previewUrl}
                      alt="Mobile preview"
                      width={120}
                      height={40}
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dynamic preview if provided */}
      {preview && (
        <div className="space-y-2">
          <Label>Responsive Preview</Label>
          {preview}
        </div>
      )}
    </div>
  );
} 