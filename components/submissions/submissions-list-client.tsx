'use client';

import { useState, useEffect } from 'react';
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
import { Download, Search, ArrowRight, Loader2 } from 'lucide-react';

interface Form {
  id: string;
  name: string;
  slug: string;
}

interface Tag {
  id: string;
  label: string;
  color: string;
}

interface Submission {
  id: string;
  submitterEmail: string;
  submittedAt: string;
  status: string;
  aggregate: {
    reviewsCount: number;
    compositeScore: number | null;
  } | null;
  tags: Array<{
    tag: Tag;
  }>;
}

interface SubmissionsListClientProps {
  forms: Form[];
  tags: Tag[];
}

export default function SubmissionsListClient({
  forms,
  tags,
}: SubmissionsListClientProps) {
  const [selectedForm, setSelectedForm] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [emailSearch, setEmailSearch] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadSubmissions = async (cursor?: string) => {
    if (!selectedForm || selectedForm === 'all') return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(emailSearch && { submitterEmail: emailSearch }),
        ...(cursor && { cursor }),
      });

      const response = await fetch(
        `/api/forms/${selectedForm}/submissions?${params}`
      );
      const data = await response.json();

      if (cursor) {
        setSubmissions((prev) => [...prev, ...data.items]);
      } else {
        setSubmissions(data.items);
      }
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedForm && selectedForm !== 'all') {
      loadSubmissions();
    } else {
      setSubmissions([]);
      setNextCursor(null);
      setHasMore(false);
    }
  }, [selectedForm, statusFilter, emailSearch]);

  const handleExport = () => {
    if (!selectedForm || selectedForm === 'all') return;
    window.open(`/api/forms/${selectedForm}/export?format=csv`, '_blank');
  };

  const statusColors: Record<string, string> = {
    ungraded: 'bg-gray-500',
    partially_graded: 'bg-yellow-500',
    fully_graded: 'bg-green-500',
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Form</label>
              <Select value={selectedForm} onValueChange={setSelectedForm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a form" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Forms</SelectItem>
                  {forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ungraded">Ungraded</SelectItem>
                  <SelectItem value="partially_graded">Partially Graded</SelectItem>
                  <SelectItem value="fully_graded">Fully Graded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search Email</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by email..."
                  value={emailSearch}
                  onChange={(e) => setEmailSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {selectedForm && selectedForm !== 'all' && (
            <div className="mt-4">
              <Button onClick={handleExport} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedForm === 'all' ? (
            <div className="py-8 text-center text-muted-foreground">
              Please select a form to view submissions
            </div>
          ) : loading && submissions.length === 0 ? (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No submissions found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviews</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">
                        {submission.submitterEmail}
                      </TableCell>
                      <TableCell>
                        {new Date(submission.submittedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            statusColors[submission.status] || 'bg-gray-500'
                          }
                        >
                          {submission.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{submission.aggregate?.reviewsCount || 0}</TableCell>
                      <TableCell>
                        {submission.aggregate?.compositeScore !== null && submission.aggregate
                          ? submission.aggregate.compositeScore.toFixed(2)
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {submission.tags.map((st) => (
                            <Badge
                              key={st.tag.id}
                              style={{ backgroundColor: st.tag.color }}
                              className="text-white text-xs"
                            >
                              {st.tag.label}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/submissions/${submission.id}`}>
                            View
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {hasMore && (
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    onClick={() => loadSubmissions(nextCursor || undefined)}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

