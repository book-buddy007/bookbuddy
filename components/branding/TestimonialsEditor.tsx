import { Control, Controller } from 'react-hook-form';
import { SectionEditor } from './SectionEditor';
import { CharacterLimitedInput } from './CharacterLimitedInput';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Star, GripVertical } from '@/components/ui/icons';
import { Reorder } from 'framer-motion';

export function TestimonialsEditor({ control, formValues, setValue, errors }: any) {
    const testimonials = formValues.testimonials || [];

    const handleAdd = () => {
        setValue('testimonials', [
            ...testimonials,
            { name: 'John Doe', role: 'Student', company: 'University X', quote: 'This library system is amazing!', rating: 5, email: `user${Date.now()}@example.com` }
        ], { shouldDirty: true, shouldValidate: true });
    };

    const handleRemove = (index: number) => {
        const newItems = [...testimonials];
        newItems.splice(index, 1);
        setValue('testimonials', newItems, { shouldDirty: true, shouldValidate: true });
    };

    const handleReorder = (newOrder: any[]) => {
        setValue('testimonials', newOrder, { shouldDirty: true, shouldValidate: true });
    };

    return (
        <SectionEditor title="Testimonials" description="What do people say about your library? Drag to reorder." name="testimonials">
            <Reorder.Group axis="y" values={testimonials} onReorder={handleReorder} className="space-y-6">
                {testimonials.map((item: any, index: number) => (
                    <Reorder.Item key={item.email || index} value={item} className="p-4 border rounded-md relative bg-white/50 space-y-4 shadow-sm">
                        <div className="absolute top-2 left-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                            <GripVertical className="h-5 w-5" aria-hidden="true" />
                            <span className="sr-only">Drag to reorder testimonial {index + 1}</span>
                        </div>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-2 right-2 text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemove(index)}
                            type="button"
                            aria-label={`Remove testimonial ${index + 1}`}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>

                        <div className="font-medium mb-2 pl-6">Testimonial {index + 1}</div>

                        <div className="grid grid-cols-2 gap-4">
                            <Controller
                                name={`testimonials.${index}.name`}
                                control={control}
                                render={({ field }) => (
                                    <CharacterLimitedInput
                                        id={`test-name-${index}`}
                                        label="Name"
                                        maxLength={50}
                                        value={field.value}
                                        onChange={field.onChange}
                                        error={errors?.testimonials?.[index]?.name?.message}
                                    />
                                )}
                            />
                            <Controller
                                name={`testimonials.${index}.email`}
                                control={control}
                                render={({ field }) => (
                                    <CharacterLimitedInput
                                        id={`test-email-${index}`}
                                        label="Email (Must be unique)"
                                        maxLength={100}
                                        value={field.value}
                                        onChange={field.onChange}
                                        error={errors?.testimonials?.[index]?.email?.message}
                                    />
                                )}
                            />
                            <Controller
                                name={`testimonials.${index}.role`}
                                control={control}
                                render={({ field }) => (
                                    <CharacterLimitedInput
                                        id={`test-role-${index}`}
                                        label="Role"
                                        maxLength={50}
                                        value={field.value}
                                        onChange={field.onChange}
                                        error={errors?.testimonials?.[index]?.role?.message}
                                    />
                                )}
                            />
                            <Controller
                                name={`testimonials.${index}.company`}
                                control={control}
                                render={({ field }) => (
                                    <CharacterLimitedInput
                                        id={`test-company-${index}`}
                                        label="Company/Institution"
                                        maxLength={50}
                                        value={field.value}
                                        onChange={field.onChange}
                                        error={errors?.testimonials?.[index]?.company?.message}
                                    />
                                )}
                            />
                        </div>

                        <Controller
                            name={`testimonials.${index}.quote`}
                            control={control}
                            render={({ field }) => (
                                <CharacterLimitedInput
                                    id={`test-quote-${index}`}
                                    label="Quote"
                                    maxLength={280}
                                    multiline
                                    value={field.value}
                                    onChange={field.onChange}
                                    error={errors?.testimonials?.[index]?.quote?.message}
                                />
                            )}
                        />

                        <Controller
                            name={`testimonials.${index}.rating`}
                            control={control}
                            render={({ field }) => (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Star Rating (1-5)</label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Button
                                                key={star}
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => field.onChange(star)}
                                                className={field.value >= star ? "text-indigo-400" : "text-gray-300"}
                                                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                                            >
                                                <Star className="h-6 w-6 fill-current" aria-hidden="true" />
                                            </Button>
                                        ))}
                                    </div>
                                    {errors?.testimonials?.[index]?.rating && (
                                        <p className="text-destructive text-sm">{errors.testimonials[index].rating.message}</p>
                                    )}
                                </div>
                            )}
                        />
                    </Reorder.Item>
                ))}
            </Reorder.Group>

            <Button type="button" variant="outline" onClick={handleAdd} className="mt-4 w-full border-dashed">
                <Plus className="h-4 w-4 mr-2" /> Add Testimonial
            </Button>
        </SectionEditor>
    );
}
