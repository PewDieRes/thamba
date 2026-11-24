## App

- Keep controllers thin. Validate input with Zod, invoke exactly one use case via the composition container and map its `Result` to a response.
- Keep business logic out of components.
