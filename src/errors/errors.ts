/**
 * Base application error class.
 * All custom errors extend this to provide a consistent
 * interface for the global error-handling middleware.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;

    // Maintains proper stack trace in V8 environments
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a requested resource cannot be found.
 * Maps to HTTP 404.
 */
export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
  }
}

/**
 * Thrown when a business rule or validation constraint is violated.
 * Maps to HTTP 400.
 */
export class ValidationError extends AppError {
  constructor(message: string = "Validation failed") {
    super(message, 400);
  }
}
