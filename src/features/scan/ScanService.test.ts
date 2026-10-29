import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./BarcodeService', () => ({
  BarcodeService: { scan: vi.fn(), lookupByCode: vi.fn() },
}));
vi.mock('./OcrService', () => ({
  OcrService: { extractText: vi.fn(), parseMaterialHint: vi.fn() },
}));
vi.mock('./VisionService', () => ({
  VisionService: { classifyImage: vi.fn() },
}));

import { BarcodeService } from './BarcodeService';
import { OcrService } from './OcrService';
import { ScanService } from './ScanService';
import type { CapturedImage } from './types';
import { VisionService } from './VisionService';

const image: CapturedImage = { uri: 'file://x', width: 10, height: 10, base64: 'abc' };

describe('ScanService.identifyItem', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('FR-07 positive: identifies via barcode and skips OCR/vision when matched', async () => {
    vi.mocked(BarcodeService.scan).mockResolvedValue({ format: 'ean13', value: '012345678905' });
    vi.mocked(BarcodeService.lookupByCode).mockResolvedValue('Glass Jar');

    const result = await ScanService.identifyItem(image);

    expect(result.item).toMatchObject({ label: 'Glass Jar', method: 'barcode', confidence: 1 });
    expect(result.methodChain).toEqual(['barcode']);
    expect(OcrService.extractText).not.toHaveBeenCalled();
    expect(VisionService.classifyImage).not.toHaveBeenCalled();
  });

  it('FR-08 positive: falls back to OCR when no barcode match', async () => {
    vi.mocked(BarcodeService.scan).mockResolvedValue(null);
    vi.mocked(OcrService.extractText).mockResolvedValue({ rawText: 'glass', confidence: 0.8 });
    vi.mocked(OcrService.parseMaterialHint).mockReturnValue('glass jar');

    const result = await ScanService.identifyItem(image);

    expect(result.item).toMatchObject({ label: 'glass jar', method: 'ocr', confidence: 0.8 });
    expect(result.methodChain).toEqual(['barcode', 'ocr']);
    expect(VisionService.classifyImage).not.toHaveBeenCalled();
  });

  it('falls back to vision when barcode and OCR both find nothing (positive)', async () => {
    vi.mocked(BarcodeService.scan).mockResolvedValue(null);
    vi.mocked(OcrService.extractText).mockResolvedValue({ rawText: '', confidence: 0 });
    vi.mocked(OcrService.parseMaterialHint).mockReturnValue(null);
    vi.mocked(VisionService.classifyImage).mockResolvedValue({ label: 'plastic bottle', confidence: 0.6 });

    const result = await ScanService.identifyItem(image);

    expect(result.item).toMatchObject({ label: 'plastic bottle', method: 'vision', confidence: 0.6 });
    expect(result.methodChain).toEqual(['barcode', 'ocr', 'vision']);
  });

  it('returns a null item when every link fails (negative)', async () => {
    vi.mocked(BarcodeService.scan).mockRejectedValue(new Error('unavailable'));
    vi.mocked(OcrService.extractText).mockRejectedValue(new Error('unavailable'));
    vi.mocked(VisionService.classifyImage).mockRejectedValue(new Error('unavailable'));

    const result = await ScanService.identifyItem(image);

    expect(result.item).toBeNull();
    expect(result.methodChain).toEqual(['barcode', 'ocr', 'vision']);
  });

  it('falls through to OCR when a barcode is found but has no catalog match (edge)', async () => {
    vi.mocked(BarcodeService.scan).mockResolvedValue({ format: 'ean13', value: '999' });
    vi.mocked(BarcodeService.lookupByCode).mockResolvedValue(null);
    vi.mocked(OcrService.extractText).mockResolvedValue({ rawText: 'cardboard', confidence: 0.5 });
    vi.mocked(OcrService.parseMaterialHint).mockReturnValue('cardboard box');

    const result = await ScanService.identifyItem(image);

    expect(result.item).toMatchObject({ label: 'cardboard box', method: 'ocr' });
  });
});

describe('ScanService.identifyByBarcodeValue', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns an identified item for a matched code (positive)', async () => {
    vi.mocked(BarcodeService.lookupByCode).mockResolvedValue('Aluminium Can');
    const item = await ScanService.identifyByBarcodeValue('012345678905');
    expect(item).toMatchObject({ itemId: 'aluminium-can', label: 'Aluminium Can', method: 'barcode', confidence: 1 });
  });

  it('returns null for an unmatched code (negative)', async () => {
    vi.mocked(BarcodeService.lookupByCode).mockResolvedValue(null);
    await expect(ScanService.identifyByBarcodeValue('000000000000')).resolves.toBeNull();
  });
});
