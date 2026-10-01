import { z } from 'zod';

// Image validation schema
export const logoSchema = z.object({
  file: z.instanceof(File),
  size: z.number().max(2 * 1024 * 1024, "Image must be less than 2MB"),
  type: z.string().refine(
    type => ['image/svg+xml', 'image/png', 'image/jpeg'].includes(type),
    "Only SVG, PNG, and JPG files are allowed"
  )
});

export type LogoRequirements = {
  maxWidth: {
    desktop: '160px';
    mobile: '120px';
  };
  maxSize: number; // in KB
  acceptedFormats: string[];
};

// Basic validation for image files
export function validateImage(
  file: File, 
  requirements: LogoRequirements
): { 
  valid: boolean;
  message?: string;
} {
  // Validate file type
  const fileType = file.type;
  if (!requirements.acceptedFormats.includes(fileType)) {
    return { 
      valid: false, 
      message: `Invalid file format. Accepted formats: ${requirements.acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}` 
    };
  }
  
  // Validate file size
  if (file.size > requirements.maxSize * 1024) {
    return { 
      valid: false, 
      message: `File size exceeds ${requirements.maxSize / 1024}MB limit` 
    };
  }
  
  return { valid: true };
} 