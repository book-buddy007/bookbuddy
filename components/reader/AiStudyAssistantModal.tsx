import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, Sparkles, Loader2 } from "@/components/ui/icons";

interface AiStudyAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialContext: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export function AiStudyAssistantModal({ isOpen, onClose, initialContext }: AiStudyAssistantModalProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && initialContext && messages.length === 0) {
            handleChat(`Please explain this excerpt:\n"${initialContext}"`);
        }
    }, [isOpen, initialContext]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleChat = async (messageText: string) => {
        if (!messageText.trim()) return;

        const newMessage: Message = { role: 'user', content: messageText };
        setMessages(prev => [...prev, newMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    systemPrompt: "You are a helpful, expert study assistant. Your goal is to explain concepts clearly, provide examples, and answer questions. Use formatting like bolding and bullet points to make your explanations easy to read.",
                    context: initialContext,
                    userMessage: messageText
                })
            });

            if (!response.ok) throw new Error('Failed to get explanation');

            const data = await response.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I couldn't process that request at the moment. Please ensure the AI service is running or try again later." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setMessages([]);
        setInput('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden flex flex-col h-[600px] max-h-[85vh]">
                <DialogHeader className="p-4 border-b bg-muted/30">
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        AI Study Assistant
                    </DialogTitle>
                    <DialogDescription className="text-xs line-clamp-2 italic">
                        Context: "{initialContext}"
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    <div className="space-y-4">
                        {messages.length === 0 && !isLoading && (
                            <div className="text-center text-muted-foreground text-sm mt-10">
                                <Bot className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                <p>Hi! I'm your AI study buddy.</p>
                                <p>I'm analyzing your selection now...</p>
                            </div>
                        )}
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                                        <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                )}
                                <div className={`text-sm rounded-lg p-3 max-w-[85%] ${msg.role === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted/50 border whitespace-pre-wrap'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3 justify-start">
                                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                    <Bot className="h-4 w-4 text-purple-600" />
                                </div>
                                <div className="flex items-center gap-1 bg-muted/50 border rounded-lg p-3">
                                    <span className="animate-bounce">●</span>
                                    <span className="animate-bounce delay-100">●</span>
                                    <span className="animate-bounce delay-200">●</span>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t bg-background">
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleChat(input); }}
                        className="flex items-center gap-2"
                    >
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a follow-up question..."
                            className="flex-1"
                            disabled={isLoading}
                        />
                        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
