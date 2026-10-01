'use client';

import { useState, useEffect, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SectionEditorProps {
  title: string;
  description?: string;
  name: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  onToggle?: (isOpen: boolean) => void;
}

export const SectionEditor = forwardRef<HTMLDivElement, SectionEditorProps>(
  ({ title, description, name, defaultOpen = true, children, onToggle }, ref) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    useEffect(() => {
      if (onToggle) {
        onToggle(isOpen);
      }
    }, [isOpen, onToggle]);
    
    return (
      <div ref={ref} className="w-full">
        <Collapsible
          open={isOpen}
          onOpenChange={setIsOpen}
          className="border rounded-md"
        >
          <Card className="border-0 shadow-none">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">{title}</CardTitle>
                    {description && (
                      <CardDescription>{description}</CardDescription>
                    )}
                  </div>
                  <Button variant="ghost" size="sm">
                    <ChevronsUpDown className={`h-4 w-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
                    <span className="sr-only">Toggle section</span>
                  </Button>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid gap-4">{children}</div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    );
  }
); 