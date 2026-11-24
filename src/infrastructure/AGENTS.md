## Infrastructure

- Each adapter implements exactly one port.
- Map rows to domain objects and back only in `*.mapper.ts`.
- Every adapter must pass its port's shared contract suite.
