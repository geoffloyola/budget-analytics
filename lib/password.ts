// Rules for a password a person chooses themselves (change-password and
// first sign-in pages). Returns an error message, or null when it's fine.
export const MIN_PASSWORD_LENGTH = 8;

export function newPasswordProblem(next: string, confirm: string): string | null {
  if (!next) return "Enter a new password.";
  if (next.length < MIN_PASSWORD_LENGTH) return `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) return "New password must include at least one letter and one number.";
  if (next !== confirm) return "The new passwords don't match.";
  return null;
}
