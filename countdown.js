#!/usr/bin/env node

import * as readline from 'node:readline';

// ─── Format helpers ─────────────────────────────────────────────────────────

export function formatSeconds(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${s}`;
}

export function formatMMSS(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function formatHHMMSS(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

const FORMATTERS = {
  seconds: formatSeconds,
  'mm:ss': formatMMSS,
  'hh:mm:ss': formatHHMMSS,
};

export function getFormatter(name) {
  return FORMATTERS[name] || null;
}

// ─── Input validation ───────────────────────────────────────────────────────

export function validateInput(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return { ok: false, error: 'Please provide the number of seconds.' };
  }
  const trimmed = String(raw).trim();
  const num = Number(trimmed);
  if (isNaN(num) || trimmed === '') {
    return { ok: false, error: `Invalid input "${trimmed}": not a number.` };
  }
  if (!Number.isFinite(num)) {
    return { ok: false, error: 'Input is too large.' };
  }
  if (num < 0) {
    return { ok: false, error: 'Seconds must be a non-negative number.' };
  }
  if (num > 359999) {
    // ~99:59:59
    return { ok: false, error: 'Maximum supported value is 359999 seconds (99:59:59).' };
  }
  const seconds = Math.round(num);
  if (seconds === 0) {
    return { ok: false, error: 'Seconds must be greater than 0.' };
  }
  return { ok: true, value: seconds };
}

// ─── Argument parsing ───────────────────────────────────────────────────────

export function parseArgs(argv) {
  const args = argv.slice(2);
  const result = { help: false, format: 'mm:ss', seconds: null };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      result.help = true;
      return result;
    }
    if (arg === '--format' || arg === '-f') {
      i++;
      if (i >= args.length) {
        return { error: '--format requires a value: seconds | mm:ss | hh:mm:ss' };
      }
      const fmt = args[i].toLowerCase();
      if (!FORMATTERS[fmt]) {
        return { error: `Unknown format "${args[i]}". Use: seconds | mm:ss | hh:mm:ss` };
      }
      result.format = fmt;
    } else if (arg.startsWith('-') && isNaN(Number(arg))) {
      return { error: `Unknown option "${arg}". Use --help for usage.` };
    } else {
      result.seconds = arg;
    }
  }
  return result;
}

// ─── Help text ──────────────────────────────────────────────────────────────

export const HELP_TEXT = `
  ⏱  countdown — CLI countdown timer by Alpha Studio

  USAGE
    countdown <seconds> [options]
    countdown              (interactive mode)

  OPTIONS
    -f, --format <fmt>   Display format: seconds | mm:ss | hh:mm:ss  (default: mm:ss)
    -h, --help           Show this help message

  EXAMPLES
    countdown 60              # 1-minute countdown
    countdown 3600 -f hh:mm:ss  # 1 hour, full format
    countdown                 # prompts for seconds interactively
`;

// ─── Countdown runner ───────────────────────────────────────────────────────

function runCountdown(totalSeconds, formatter) {
  const cols = process.stdout.columns || 80;
  const startTime = Date.now();
  const endTime = startTime + totalSeconds * 1000;

  const render = (remaining) => {
    const display = `  ⏳ ${formatter(remaining)}  `;
    const padded = display.padEnd(cols);
    process.stdout.write(`\r${padded}`);
  };

  render(totalSeconds);

  return new Promise((resolve) => {
    const timer = setInterval(() => {
      const remaining = Math.round((endTime - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(timer);
        process.removeListener('SIGINT', onSigint);
        const done = `  ✅ ${formatter(0)} — Time's up!  \u0007`;
        process.stdout.write(`\r${done.padEnd(cols)}\n`);
        resolve();
      } else {
        render(remaining);
      }
    }, 250);

    // Graceful Ctrl+C — use named function so we can removeListener
    const onSigint = () => {
      clearInterval(timer);
      process.removeListener('SIGINT', onSigint);
      process.stdout.write('\n');
      process.exit(0);
    };
    process.on('SIGINT', onSigint);
  });
}

// ─── Interactive prompt ─────────────────────────────────────────────────────

function askForSeconds() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('  Enter seconds to count down: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const parsed = parseArgs(process.argv);

  if (parsed.error) {
    console.error(`\n  ❌ ${parsed.error}\n`);
    process.exit(1);
  }

  if (parsed.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  const formatter = getFormatter(parsed.format);

  let rawInput = parsed.seconds;
  if (rawInput === null) {
    // Interactive mode
    rawInput = await askForSeconds();
  }

  const validation = validateInput(rawInput);
  if (!validation.ok) {
    console.error(`\n  ❌ ${validation.error}\n`);
    process.exit(1);
  }

  console.log(`\n  Starting ${formatter(validation.value)} countdown...\n`);
  await runCountdown(validation.value, formatter);
}

// Only run main when executed directly (not imported for testing)
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('countdown.js') || process.argv[1].endsWith('countdown')
);
if (isDirectRun) {
  main();
}
