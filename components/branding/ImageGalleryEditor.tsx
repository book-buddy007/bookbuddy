import { SectionEditor } from './SectionEditor';
import { ImageUploader } from './ContentImageUploader';
import { Button } from '@/components/ui/button';
import { Trash2 } from '@/components/ui/icons';

export function ImageGalleryEditor({ formValues, setValue, uploadImage }: any) {
    const images = formValues.gallery?.images || [];

    const handleRemove = (index: number) => {
        const newImages = [...images];
        newImages.splice(index, 1);
        setValue('gallery.images', newImages, { shouldDirty: true, shouldValidate: true });
    };

    const handleAdd = (url: string) => {
        setValue('gallery.images', [...images, url], { shouldDirty: true, shouldValidate: true });
    };

    return (
        <SectionEditor title="Image Gallery" description="Add up to 10 images to showcase your library." name="gallery">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {images.map((img: string, index: number) => (
                    <div key={index} className="relative group rounded-md overflow-hidden border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt={`Gallery ${index}`} className="w-full h-32 object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button size="icon" variant="destructive" onClick={() => handleRemove(index)} title="Delete Image">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <ImageUploader
                label="Add New Image"
                value=""
                onChange={handleAdd}
                onUpload={uploadImage}
                formats={['jpg', 'png', 'webp']}
                maxSize={5}
                aspectRatio="free"
                recommendedSize="Any size"
            />
        </SectionEditor>
    );
}
