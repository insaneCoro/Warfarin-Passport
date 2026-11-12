import { test } from 'node:test';
import assert from 'node:assert/strict';
import { doseSummary, followupAttempt, referenceGuidance } from '../../app/js/clinical-utils.mjs';
import { addDays } from '../../app/js/date-utils.mjs';
test('dose totals, percentage, snapshots and unknown baseline', () => {
  const old = [5, 5, 5, 5, 5, 5, 5],
    daily = [5, 5, 5, 5, 5, 5, 7.5];
  const summary = doseSummary(old, daily);
  assert.equal(summary.weekly, 37.5);
  assert.equal(summary.percentChange, 7.14);
  daily[0] = 0;
  old[0] = 0;
  assert.equal(summary.daily[0], 5);
  assert.equal(summary.previousDaily[0], 5);
  assert.equal(doseSummary(null, Array(7).fill(0)).percentChange, null);
  assert.throws(() => doseSummary(null, [1]));
});
test('failed contact cannot close task and attempts preserve original', () => {
  const f = { status: 'Pending', attempts: [] };
  const input = { outcome: 'No answer', actions: 'Left callback request' };
  const a = followupAttempt(f, input, 'staff-uid', '2026-11-11T00:00:00Z');
  assert.equal(a.completed, false);
  assert.equal(a.actor, 'staff-uid');
  assert.equal(f.attempts.length, 0);
  assert.throws(() => followupAttempt(f, { ...input, complete: true }, 'uid', 'time'));
  assert.equal(
    followupAttempt(f, { ...input, outcome: 'Contacted', complete: true }, 'uid', 'time').completed,
    true,
  );
});
test('calendar and urgent guidance', () => {
  assert.equal(addDays('2026-12-31', 2), '2027-01-02');
  assert.throws(() => addDays('2026-02-30', 2));
  assert.match(
    referenceGuidance({ inr: 6, targetLow: 2, targetHigh: 3 }).join(' '),
    /prompt clinician review/,
  );
});
