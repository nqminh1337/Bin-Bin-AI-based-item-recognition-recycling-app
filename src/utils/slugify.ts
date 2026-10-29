/** Lowercases and dashifies a label so it can double as an itemId, e.g. "Glass Jar" -> "glass-jar". */
export function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
