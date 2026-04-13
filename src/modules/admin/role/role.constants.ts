/** Matches `roleSeed()` in `seed.command.ts` — do not allow duplicate system slugs. */
export const RESERVED_ROLE_SLUGS = ['su_admin', 'admin'] as const;

/** Roles that must not be deleted or have permissions changed (platform safety). */
export const IMMUTABLE_ROLE_SLUGS = ['su_admin'] as const;
