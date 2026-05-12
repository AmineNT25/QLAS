/**
 * Zod validation middleware
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} source
 */
export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return res.status(422).json({
        message: "Validation failed",
        errors,
      });
    }

    // Replace with parsed + coerced values (e.g. transformed query params)
    req[source] = result.data;
    next();
  };
};
