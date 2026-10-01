import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';

export function useOfflineAutoSave(
    formValues: any,
    saveAction: (data: any) => Promise<boolean>,
    tenantId: string,
    isDirty: boolean
) {
    const [isOnline, setIsOnline] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Track online/offline status
    useEffect(() => {
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            toast({ title: 'You are back online', description: 'Syncing pending changes...' });
            // Execute any queued saves
            const queuedData = localStorage.getItem(`offline-save-${tenantId}`);
            if (queuedData) {
                saveAction(JSON.parse(queuedData)).then(success => {
                    if (success) {
                        localStorage.removeItem(`offline-save-${tenantId}`);
                        setLastSaved(new Date());
                    }
                });
            }
        };

        const handleOffline = () => {
            setIsOnline(false);
            toast({ title: 'You are offline', description: 'Changes will be saved locally.', variant: 'destructive' });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [tenantId, saveAction]);

    // Auto-save every 3s if dirty
    useEffect(() => {
        if (!isDirty || !tenantId) return;

        const timer = setTimeout(async () => {
            setIsSaving(true);

            try {
                if (!isOnline) {
                    // Offline mode - save to local storage (simulating IndexedDB for simplicity)
                    localStorage.setItem(`offline-save-${tenantId}`, JSON.stringify(formValues));
                    setLastSaved(new Date());
                } else {
                    // Online - attempt real save
                    const success = await saveAction(formValues);
                    if (success) setLastSaved(new Date());
                }
            } catch (err) {
                console.error('Auto-save failed', err);
            } finally {
                setIsSaving(false);
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, [formValues, isDirty, isOnline, tenantId, saveAction]);

    return { isOnline, isSaving, lastSaved };
}
