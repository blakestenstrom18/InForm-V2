import { validateRequest } from '@/lib/auth';
import { getUserOrgs } from '@/lib/rbac';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, BarChart3, Users, ArrowRight } from 'lucide-react';

export default async function DashboardPage() {
  const { user } = await validateRequest();
  const orgs = await getUserOrgs();

  // Get submissions count for user's orgs
  const orgIds = orgs.map((org: any) => org.id);
  
  const [totalSubmissions, gradedSubmissions, recentSubmissions] = await Promise.all([
    prisma.submission.count({
      where: {
        orgId: { in: orgIds },
      },
    }),
    prisma.submission.count({
      where: {
        orgId: { in: orgIds },
        status: { in: ['partially_graded', 'fully_graded'] },
      },
    }),
    prisma.submission.findMany({
      where: {
        orgId: { in: orgIds },
      },
      take: 5,
      orderBy: {
        submittedAt: 'desc',
      },
      include: {
        form: {
          select: {
            name: true,
          },
        },
        aggregate: true,
      },
    }),
  ]);

  const gradedPercentage =
    totalSubmissions > 0
      ? Math.round((gradedSubmissions / totalSubmissions) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name || user?.email || 'User'}
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Submissions
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">
              Across all forms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Graded</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gradedSubmissions}</div>
            <p className="text-xs text-muted-foreground">
              {gradedPercentage}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orgs.length}</div>
            <p className="text-xs text-muted-foreground">
              You have access to
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start">
              <Link href="/forms/new">
                <FileText className="mr-2 h-4 w-4" />
                Create New Form
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/review-queue">
                <BarChart3 className="mr-2 h-4 w-4" />
                Review Queue
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/submissions">
                <FileText className="mr-2 h-4 w-4" />
                View All Submissions
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Submissions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Submissions</CardTitle>
            <CardDescription>Latest activity</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No submissions yet
              </p>
            ) : (
              <div className="space-y-4">
                {recentSubmissions.map((submission: any) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {submission.form.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {submission.submitterEmail} •{' '}
                        {new Date(submission.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {submission.aggregate && (
                        <span className="text-xs text-muted-foreground">
                          {submission.aggregate.reviewsCount} reviews
                        </span>
                      )}
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/submissions/${submission.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/submissions">View All</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

