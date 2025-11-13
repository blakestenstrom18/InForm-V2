import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgRole } from '@/lib/rbac';
import { PaginationSchema } from '@/lib/zod-schemas';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const { user } = await requireOrgRole(orgId, [
      'org_admin',
      'reviewer',
    ]);

    const { searchParams } = new URL(request.url);
    const { cursor, limit } = PaginationSchema.parse({
      cursor: searchParams.get('cursor') || undefined,
      limit: Number(searchParams.get('limit')) || 20,
    });

    // Get submissions user hasn't reviewed yet
    const where: any = {
      orgId: orgId,
      form: {
        status: 'open',
      },
      NOT: {
        reviews: {
          some: {
            reviewerUserId: user.id,
            submittedAt: { not: null },
          },
        },
      },
    };

    if (cursor) {
      where.id = { lt: cursor };
    }

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        form: {
          select: {
            name: true,
            slug: true,
          },
        },
        aggregate: true,
        _count: {
          select: {
            reviews: {
              where: {
                submittedAt: { not: null },
              },
            },
          },
        },
      },
      orderBy: [
        {
          aggregate: {
            reviewsCount: 'asc',
          },
        },
        {
          submittedAt: 'desc',
        },
      ],
      take: limit + 1,
    });

    const hasMore = submissions.length > limit;
    const items = hasMore ? submissions.slice(0, limit) : submissions;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({
      items,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Get review queue error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

