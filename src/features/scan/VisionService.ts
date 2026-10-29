import { classifyImageAsJson } from './geminiClient';
import type { CapturedImage, VisionScanResult } from './types';

const PROMPT =
  'You are helping sort an item for household recycling/waste disposal. ' +
  'Identify the single most likely item in this photo as a short, plain-language ' +
  'label (e.g. "glass jar", "plastic bottle", "pizza box", "aa battery"). ' +
  'Favour common household item and material names. ' +
  'Respond with your confidence from 0 to 1 that the label is correct.';

const SCHEMA = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    confidence: { type: 'number' },
  },
  required: ['label', 'confidence'],
};

/**
 * Final link in the scan fallback chain: used when barcode and OCR both
 * fail, classifying the item directly from the image.
 */
export class VisionService {
  static async classifyImage(image: CapturedImage): Promise<VisionScanResult> {
    return classifyImageAsJson<VisionScanResult>({
      base64Image: image.base64,
      prompt: PROMPT,
      schema: SCHEMA,
    });
  }
}
