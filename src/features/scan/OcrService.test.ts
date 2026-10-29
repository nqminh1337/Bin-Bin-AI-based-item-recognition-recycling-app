import { describe, expect, it, vi } from 'vitest';

vi.mock('./geminiClient', () => ({
  classifyImageAsJson: vi.fn(),
}));

import { classifyImageAsJson } from './geminiClient';
import { OcrService } from './OcrService';

describe('OcrService.extractText', () => {
  it('returns the parsed OCR result from Gemini (positive)', async () => {
    vi.mocked(classifyImageAsJson).mockResolvedValue({ rawText: 'GLASS', confidence: 0.9 });
    const result = await OcrService.extractText({ uri: 'x', width: 1, height: 1, base64: 'abc' });
    expect(result).toEqual({ rawText: 'GLASS', confidence: 0.9 });
  });

  it('propagates a Gemini failure rather than swallowing it (negative)', async () => {
    vi.mocked(classifyImageAsJson).mockRejectedValue(new Error('Gemini returned no output text'));
    await expect(OcrService.extractText({ uri: 'x', width: 1, height: 1, base64: 'abc' })).rejects.toThrow();
  });
});

describe('OcrService.parseMaterialHint', () => {
  it('matches a known packaging keyword (positive)', () => {
    expect(OcrService.parseMaterialHint({ rawText: 'Recyclable Glass Bottle', confidence: 0.8 })).toBe('glass jar');
  });

  it('is case-insensitive (positive)', () => {
    expect(OcrService.parseMaterialHint({ rawText: 'ALUMINIUM CAN', confidence: 0.8 })).toBe('aluminium can');
  });

  it('returns null when no keyword matches (negative)', () => {
    expect(OcrService.parseMaterialHint({ rawText: 'Best before 2027', confidence: 0.8 })).toBeNull();
  });

  it('returns null for empty text (edge)', () => {
    expect(OcrService.parseMaterialHint({ rawText: '', confidence: 0 })).toBeNull();
  });

  it('matches the first keyword found when text includes several (edge)', () => {
    expect(OcrService.parseMaterialHint({ rawText: 'glass and cardboard', confidence: 0.8 })).toBe('glass jar');
  });
});
