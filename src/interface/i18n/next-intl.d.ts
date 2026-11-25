import type { Messages as ThambaMessages } from './messages';

declare module 'next-intl' {
  interface AppConfig {
    Messages: ThambaMessages;
  }
}
