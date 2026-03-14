import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  formatSeconds,
  formatMMSS,
  formatHHMMSS,
  getFormatter,
  validateInput,
  parseArgs,
} from './countdown.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COUNTDOWN_PATH = join(__dirname, 'countdown.js');

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

// ─── E2E timing deviation tests ────────────────────────────────────────────
// These tests run actual countdowns and measure wall-clock deviation.
// They validate that the Date.now()-based timing stays accurate and
// doesn't accumulate drift like a naive setInterval approach would.

function runCountdownProcess(seconds) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const child = execFile('node', [COUNTDOWN_PATH, String(seconds)], {
      timeout: (seconds + 5) * 1000,
    }, (error, stdout, stderr) => {
      const elapsed = Date.now() - start;
      if (error && error.killed) {
        reject(new Error(`Countdown timed out after ${elapsed}ms`));
        return;
      }
      resolve({ elapsed, stdout, stderr, exitCode: error ? error.code : 0 });
    });
  });
}

describe('e2e: timing deviation', () => {
  it('3-second countdown completes within ±500ms of expected', async () => {
    const target = 3;
    const { elapsed } = await runCountdownProcess(target);
    const expectedMs = target * 1000;
    const deviation = elapsed - expectedMs;
    const absDeviation = Math.abs(deviation);

    console.log(`  3s countdown: elapsed=${elapsed}ms, deviation=${deviation}ms (${(deviation / expectedMs * 100).toFixed(1)}%)`);

    // 250ms poll interval + process startup overhead → 500ms tolerance is generous
    assert.ok(absDeviation < 500,
      `3s countdown deviated by ${deviation}ms (expected < ±500ms)`);
  });

  it('5-second countdown completes within ±500ms of expected', async () => {
    const target = 5;
    const { elapsed } = await runCountdownProcess(target);
    const expectedMs = target * 1000;
    const deviation = elapsed - expectedMs;
    const absDeviation = Math.abs(deviation);

    console.log(`  5s countdown: elapsed=${elapsed}ms, deviation=${deviation}ms (${(deviation / expectedMs * 100).toFixed(1)}%)`);

    assert.ok(absDeviation < 500,
      `5s countdown deviated by ${deviation}ms (expected < ±500ms)`);
  });

  it('10-second countdown completes within ±500ms of expected', async () => {
    const target = 10;
    const { elapsed } = await runCountdownProcess(target);
    const expectedMs = target * 1000;
    const deviation = elapsed - expectedMs;
    const absDeviation = Math.abs(deviation);

    console.log(`  10s countdown: elapsed=${elapsed}ms, deviation=${deviation}ms (${(deviation / expectedMs * 100).toFixed(1)}%)`);

    assert.ok(absDeviation < 500,
      `10s countdown deviated by ${deviation}ms (expected < ±500ms)`);
  });

  it('60-second countdown completes within ±500ms of expected', async () => {
    const target = 60;
    const { elapsed } = await runCountdownProcess(target);
    const expectedMs = target * 1000;
    const deviation = elapsed - expectedMs;
    const absDeviation = Math.abs(deviation);

    console.log(`  60s countdown: elapsed=${elapsed}ms, deviation=${deviation}ms (${(deviation / expectedMs * 100).toFixed(1)}%)`);

    assert.ok(absDeviation < 500,
      `60s countdown deviated by ${deviation}ms (expected < ±500ms)`);
  });

  it('countdown outputs completion message', async () => {
    const { stdout } = await runCountdownProcess(2);
    assert.ok(stdout.includes("Time's up!"), 'Expected completion message in output');
  });
});
