import { validateRequest } from '@/lib/auth';
import { getUserOrgs } from '@/lib/rbac';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Plus, FileText, Edit, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500',
  open: 'bg-green-500',
  closed: 'bg-yellow-500',
  archived: 'bg-gray-700',
};

export default async function FormsPage() {
  const { user } = await validateRequest();
  const orgs = await getUserOrgs();
  const orgIds = orgs.map((org: any) => org.id);

  const forms = await prisma.form.findMany({
    where: {
      orgId: { in: orgIds },
    },
    include: {
      org: {
        select: {
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          submissions: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Forms</h1>
          <p className="text-muted-foreground">
            Manage your forms and submissions
          </p>
        </div>
        <Button asChild>
          <Link href="/forms/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Form
          </Link>
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Forms</CardTitle>
            <CardDescription>
              Get started by creating your first form
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/forms/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Form
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Forms</CardTitle>
            <CardDescription>
              {forms.length} form{forms.length !== 1 ? 's' : ''} total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form: any) => (
                  <TableRow key={form.id}>
                    <TableCell className="font-medium">{form.name}</TableCell>
                    <TableCell>{form.org.name}</TableCell>
                    <TableCell>
                      <Badge
                        className={statusColors[form.status] || 'bg-gray-500'}
                      >
                        {form.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{form._count.submissions}</TableCell>
                    <TableCell>
                      {new Date(form.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/forms/${form.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/submissions?formId=${form.id}`}>
                            <FileText className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
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

