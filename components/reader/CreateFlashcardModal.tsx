import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, Loader2 } from '@/components/ui/icons';
import { toast } from 'sonner';

interface CreateFlashcardModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialFrontText: string;
    bookId?: string;
    bookTitle?: string;
}

export function CreateFlashcardModal({ isOpen, onClose, initialFrontText, bookId, bookTitle }: CreateFlashcardModalProps) {
    const [front, setFront] = useState(initialFrontText);
    const [back, setBack] = useState('');
    const [decks, setDecks] = useState<any[]>([]);
    const [selectedDeckId, setSelectedDeckId] = useState<string>('');
    const [isLoadingDecks, setIsLoadingDecks] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Sync initial text when it changes
    useEffect(() => {
        if (isOpen) {
            setFront(initialFrontText);
            setBack(''); // reset back
        }
    }, [initialFrontText, isOpen]);

    // Fetch decks on open
    useEffect(() => {
        if (isOpen) {
            const fetchDecks = async () => {
                setIsLoadingDecks(true);
                try {
                    const res = await fetch('/api/flashcards/decks');
                    if (res.ok) {
                        const data = await res.json();
                        setDecks(data);
                        if (data.length > 0) {
                            setSelectedDeckId(data[0].id);
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch decks", error);
                } finally {
                    setIsLoadingDecks(false);
                }
            };

            fetchDecks();
        }
    }, [isOpen]);

    const handleCreateDeck = async () => {
        const title = bookTitle ? `Notes: ${bookTitle}` : 'General Reading Notes';
        try {
            const res = await fetch('/api/flashcards/decks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, bookId })
            });
            if (res.ok) {
                const newDeck = await res.json();
                setDecks([...decks, newDeck]);
                setSelectedDeckId(newDeck.id);
                toast.success(`Deck "${title}" created`);
            }
        } catch (err) {
            toast.error('Failed to create deck');
        }
    };

    const handleSave = async () => {
        if (!front.trim() || !back.trim()) {
            toast.error("Both front and back are required.");
            return;
        }

        if (!selectedDeckId) {
            toast.error("Please select or create a deck first.");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch('/api/flashcards/cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deckId: selectedDeckId,
                    frontContent: front,
                    backContent: back
                })
            });

            if (res.ok) {
                toast.success('Flashcard created perfectly!');
                onClose();
            } else {
                throw new Error();
            }
        } catch (e) {
            toast.error('Failed to create flashcard');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-serif">
                        <Layers className="h-5 w-5 text-emerald-500" />
                        Create Flashcard
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>Deck</Label>
                            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleCreateDeck} disabled={isLoadingDecks}>
                                + Create New Deck
                            </Button>
                        </div>

                        <Select value={selectedDeckId} onValueChange={setSelectedDeckId} disabled={isLoadingDecks || decks.length === 0}>
                            <SelectTrigger>
                                <SelectValue placeholder={isLoadingDecks ? "Loading decks..." : decks.length === 0 ? "No decks available" : "Select a deck"} />
                            </SelectTrigger>
                            <SelectContent>
                                {decks.map((deck) => (
                                    <SelectItem key={deck.id} value={deck.id}>
                                        {deck.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Front</Label>
                        <Textarea
                            value={front}
                            onChange={e => setFront(e.target.value)}
                            placeholder="e.g., A term, question, or concept..."
                            className="resize-none h-20"
                        />
                        <p className="text-xs text-muted-foreground text-right">{front.length}/500</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Back</Label>
                        <Textarea
                            value={back}
                            onChange={e => setBack(e.target.value)}
                            placeholder="e.g., The definition, answer, or explanation..."
                            className="resize-none h-24"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || !front || !back || !selectedDeckId}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Card
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
