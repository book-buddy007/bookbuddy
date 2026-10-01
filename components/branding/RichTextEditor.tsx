import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Link as LinkIcon, AlertCircle } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { getRemainingCharacters, getCounterStatusColor } from '@/utils/content-validator';

interface RichTextEditorProps {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    maxLength: number;
    label: string;
    error?: string;
}

export function RichTextEditor({ id, value, onChange, maxLength, label, error }: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);

    // Update innerHTML only when value changes externally (but not from our own typing)
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            const textContent = editorRef.current.textContent || '';

            if (textContent.length > maxLength) {
                // Simple truncation if they paste too much
                // Note: Real rich text truncation is complex, this is simplified
                const truncated = textContent.substring(0, maxLength);
                editorRef.current.innerText = truncated;
                onChange(editorRef.current.innerHTML);

                // Move cursor to end
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(editorRef.current);
                range.collapse(false);
                sel?.removeAllRanges();
                sel?.addRange(range);
            } else {
                onChange(html);
            }
        }
    };

    const execCmd = (cmd: string, val?: string) => {
        document.execCommand(cmd, false, val);
        handleInput();
    };

    const handleLink = () => {
        const url = prompt('Enter link URL:');
        if (url) execCmd('createLink', url);
    };

    // Calculate text length purely from text content, ignoring HTML tags
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = value;
    const currentLength = tempDiv.textContent?.length || 0;

    const remainingCount = Math.max(0, maxLength - currentLength);
    const percentage = (remainingCount / maxLength) * 100;
    const counterColor = percentage <= 10 ? 'text-destructive' : percentage <= 25 ? 'text-orange-500' : 'text-muted-foreground';

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label htmlFor={id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {label}
                </label>
                <span className={cn("text-xs font-medium tabular-nums", counterColor)}>
                    {remainingCount} characters remaining
                </span>
            </div>

            <div className={cn("border rounded-md overflow-hidden bg-white", error ? "border-destructive" : "border-input")}>
                <div className="bg-muted/50 border-b p-1 flex items-center gap-1">
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd('bold')} title="Bold">
                        <Bold className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd('italic')} title="Italic">
                        <Italic className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleLink} title="Link">
                        <LinkIcon className="h-4 w-4" />
                    </Button>
                </div>

                <div
                    id={id}
                    ref={editorRef}
                    contentEditable
                    onInput={handleInput}
                    onBlur={handleInput}
                    className="min-h-[80px] w-full p-3 text-sm focus:outline-none"
                    dir="ltr"
                />
            </div>

            {error && (
                <div className="flex items-center mt-1 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
