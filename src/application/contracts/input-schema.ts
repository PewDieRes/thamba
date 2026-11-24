import { err } from '@domain/shared/result';
import type { Result } from '@domain/shared/result';
import type { ApplicationResult } from '../ports/application-result';

export interface InputSchema<T> {
  safeParse(input: unknown): { success: true; data: T } | { success: false };
}

export type SchemaShape = Readonly<Record<string, InputSchema<unknown>>>;

type Output<S> = S extends InputSchema<infer T> ? T : never;

export type SchemaOutput<S extends SchemaShape> = {
  [K in keyof S as undefined extends Output<S[K]> ? never : K]: Output<S[K]>;
} & {
  [K in keyof S as undefined extends Output<S[K]> ? K : never]?: Output<S[K]>;
};

export type InputOf<S extends (factory: InputSchemaFactory) => InputSchema<unknown>> = Output<
  ReturnType<S>
>;

export interface InputSchemaFactory {
  object<S extends SchemaShape>(shape: S): InputSchema<SchemaOutput<S>>;
  union<T, U>(first: InputSchema<T>, second: InputSchema<U>): InputSchema<T | U>;
  optional<T>(schema: InputSchema<T>): InputSchema<T | undefined>;
  validated<T>(parse: (input: unknown) => Result<T, { readonly code: string }>): InputSchema<T>;
  text(maxLength: number): InputSchema<string>;
  literal<T extends string>(value: T): InputSchema<T>;
  boolean(): InputSchema<boolean>;
}

export function validateInput<T, U>(
  schema: InputSchema<T>,
  input: unknown,
  act: (value: T) => Promise<ApplicationResult<U>>,
): Promise<ApplicationResult<U>> {
  const parsed = schema.safeParse(input);
  return parsed.success ? act(parsed.data) : Promise.resolve(err({ code: 'invalid_input' }));
}
