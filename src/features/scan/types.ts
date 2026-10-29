/**
 * Domain types for the scan feature: camera capture + item identification
 * via a barcode -> OCR -> vision fallback chain.
 */

export type ScanMethod = 'barcode' | 'ocr' | 'vision';

export interface CapturedImage {
  uri: string;
  width: number;
  height: number;
  /** Base64-encoded JPEG data, used for the OCR/vision API calls. */
  base64: string;
}

export interface BarcodeScanResult {
  format: string;
  value: string;
}

export interface OcrScanResult {
  rawText: string;
  confidence: number;
}

export interface VisionScanResult {
  label: string;
  confidence: number;
}

export interface IdentifiedItem {
  itemId: string;
  label: string;
  method: ScanMethod;
  confidence: number;
}

export interface ScanResult {
  image: CapturedImage;
  item: IdentifiedItem | null;
  methodChain: ScanMethod[];
}
