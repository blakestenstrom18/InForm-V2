import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgRole } from '@/lib/rbac';
import { UpdateFormSchema } from '@/lib/zod-schemas';

export async function GET(
  request: Request,
  { params }: { params: { formId: string } }
) {
  try {
    const form = await prisma.form.findUnique({
      where: { id: params.formId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
        rubricVersions: {
          orderBy: { version: 'desc' },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const { user } = await requireOrgRole(form.orgId, [
      'org_admin',
      'reviewer',
      'viewer',
    ]);

    return NextResponse.json(form);
  } catch (error) {
    if (error instanceof Error && error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Get form error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { formId: string } }
) {
  try {
    const form = await prisma.form.findUnique({
      where: { id: params.formId },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const { user } = await requireOrgRole(form.orgId, ['org_admin']);

    const body = await request.json();
    const data = UpdateFormSchema.parse(body);

    // Check slug uniqueness if slug is being updated
    if (data.slug && data.slug !== form.slug) {
      const existingForm = await prisma.form.findUnique({
        where: {
          orgId_slug: {
            orgId: form.orgId,
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

      // Record slug change
      await prisma.slugHistory.create({
        data: {
          formId: form.id,
          oldSlug: form.slug,
        },
      });
    }

    const updatedForm = await prisma.form.update({
      where: { id: params.formId },
      data: {
        name: data.name,
        slug: data.slug,
        status: data.status,
        openAt: data.openAt ? new Date(data.openAt) : null,
        closeAt: data.closeAt ? new Date(data.closeAt) : null,
        minReviewsRequired: data.minReviewsRequired,
        visibilityMode: data.visibilityMode,
        visibilityThreshold: data.visibilityThreshold,
      },
    });

    return NextResponse.json(updatedForm);
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
    console.error('Update form error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { formId: string } }
) {
  try {
    const form = await prisma.form.findUnique({
      where: { id: params.formId },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const { user } = await requireOrgRole(form.orgId, ['org_admin']);

    await prisma.form.delete({
      where: { id: params.formId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Delete form error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

