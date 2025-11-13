import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgRole } from '@/lib/rbac';
import { getVisibleReviews } from '@/lib/visibility';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const { submissionId } = await params;
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        form: {
          include: {
            versions: {
              where: {
                id: { equals: undefined }, // Get the version used for this submission
              },
            },
          },
        },
        formVersion: true,
        rubricVersion: true,
        aggregate: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    const { user } = await requireOrgRole(submission.orgId, [
      'org_admin',
      'reviewer',
      'viewer',
    ]);

    // Check if user is admin
    const membership = await prisma.membership.findUnique({
      where: {
        userId_orgId: {
          userId: user.id,
          orgId: submission.orgId,
        },
      },
    });

    const isAdmin = user.isSuperAdmin || membership?.role === 'org_admin';

    // Get reviews based on visibility policy
    const { myReview, others, canSeeOthers } = await getVisibleReviews(
      user,
      submissionId
    );

    // Admins can always see all reviews
    const visibleOthers = isAdmin
      ? await prisma.review.findMany({
          where: {
            submissionId: submissionId,
            submittedAt: { not: null },
          },
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            revisions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        })
      : canSeeOthers
      ? others
      : [];

    return NextResponse.json({
      submission: {
        id: submission.id,
        submitterEmail: submission.submitterEmail,
        submittedAt: submission.submittedAt,
        status: submission.status,
        dataJson: submission.dataJson,
        form: {
          id: submission.form.id,
          name: submission.form.name,
          slug: submission.form.slug,
        },
        formVersion: {
          id: submission.formVersion.id,
          version: submission.formVersion.version,
          schemaJson: submission.formVersion.schemaJson,
        },
        rubricVersion: {
          id: submission.rubricVersion.id,
          version: submission.rubricVersion.version,
          questionsJson: submission.rubricVersion.questionsJson,
          scaleMin: submission.rubricVersion.scaleMin,
          scaleMax: submission.rubricVersion.scaleMax,
          scaleStep: submission.rubricVersion.scaleStep,
        },
        aggregate: submission.aggregate,
        tags: submission.tags.map((st) => ({
          id: st.tag.id,
          label: st.tag.label,
          color: st.tag.color,
        })),
      },
      reviews: {
        myReview,
        others: visibleOthers,
        canSeeOthers: isAdmin || canSeeOthers,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Get submission error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

