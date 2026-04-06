export class WrenError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = "WrenError";
  }
}

export class WrenNotFoundError extends WrenError {
  constructor(body: unknown) {
    super(404, body, "Not found");
    this.name = "WrenNotFoundError";
  }
}

export class WrenUnauthorizedError extends WrenError {
  constructor(body: unknown) {
    super(401, body, "Unauthorized");
    this.name = "WrenUnauthorizedError";
  }
}

export class WrenForbiddenError extends WrenError {
  constructor(body: unknown) {
    super(403, body, "Forbidden");
    this.name = "WrenForbiddenError";
  }
}

export class WrenValidationError extends WrenError {
  constructor(body: unknown, public readonly details: string[]) {
    super(422, body, `Validation error: ${details.join(", ")}`);
    this.name = "WrenValidationError";
  }
}
