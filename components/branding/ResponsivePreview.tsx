'use client';

import { useState } from 'react';
import { Card,CardContent } from '@/components/ui/card';
import { Tabs,TabsList,TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Moon,Sun } from '@/components/ui/icons';

interface BreakpointProps {
  device: string;
  width: number;
}

interface ResponsivePreviewProps {
  svgContent: string;
  breakpoints: BreakpointProps[];
}

export function ResponsivePreview({ svgContent, breakpoints }: ResponsivePreviewProps) {
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <Label className="text-sm font-medium">Responsive Preview</Label>
          
          <Tabs defaultValue="light" onValueChange={(value) => setColorMode(value as any)} className="w-auto">
            <TabsList>
              <TabsTrigger value="light" className="flex items-center gap-1">
                <Sun className="h-4 w-4" />
                <span className="hidden sm:inline">Light</span>
              </TabsTrigger>
              <TabsTrigger value="dark" className="flex items-center gap-1">
                <Moon className="h-4 w-4" />
                <span className="hidden sm:inline">Dark</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {breakpoints.map((breakpoint) => (
            <div key={breakpoint.device} className="flex flex-col items-center">
              <span className="text-xs text-muted-foreground mb-2">
                {breakpoint.device} ({breakpoint.width}px)
              </span>
              <div 
                className={`border p-4 flex items-center justify-center w-full ${
                  colorMode === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'
                }`}
                style={{ minHeight: '80px' }}
              >
                <div 
                  className={`w-[${breakpoint.width}px] h-auto max-w-full`} 
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 