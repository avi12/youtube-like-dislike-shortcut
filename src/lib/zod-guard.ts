import type { z } from "@/lib/zod";

// Page objects are validated in place and used as they are, since a parsed copy would lose their identity and `this`
export function createGuard<Schema extends z.ZodType>(schema: Schema) {
  return (value: unknown): value is z.infer<Schema> => schema.safeParse(value).success;
}

// For classes that exist only in a browser: a schema built at import time would throw when WXT imports the
// entrypoints in Node to read their options
export function createLazyGuard<Schema extends z.ZodType>(getSchema: () => Schema) {
  let schema: Schema | undefined;
  return (value: unknown): value is z.infer<Schema> => {
    schema ??= getSchema();
    return schema.safeParse(value).success;
  };
}
