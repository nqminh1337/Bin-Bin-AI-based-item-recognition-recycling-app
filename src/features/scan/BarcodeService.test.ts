import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BarcodeService } from './BarcodeService';

describe('BarcodeService.scan', () => {
  it('always returns null (live detection happens in the camera view)', async () => {
    await expect(BarcodeService.scan({ uri: 'x', width: 1, height: 1, base64: '' })).resolves.toBeNull();
  });
});

describe('BarcodeService.lookupByCode', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns the product name on a matched barcode (positive)', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 1, product: { product_name: 'Glass Jam Jar' } }),
    });
    await expect(BarcodeService.lookupByCode('012345678905')).resolves.toBe('Glass Jam Jar');
  });

  it('falls back to generic_name when product_name is missing (positive)', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 1, product: { generic_name: 'Tin can' } }),
    });
    await expect(BarcodeService.lookupByCode('012345678905')).resolves.toBe('Tin can');
  });

  it('returns null when the product is not found (negative)', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 0 }),
    });
    await expect(BarcodeService.lookupByCode('000000000000')).resolves.toBeNull();
  });

  it('returns null on a non-OK HTTP response (negative)', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });
    await expect(BarcodeService.lookupByCode('012345678905')).resolves.toBeNull();
  });

  it('returns null instead of throwing on a network error (negative)', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network down'));
    await expect(BarcodeService.lookupByCode('012345678905')).resolves.toBeNull();
  });

  it('returns null for an empty/whitespace code without calling fetch (edge)', async () => {
    await expect(BarcodeService.lookupByCode('   ')).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
