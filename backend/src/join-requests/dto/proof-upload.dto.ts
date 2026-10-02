import { IsIn, IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';

/** Types a proof document may be: a scan or photo of an ID, or a PDF letter. */
export const PROOF_MIME_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
} as const;

export const PROOF_MAX_BYTES = 5 * 1024 * 1024;

/** Body for POST /join-requests/proof-upload-url. */
export class ProofUploadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename: string;

  @IsIn(Object.keys(PROOF_MIME_TYPES), { message: 'Upload a PDF, JPG or PNG' })
  contentType: keyof typeof PROOF_MIME_TYPES;

  @IsInt()
  @Min(1)
  @Max(PROOF_MAX_BYTES, { message: 'The file must be 5 MB or smaller' })
  size: number;
}
