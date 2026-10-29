import { describe, expect, it } from 'vitest';
import { canAutoConfirm, confidenceLevel, LOW_CONFIDENCE } from './confidence';

// FR-14: below 70% confidence, the result must not be auto-confirmable.
describe('canAutoConfirm', () => {
  it('allows confirmation above the threshold (positive)', () => {
    expect(canAutoConfirm(0.9)).toBe(true);
  });

  it('blocks confirmation below the threshold (negative)', () => {
    expect(canAutoConfirm(0.5)).toBe(false);
  });

  it('allows confirmation exactly at the threshold (edge)', () => {
    expect(canAutoConfirm(LOW_CONFIDENCE)).toBe(true);
  });

  it('blocks confirmation at 0 (edge)', () => {
    expect(canAutoConfirm(0)).toBe(false);
  });

  it('allows confirmation at 1 (edge)', () => {
    expect(canAutoConfirm(1)).toBe(true);
  });
});

describe('confidenceLevel', () => {
  it('labels 0.9 as high confidence (positive)', () => {
    expect(confidenceLevel(0.9)).toEqual({ label: 'High confidence', bars: 3 });
  });

  it('labels 0.2 as low confidence (negative)', () => {
    expect(confidenceLevel(0.2)).toEqual({ label: 'Low confidence', bars: 1 });
  });

  it('labels exactly 0.85 as high confidence (edge)', () => {
    expect(confidenceLevel(0.85)).toEqual({ label: 'High confidence', bars: 3 });
  });

  it('labels exactly 0.7 as medium confidence (edge)', () => {
    expect(confidenceLevel(0.7)).toEqual({ label: 'Medium confidence', bars: 2 });
  });

  it('labels just below 0.85 as medium confidence (edge)', () => {
    expect(confidenceLevel(0.84)).toEqual({ label: 'Medium confidence', bars: 2 });
  });
});
