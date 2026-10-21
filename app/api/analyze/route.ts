import { env } from 'cloudflare:workers';
import { buildAnalysisRequest } from '../../../server/analysis.mjs';
import { RequestError, requireBrowserUser, readSequence, reserveQuota, isAnalysisResult } from '../../../server/request-boundary.mjs';

export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => Response.json(body, {status, headers: {'Cache-Control': 'no-store'}});

export async function POST(request: Request) {
  try {
    const user = requireBrowserUser(request);
    const sequence = await readSequence(request);
    if (!env.GEMINI_API_KEY) throw new RequestError(503, 'AI analysis is not configured yet. The Generator Lab is ready to use.');
    await reserveQuota(env.DB, user, Date.now(), Number(env.AI_DAILY_LIMIT || 200));
    const model = env.GEMINI_MODEL || 'gemini-3.1-pro-preview';
    if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw new RequestError(503, 'AI analysis is temporarily unavailable.');
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY},
      body: JSON.stringify(buildAnalysisRequest(sequence)),
      signal: AbortSignal.timeout(60_000),
    });
    if (upstream.status === 429) throw new RequestError(429, 'The AI service is busy. Please wait and try again.');
    if (!upstream.ok) throw new RequestError(502, 'The AI service could not complete the analysis. Please try again later.');
    const body = await upstream.json() as { candidates?: {content?: {parts?: {text?: string; thought?: boolean}[]}}[] };
    const text = body.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('') || '';
    let result;
    try { result = JSON.parse(text); } catch { throw new RequestError(502, 'The AI returned an incomplete analysis. Please try again.'); }
    if (!isAnalysisResult(result)) throw new RequestError(502, 'The AI returned an incomplete analysis. Please try again.');
    return json(result);
  } catch (error) {
    if (error instanceof RequestError) return json({error: error.message}, error.status);
    if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) return json({error: 'Analysis timed out. Please try a shorter sequence.'}, 504);
    return json({error: 'Analysis is temporarily unavailable. Please try again later.'}, 503);
  }
}
