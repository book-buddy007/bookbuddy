import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookMarked, Copy, Check } from '@/components/ui/icons';

interface CitationGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookData: {
        title: string;
        author: string;
        publisher?: string;
        publishYear?: number;
    };
}

export function CitationGeneratorModal({ isOpen, onClose, bookData }: CitationGeneratorModalProps) {
    const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

    const { title, author, publisher, publishYear } = bookData;
    const year = publishYear || new Date().getFullYear();
    const pub = publisher || 'Independently published';

    // Format authorship
    // Simple heuristic: "John Doe" -> "Doe, J."
    const names = author.trim().split(' ');
    const lastName = names.length > 1 ? names[names.length - 1] : author;
    const firstInitial = names.length > 1 ? `${names[0].charAt(0)}.` : '';
    const apaAuthor = `${lastName}, ${firstInitial}`;
    const mlaAuthor = names.length > 1 ? `${lastName}, ${names.slice(0, names.length - 1).join(' ')}` : author;

    const citations = {
        apa: `${apaAuthor} (${year}). *${title}*. ${pub}.`,
        mla: `${mlaAuthor}. *${title}*. ${pub}, ${year}.`,
        chicago: `${mlaAuthor}. *${title}*. ${pub}, ${year}.`,
        harvard: `${apaAuthor}, ${year}. *${title}*. ${pub}.`
    };

    const handleCopy = (format: string, text: string) => {
        // Strip markdown italics asterisks for actual clipboard copy
        const cleanText = text.replace(/\*/g, '');
        navigator.clipboard.writeText(cleanText);
        setCopiedFormat(format);
        setTimeout(() => setCopiedFormat(null), 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-serif">
                        <BookMarked className="h-5 w-5 text-indigo-500" />
                        Cite This Book
                    </DialogTitle>
                    <DialogDescription>
                        Copy the formatted citation below to use in your academic papers or bibliographies.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="apa" className="w-full mt-2">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="apa">APA 7</TabsTrigger>
                        <TabsTrigger value="mla">MLA 9</TabsTrigger>
                        <TabsTrigger value="chicago">Chicago</TabsTrigger>
                        <TabsTrigger value="harvard">Harvard</TabsTrigger>
                    </TabsList>

                    {Object.entries(citations).map(([format, text]) => (
                        <TabsContent key={format} value={format} className="mt-4">
                            <div className="p-4 bg-muted/50 rounded-lg border relative group flex items-start gap-4">
                                <p
                                    className="text-sm leading-relaxed flex-1 select-all"
                                    dangerouslySetInnerHTML={{ __html: text.replace(/\*(.*?)\*/g, "<i>$1</i>") }}
                                />
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="shrink-0 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleCopy(format, text)}
                                >
                                    {copiedFormat === format ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
