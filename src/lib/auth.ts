import { cookies } from 'next/headers';
import { prisma } from './prisma';

/**
 * Get the current session user from the session_id cookie.
 * Returns the user object or null if not authenticated.
 */
export async function getSessionUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;
  if (!sessionId) return null;

  const session = await prisma.session.findFirst({
    where: { id: sessionId, expiresAt: { gt: new Date() } },
    include: { user: true },
  });

  return session?.user ?? null;
}

/**
 * Require an admin user. Returns the user or null if not admin.
 */
export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') return null;
  return user;
}
