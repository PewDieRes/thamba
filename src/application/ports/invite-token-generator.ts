export interface InviteTokenGenerator {
  derive(seed: string): string;
}
