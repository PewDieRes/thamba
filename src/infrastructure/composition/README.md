Server wiring lives in `container.ts`. Browser wiring belongs in `browser.ts`.

`createInMemoryContainer()` creates an isolated application instance with an empty
store. Seed Towns, Demo Town run ownership, Stand and roster records, Fare
charts and initial Driver devices through its transaction port before running a Demo Town journey. Tests
can inject a Clock and other runtime ports. `createContainer(ports)` binds the
same use cases to another Unit of Work. The transaction factory provides one
binding for each repository, command log and event log.

The boundary that calls a protected use case supplies verified Rider IDs,
Driver session subjects and Stand Coordinator memberships. Driver commands
resolve their active device in the same transaction as the state change.
The Zod factory builds strict input schemas and lives in server composition.

Commands take an actor-scoped `commandKey`. AdvanceDispatch also accepts
unkeyed calls for polls and sweeps, which reevaluate the current due work.
Each advance retries one concurrency conflict using a fresh transaction and
clock reading. Callers can advance a requested Booking after confirmation,
decline or withdrawal.
