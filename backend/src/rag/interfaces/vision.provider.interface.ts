export interface IVisionProvider {
  /**
   * Ask a question about an image. `imageBytes` is the raw (decoded) image
   * file bytes — the caller base64-decodes before calling in, so provider
   * implementations don't each re-derive that.
   */
  describe(imageBytes: Buffer, prompt: string): Promise<string>;
}

export const VISION_PROVIDER = Symbol('VISION_PROVIDER');
