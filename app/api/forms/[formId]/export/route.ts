import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgRole } from '@/lib/rbac';
import { stringify } from 'csv-stringify/sync';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        versions: {
          where: { publishedAt: { not: null } },
          orderBy: { version: 'desc' },
          take: 1,
        },
        rubricVersions: {
          where: { publishedAt: { not: null } },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const { user } = await requireOrgRole(form.orgId, ['org_admin']);

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    // Get all submissions for this form
    const submissions = await prisma.submission.findMany({
      where: {
        formId: formId,
      },
      include: {
        aggregate: true,
        reviews: {
          where: {
            submittedAt: { not: null },
          },
          include: {
            revisions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    if (submissions.length === 0) {
      return NextResponse.json(
        { error: 'No submissions found' },
        { status: 404 }
      );
    }

    // Get form schema and rubric questions
    const formSchema = form.versions[0]?.schemaJson as any;
    const rubricQuestions = form.rubricVersions[0]?.questionsJson as any;
    const questions = Array.isArray(rubricQuestions?.questions)
      ? rubricQuestions.questions
      : rubricQuestions || [];

    // Build CSV headers
    const headers = [
      'submissionId',
      'submittedAt',
      'submitterEmail',
      'compositeScore',
      'reviewsCount',
      ...questions.map((q: any) => `q_${q.id}`),
      ...(formSchema?.fields?.map((f: any) => f.id) || []),
    ];

    // Build CSV rows
    const rows = submissions.map((submission: any) => {
      const row: any[] = [
        submission.id,
        submission.submittedAt.toISOString(),
        submission.submitterEmail,
        submission.aggregate?.compositeScore?.toFixed(2) || '',
        submission.aggregate?.reviewsCount || 0,
      ];

      // Add average scores for each question
      questions.forEach((question: any) => {
        const questionScores = submission.reviews
          .map((review: any) => {
            const scores = review.revisions[0]?.scoresJson as Record<string, number>;
            return scores?.[question.id];
          })
          .filter((score: any) => score !== undefined);

        const avgScore =
          questionScores.length > 0
            ? (
                questionScores.reduce((a: number, b: number) => a + b, 0) / questionScores.length
              ).toFixed(2)
            : '';
        row.push(avgScore);
      });

      // Add submission data fields
      const dataJson = submission.dataJson as Record<string, any>;
      formSchema?.fields?.forEach((field: any) => {
        const value = dataJson[field.id];
        row.push(value !== undefined && value !== null ? String(value) : '');
      });

      return row;
    });

    // Generate CSV
    const csv = stringify([headers, ...rows], {
      header: true,
      quoted: true,
    });

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="submissions-${form.slug}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'An error occurred during export' },
      { status: 500 }
    );
  }
}

