import { Control, Controller } from 'react-hook-form';
import { SectionEditor } from './SectionEditor';
import { CharacterLimitedInput } from './CharacterLimitedInput';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, GripVertical } from '@/components/ui/icons';
import { Reorder } from 'framer-motion';

export function FeatureCardsEditor({ control, formValues, setValue, errors }: any) {
    const cards = formValues.features?.cards || [];

    const handleAdd = () => {
        if (cards.length >= 6) return;
        setValue('features.cards', [
            ...cards,
            { title: 'New Feature', description: 'Describe your feature here.', icon: 'Star', link: '' }
        ], { shouldDirty: true, shouldValidate: true });
    };

    const handleRemove = (index: number) => {
        const newCards = [...cards];
        newCards.splice(index, 1);
        setValue('features.cards', newCards, { shouldDirty: true, shouldValidate: true });
    };

    const handleReorder = (newOrder: any[]) => {
        setValue('features.cards', newOrder, { shouldDirty: true, shouldValidate: true });
    };

    return (
        <SectionEditor title="Feature Cards" description="Add up to 6 feature highlights. Drag to reorder." name="features">
            <Reorder.Group axis="y" values={cards} onReorder={handleReorder} className="space-y-6">
                {cards.map((card: any, index: number) => (
                    <Reorder.Item key={card.title + index} value={card} className="p-4 border rounded-md relative bg-white/50 space-y-4 shadow-sm">
                        <div className="absolute top-2 left-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                            <GripVertical className="h-5 w-5" aria-hidden="true" />
                            <span className="sr-only">Drag to reorder feature card {index + 1}</span>
                        </div>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-2 right-2 text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemove(index)}
                            type="button"
                            aria-label={`Remove feature card ${index + 1}`}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>

                        <div className="font-medium mb-2 pl-6">Card {index + 1}</div>

                        <Controller
                            name={`features.cards.${index}.title`}
                            control={control}
                            render={({ field }) => (
                                <CharacterLimitedInput
                                    id={`feature-title-${index}`}
                                    label="Title"
                                    maxLength={40}
                                    value={field.value}
                                    onChange={field.onChange}
                                    error={errors?.features?.cards?.[index]?.title?.message}
                                />
                            )}
                        />

                        <Controller
                            name={`features.cards.${index}.description`}
                            control={control}
                            render={({ field }) => (
                                <CharacterLimitedInput
                                    id={`feature-desc-${index}`}
                                    label="Description"
                                    maxLength={120}
                                    multiline
                                    value={field.value}
                                    onChange={field.onChange}
                                    error={errors?.features?.cards?.[index]?.description?.message}
                                />
                            )}
                        />

                        <Controller
                            name={`features.cards.${index}.link`}
                            control={control}
                            render={({ field }) => (
                                <CharacterLimitedInput
                                    id={`feature-link-${index}`}
                                    label="URL Link (Optional)"
                                    maxLength={200}
                                    value={field.value}
                                    onChange={field.onChange}
                                    error={errors?.features?.cards?.[index]?.link?.message}
                                />
                            )}
                        />
                    </Reorder.Item>
                ))}
            </Reorder.Group>

            {cards.length < 6 && (
                <Button type="button" variant="outline" onClick={handleAdd} className="mt-4 w-full border-dashed">
                    <Plus className="h-4 w-4 mr-2" /> Add Feature Card
                </Button>
            )}
        </SectionEditor>
    );
}
