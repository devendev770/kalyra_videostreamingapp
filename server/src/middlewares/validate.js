import { AppError } from './errorHandler.js';

/**
 * Validate request body/query/params against a Joi schema
 * @param {Object} schema - Joi schema object with optional body, query, params keys
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const validationErrors = [];

    for (const [source, joiSchema] of Object.entries(schema)) {
      if (!req[source]) continue;
      const { error, value } = joiSchema.validate(req[source], {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false,
      });

      if (error) {
        const messages = error.details.map((d) => d.message.replace(/"/g, ''));
        validationErrors.push(...messages);
      } else {
        // Express 5 makes some request objects like req.query read-only (getter only).
        // We assign properties individually to avoid "Cannot set property query" errors.
        try {
          req[source] = value;
        } catch {
          // Clear existing keys if writable, then assign new sanitized values
          for (const key of Object.keys(req[source])) {
            try { delete req[source][key]; } catch {}
          }
          Object.assign(req[source], value);
        }
      }
    }

    if (validationErrors.length > 0) {
      return next(new AppError(validationErrors.join('; '), 400));
    }

    next();
  };
};
