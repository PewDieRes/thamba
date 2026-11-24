import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHELL_PARTS = /#[^\n]*|[;&|()<>\n]+|(?:'[^']*'|"(?:\\[\s\S]|[^"\\])*"|\\[\s\S]|[^\s'"\;&|()<>\\])+/g;
const WORD_PARTS = /'([^']*)'|"((?:\\[\s\S]|[^"\\])*)"|\\([\s\S])/g;
const COMMAND_BREAK = /^[;&|()<>\n]/;
const REDIRECTION = /^[<>]+&?$/;
const SHELLS = ['bash', 'sh', 'zsh', 'dash', 'ksh'];
const SUPABASE_OPTIONS_WITH_VALUE = ['--workdir', '--network-id', '--output', '-o'];

export function getBlockReason(command, prodRef) {
  const ref = prodRef?.trim();
  if (ref && command.includes(ref)) return 'The command contains the production Supabase project ref.';

  let words = [];
  let isRedirectionTarget = false;
  for (const [part] of command.replaceAll('\\\n', '').matchAll(SHELL_PARTS)) {
    if (part.startsWith('#')) continue;
    if (REDIRECTION.test(part)) {
      isRedirectionTarget = true;
      continue;
    }
    if (COMMAND_BREAK.test(part)) {
      const reason = checkWords(words, ref);
      if (reason) return reason;
      words = [];
    } else if (!isRedirectionTarget) {
      words.push(unquote(part));
    }
    isRedirectionTarget = false;
  }
  return checkWords(words, ref);
}

function unquote(word) {
  return word.replace(WORD_PARTS, (_, singleQuoted, doubleQuoted, escaped) =>
    singleQuoted ?? doubleQuoted?.replace(/\\([$"\\])/g, '$1') ?? escaped);
}

function checkWords(words, prodRef) {
  for (const [index, word] of words.entries()) {
    const executable = word.split('/').at(-1);
    const args = words.slice(index + 1);
    if (executable === 'supabase') {
      const reason = checkSupabase(args);
      if (reason) return reason;
    }
    if (executable === 'vercel' && isFlagEnabled(args, '--prod')) {
      return 'Vercel production deployments are blocked.';
    }
    if (SHELLS.includes(executable)) {
      const flagIndex = args.findIndex((arg) => /^-[a-z]*c[a-z]*$/i.test(arg));
      const program = args[flagIndex + 1];
      if (flagIndex >= 0 && program) {
        const reason = getBlockReason(program, prodRef);
        if (reason) return reason;
      }
    }
  }
  return null;
}

function checkSupabase(args) {
  const [command, subcommand] = args.filter((arg, index) =>
    !arg.startsWith('-') && !SUPABASE_OPTIONS_WITH_VALUE.includes(args[index - 1]));
  if (command !== 'db') return null;
  if (subcommand === 'reset' && isFlagEnabled(args, '--linked')) {
    return 'Resetting a linked Supabase database is blocked.';
  }
  if (subcommand === 'push' && !isFlagEnabled(args, '--dry-run')) {
    return 'Supabase database pushes require --dry-run.';
  }
  return null;
}

function isFlagEnabled(args, flag) {
  const endOfOptions = args.indexOf('--');
  const options = endOfOptions < 0 ? args : args.slice(0, endOfOptions);
  const lastValue = options.findLast((arg) => arg === flag || arg.startsWith(flag + '='));
  return lastValue === flag || lastValue === flag + '=true' || lastValue === flag + '=1';
}

function readReason() {
  try {
    const event = JSON.parse(readFileSync(0, 'utf8'));
    if (event?.hook_event_name !== 'PreToolUse' || event.tool_name !== 'Bash' ||
        typeof event.tool_input?.command !== 'string') {
      return 'The production command hook expected a Codex Bash PreToolUse payload.';
    }
    return getBlockReason(event.tool_input.command, process.env.THAMBA_PROD_REF);
  } catch {
    return 'The production command hook could not read the Codex Bash payload.';
  }
}

function run() {
  const reason = readReason();
  if (!reason) return;
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
