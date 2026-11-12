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

test('each tab is read once per request; writes and taking the lock re-read fresh data', () => {
  const { c } = storage();
  const realDatabase = c.database_;
  let reads = 0;
  c.database_ = () => {
    const db = realDatabase();
    return {
      ...db,
      getSheetByName: (name) => {
        const sh = db.getSheetByName(name);
        return {
          ...sh,
          getRange: (row, ...rest) => {
            const range = sh.getRange(row, ...rest);
            return { ...range, getValues: () => (row === 2 && reads++, range.getValues()) };
          },
        };
      },
    };
  };
  c.append_('Follow_Ups', { id: 'f1', patientId: 'p1', status: 'Pending' });
  c.allRows_('Follow_Ups');
  c.allRows_('Follow_Ups');
  c.findRow_('Follow_Ups', 'id', 'f1');
  assert.equal(reads, 1, 'repeated reads in one request use the cache');
  c.append_('Follow_Ups', { id: 'f2', patientId: 'p1', status: 'Pending' });
  assert.equal(c.allRows_('Follow_Ups').length, 2, 'a write refreshes the cached rows');
  assert.equal(reads, 2);
  c.withLock_(() => c.allRows_('Follow_Ups'));
  assert.equal(reads, 3, 'taking the lock re-reads, in case another request wrote meanwhile');
  const row = c.allRows_('Follow_Ups')[0];
  row.status = 'Changed by caller';
  assert.equal(c.allRows_('Follow_Ups')[0].status, 'Pending', 'callers get copies, not the cache');
});
