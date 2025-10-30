import { Lucia } from 'lucia';
import { prisma } from './db';
import { cookies } from 'next/headers';

// Custom Prisma adapter for Lucia v3
const adapter = {
  async getSessionAndUser(sessionId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true }
    });
    if (!session || !session.user) return [null, null];
    
    // Transform Prisma user to Lucia's expected format
    // Lucia expects: { id: string, attributes: DatabaseUserAttributes }
    const luciaUser = {
      id: session.user.id,
      attributes: {
        email: session.user.email,
        name: session.user.name,
        isSuperAdmin: session.user.isSuperAdmin,
      },
    };
    
    return [session, luciaUser];
  },
  async getUserSessions(userId: string) {
    return prisma.session.findMany({
      where: { userId }
    });
  },
  async setSession(session: any) {
    await prisma.session.create({
      data: {
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
      },
    });
  },
  async updateSessionExpiration(sessionId: string, expiresAt: Date) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { expiresAt }
    });
  },
  async deleteSession(sessionId: string) {
    await prisma.session.delete({
      where: { id: sessionId }
    });
  },
  async deleteUserSessions(userId: string) {
    await prisma.session.deleteMany({
      where: { userId }
    });
  },
  async deleteExpiredSessions() {
    await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lte: new Date()
        }
      }
    });
  }
};

export const lucia = new Lucia(adapter as any, {
  sessionCookie: {
    name: 'inform_session',
    expires: false,
    attributes: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  },
  getUserAttributes: (attributes) => {
    return {
      email: attributes.email,
      name: attributes.name,
      isSuperAdmin: attributes.isSuperAdmin,
    };
  },
});

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
}

export async function validateRequest() {
  const sessionId = (await cookies()).get(lucia.sessionCookieName)?.value ?? null;
  
  if (!sessionId) {
    return {
      user: null,
      session: null,
    };
  }

  const result = await lucia.validateSession(sessionId);
  
  try {
    if (result.session && result.session.fresh) {
      const sessionCookie = lucia.createSessionCookie(result.session.id);
      (await cookies()).set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );
    }
    if (!result.session) {
      const sessionCookie = lucia.createBlankSessionCookie();
      (await cookies()).set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );
    }
  } catch {
    // Next.js throws error when setting cookies in Server Components
  }

  return result;
}
