import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookA, BookmarkPlus, Loader2, Globe, Languages, ExternalLink } from '@/components/ui/icons';
import { useAuthStore } from '@/store/useAuthStore';
import { useDictionaryStore } from '@/store/useDictionaryStore';
import { toast } from 'sonner';

export function DictionaryModal() {
    const { isOpen, word, contextSentence, bookId, closeDictionary } = useDictionaryStore();
    const [lookupData, setLookupData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { user } = useAuthStore();

    useEffect(() => {
        if (isOpen && word) {
            const fetchData = async () => {
                setIsLoading(true);
                setLookupData(null);

                try {
                    const res = await fetch(`/api/dictionary/lookup?word=${encodeURIComponent(word)}`);
                    if (res.ok) {
                        const data = await res.json();
                        setLookupData(data);
                    }
                } catch (error) {
                    console.error("Failed to fetch dictionary data", error);
                } finally {
                    setIsLoading(false);
                }
            };

            fetchData();
        }
    }, [word, isOpen]);

    const handleSaveVocabulary = async () => {
        if (!user) {
            toast.error('You must be logged in to save vocabulary');
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch('/api/dictionary/vocabulary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    word,
                    definition: lookupData?.definition || '',
                    context: contextSentence,
                    bookId
                })
            });

            if (response.ok) {
                toast.success(`'${word}' saved to your vocabulary`);
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            toast.error('Failed to save vocabulary');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && closeDictionary()}>
            <DialogContent className="sm:max-w-[500px]" overlayBgClass="bg-black/30" overlayClassName="backdrop-blur-sm">
                <DialogHeader>
                    <DialogTitle className="flex justify-between items-center text-xl font-display">
                        <div className="flex items-center gap-2">
                            <span className="capitalize">{word}</span>
                            {lookupData?.pronunciation && (
                                <span className="text-sm text-muted-foreground font-sans font-normal">
                                    {lookupData.pronunciation}
                                </span>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSaveVocabulary}
                            disabled={isSaving}
                            className="ml-4 gap-1 h-8"
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookmarkPlus className="h-4 w-4" />}
                            Save
                        </Button>
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (!lookupData || (!lookupData.definition && !lookupData.wikiExtract && !lookupData.hindiTranslation)) ? (
                    <div className="py-8 text-center flex flex-col items-center justify-center space-y-3">
                        <p className="text-muted-foreground">No definitions found for &quot;{word}&quot;.</p>
                        <p className="text-sm text-slate-500">You can still save this word to your vocabulary list to review later.</p>
                    </div>
                ) : (
                    <Tabs defaultValue={lookupData.definition ? "dictionary" : (lookupData.hindiTranslation ? "translation" : "wikipedia")} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="dictionary" disabled={!lookupData.definition} className="gap-2">
                                <BookA className="h-4 w-4" />
                                Dictionary
                            </TabsTrigger>
                            {/* Phase 3: the translation tab's language depends on the
                                looked-up word — English words translate to Hindi, Hindi
                                words to English. translationLang is derived server-side. */}
                            <TabsTrigger value="translation" disabled={!lookupData.hindiTranslation} className="gap-2">
                                <Languages className="h-4 w-4" />
                                {lookupData.translationLang === 'en' ? 'English' : 'Hindi'}
                            </TabsTrigger>
                            <TabsTrigger value="wikipedia" disabled={!lookupData.wikiExtract} className="gap-2">
                                <Globe className="h-4 w-4" />
                                Wikipedia
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="dictionary" className="mt-4 max-h-[60vh] overflow-y-auto pr-2 space-y-4">
                            {lookupData.definition && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <h4 className="font-semibold capitalize text-primary border-b pb-1">
                                            {lookupData.partOfSpeech || 'Definition'}
                                        </h4>
                                        <div className="text-sm text-foreground">
                                            {lookupData.definition}
                                        </div>
                                        {lookupData.example && (
                                            <p className="text-sm text-muted-foreground italic mt-2">
                                                &quot;{lookupData.example}&quot;
                                            </p>
                                        )}
                                    </div>
                                    
                                    {contextSentence && (
                                        <div className="mt-6 pt-4 border-t border-border">
                                            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Found in context</h5>
                                            <p className="text-sm italic pl-3 border-l-2 border-primary/50 text-muted-foreground">
                                                &quot;{contextSentence}&quot;
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="translation" className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
                            {lookupData.hindiTranslation && (
                                <div className="flex flex-col items-center justify-center py-6 space-y-4">
                                    <h4 className="text-3xl font-semibold text-primary">
                                        {lookupData.hindiTranslation}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {lookupData.translationLang === 'en' ? 'English' : 'Hindi'} translation provided by MyMemory API
                                    </p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="wikipedia" className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
                            {lookupData.wikiExtract && (
                                <div className="space-y-6 pb-4">
                                    <div className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
                                        {lookupData.wikiExtract.split(/\n+/).filter(Boolean).map((paragraph: string, index: number) => (
                                            <p key={index} className="mb-5 text-justify last:mb-0">
                                                {index === 0 && paragraph.length > 0 ? (
                                                    <>
                                                        <span className="float-left text-5xl leading-[0.85] font-bold text-indigo-500 dark:text-indigo-400 mr-3 mt-1 font-display">
                                                            {paragraph.charAt(0)}
                                                        </span>
                                                        <span className="font-medium text-slate-900 dark:text-slate-100">
                                                            {paragraph.slice(1).split(' ').slice(0, 4).join(' ')}{' '}
                                                        </span>
                                                        {paragraph.slice(1).split(' ').slice(4).join(' ')}
                                                    </>
                                                ) : (
                                                    paragraph
                                                )}
                                            </p>
                                        ))}
                                    </div>
                                    {lookupData.wikiUrl && (
                                        <div className="pt-5 border-t border-slate-100 dark:border-slate-800/60 flex justify-center">
                                            <a
                                                href={lookupData.wikiUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 dark:bg-slate-900/50 dark:border-slate-800 dark:hover:border-indigo-800/80 dark:hover:bg-indigo-900/30 text-xs font-semibold tracking-wide text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-all duration-300 hover:shadow-sm"
                                            >
                                                Read full article on Wikipedia <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
