// Public API of the scan feature. BarcodeService/OcrService/VisionService
// are internals of the identification chain; import ScanService instead.
export { ScanService } from './ScanService';
export { canAutoConfirm, confidenceLevel, LOW_CONFIDENCE } from './confidence';
export type { ConfidenceLevel } from './confidence';
export type {
  CapturedImage,
  IdentifiedItem,
  ScanMethod,
  ScanResult,
} from './types';
