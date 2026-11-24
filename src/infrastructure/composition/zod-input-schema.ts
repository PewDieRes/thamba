import { z } from 'zod';
import type {
  InputSchema,
  InputSchemaFactory,
  SchemaOutput,
  SchemaShape,
} from '@application/contracts/input-schema';

function asZod<T>(schema: InputSchema<T>): z.ZodType<T> {
  return schema as z.ZodType<T>;
}

export const zodInputSchema: InputSchemaFactory = {
  object<S extends SchemaShape>(shape: S): InputSchema<SchemaOutput<S>> {
    const fields = Object.fromEntries(
      Object.entries(shape).map(([key, value]) => [key, asZod(value)]),
    );
    return z.strictObject(fields) as InputSchema<SchemaOutput<S>>;
  },
  union: (first, second) => z.union([asZod(first), asZod(second)]),
  optional: (schema) => asZod(schema).optional(),
  validated: (parse) =>
    z.unknown().transform((input, context) => {
      const result = parse(input);
      if (result.ok) return result.value;
      context.addIssue({ code: 'custom', message: result.error.code });
      return z.NEVER;
    }),
  text: (maxLength) => z.string().min(1).max(maxLength),
  literal: (value) => z.literal(value),
  boolean: () => z.boolean(),
};
