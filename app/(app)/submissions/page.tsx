import { validateRequest } from '@/lib/auth';
import { getUserOrgs } from '@/lib/rbac';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Search, FileText } from 'lucide-react';
import SubmissionsListClient from '@/components/submissions/submissions-list-client';

export default async function SubmissionsPage() {
  const { user } = await validateRequest();
  const orgs = await getUserOrgs();
  const orgIds = orgs.map((org: any) => org.id);

  // Get all forms for filter dropdown
  const forms = await prisma.form.findMany({
    where: {
      orgId: { in: orgIds },
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Get tags for filter
  const tags = await prisma.tag.findMany({
    where: {
      orgId: { in: orgIds },
    },
    select: {
      id: true,
      label: true,
      color: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Submissions</h1>
          <p className="text-muted-foreground">
            View and manage all form submissions
          </p>
        </div>
      </div>

      <SubmissionsListClient forms={forms} tags={tags} />
    </div>
  );
}

