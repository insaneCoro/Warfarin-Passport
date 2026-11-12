import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { createHmac } from 'node:crypto';
test('replay protection stays atomic under a short owner lock while database writes hold the script lock', () => {
  const secret = 'synthetic-signing-key-12345678901234567890',
    cache = new Map();
  let userLocks = 0,
    scriptLocks = 0,
    dispatches = 0;
  const c = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => secret }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k), put: (k, v) => cache.set(k, v) }) },
    LockService: {
      getUserLock: () => ({
        tryLock: () => {
          userLocks++;
          return true;
        },
        releaseLock() {},
      }),
      getScriptLock: () => ({
        tryLock: () => {
          scriptLocks++;
          return false;
        },
        releaseLock() {},
      }),
    },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (text) => ({ setMimeType: () => JSON.parse(text) }),
    },
    Utilities: {
      computeHmacSha256Signature: (text, key) => [...createHmac('sha256', key).update(text).digest()],
      base64DecodeWebSafe: (x) => [...Buffer.from(x, 'base64url')],
      newBlob: (bytes) => ({ getDataAsString: () => Buffer.from(bytes).toString('utf8') }),
    },
  });
  for (const name of ['API.gs', 'Security.gs'])
    vm.runInContext(fs.readFileSync(new URL('../../backend/' + name, import.meta.url), 'utf8'), c);
  c.dispatch_ = () => {
    dispatches++;
    return { uid: 'approved-test-staff' };
  };
  function envelope(nonce) {
    const ts = Date.now(),
      payload = Buffer.from(
        JSON.stringify({ action: 'auth.me', params: {}, user: { uid: 'approved-test-staff' } }),
      ).toString('base64url'),
      signature = createHmac('sha256', secret).update(`v1\n${ts}\n${nonce}\n${payload}`).digest('hex');
    return { postData: { contents: JSON.stringify({ ts, nonce, payload, signature }) } };
  }
  const request = envelope('11111111-1111-4111-8111-111111111111');
  assert.equal(c.doPost(request).ok, true);
  assert.equal(scriptLocks, 0);
  assert.equal(userLocks, 1);
  assert.equal(c.doPost(request).error, 'Duplicate request');
  assert.equal(dispatches, 1);
  let mutation = false;
  c.dispatch_ = () =>
    c.withLock_(() => {
      mutation = true;
    });
  const busy = c.doPost(envelope('22222222-2222-4222-8222-222222222222'));
  assert.equal(busy.errorCode, 'SERVER_BUSY');
  assert.equal(mutation, false);
  assert.equal(scriptLocks, 1);
  assert.match(busy.error, /Clinic is busy/);
});
