import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgRole } from '@/lib/rbac';
import { PublishFormSchema, FormSchemaJson, RubricSchemaJson } from '@/lib/zod-schemas';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
        rubricVersions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const { user } = await requireOrgRole(form.orgId, ['org_admin']);

    const body = await request.json();
    const data = PublishFormSchema.parse(body);

    // Use provided schema or latest draft
    const formSchema = data.formSchema || (form.versions[0]?.schemaJson as any);
    const rubricSchema = data.rubricSchema || {
      questions: form.rubricVersions[0]?.questionsJson as any,
      scaleMin: form.rubricVersions[0]?.scaleMin || 1,
      scaleMax: form.rubricVersions[0]?.scaleMax || 5,
      scaleStep: form.rubricVersions[0]?.scaleStep || 1,
    };

    // Validate form has fields
    if (!formSchema?.fields || formSchema.fields.length === 0) {
      return NextResponse.json(
        { error: 'Form must have at least one field' },
        { status: 400 }
      );
    }

    // Validate rubric has questions
    if (!rubricSchema?.questions || rubricSchema.questions.length === 0) {
      return NextResponse.json(
        { error: 'Rubric must have at least one question' },
        { status: 400 }
      );
    }

    // Get next version numbers
    const nextFormVersion = (form.versions[0]?.version || 0) + 1;
    const nextRubricVersion = (form.rubricVersions[0]?.version || 0) + 1;

    // Create new FormVersion
    const formVersion = await prisma.formVersion.create({
      data: {
        formId: form.id,
        version: nextFormVersion,
        schemaJson: formSchema,
        publishedAt: new Date(),
        notes: data.notes,
      },
    });

    // Create new RubricVersion
    const rubricVersion = await prisma.rubricVersion.create({
      data: {
        formId: form.id,
        version: nextRubricVersion,
        questionsJson: rubricSchema.questions,
        scaleMin: rubricSchema.scaleMin,
        scaleMax: rubricSchema.scaleMax,
        scaleStep: rubricSchema.scaleStep,
        publishedAt: new Date(),
      },
    });

    // Create domain event
    await prisma.domainEvent.create({
      data: {
        orgId: form.orgId,
        type: 'form.published',
        payloadJson: {
          formId: form.id,
          formVersionId: formVersion.id,
          rubricVersionId: rubricVersion.id,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Optionally update form status to "open" if it's draft
    if (form.status === 'draft') {
      await prisma.form.update({
        where: { id: form.id },
        data: { status: 'open' },
      });
    }

    return NextResponse.json({
      success: true,
      formVersion,
      rubricVersion,
    });
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
    console.error('Publish form error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

