import { test } from 'node:test';
import assert from 'node:assert/strict';
import { usesConnectedApi } from '../../app/js/mode-utils.mjs';
test('the website always opens staff sign-in; demo mode only works locally for tests', () => {
  assert.equal(usesConnectedApi(true, '', 'insanecoro.github.io'), true);
  assert.equal(usesConnectedApi(true, '?mode=demo', 'insanecoro.github.io'), true);
  assert.equal(usesConnectedApi(true, '?mode=demo', '127.0.0.1'), false);
  assert.equal(usesConnectedApi(true, '?mode=connected', 'localhost'), true);
  assert.equal(usesConnectedApi(false, '?mode=connected', 'localhost'), false);
});
