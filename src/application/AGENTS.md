## Application

- Put one use case per folder with `*.use-case.ts` and `*.input.ts`.
- Put use case tests in `tests/unit/application/use-cases/`, mirroring the source folder structure.
- Depend only on ports for external capabilities. Apply domain rules through domain modules.
- Map domain errors to typed application errors.
