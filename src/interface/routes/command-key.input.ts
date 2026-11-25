import { z } from 'zod';

const MAX_COMMAND_KEY_LENGTH = 128;

export const commandKey = z.string().min(1).max(MAX_COMMAND_KEY_LENGTH);
