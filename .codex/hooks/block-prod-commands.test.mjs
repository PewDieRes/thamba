import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { getBlockReason } from './block-prod-commands.mjs';

test('blocks references to production without echoing the project ref', () => {
  const ref = 'synthetic-production-ref';
  const reason = getBlockReason(`curl https://${ref}.supabase.co`, ref);
  assert.ok(reason);
  assert.ok(!reason.includes(ref));
  assert.equal(getBlockReason('supabase status', ''), null);
});

test('blocks linked resets, pushes without dry-run, and production Vercel deployments', () => {
  for (const command of [
    'supabase db reset --linked',
    'supabase --debug db reset --linked',
    'supabase --workdir ./town db push',
    'supabase db --debug push',
    'bash -lc "supabase db push"',
    'sh -c "supabase db push; supabase db push --dry-run"',
    'supabase db reset --linked=true',
    'pnpm exec supabase db push',
    './node_modules/.bin/supabase db push --debug',
    'supabase db push --dry-run=false',
    'supabase db push && echo --dry-run',
    'supabase db push --dry-run; supabase db push',
    'supabase db push > --dry-run',
    'supabase db push -- --dry-run',
    'supabase db push --dry-run --dry-run=false',
    'vercel --prod',
    'vercel deploy "--prod"',
  ]) {
    assert.ok(getBlockReason(command), command);
  }
});

test('allows preview deployments, local resets, and dry runs', () => {
  for (const command of [
    'supabase db reset --local',
    'supabase db push --dry-run',
    'supabase db push --dry-run=true',
    'supabase db push "--dry-run" && supabase status',
    'bash -lc "supabase db push --dry-run"',
    'grep "vercel --prod" notes.txt',
    'vercel deploy --prebuilt',
    'vercel --production-flag',
  ]) {
    assert.equal(getBlockReason(command), null, command);
  }
});

test('reads the documented shell payload and emits a structured denial', () => {
  const script = fileURLToPath(new URL('./block-prod-commands.mjs', import.meta.url));
  const event = { hook_event_name: 'PreToolUse', tool_name: 'Bash' };
  const runHook = (command) => spawnSync(process.execPath, [script], {
    input: JSON.stringify({ ...event, tool_input: { command } }),
    encoding: 'utf8',
  });
  const blocked = runHook('vercel --prod');
  assert.equal(blocked.status, 0, blocked.stderr);
  const { hookSpecificOutput } = JSON.parse(blocked.stdout);
  assert.equal(hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.equal(hookSpecificOutput.permissionDecision, 'deny');
  assert.ok(hookSpecificOutput.permissionDecisionReason);
  const allowed = runHook('vercel deploy');
  assert.equal(allowed.status, 0, allowed.stderr);
  assert.equal(allowed.stdout, '');
});
