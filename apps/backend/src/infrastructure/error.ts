export class DomainError extends Error {
  private constructor(
    public message: string,
    public statusCode = 500,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message: string): DomainError {
    return new DomainError(message, 400);
  }

  static unauthorized(message = "Please login"): DomainError {
    return new DomainError(message, 401);
  }

  static forbidden(
    message = "You don't have enough permissions to perform this action",
  ): DomainError {
    return new DomainError(message, 403);
  }

  static notFound(
    message = "The resource you requested does not exist",
  ): DomainError {
    return new DomainError(message, 404);
  }

  static unprocessableEntity(
    message = "We are unable to process this request",
  ): DomainError {
    return new DomainError(message, 422);
  }

  static internalError(message = "Something went wrong!"): DomainError {
    return new DomainError(message, 500);
  }

  static badGateway(message = "Bad Gateway"): DomainError {
    return new DomainError(message, 502);
  }
}
