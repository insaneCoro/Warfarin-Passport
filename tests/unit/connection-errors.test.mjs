import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  backendErrorCode,
  connectionErrorMessage,
  safeConnectionCode,
} from '../../app/js/connection-errors.mjs';
import worker from '../../gateway/worker.mjs';
test('backend errors distinguish signing, staff and database setup without reflecting raw details', () => {
  assert.equal(backendErrorCode('Unauthorized request'), 'SIGNING_KEY_MISMATCH');
  assert.equal(backendErrorCode('User is not approved'), 'STAFF_NOT_APPROVED');
  assert.equal(backendErrorCode('Schema migration required: Users'), 'DATABASE_MIGRATION_REQUIRED');
  assert.equal(backendErrorCode('unknown private error'), 'API_REJECTED');
  assert.doesNotMatch(connectionErrorMessage('unknown private error'), /private/);
  assert.match(connectionErrorMessage('SIGNING_KEY_MISMATCH'), /do not match/);
  assert.equal(safeConnectionCode('untrusted'), null);
});
test('gateway configuration errors identify missing settings without exposing their values', async () => {
  const request = () =>
    new Request('https://gateway.test', { method: 'POST', headers: { Origin: 'https://example.org' } });
  const base = { ALLOWED_ORIGIN: 'https://example.org', FIREBASE_PROJECT_ID: 'test' };
  let r = await worker.fetch(request(), base);
  assert.equal((await r.json()).errorCode, 'GATEWAY_SECRET_MISSING');
  r = await worker.fetch(request(), {
    ...base,
    GATEWAY_HMAC_SECRET: 'synthetic-secret-value-1234567890123456',
  });
  assert.equal((await r.json()).errorCode, 'GATEWAY_URL_INVALID');
  r = await worker.fetch(request(), {
    ...base,
    GATEWAY_HMAC_SECRET: 'synthetic-secret-value-1234567890123456',
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/test/exec',
  });
  assert.equal((await r.json()).errorCode, 'AUTH_TOKEN_MISSING');
});
