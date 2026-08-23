/**
 * Return-path helpers for the sign-in bounce.
 *
 * A link in a digest email frequently opens in a mail webview with no session
 * at all. The guard routes then send the reader to /auth, and unless the
 * original target travels with them they land on /dashboard and have to guess
 * where the review queue lives. These helpers carry the target through as a
 * `next` query param.
 *
 * Open-redirect safety: only same-origin *relative* paths are ever accepted.
 * Anything protocol-relative ("//evil.com"), backslash-smuggled ("/\evil.com"),
 * absolute ("https://…") or non-path is discarded and the caller falls back to
 * the default landing route.
 */

/** True when `value` is a safe same-origin relative path we may navigate to. */
export function isSafeReturnPath(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  // Protocol-relative and backslash variants resolve to another origin.
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  if (/^\/+[\\/]/.test(value)) return false;
  // Reject control characters and whitespace smuggling.
  if (/[\u0000-\u001F\u007F\s]/.test(value)) return false;
  return true;
}

/** Normalise an untrusted `next` value to a safe path, or null. */
export function sanitizeReturnPath(value: string | null | undefined): string | null {
  return isSafeReturnPath(value) ? value : null;
}

/** Build `/auth?next=<current path>` from a router location. */
export function authUrlFor(location: { pathname: string; search?: string; hash?: string }): string {
  const target = `${location.pathname}${location.search ?? ""}${location.hash ?? ""}`;
  const safe = sanitizeReturnPath(target);
  // Never bounce back to the auth screens themselves.
  if (!safe || safe.startsWith("/auth") || safe.startsWith("/confirm-email")) return "/auth";
  return `/auth?next=${encodeURIComponent(safe)}`;
}
