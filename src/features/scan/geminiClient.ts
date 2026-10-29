import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error(
    'EXPO_PUBLIC_GEMINI_API_KEY is missing. Copy .env.example to .env and fill in a key from ' +
      'https://aistudio.google.com/apikey, then restart Expo.'
  );
}

export const genai = new GoogleGenAI({ apiKey });


export const VISION_MODEL = 'gemini-3.5-flash-lite';

/**
 * Sends a JPEG + prompt to Gemini and returns the parsed JSON response.
 * `schema` is enforced via response_format so the model can't wander off-format.
 */
export async function classifyImageAsJson<T>(params: {
  base64Image: string;
  prompt: string;
  schema: Record<string, unknown>;
}): Promise<T> {
  const interaction = await genai.interactions.create({
    model: VISION_MODEL,
    input: [
      { type: 'text', text: params.prompt },
      { type: 'image', data: params.base64Image, mime_type: 'image/jpeg' },
    ],
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: params.schema,
    },
  });

  const text = interaction.output_text;
  if (!text) {
    throw new Error('Gemini returned no output text for the classification request.');
  }
  return JSON.parse(text) as T;
}
