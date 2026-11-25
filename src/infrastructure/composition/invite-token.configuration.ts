const MIN_INVITE_TOKEN_SECRET_BYTES = 32;

type ConfigurationErrorCode = 'missing_invite_token_secret' | 'invalid_invite_token_secret';

export class ConfigurationError extends Error {
  constructor(readonly code: ConfigurationErrorCode) {
    super(
      code === 'missing_invite_token_secret'
        ? 'INVITE_TOKEN_SECRET is required for the Supabase container'
        : `INVITE_TOKEN_SECRET must be base64 encoding at least ${String(MIN_INVITE_TOKEN_SECRET_BYTES)} bytes`,
    );
    this.name = 'ConfigurationError';
  }
}

export function decodeInviteTokenSecret(encoded: string | undefined): Buffer {
  if (!encoded) throw new ConfigurationError('missing_invite_token_secret');
  const secret = Buffer.from(encoded, 'base64');
  const canonical = secret.toString('base64');
  // Node's decoder also accepts non-base64 characters and partially padded input.
  const isBase64 = encoded === canonical || encoded === canonical.replace(/=+$/, '');
  if (!isBase64 || secret.length < MIN_INVITE_TOKEN_SECRET_BYTES) {
    throw new ConfigurationError('invalid_invite_token_secret');
  }
  return secret;
}
