import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgRole } from '@/lib/rbac';
import { CreateFormSchema } from '@/lib/zod-schemas';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const { user } = await requireOrgRole(orgId, [
      'org_admin',
      'reviewer',
      'viewer',
    ]);

    const forms = await prisma.form.findMany({
      where: {
        orgId: orgId,
      },
      include: {
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

    return NextResponse.json(forms);
  } catch (error) {
    if (error instanceof Error && error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Get forms error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const { user } = await requireOrgRole(orgId, ['org_admin']);

    const body = await request.json();
    const data = CreateFormSchema.parse(body);

    // Verify orgId matches
    if (data.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Organization ID mismatch' },
        { status: 400 }
      );
    }

    // Check if slug is unique within org
    const existingForm = await prisma.form.findUnique({
      where: {
        orgId_slug: {
          orgId: orgId,
          slug: data.slug,
        },
      },
    });

    if (existingForm) {
      return NextResponse.json(
        { error: 'Form slug already exists in this organization' },
        { status: 400 }
      );
    }

    // Create form
    const form = await prisma.form.create({
      data: {
        orgId: orgId,
        name: data.name,
        slug: data.slug,
        status: 'draft',
        minReviewsRequired: 1,
        visibilityMode: 'REVEAL_AFTER_ME_SUBMIT',
        versions: {
          create: {
            version: 1,
            schemaJson: data.formSchema,
          },
        },
        rubricVersions: {
          create: {
            version: 1,
            questionsJson: data.rubricSchema.questions,
            scaleMin: data.rubricSchema.scaleMin,
            scaleMax: data.rubricSchema.scaleMax,
            scaleStep: data.rubricSchema.scaleStep,
          },
        },
      },
      include: {
        versions: true,
        rubricVersions: true,
      },
    });

    return NextResponse.json(form, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid form data', details: error },
        { status: 400 }
      );
    }
    console.error('Create form error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

