export const MAX_SEQUENCE_LENGTH = 500;
export const MAX_BODY_BYTES = 20_000;
export const HOURLY_LIMIT = 30;

export class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function requireBrowserUser(request) {
  const user = request.headers.get('oai-authenticated-user-id');
  if (!user) throw new RequestError(401, 'Please sign in to run an analysis.');
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    throw new RequestError(403, 'This request must come from this website.');
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new RequestError(415, 'Send a JSON request.');
  }
  return user;
}

export async function readSequence(request) {
  const declared = Number(request.headers.get('content-length'));
  if (declared > MAX_BODY_BYTES) throw new RequestError(413, 'Sequence input is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, 'Provide a sequence.');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RequestError(413, 'Sequence input is too large.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let body;
  try { body = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new RequestError(400, 'Invalid JSON request.'); }
  const sequence = body?.sequence;
  if (!Array.isArray(sequence) || sequence.length < 3 || sequence.length > MAX_SEQUENCE_LENGTH ||
      sequence.some(n => typeof n !== 'number' || !Number.isFinite(n))) {
    throw new RequestError(400, `Provide 3 to ${MAX_SEQUENCE_LENGTH} finite numbers.`);
  }
  return sequence;
}

export function isAnalysisResult(value) {
  return value && Array.isArray(value.candidates) && value.candidates.length >= 1 && value.candidates.length <= 3 &&
    value.candidates.every(c => c && ['algorithm', 'parameters', 'explanation'].every(k => typeof c[k] === 'string' && c[k].length <= 20_000) &&
      Number.isInteger(c.confidence) && c.confidence >= 0 && c.confidence <= 100) &&
    Array.isArray(value.nextValues) && value.nextValues.length === 3 && value.nextValues.every(Number.isFinite);
}

// The conditional UPSERT runs atomically in D1, shared by all Worker instances.
export async function reserveQuota(db, user, now = Date.now(), dailyLimit = 200) {
  if (!db) throw new RequestError(503, 'Analysis is temporarily unavailable. Please try again later.');
  const reserve = async (key, window, limit) => db.prepare(`INSERT INTO analysis_quota (user_id, window_start, request_count)
    VALUES (?, ?, 1)
    ON CONFLICT(user_id) DO UPDATE SET window_start = excluded.window_start,
      request_count = CASE WHEN analysis_quota.window_start = excluded.window_start THEN analysis_quota.request_count + 1 ELSE 1 END
    WHERE analysis_quota.window_start < excluded.window_start OR
      (analysis_quota.window_start = excluded.window_start AND analysis_quota.request_count < ?)
    RETURNING request_count`).bind(key, window, limit).first();
  const userRow = await reserve(`user:${user}`, Math.floor(now / 3_600_000), HOURLY_LIMIT);
  if (!userRow) throw new RequestError(429, 'You have reached the hourly analysis limit. Please try again next hour.');
  const configured = Number(dailyLimit);
  const limit = Number.isInteger(configured) && configured >= 1 && configured <= 10000 ? configured : 200;
  const globalRow = await reserve('site:daily', Math.floor(now / 86_400_000), limit);
  if (!globalRow) throw new RequestError(429, 'The daily analysis limit has been reached. Please try again tomorrow.');
}
