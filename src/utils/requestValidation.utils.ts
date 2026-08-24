import { AppError } from '#utils/appError.js';
import { ErrorCode } from '#utils/errorCodes.js';
import { z } from 'zod';

/**
 * validateRequestBody - Parses `body` against `schema`, throwing a descriptive AppError naming
 * exactly which fields are missing vs malformed if validation fails.
 *
 * @schema: Zod schema describing the expected request body shape.
 * @body: The raw, unvalidated request body (e.g. `req.body`).
 *
 * @return: The parsed, type-safe body on success.
 */
const parseOrThrow = <T extends z.ZodType>(schema: T, data: unknown): z.infer<T> => {
  const parsedData = schema.safeParse(data, { reportInput: true });

  if (!parsedData.success) {
    const missingFields = new Set<string>();
    const invalidFields = new Set<string>();

    for (const issue of parsedData.error.issues) {
      const field = issue.path.join('.') || '(root)';

      if (issue.code === 'invalid_type' && issue.input === undefined) {
        missingFields.add(field);
      } else {
        invalidFields.add(field);
      }
    }

    if (missingFields.size > 0 && invalidFields.size > 0) {
      throw new AppError(
        `Campo(s) obrigatório(s) ausente(s): ${[...missingFields].join(', ')}. Campo(s) inválido(s): ${[...invalidFields].join(', ')}`,
        400,
        ErrorCode.MISSING_REQUIRED_FIELD,
        true,
        parsedData.error
      );
    }

    if (missingFields.size > 0) {
      throw new AppError(
        `Campo(s) obrigatório(s) ausente(s): ${[...missingFields].join(', ')}`,
        400,
        ErrorCode.MISSING_REQUIRED_FIELD,
        true,
        parsedData.error
      );
    }

    throw new AppError(
      `Campo(s) inválido(s): ${[...invalidFields].join(', ')}`,
      400,
      ErrorCode.INVALID_INPUT,
      true,
      parsedData.error
    );
  }

  return parsedData.data;
};

export const validateRequestBody = <T extends z.ZodType>(schema: T, body: unknown): z.infer<T> =>
  parseOrThrow(schema, body);

/**
 * validateRequestParams - Same as validateRequestBody but for `req.params`.
 *
 * @schema: Zod schema describing the expected request params shape.
 * @params: The raw, unvalidated request params (e.g. `req.params`).
 *
 * @return: The parsed, type-safe params on success.
 */
export const validateRequestParams = <T extends z.ZodType>(schema: T, params: unknown): z.infer<T> =>
  parseOrThrow(schema, params);
