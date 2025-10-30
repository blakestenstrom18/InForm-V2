import { prisma } from './db';

type VisibilityMode = 'REVEAL_AFTER_ME_SUBMIT' | 'REVEAL_AFTER_MIN_REVIEWS' | 'NEVER' | 'AVERAGES_ONLY_UNTIL_LOCK';

interface VisibilityPolicy {
  mode: VisibilityMode;
  threshold?: number | null;
}

interface User {
  id: string;
  isSuperAdmin: boolean;
}

interface Submission {
  id: string;
  orgId: string;
  formId: string;
}

interface SubmissionWithAggregate extends Submission {
  aggregate?: {
    reviewsCount: number;
  } | null;
  form: {
    minReviewsRequired: number;
    visibilityMode: VisibilityMode;
    visibilityThreshold?: number | null;
  };
}

/**
 * Determine if a user can see other reviewers' reviews and comments
 * for a given submission based on the visibility policy
 */
export async function canSeeOthersReviews(
  user: User,
  submission: SubmissionWithAggregate
): Promise<boolean> {
  // Super admins can always see everything
  if (user.isSuperAdmin) {
    return true;
  }

  // Check if user is a member of the org
  const membership = await prisma.membership.findUnique({
    where: {
      userId_orgId: {
        userId: user.id,
        orgId: submission.orgId,
      },
    },
  });

  if (!membership) {
    return false;
  }

  const policy: VisibilityPolicy = {
    mode: submission.form.visibilityMode,
    threshold: submission.form.visibilityThreshold,
  };

  switch (policy.mode) {
    case 'REVEAL_AFTER_ME_SUBMIT': {
      // Check if user has submitted their review
      const myReview = await prisma.review.findUnique({
        where: {
          submissionId_reviewerUserId: {
            submissionId: submission.id,
            reviewerUserId: user.id,
          },
        },
      });
      return myReview?.submittedAt !== null;
    }

    case 'REVEAL_AFTER_MIN_REVIEWS': {
      const reviewsCount = submission.aggregate?.reviewsCount ?? 0;
      const minRequired = submission.form.minReviewsRequired;
      return reviewsCount >= minRequired;
    }

    case 'NEVER': {
      return false;
    }

    case 'AVERAGES_ONLY_UNTIL_LOCK': {
      // This mode shows aggregates but not individual reviews until threshold
      const reviewsCount = submission.aggregate?.reviewsCount ?? 0;
      const minRequired = submission.form.minReviewsRequired;
      return reviewsCount >= minRequired;
    }

    default:
      return false;
  }
}

/**
 * Determine if a user can see aggregate scores
 */
export async function canSeeAggregates(
  user: User,
  submission: SubmissionWithAggregate
): Promise<boolean> {
  // Super admins can always see everything
  if (user.isSuperAdmin) {
    return true;
  }

  // Check if user is a member of the org
  const membership = await prisma.membership.findUnique({
    where: {
      userId_orgId: {
        userId: user.id,
        orgId: submission.orgId,
      },
    },
  });

  if (!membership) {
    return false;
  }

  const policy: VisibilityPolicy = {
    mode: submission.form.visibilityMode,
    threshold: submission.form.visibilityThreshold,
  };

  // For AVERAGES_ONLY_UNTIL_LOCK, always show aggregates
  if (policy.mode === 'AVERAGES_ONLY_UNTIL_LOCK') {
    return true;
  }

  // For other modes, same rules as seeing individual reviews
  return canSeeOthersReviews(user, submission);
}

/**
 * Get reviews that a user is allowed to see for a submission
 */
export async function getVisibleReviews(
  user: User,
  submissionId: string
) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      form: true,
      aggregate: true,
    },
  });

  if (!submission) {
    return { myReview: null, others: [], canSeeOthers: false };
  }

  // Get user's own review
  const myReview = await prisma.review.findUnique({
    where: {
      submissionId_reviewerUserId: {
        submissionId,
        reviewerUserId: user.id,
      },
    },
    include: {
      revisions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const canSee = await canSeeOthersReviews(user, submission as any);

  if (!canSee) {
    return { myReview, others: [], canSeeOthers: false };
  }

  // Get other reviewers' reviews
  const others = await prisma.review.findMany({
    where: {
      submissionId,
      reviewerUserId: { not: user.id },
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
  });

  return { myReview, others, canSeeOthers: true };
}
