The repository adapters map normalized Postgres records to the values in the application ports. The composition root builds a server-only Supabase client and supplies the domain constructors to the mappers.

`SupabaseUnitOfWork` buffers versioned mutations and sends one commit RPC when the use case succeeds. Postgres keeps the normalized projections and deferred constraints in the same transaction. See [ADR 0007](../../../docs/adr/0007-unit-of-work.md) and the [local integration instructions](../../../tests/integration/README.md).
