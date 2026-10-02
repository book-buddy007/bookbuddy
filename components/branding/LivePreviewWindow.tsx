'use client';

import { useState,useEffect } from 'react';
import { Card,CardContent,CardHeader,CardTitle,CardDescription } from '@/components/ui/card';
import { Tabs,TabsList,TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LayoutGrid,Smartphone,Tablet,ExternalLink } from '@/components/ui/icons';
import Link from 'next/link';
import { toast } from '@/components/ui/use-toast';

interface LivePreviewWindowProps {
  htmlContent: string;
  children?: React.ReactNode;
}

export function LivePreviewWindow({ htmlContent, children }: LivePreviewWindowProps) {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [debouncedHtml, setDebouncedHtml] = useState(htmlContent);
  const [previewToken] = useState('temp-token-123'); // In a real app this would be fetched

  // 500ms debounce for htmlContent
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedHtml(htmlContent);
    }, 500);

    return () => clearTimeout(handler);
  }, [htmlContent]);

  // Define viewport sizes for different devices
  const viewportSizes = {
    desktop: { width: '100%', height: '600px', maxWidth: '100%' },
    tablet: { width: '768px', height: '600px', maxWidth: '100%' },
    mobile: { width: '375px', height: '600px', maxWidth: '100%' }
  };

  const handleOpenNewTab = () => {
    // Generate read-only token logic would go here
    toast({
      title: "Preview link generated",
      description: "Link expires in 30 minutes",
    });
  };

  return (
    <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-indigo-100 dark:border-indigo-900/30">
        <div>
          <CardTitle className="text-indigo-900 dark:text-indigo-100 flex items-center gap-2">Live Preview</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">See how your homepage looks in real-time</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild onClick={handleOpenNewTab} className="gap-2">
          <Link href={`/preview/homepage?token=${previewToken}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open in new tab
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <Tabs value={device} onValueChange={(value) => setDevice(value as any)} className="w-auto">
            <TabsList className="bg-indigo-50 dark:bg-slate-900">
              <TabsTrigger value="desktop" className="flex items-center gap-1 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">View Desktop</span>
              </TabsTrigger>
              <TabsTrigger value="tablet" className="flex items-center gap-1 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400">
                <Tablet className="h-4 w-4" />
                <span className="hidden sm:inline">View Tablet</span>
              </TabsTrigger>
              <TabsTrigger value="mobile" className="flex items-center gap-1 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400">
                <Smartphone className="h-4 w-4" />
                <span className="hidden sm:inline">View Mobile</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="border rounded-t-xl overflow-hidden flex justify-center bg-muted/30 shadow-inner">
          <div style={{
            width: viewportSizes[device].width,
            height: viewportSizes[device].height,
            maxWidth: viewportSizes[device].maxWidth,
            transition: 'width 0.3s ease'
          }}>
            {/* Note: Iframe does not have key={device} to prevent reload on viewport switch */}
            <iframe
              title="Preview"
              srcDoc={`
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                      body { margin: 0; font-family: system-ui, sans-serif; background-color: #fff; }
                      .preview-content { height: 100%; overflow: auto; }
                    </style>
                  </head>
                  <body>
                    <div class="preview-content">${debouncedHtml}</div>
                  </body>
                </html>
              `}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                backgroundColor: 'white'
              }}
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        </div>

        {children}
      </CardContent>
    </Card>
  );
} 