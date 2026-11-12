import { backendErrorCode } from '../app/js/connection-errors.mjs';
const encoder = new TextEncoder();
let keys,
  keysUntil = 0;
const decode = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
export async function verifyToken(token, project, fetcher = fetch) {
  const parts = token.split('.');
  if (parts.length !== 3) throw Error('Unauthorized');
  const header = JSON.parse(new TextDecoder().decode(decode(parts[0]))),
    claims = JSON.parse(new TextDecoder().decode(decode(parts[1])));
  const now = Date.now() / 1000;
  if (
    header.alg !== 'RS256' ||
    !header.kid ||
    claims.aud !== project ||
    claims.iss !== `https://securetoken.google.com/${project}` ||
    !claims.sub ||
    claims.sub.length > 128 ||
    !(claims.exp > now) ||
    !(claims.iat <= now) ||
    !(claims.auth_time <= now)
  )
    throw Error('Unauthorized');
  if (!keys || Date.now() > keysUntil) {
    const r = await fetcher(
      'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
    );
    if (!r.ok) throw Error('Key service unavailable');
    keys = (await r.json()).keys;
    keysUntil = Date.now() + 300000;
  }
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw Error('Unauthorized');
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  if (
    !(await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      decode(parts[2]),
      encoder.encode(parts[0] + '.' + parts[1]),
    ))
  )
    throw Error('Unauthorized');
  return {
    uid: claims.sub,
    email: claims.email || '',
    emailVerified: claims.email_verified === true,
    authTime: Number(claims.auth_time),
  };
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const headers = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
      Vary: 'Origin',
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
    if (origin !== env.ALLOWED_ORIGIN) return response({ ok: false, error: 'Origin rejected' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return response({ ok: false, error: 'POST required' }, 405);
    let failureCode = 'AUTH_TOKEN_INVALID';
    try {
      if (!env.FIREBASE_PROJECT_ID) return response({ ok: false, errorCode: 'GATEWAY_PROJECT_MISSING' }, 503);
      if (!env.GATEWAY_HMAC_SECRET || env.GATEWAY_HMAC_SECRET.length < 32)
        return response({ ok: false, errorCode: 'GATEWAY_SECRET_MISSING' }, 503);
      if (!/^https:\/\/script.google.com\/macros\/s\/[^/]+\/exec$/.test(env.APPS_SCRIPT_URL))
        return response({ ok: false, errorCode: 'GATEWAY_URL_INVALID' }, 503);
      const token = /^Bearer (.+)$/.exec(request.headers.get('Authorization') || '')?.[1];
      if (!token) return response({ ok: false, errorCode: 'AUTH_TOKEN_MISSING' }, 401);
      const user = await verifyToken(token, env.FIREBASE_PROJECT_ID);
      failureCode = 'REQUEST_INVALID';
      const raw = await request.text();
      if (encoder.encode(raw).length > 100000)
        return response({ ok: false, error: 'Request too large' }, 413);
      const { action, params } = JSON.parse(raw);
      if (typeof action !== 'string' || !params || typeof params !== 'object' || Array.isArray(params))
        throw Error('Invalid request');
      const bytes = encoder.encode(JSON.stringify({ action, params, user }));
      const payload = btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      const ts = Date.now(),
        nonce = crypto.randomUUID();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(env.GATEWAY_HMAC_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      );
      const signature = Array.from(
        new Uint8Array(
          await crypto.subtle.sign('HMAC', key, encoder.encode(`v1\n${ts}\n${nonce}\n${payload}`)),
        ),
        (x) => x.toString(16).padStart(2, '0'),
      ).join('');
      failureCode = 'BACKEND_UNREACHABLE';
      const upstream = await fetch(env.APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ ts, nonce, payload, signature }),
        redirect: 'follow',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!upstream.ok) return response({ ok: false, errorCode: 'BACKEND_HTTP_ERROR' }, 502);
      failureCode = 'BACKEND_RESPONSE_INVALID';
      const result = await upstream.json();
      if (typeof result.ok !== 'boolean') throw Error('Invalid response');
      if (!result.ok) return response({ ...result, errorCode: backendErrorCode(result.error) });
      return response(result);
    } catch {
      return response(
        { ok: false, error: 'Clinic API request rejected', errorCode: failureCode },
        failureCode === 'AUTH_TOKEN_INVALID' ? 401 : 502,
      );
    }
  },
};
