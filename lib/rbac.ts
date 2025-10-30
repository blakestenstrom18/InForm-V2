import { validateRequest } from './auth';
import { prisma } from './db';

type Role = 'org_admin' | 'reviewer' | 'viewer';

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth() {
  const { user, session } = await validateRequest();
  
  if (!user || !session) {
    throw new UnauthorizedError();
  }
  
  return { user, session };
}

/**
 * Require super admin role
 */
export async function requireSuperAdmin() {
  const { user } = await requireAuth();
  
  if (!user.isSuperAdmin) {
    throw new ForbiddenError('Super admin access required');
  }
  
  return { user };
}

/**
 * Require membership in an organization with specific roles
 */
export async function requireOrgRole(
  orgId: string,
  allowedRoles: Role[]
) {
  const { user } = await requireAuth();
  
  // Super admins can access any org
  if (user.isSuperAdmin) {
    return { user, role: 'org_admin' as Role };
  }
  
  const membership = await prisma.membership.findUnique({
    where: {
      userId_orgId: {
        userId: user.id,
        orgId,
      },
    },
  });
  
  if (!membership) {
    throw new ForbiddenError('Not a member of this organization');
  }
  
  if (!allowedRoles.includes(membership.role)) {
    throw new ForbiddenError(`Requires one of: ${allowedRoles.join(', ')}`);
  }
  
  return { user, role: membership.role };
}

/**
 * Check if user has org membership (doesn't throw)
 */
export async function checkOrgMembership(orgId: string) {
  const { user } = await validateRequest();
  
  if (!user) {
    return null;
  }
  
  if (user.isSuperAdmin) {
    return { user, role: 'org_admin' as Role };
  }
  
  const membership = await prisma.membership.findUnique({
    where: {
      userId_orgId: {
        userId: user.id,
        orgId,
      },
    },
  });
  
  if (!membership) {
    return null;
  }
  
  return { user, role: membership.role };
}

/**
 * Get all organizations user has access to
 */
export async function getUserOrgs() {
  const { user } = await requireAuth();
  
  if (user.isSuperAdmin) {
    return prisma.organization.findMany({
      include: {
        _count: {
          select: {
            forms: true,
            users: true,
          },
        },
      },
    });
  }
  
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: {
      org: {
        include: {
          _count: {
            select: {
              forms: true,
              users: true,
            },
          },
        },
      },
    },
  });
  
  return memberships.map((m: any) => m.org);
}
