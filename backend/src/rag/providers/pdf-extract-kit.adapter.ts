import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validateChunkBatch } from '../schemas/chunk-metadata-schema';

@Injectable()
export class PDFExtractKitAdapter {
  private readonly logger = new Logger(PDFExtractKitAdapter.name);
  private readonly extractorUrl: string;

  constructor(private configService: ConfigService) {
    this.extractorUrl =
      this.configService.get<string>('PDF_EXTRACTOR_URL') ||
      'http://localhost:8000/extract';
  }

  isReady(): boolean {
    return !!this.configService.get<string>('PDF_EXTRACTOR_URL');
  }

  async processPDF(
    pdfBuffer: Buffer,
    metadata: any,
    filename: string,
  ): Promise<any[]> {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(pdfBuffer)], {
      type: 'application/pdf',
    });
    formData.append('file', blob, filename);
    formData.append('metadata', JSON.stringify(metadata));

    this.logger.log(
      `Calling Python PDF Extractor at ${this.extractorUrl} for ${filename}`,
    );

    try {
      const response = await fetch(this.extractorUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      const rawChunks = data.chunks || [];
      this.logger.log(`Received ${rawChunks.length} raw chunks from extractor`);

      // Validate metadata using Zod schema
      const { valid, invalid, stats } = validateChunkBatch(rawChunks);

      if (invalid.length > 0) {
        this.logger.warn(`${invalid.length} chunks failed metadata validation`);
      }

      this.logger.log(
        `Validated ${stats.validCount}/${stats.total} chunks successfully`,
      );

      // Map to the format expected by ingestion.processor
      return valid.map((v) => ({
        text: v.chunk.text,
        pageNumber: v.metadata.page,
        chapterTitle: v.metadata.chapter,
        sectionTitle: v.metadata.section_title,
        contentType: v.metadata.content_type,
        hasFormulas: v.metadata.contains_equation,
        hasTables: v.metadata.contains_table,
      }));
    } catch (error: any) {
      this.logger.error(
        `Error communicating with PDF Extractor: ${error.message}`,
      );
      throw new Error(`PDF Extraction failed: ${error.message}`);
    }
  }
}
