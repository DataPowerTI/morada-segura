const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/booking-date.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const api = {};
vm.runInNewContext(compiled, { exports: api, Date });
const { bookingDateKey, parseBookingDate } = api;

for (const timezone of ['America/Sao_Paulo', 'UTC', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
  test('booking day survives save, PocketBase response and display in ' + timezone, () => {
    const previous = process.env.TZ;
    process.env.TZ = timezone;
    try {
      for (const day of ['2026-09-18', '2026-01-01', '2026-12-31', '2028-02-29', '2026-03-08', '2026-11-01']) {
        const [year, month, date] = day.split('-').map(Number);
        const selected = new Date(year, month - 1, date);
        assert.equal(bookingDateKey(selected), day);
        for (const stored of [day, day + ' 00:00:00.000Z', day + 'T00:00:00Z', day + 'T23:00:00-03:00']) {
          assert.equal(bookingDateKey(stored), day);
          const displayed = parseBookingDate(stored);
          assert.equal(displayed.getFullYear(), year);
          assert.equal(displayed.getMonth(), month - 1);
          assert.equal(displayed.getDate(), date);
        }
      }
      // At 23:30 the dashboard must still include today's reservations.
      const lateToday = new Date(2026, 8, 18, 23, 30);
      assert.equal(bookingDateKey(lateToday), '2026-09-18');
      assert.ok(bookingDateKey('2026-09-18 00:00:00.000Z') >= bookingDateKey(lateToday));
      assert.ok(bookingDateKey('2026-09-17 00:00:00.000Z') < bookingDateKey(lateToday));
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });
}
test('invalid dates are rejected instead of rolling into another booking day', () => {
  for (const value of ['', 'not a date', '2026-02-29', '2026-04-31', '2026-13-18', '2026-00-18', '2026-09-00']) {
    assert.equal(bookingDateKey(value), '');
    assert.ok(Number.isNaN(parseBookingDate(value).getTime()));
  }
});
