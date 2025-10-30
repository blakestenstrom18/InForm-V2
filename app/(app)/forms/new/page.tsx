import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/auth';
import { getUserOrgs } from '@/lib/rbac';
import FormBuilder from '@/components/forms/form-builder';

export default async function NewFormPage() {
  const { user } = await validateRequest();
  const orgs = await getUserOrgs();

  if (orgs.length === 0) {
    redirect('/dashboard');
  }

  // For now, use first org. In future, add org selector
  const orgId = orgs[0].id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create New Form</h1>
        <p className="text-muted-foreground">
          Build a form with custom fields and a review rubric
        </p>
      </div>
      <FormBuilder orgId={orgId} />
    </div>
  );
}

