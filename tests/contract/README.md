Each `*.contract.ts` exports a reusable suite that takes a factory for an
isolated adapter. Register the suite in a `*.test.ts` entry point. The memory
entry point runs all suites. A future Supabase entry point can register the
same suites with its own factories and prerequisite fixtures.

A versioned save uses `null` for insert and the current version for update.
The first saved version is 1. A failed expected-version check returns
`ConcurrencyConflict` and preserves the existing record. Unit of Work adapters
must commit all transaction writes together and roll them back on failure.
