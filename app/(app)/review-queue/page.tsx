import { validateRequest } from '@/lib/auth';
import { getUserOrgs } from '@/lib/rbac';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, ArrowRight } from 'lucide-react';

async function getReviewQueue(orgIds: string[], userId: string) {
  // For now, get from first org - in production, aggregate across all orgs
  if (orgIds.length === 0) return { items: [], nextCursor: null, hasMore: false };

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/org/${orgIds[0]}/review-queue?limit=20`,
    {
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  return response.json();
}

export default async function ReviewQueuePage() {
  const { user } = await validateRequest();
  const orgs = await getUserOrgs();
  const orgIds = orgs.map((org: any) => org.id);

  const queueData = await getReviewQueue(orgIds, user.id);
  const submissions = queueData.items || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Review Queue</h1>
        <p className="text-muted-foreground">
          Submissions waiting for your review
        </p>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>All Caught Up!</CardTitle>
            <CardDescription>
              There are no submissions waiting for your review.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pending Reviews</CardTitle>
            <CardDescription>
              {submissions.length} submission{submissions.length !== 1 ? 's' : ''} need your review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form</TableHead>
                  <TableHead>Submitter</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Reviews</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission: any) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">
                      {submission.form.name}
                    </TableCell>
                    <TableCell>{submission.submitterEmail}</TableCell>
                    <TableCell>
                      {new Date(submission.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {submission._count.reviews} review
                        {submission._count.reviews !== 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/submissions/${submission.id}`}>
                          Review
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

