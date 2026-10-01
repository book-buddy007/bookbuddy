import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { IVisionProvider, VISION_PROVIDER } from '../rag/interfaces/vision.provider.interface';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB decoded — leaves headroom under the 10MB JSON body limit (main.ts) for base64 overhead + the rest of the request

export interface BoundingBox {
  x: number; // 0..1, fraction of image width from the left
  y: number; // 0..1, fraction of image height from the top
  w: number; // 0..1, fraction of image width
  h: number; // 0..1, fraction of image height
}

export interface VisualQueryResult {
  answer: string;
  groundedRegion: BoundingBox | { x: 0; y: 0; w: 1; h: 1 };
  confidence: null;
}

/**
 * Reading Intelligence Layer §9 — visual grounding for figures, diagrams,
 * and equations. Deviates from the spec's literal API surface in one
 * disclosed way: the spec assumes "page images (already rasterized for the
 * reader's rendering pipeline)" the backend can resolve via a pageImageRef.
 * That assumption doesn't hold in this codebase — PDFs are rendered
 * client-side (pdf.js via @react-pdf-viewer), so there is no server-side
 * page-image asset to resolve. The caller supplies the image directly.
 *
 * Second disclosed deviation: true pixel-level cropping to the tapped
 * region would need an image-processing library (sharp/canvas), which this
 * backend doesn't currently depend on — adding a new native-binary
 * dependency for one feature is a bigger call than this pass should make
 * unilaterally. v1 instead sends the whole image with the region expressed
 * as a textual hint in the prompt. `groundedRegion` in the response is
 * therefore an echo of the requested region, not a model-verified one, and
 * `confidence` is null — the underlying model doesn't expose a real score,
 * and fabricating one would be worse than admitting there isn't one.
 *
 * MEASURED, NOT JUST SUSPECTED, LIMITATION: the whole-image + textual-hint
 * approach was verified against a synthetic two-color test image (red
 * top-left, blue bottom-right, otherwise unambiguous) with llava-1.5-7b-hf.
 * Asking about the top-left region was correct 7/7 runs. Asking about the
 * bottom-right region was correct only 3/7 runs — worse than a coin flip,
 * and consistent with a positional bias toward "red"/top-left regardless of
 * the requested region, not just occasional imprecision. Whole-image
 * questions (no boundingBox) were reliable in every run. Conclusion:
 * boundingBox-scoped answers from this endpoint are NOT currently
 * trustworthy and should not be presented to users as reliably grounded —
 * only the no-boundingBox (whole-page) path has verified reliability today.
 * Fixing this needs either a stronger/different vision model or real pixel
 * cropping (the sharp/canvas dependency above) — both are calls for product
 * engineering to make deliberately, not silently ship as if solved.
 */
@Injectable()
export class VisualGroundingService {
  constructor(@Inject(VISION_PROVIDER) private vision: IVisionProvider) {}

  async query(imageBase64: string, question: string, boundingBox?: BoundingBox): Promise<VisualQueryResult> {
    if (!question?.trim()) {
      throw new BadRequestException('"question" is required.');
    }

    let imageBytes: Buffer;
    try {
      imageBytes = Buffer.from(imageBase64, 'base64');
    } catch {
      throw new BadRequestException('"image" must be valid base64.');
    }
    if (imageBytes.length === 0) {
      throw new BadRequestException('"image" must be valid base64.');
    }
    if (imageBytes.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException(`Image too large (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB decoded).`);
    }

    let prompt = question.trim();
    if (boundingBox) {
      this.validateBoundingBox(boundingBox);
      const pctX = Math.round(boundingBox.x * 100);
      const pctY = Math.round(boundingBox.y * 100);
      const pctX2 = Math.round((boundingBox.x + boundingBox.w) * 100);
      const pctY2 = Math.round((boundingBox.y + boundingBox.h) * 100);
      prompt =
        `The student tapped a specific region of this image, roughly the area from ` +
        `${pctX}% to ${pctX2}% of the width and ${pctY}% to ${pctY2}% of the height ` +
        `(measured from the top-left corner). Focus your answer on that region specifically, ` +
        `not the whole image, unless the question requires broader context. Question: ${question.trim()}`;
    }

    const answer = await this.vision.describe(imageBytes, prompt);

    return {
      answer,
      groundedRegion: boundingBox ?? { x: 0, y: 0, w: 1, h: 1 },
      confidence: null,
    };
  }

  private validateBoundingBox(box: BoundingBox) {
    const { x, y, w, h } = box;
    const inUnitRange = (n: number) => typeof n === 'number' && n >= 0 && n <= 1;
    if (![x, y, w, h].every(inUnitRange) || x + w > 1 || y + h > 1) {
      throw new BadRequestException('"boundingBox" fields must be fractions in [0,1] and must not extend past the image edges.');
    }
  }
}
