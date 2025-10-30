import { redirect, notFound } from 'next/navigation';
import { validateRequest } from '@/lib/auth';
import { requireOrgRole } from '@/lib/rbac';
import { prisma } from '@/lib/db';
import FormBuilder from '@/components/forms/form-builder';

export default async function EditFormPage({
  params,
}: {
  params: { formId: string };
}) {
  const { user } = await validateRequest();
  
  const form = await prisma.form.findUnique({
    where: { id: params.formId },
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
    notFound();
  }

  try {
    await requireOrgRole(form.orgId, ['org_admin']);
  } catch {
    redirect('/forms');
  }

  // Get latest draft schema and rubric
  const latestFormVersion = form.versions[0];
  const latestRubricVersion = form.rubricVersions[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Form: {form.name}</h1>
        <p className="text-muted-foreground">
          Update form fields, rubric, and settings
        </p>
      </div>
      <FormBuilder
        orgId={form.orgId}
        formId={form.id}
        initialForm={{
          name: form.name,
          slug: form.slug,
          status: form.status,
          openAt: form.openAt?.toISOString() || null,
          closeAt: form.closeAt?.toISOString() || null,
          minReviewsRequired: form.minReviewsRequired,
          visibilityMode: form.visibilityMode,
          visibilityThreshold: form.visibilityThreshold,
          formSchema: latestFormVersion?.schemaJson as any,
          rubricSchema: latestRubricVersion
            ? {
                questions: latestRubricVersion.questionsJson as any,
                scaleMin: latestRubricVersion.scaleMin,
                scaleMax: latestRubricVersion.scaleMax,
                scaleStep: latestRubricVersion.scaleStep,
              }
            : {
                questions: [],
                scaleMin: 1,
                scaleMax: 5,
                scaleStep: 1,
              },
        }}
      />
    </div>
  );
}

