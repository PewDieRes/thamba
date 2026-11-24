type Ok<T> = { readonly ok: true; readonly value: T };
type Err<E> = { readonly ok: false; readonly error: E };

export type Result<T, E> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

export function map<T, E, U>(result: Result<T, E>, mapValue: (value: T) => U): Result<U, E> {
  return isOk(result) ? ok(mapValue(result.value)) : result;
}

export function mapErr<T, E, F>(result: Result<T, E>, mapError: (error: E) => F): Result<T, F> {
  return isErr(result) ? err(mapError(result.error)) : result;
}

export function flatMap<T, E, U, F>(
  result: Result<T, E>,
  mapValue: (value: T) => Result<U, F>,
): Result<U, E | F> {
  return isOk(result) ? mapValue(result.value) : result;
}

export function match<T, E, U, V>(
  result: Result<T, E>,
  handlers: { ok: (value: T) => U; err: (error: E) => V },
): U | V {
  return isOk(result) ? handlers.ok(result.value) : handlers.err(result.error);
}
