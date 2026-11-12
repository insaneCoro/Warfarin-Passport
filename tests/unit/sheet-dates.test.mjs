import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storage } from '../helpers/sheets.mjs';

test('date cells read from Google Sheets come back as the same yyyy-MM-dd text that was written', () => {
  const { c, grids } = storage();
  c.append_('Follow_Ups', {
    id: 'f1',
    patientId: 'p1',
    inrCheckDate: '2026-11-20',
    callDueDate: '2026-11-21',
    status: 'Pending',
    createdAt: '2026-11-12T10:00:00+03:00',
  });
  assert.ok(
    grids.Follow_Ups[1][3] instanceof Date,
    'fake sheet stores date text as a Date, like Google Sheets',
  );
  const row = c.allRows_('Follow_Ups')[0];
  assert.equal(row.inrCheckDate, '2026-11-20');
  assert.equal(row.callDueDate, '2026-11-21');
  assert.equal(row.createdAt, '2026-11-12T10:00:00+03:00');
});
