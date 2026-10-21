import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json({status: 'ok', aiConfigured: Boolean(env.GEMINI_API_KEY), quotaConfigured: Boolean(env.DB)}, {headers: {'Cache-Control': 'no-store'}});
}
