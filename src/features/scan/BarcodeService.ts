import type { BarcodeScanResult, CapturedImage } from './types';

const LOOKUP_URL = 'https://world.openfoodfacts.org/api/v2/product';

/**
 * First link in the scan fallback chain: attempts to read a barcode
 * directly from camera input.
 */
export class BarcodeService {
  // Barcode detection runs live in app/scan.tsx; nothing to decode here.
  static async scan(_image: CapturedImage): Promise<BarcodeScanResult | null> {
    return null;
  }

  static async lookupByCode(code: string): Promise<string | null> {
    if (!code.trim()) return null;
    try {
      const response = await fetch(`${LOOKUP_URL}/${encodeURIComponent(code)}.json`);
      if (!response.ok) return null;
      const data = await response.json();
      if (data?.status !== 1 || !data?.product) return null;
      const name = data.product.product_name ?? data.product.generic_name;
      return typeof name === 'string' && name.trim() ? name.trim() : null;
    } catch {
      return null;
    }
  }
}
