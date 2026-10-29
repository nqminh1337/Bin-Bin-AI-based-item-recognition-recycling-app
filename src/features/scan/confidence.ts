// FR-14: below this the result can't be auto-confirmed; the user must rescan or edit.
export const LOW_CONFIDENCE = 0.7;

export interface ConfidenceLevel {
  label: string;
  bars: 1 | 2 | 3;
}

export function confidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.85) return { label: 'High confidence', bars: 3 };
  if (confidence >= LOW_CONFIDENCE) return { label: 'Medium confidence', bars: 2 };
  return { label: 'Low confidence', bars: 1 };
}

export function canAutoConfirm(confidence: number): boolean {
  return confidence >= LOW_CONFIDENCE;
}
