import { classifyImageAsJson } from './geminiClient';
import type { CapturedImage, OcrScanResult } from './types';

const PROMPT =
  'Read any text visible on this packaging or label (e.g. brand name, material, ' +
  'recycling symbol text). Return the raw text you can read and your confidence ' +
  'from 0 to 1 that the text is legible.';

const SCHEMA = {
  type: 'object',
  properties: {
    rawText: { type: 'string' },
    confidence: { type: 'number' },
  },
  required: ['rawText', 'confidence'],
};

// Packaging keyword -> material/item label, checked against the OCR'd text.
const MATERIAL_KEYWORDS: [string, string][] = [
  ['glass', 'glass jar'],
  ['aluminium', 'aluminium can'],
  ['aluminum', 'aluminium can'],
  ['cardboard', 'cardboard box'],
  ['corrugated', 'cardboard box'],
  ['pet 1', 'plastic bottle'],
  ['hdpe', 'plastic container'],
  ['polystyrene', 'polystyrene packaging'],
  ['paper', 'paper'],
  ['steel', 'steel can'],
  ['tin', 'tin can'],
];

/**
 * Second link in the scan fallback chain: runs when no barcode is found,
 * attempting to read packaging text instead.
 */
export class OcrService {
  static async extractText(image: CapturedImage): Promise<OcrScanResult> {
    return classifyImageAsJson<OcrScanResult>({
      base64Image: image.base64,
      prompt: PROMPT,
      schema: SCHEMA,
    });
  }

  static parseMaterialHint(ocrResult: OcrScanResult): string | null {
    const text = ocrResult.rawText?.toLowerCase() ?? '';
    for (const [keyword, label] of MATERIAL_KEYWORDS) {
      if (text.includes(keyword)) return label;
    }
    return null;
  }
}
