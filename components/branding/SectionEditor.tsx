'use client';

import { useState,useEffect,forwardRef } from 'react';
import { Card,CardContent,CardHeader,CardTitle,CardDescription } from '@/components/ui/card';
import { Collapsible,CollapsibleContent,CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronsUpDown } from '@/components/ui/icons';
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
  ({ title, description, defaultOpen = true, children, onToggle }, ref) => {
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
          className="rounded-[18px] border border-bb-border"
        >
          <Card className="border-0 bg-transparent shadow-none">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer rounded-t-[18px] transition-colors hover:bg-bb-surface-2">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="font-display text-lg font-extrabold tracking-[-0.02em]">{title}</CardTitle>
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

SectionEditor.displayName = 'SectionEditor';
