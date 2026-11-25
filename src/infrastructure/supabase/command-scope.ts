export interface CommandScope {
  readonly town_id: string;
  readonly demo_run_id: string | null;
  readonly stand_ids?: readonly string[];
}
