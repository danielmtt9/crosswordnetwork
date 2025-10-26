export const SUPER_ADMIN_EMAIL = 'superadmin@crossword.network';

export function isSuperAdmin(email: string | null | undefined): boolean {
  return email === SUPER_ADMIN_EMAIL;
}
