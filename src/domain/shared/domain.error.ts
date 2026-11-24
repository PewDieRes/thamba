export interface DomainError<Code extends string = string> {
  readonly code: Code;
}
