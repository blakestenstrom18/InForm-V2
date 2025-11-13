import { notFound, redirect } from 'next/navigation';
import { validateRequest } from '@/lib/auth';
import { requireOrgRole } from '@/lib/rbac';
import { prisma } from '@/lib/db';
import { getVisibleReviews } from '@/lib/visibility';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Calendar, Mail, FileText } from 'lucide-react';
import ReviewForm from '@/components/review/review-form';
import ReviewDisplay from '@/components/review/review-display';

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { user } = await validateRequest();
  const { submissionId } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      form: true,
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
    notFound();
  }

  try {
    await requireOrgRole(submission.orgId, ['org_admin', 'reviewer', 'viewer']);
  } catch {
    redirect('/submissions');
  }

  // Check if user is admin
  const membership = await prisma.membership.findUnique({
    where: {
      userId_orgId: {
        userId: user!.id,
        orgId: submission.orgId,
      },
    },
  });

  const isAdmin = user!.isSuperAdmin || membership?.role === 'org_admin';

  // Get reviews based on visibility policy
  const { myReview, others, canSeeOthers } = await getVisibleReviews(
    user!,
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

  const formSchema = submission.formVersion.schemaJson as any;
  const rubricSchema = {
    id: submission.rubricVersion.id,
    version: submission.rubricVersion.version,
    questionsJson: submission.rubricVersion.questionsJson,
    scaleMin: submission.rubricVersion.scaleMin,
    scaleMax: submission.rubricVersion.scaleMax,
    scaleStep: submission.rubricVersion.scaleStep,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/submissions">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Submissions
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{submission.form.name}</h1>
            <p className="text-muted-foreground">Submission Details</p>
          </div>
        </div>
        <Badge
          variant={
            submission.status === 'fully_graded'
              ? 'default'
              : submission.status === 'partially_graded'
              ? 'secondary'
              : 'outline'
          }
        >
          {submission.status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Submission Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Submission Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Submitter</p>
                    <p className="font-medium">{submission.submitterEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Submitted</p>
                    <p className="font-medium">
                      {new Date(submission.submittedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {submission.aggregate && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Reviews</p>
                    <p className="font-medium">
                      {submission.aggregate.reviewsCount} review
                      {submission.aggregate.reviewsCount !== 1 ? 's' : ''}
                      {submission.aggregate.compositeScore !== null && (
                        <span className="ml-2">
                          • Score: {submission.aggregate.compositeScore.toFixed(2)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission Data */}
          <Card>
            <CardHeader>
              <CardTitle>Submission Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formSchema.fields?.map((field: any) => {
                  const dataJson = submission.dataJson as Record<string, any>;
                  const value = dataJson?.[field.id];
                  return (
                    <div key={field.id}>
                      <p className="text-sm font-medium text-muted-foreground">
                        {field.label}
                      </p>
                      <p className="mt-1">
                        {value !== undefined && value !== null
                          ? String(value)
                          : '—'}
                      </p>
                      <Separator className="mt-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Review Form */}
          <ReviewForm
            submissionId={submission.id}
            rubricVersion={rubricSchema}
            existingReview={myReview as any}
          />

          {/* Reviews Display */}
          <ReviewDisplay
            myReview={myReview as any}
            others={visibleOthers as any}
            canSeeOthers={isAdmin || canSeeOthers}
            aggregate={submission.aggregate}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              {submission.tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tags</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {submission.tags.map((tag: any) => (
                    <Badge
                      key={tag.id}
                      style={{ backgroundColor: tag.color }}
                      className="text-white"
                    >
                      {tag.label}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
