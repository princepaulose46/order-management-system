import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { ValidationError } from "../errors/errors";

/**
 * Generic Express middleware to validate request payloads against a Zod schema.
 * If validation fails, it formats error messages and calls next() with a ValidationError.
 * On success, it replaces the request parameters with parsed (and sanitized) values.
 */
export const validateRequest = (schema: z.ZodTypeAny) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed: any = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Assign parsed values to strip out any unvalidated properties (mass-assignment protection)
      req.body = parsed.body;
      req.query = parsed.query;
      req.params = parsed.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Flatten Zod errors into a readable, comma-separated string
        const errorMessage = error.issues
          .map((issue) => {
            const path = issue.path.join(".");
            return `${path}: ${issue.message}`;
          })
          .join(", ");
        next(new ValidationError(errorMessage));
      } else {
        next(error);
      }
    }
  };
};
