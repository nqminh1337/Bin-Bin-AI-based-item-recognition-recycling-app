import { slugify } from '@utils/slugify';
import { BarcodeService } from './BarcodeService';
import { OcrService } from './OcrService';
import { VisionService } from './VisionService';
import type { CapturedImage, IdentifiedItem, ScanMethod, ScanResult } from './types';

/**
 * Orchestrates the identification chain: barcode -> OCR -> vision.
 * This is the only class other features/screens should call into for
 * scanning; BarcodeService/OcrService/VisionService are internals.
 */
export class ScanService {
  // Called from the live camera barcode scanner, which already has a code.
  static async identifyByBarcodeValue(code: string): Promise<IdentifiedItem | null> {
    const material = await BarcodeService.lookupByCode(code);
    return material ? toItem(slugify(material), material, 'barcode', 1) : null;
  }

  static async identifyItem(image: CapturedImage): Promise<ScanResult> {
    const methodChain: ScanMethod[] = [];

    // Each link swallows its own failure so an unavailable link falls through.
    methodChain.push('barcode');
    try {
      const barcode = await BarcodeService.scan(image);
      if (barcode) {
        const material = await BarcodeService.lookupByCode(barcode.value);
        if (material) {
          return { image, item: toItem(barcode.value, material, 'barcode', 1), methodChain };
        }
      }
    } catch {
      // link unavailable, fall through
    }

    methodChain.push('ocr');
    try {
      const ocrResult = await OcrService.extractText(image);
      const hint = OcrService.parseMaterialHint(ocrResult);
      if (hint) {
        return { image, item: toItem(slugify(hint), hint, 'ocr', ocrResult.confidence), methodChain };
      }
    } catch {
      // link unavailable, fall through
    }

    methodChain.push('vision');
    try {
      const vision = await VisionService.classifyImage(image);
      return { image, item: toItem(slugify(vision.label), vision.label, 'vision', vision.confidence), methodChain };
    } catch {
      return { image, item: null, methodChain };
    }
  }
}

function toItem(itemId: string, label: string, method: ScanMethod, confidence: number): IdentifiedItem {
  return { itemId, label, method, confidence };
}
