import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSeconds,
  formatMMSS,
  formatHHMMSS,
  getFormatter,
  validateInput,
  parseArgs,
} from './countdown.js';

// ─── formatSeconds ──────────────────────────────────────────────────────────

describe('formatSeconds', () => {
  it('formats zero', () => assert.equal(formatSeconds(0), '0'));
  it('formats small value', () => assert.equal(formatSeconds(5), '5'));
  it('formats large value', () => assert.equal(formatSeconds(3661), '3661'));
  it('clamps negative to 0', () => assert.equal(formatSeconds(-5), '0'));
});

// ─── formatMMSS ─────────────────────────────────────────────────────────────

describe('formatMMSS', () => {
  it('formats zero', () => assert.equal(formatMMSS(0), '00:00'));
  it('formats under a minute', () => assert.equal(formatMMSS(45), '00:45'));
  it('formats exactly one minute', () => assert.equal(formatMMSS(60), '01:00'));
  it('formats mixed', () => assert.equal(formatMMSS(125), '02:05'));
  it('formats large value', () => assert.equal(formatMMSS(3599), '59:59'));
  it('clamps negative', () => assert.equal(formatMMSS(-10), '00:00'));
});

// ─── formatHHMMSS ───────────────────────────────────────────────────────────

describe('formatHHMMSS', () => {
  it('formats zero', () => assert.equal(formatHHMMSS(0), '00:00:00'));
  it('formats one hour', () => assert.equal(formatHHMMSS(3600), '01:00:00'));
  it('formats mixed', () => assert.equal(formatHHMMSS(3661), '01:01:01'));
  it('formats large', () => assert.equal(formatHHMMSS(359999), '99:59:59'));
  it('clamps negative', () => assert.equal(formatHHMMSS(-1), '00:00:00'));
});

// ─── getFormatter ───────────────────────────────────────────────────────────

describe('getFormatter', () => {
  it('returns formatter for seconds', () => assert.equal(typeof getFormatter('seconds'), 'function'));
  it('returns formatter for mm:ss', () => assert.equal(typeof getFormatter('mm:ss'), 'function'));
  it('returns formatter for hh:mm:ss', () => assert.equal(typeof getFormatter('hh:mm:ss'), 'function'));
  it('returns null for unknown', () => assert.equal(getFormatter('xyz'), null));
});

// ─── validateInput ──────────────────────────────────────────────────────────

describe('validateInput', () => {
  it('accepts valid integer', () => {
    const r = validateInput('60');
    assert.equal(r.ok, true);
    assert.equal(r.value, 60);
  });

  it('accepts valid float (rounds)', () => {
    const r = validateInput('60.7');
    assert.equal(r.ok, true);
    assert.equal(r.value, 61);
  });

  it('rejects empty', () => {
    assert.equal(validateInput('').ok, false);
    assert.equal(validateInput(null).ok, false);
    assert.equal(validateInput(undefined).ok, false);
  });

  it('rejects non-number', () => {
    assert.equal(validateInput('abc').ok, false);
  });

  it('rejects negative', () => {
    assert.equal(validateInput('-5').ok, false);
  });

  it('rejects zero', () => {
    assert.equal(validateInput('0').ok, false);
  });

  it('rejects too large', () => {
    assert.equal(validateInput('999999').ok, false);
  });

  it('rejects Infinity', () => {
    assert.equal(validateInput('Infinity').ok, false);
  });
});

// ─── parseArgs ──────────────────────────────────────────────────────────────

describe('parseArgs', () => {
  const p = (...args) => parseArgs(['node', 'countdown.js', ...args]);

  it('parses seconds argument', () => {
    const r = p('60');
    assert.equal(r.seconds, '60');
    assert.equal(r.format, 'mm:ss');
  });

  it('parses --help', () => {
    assert.equal(p('--help').help, true);
    assert.equal(p('-h').help, true);
  });

  it('parses --format', () => {
    const r = p('120', '--format', 'hh:mm:ss');
    assert.equal(r.format, 'hh:mm:ss');
    assert.equal(r.seconds, '120');
  });

  it('parses -f shorthand', () => {
    assert.equal(p('-f', 'seconds').format, 'seconds');
  });

  it('returns error for missing format value', () => {
    assert.ok(p('--format').error);
  });

  it('returns error for unknown format', () => {
    assert.ok(p('-f', 'invalid').error);
  });

  it('returns error for unknown flag', () => {
    assert.ok(p('--foo').error);
  });

  it('defaults to interactive when no seconds given', () => {
    assert.equal(p().seconds, null);
  });

  it('treats negative numbers as seconds, not flags', () => {
    const r = p('-5');
    assert.equal(r.seconds, '-5');
    assert.equal(r.error, undefined);
  });
});
