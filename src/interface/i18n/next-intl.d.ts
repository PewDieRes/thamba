import type commonMessages from '../../../messages/mr/common.json';

declare module 'next-intl' {
  interface AppConfig {
    Messages: { common: typeof commonMessages };
  }
}
