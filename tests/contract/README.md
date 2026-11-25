Each `*.contract.ts` exports a reusable suite that takes a factory for an
isolated adapter. Register the suite in a `*.test.ts` entry point. The memory
entry point runs all suites in the contract project. The Supabase entry point
runs the same suites with prerequisite fixtures in the integration project.
[Local Supabase commands](../integration/README.md)

A versioned save uses `null` for insert and the current version for update.
The first saved version is 1. A failed expected-version check returns
`ConcurrencyConflict` and preserves the existing record. Unit of Work adapters
must commit all transaction writes together and roll them back on failure.
