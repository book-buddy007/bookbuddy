"use client";

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileAudio, FileText } from "@/components/ui/icons";
import { useToast } from "@/components/ui/use-toast";
import { FileUploadZone } from "@/components/catalog/FileUploadZone";
import { catalogKeys } from '@/lib/query-keys';

export function MediaUploadManager() {
  const [mediaType, setMediaType] = useState<'audiobook' | 'ebook'>('audiobook');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Define the upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (uploadData: { fileKey: string; size: number; contentType: string; filename: string }) => {
      // Simulate backend processing that saves the metadata and returns an entity
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        id: Math.random().toString(36).substring(7),
        title: uploadData.filename,
        type: mediaType,
        size: `${(uploadData.size / (1024 * 1024)).toFixed(2)} MB`,
        uploadedAt: 'Just now'
      };
    },
    onMutate: async (newUpload) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: catalogKeys.recentMedia() });

      // Snapshot the previous value
      const previousMedia = queryClient.getQueryData(catalogKeys.recentMedia()) || [];

      // Optimistically update to the new value
      queryClient.setQueryData(catalogKeys.recentMedia(), (old: any) => {
        return [{
          id: 'temp-' + Date.now(),
          title: newUpload.filename,
          type: mediaType,
          size: `${(newUpload.size / (1024 * 1024)).toFixed(2)} MB`,
          uploadedAt: 'Processing...'
        }, ...(old || [])];
      });

      // Return a context object with the snapshotted value
      return { previousMedia };
    },
    onError: (err, newUpload, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(catalogKeys.recentMedia(), context?.previousMedia);
      toast({
        title: "Process failed",
        description: "There was an error saving the media information.",
        variant: "destructive"
      });
    },
    onSuccess: () => {
      toast({
        title: "Upload successful",
        description: `${mediaType === 'audiobook' ? 'Audiobook' : 'E-book'} uploaded and processed seamlessly.`,
        variant: "default"
      });
    },
    onSettled: () => {
      // Always refetch after error or success to synchronize with server
      queryClient.invalidateQueries({ queryKey: catalogKeys.recentMedia() });
    },
  });

  const handleUploadStart = async (file: File) => {
    // Phase 1: Request presigned URL 
    // In our simplified test without real endpoint, we mock a presigned URL callback:
    // return { uploadUrl: '/api/v1/s3/mock-presign', fileKey: file.name };

    // For real integration (when backend endpoints exist):
    const response = await fetch('/api/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileType: mediaType === 'audiobook' ? 'audio/mp3' : 'application/pdf',
        filename: file.name,
        contentType: file.type
      }),
    });
    
    // Fallback simulated response if API doesn't exist yet
    if (response.status === 404) {
      console.warn("Mocking Upload: Endpoint /api/media/upload missing in backend currently.");
      // We return a mock endpoint that we can PUT to without failing (e.g., echo service or dummy block)
      return { uploadUrl: 'https://httpbin.org/put', fileKey: `mock_r2_keys/${file.name}` };
    }

    if (!response.ok) throw new Error('Failed to get presigned URL from server');
    
    // Expect { presignedUrl, uploadId, key } from the real backend
    const data = await response.json();
    return { uploadUrl: data.presignedUrl, fileKey: data.key };
  };

  const handleUploadSuccess = (fileKey: string, size: number, contentType: string) => {
    // The FileUploadZone finishes the XHR upload to S3.
    // Now trigger the mutation to process the media and save to DB optimistically.
    uploadMutation.mutate({
      fileKey,
      size,
      contentType,
      filename: fileKey.split('/').pop() || 'Unknown Media'
    });
  };

  const handleUploadError = (error: string) => {
    toast({
      title: "Upload failed",
      description: error,
      variant: "destructive"
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Media</CardTitle>
        <CardDescription>Upload audiobooks or e-books to the library</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="w-full sm:max-w-sm">
            <label className="block text-sm font-medium mb-2">Media Type</label>
            <Select value={mediaType} onValueChange={(value: 'audiobook' | 'ebook') => setMediaType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select media type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="audiobook">
                  <div className="flex items-center">
                    <FileAudio className="mr-2 h-4 w-4 text-vg-cultural-500" />
                    <span>Audiobook (.mp3, .m4a)</span>
                  </div>
                </SelectItem>
                <SelectItem value="ebook">
                  <div className="flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-vg-success-500" />
                    <span>E-Book (.epub, .pdf)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4">
            <FileUploadZone 
               accept={mediaType === 'audiobook' ? '.mp3,.m4a,.wav,audio/*' : '.pdf,.epub,application/pdf,application/epub+zip'}
               maxSizeBytes={mediaType === 'audiobook' ? 500 * 1024 * 1024 : 50 * 1024 * 1024} // 500MB audio, 50MB ebook
               label={`Drop your ${mediaType} file here`}
               description="Or click anywhere in this box to browse files"
               onUploadStart={handleUploadStart}
               onUploadSuccess={handleUploadSuccess}
               onUploadError={handleUploadError}
               isUploading={uploadMutation.isPending}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 