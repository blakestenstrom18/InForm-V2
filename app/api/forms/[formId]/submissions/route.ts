import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgRole } from '@/lib/rbac';
import { SubmissionFilterSchema } from '@/lib/zod-schemas';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const form = await prisma.form.findUnique({
      where: { id: formId },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const { user } = await requireOrgRole(form.orgId, [
      'org_admin',
      'reviewer',
      'viewer',
    ]);

    const { searchParams } = new URL(request.url);
    const filters = SubmissionFilterSchema.parse({
      status: searchParams.get('status') || undefined,
      submitterEmail: searchParams.get('submitterEmail') || undefined,
      minScore: searchParams.get('minScore') ? Number(searchParams.get('minScore')) : undefined,
      maxScore: searchParams.get('maxScore') ? Number(searchParams.get('maxScore')) : undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 20,
    });

    const where: any = {
      formId: formId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.submitterEmail) {
      where.submitterEmail = {
        contains: filters.submitterEmail,
        mode: 'insensitive',
      };
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        some: {
          tagId: { in: filters.tags },
        },
      };
    }

    if (filters.cursor) {
      where.id = { lt: filters.cursor };
    }

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        aggregate: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
      take: filters.limit + 1,
    });

    // Filter by score range
    let filteredSubmissions = submissions;
    if (filters.minScore !== undefined || filters.maxScore !== undefined) {
      filteredSubmissions = submissions.filter((sub: any) => {
        const score = sub.aggregate?.compositeScore;
        if (score === null || score === undefined) return false;
        if (filters.minScore !== undefined && score < filters.minScore) return false;
        if (filters.maxScore !== undefined && score > filters.maxScore) return false;
        return true;
      });
    }

    const hasMore = filteredSubmissions.length > filters.limit;
    const items = hasMore ? filteredSubmissions.slice(0, filters.limit) : filteredSubmissions;
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
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid filter parameters', details: error },
        { status: 400 }
      );
    }
    console.error('Get submissions error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

