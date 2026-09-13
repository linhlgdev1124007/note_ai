import { GoogleAuth } from 'google-auth-library';

export type GeminiOptions = { systemInstruction?: string; json?: boolean; maxOutputTokens?: number; temperature?: number; timeoutMs?: number };
const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });

function required(name: string) { const value = process.env[name]; if (!value) throw new Error(`Missing ${name}`); return value; }
function endpoint() {
  const project = required('GOOGLE_CLOUD_PROJECT'); const location = process.env.GOOGLE_CLOUD_LOCATION || 'global'; const model = required('GEMINI_MODEL');
  const host = location === 'global' ? 'aiplatform.googleapis.com' : `${location}-aiplatform.googleapis.com`;
  return `https://${host}/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;
}
function transient(error: unknown) { return /returned (429|5\d\d)|timeout|network/i.test(error instanceof Error ? error.message : ''); }

export async function generateText(prompt: string, options: GeminiOptions = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const client = await auth.getClient(); const token = (await client.getAccessToken()).token;
      if (!token) throw new Error('Could not obtain Google ADC access token');
      const body: Record<string, unknown> = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: options.maxOutputTokens ?? 1024, responseMimeType: options.json ? 'application/json' : 'text/plain', temperature: options.temperature ?? 0.2 } };
      if (options.systemInstruction) body.systemInstruction = { parts: [{ text: options.systemInstruction }] };
      const response = await fetch(endpoint(), { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(options.timeoutMs ?? 20000) });
      if (!response.ok) throw new Error(`Vertex AI returned ${response.status}: ${(await response.text()).slice(0, 500)}`);
      const data = await response.json() as any; const candidate = data.candidates?.[0];
      if (candidate?.finishReason && candidate.finishReason !== 'STOP') throw new Error(`Incomplete Gemini response: ${candidate.finishReason}`);
      const text = candidate?.content?.parts?.filter((part: any) => typeof part.text === 'string').map((part: any) => part.text).join('');
      if (!text) throw new Error('Gemini returned no usable text'); return { text, usage: data.usageMetadata };
    } catch (error) { if (attempt === 1 || !transient(error)) throw error; await new Promise((resolve) => setTimeout(resolve, 500)); }
  }
  throw new Error('AI unavailable');
}

export async function embedText(text: string) {
  const model = process.env.GEMINI_EMBEDDING_MODEL;
  if (!model) return null;
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;
  if (!token) throw new Error('Could not obtain Google ADC access token');
  const project = required('GOOGLE_CLOUD_PROJECT');
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'global';
  const host = location === 'global' ? 'aiplatform.googleapis.com' : `${location}-aiplatform.googleapis.com`;
  const response = await fetch(`https://${host}/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:predict`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ instances: [{ content: text }], parameters: { autoTruncate: true } }), signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Embedding provider returned ${response.status}`);
  const data = await response.json() as any;
  const values = data.predictions?.[0]?.embeddings?.values ?? data.predictions?.[0]?.embedding;
  return Array.isArray(values) ? values : null;
}
