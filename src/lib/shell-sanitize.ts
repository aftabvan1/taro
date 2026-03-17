/**
 * Shell input sanitization for values interpolated into SSH commands.
 * All user-controlled or DB-sourced values MUST pass through these
 * before being used in shell strings.
 */

const SAFE_NAME_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Validates that a string is safe to use as a shell identifier
 * (instance names, container names, service names).
 * Allows only lowercase alphanumeric + hyphens, 1-63 chars.
 */
export function validateShellName(value: string, label: string): string {
  if (!SAFE_NAME_REGEX.test(value)) {
    throw new Error(
      `Invalid ${label}: must be 1-63 chars, lowercase alphanumeric with optional hyphens, cannot start/end with hyphen`
    );
  }
  return value;
}

/**
 * Validates that a value is a valid TCP port number (1-65535).
 */
export function validatePort(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`Invalid ${label}: must be an integer between 1 and 65535`);
  }
  return value;
}
