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

/**
 * A conditional write (`ifVersion`) found the document at another version — someone
 * else wrote it since you read it. Re-read it and re-apply your change.
 * `currentVersion` is the version it is at now (0: it doesn't exist).
 */
export class WrenVersionMismatchError extends WrenError {
  public readonly currentVersion: number;
  constructor(body: unknown) {
    const current = (body as { currentVersion?: unknown } | null)?.currentVersion;
    const currentVersion = typeof current === "number" ? current : 0;
    super(412, body, `Version mismatch: the document is at version ${currentVersion}`);
    this.name = "WrenVersionMismatchError";
    this.currentVersion = currentVersion;
  }
}
