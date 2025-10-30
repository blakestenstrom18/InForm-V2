import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgRole } from '@/lib/rbac';
import { ReviewUpsertSchema } from '@/lib/zod-schemas';
import { getVisibleReviews } from '@/lib/visibility';

export async function GET(
  request: Request,
  { params }: { params: { submissionId: string } }
) {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: params.submissionId },
      include: {
        form: true,
        aggregate: true,
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

    // Get visible reviews based on policy
    const { myReview, others, canSeeOthers } = await getVisibleReviews(
      user,
      params.submissionId
    );

    // Org admins can always see all reviews
    const isAdmin = user.isSuperAdmin || 
      (await prisma.membership.findUnique({
        where: {
          userId_orgId: {
            userId: user.id,
            orgId: submission.orgId,
          },
        },
      }))?.role === 'org_admin';

    const visibleOthers = isAdmin ? others : (canSeeOthers ? others : []);

    return NextResponse.json({
      myReview,
      others: visibleOthers,
      canSeeOthers: isAdmin || canSeeOthers,
      aggregate: submission.aggregate,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Get reviews error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { submissionId: string } }
) {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: params.submissionId },
      include: {
        form: true,
        rubricVersion: true,
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
    ]);

    const body = await request.json();
    const { scores, commentText, submit } = ReviewUpsertSchema.parse(body);

    // Validate scores against rubric
    const rubricQuestions = submission.rubricVersion.questionsJson as any;
    const questions = Array.isArray(rubricQuestions.questions)
      ? rubricQuestions.questions
      : rubricQuestions;

    for (const question of questions) {
      if (question.required && !(question.id in scores)) {
        return NextResponse.json(
          { error: `Required question ${question.id} is missing` },
          { status: 400 }
        );
      }

      const score = scores[question.id];
      if (score !== undefined) {
        if (
          score < submission.rubricVersion.scaleMin ||
          score > submission.rubricVersion.scaleMax
        ) {
          return NextResponse.json(
            {
              error: `Score for ${question.id} must be between ${submission.rubricVersion.scaleMin} and ${submission.rubricVersion.scaleMax}`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Find or create review
    let review = await prisma.review.findUnique({
      where: {
        submissionId_reviewerUserId: {
          submissionId: params.submissionId,
          reviewerUserId: user.id,
        },
      },
    });

    if (!review) {
      review = await prisma.review.create({
        data: {
          submissionId: params.submissionId,
          reviewerUserId: user.id,
        },
      });
    }

    // Create review revision
    await prisma.reviewRevision.create({
      data: {
        reviewId: review.id,
        scoresJson: scores,
        commentText: commentText || null,
      },
    });

    // If submitting, mark as submitted and trigger aggregate recalculation
    if (submit) {
      await prisma.review.update({
        where: { id: review.id },
        data: { submittedAt: new Date() },
      });

      // Recalculate aggregate (simplified - in production, use worker)
      const submittedReviews = await prisma.review.count({
        where: {
          submissionId: params.submissionId,
          submittedAt: { not: null },
        },
      });

      // Calculate composite score
      const latestRevisions = await prisma.reviewRevision.findMany({
        where: {
          review: {
            submissionId: params.submissionId,
            submittedAt: { not: null },
          },
        },
        orderBy: { createdAt: 'desc' },
        distinct: ['reviewId'],
      });

      let totalWeightedScore = 0;
      let totalWeight = 0;

      for (const revision of latestRevisions) {
        const scores = revision.scoresJson as Record<string, number>;
        for (const question of questions) {
          const score = scores[question.id];
          if (score !== undefined) {
            totalWeightedScore += score * question.weight;
            totalWeight += question.weight;
          }
        }
      }

      const compositeScore = totalWeight > 0 ? totalWeightedScore / totalWeight : null;

      // Update aggregate
      await prisma.submissionAggregate.upsert({
        where: { submissionId: params.submissionId },
        create: {
          submissionId: params.submissionId,
          reviewsCount: submittedReviews,
          compositeScore,
          lastReviewAt: new Date(),
        },
        update: {
          reviewsCount: submittedReviews,
          compositeScore,
          lastReviewAt: new Date(),
        },
      });

      // Update submission status
      const minReviews = submission.form.minReviewsRequired;
      let status = 'ungraded';
      if (submittedReviews >= minReviews) {
        status = 'fully_graded';
      } else if (submittedReviews > 0) {
        status = 'partially_graded';
      }

      await prisma.submission.update({
        where: { id: params.submissionId },
        data: { status },
      });

      // Create domain event
      await prisma.domainEvent.create({
        data: {
          orgId: submission.orgId,
          type: 'review.submitted',
          payloadJson: {
            reviewId: review.id,
            submissionId: params.submissionId,
            timestamp: new Date().toISOString(),
          },
        },
      });
    }

    // Return updated review
    const updatedReview = await prisma.review.findUnique({
      where: { id: review.id },
      include: {
        revisions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json(updatedReview);
  } catch (error) {
    if (error instanceof Error && error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid review data', details: error },
        { status: 400 }
      );
    }
    console.error('Submit review error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

