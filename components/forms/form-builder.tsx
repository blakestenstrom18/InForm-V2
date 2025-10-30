'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { z } from 'zod';
import { FormSchemaJson, RubricSchemaJson, CreateFormSchema, UpdateFormSchema } from '@/lib/zod-schemas';
import { FormFieldSchema, RubricQuestionSchema } from '@/lib/zod-schemas';
import FormSchemaEditor from './form-schema-editor';
import RubricEditor from './rubric-editor';
import FormSettingsPanel from './form-settings-panel';
import FormPreview from './form-preview';
import { useToast } from '@/hooks/use-toast';
import { Save, Eye, Loader2 } from 'lucide-react';

type FormField = z.infer<typeof FormFieldSchema>;
type RubricQuestion = z.infer<typeof RubricQuestionSchema>;
type FormSchema = z.infer<typeof FormSchemaJson>;
type RubricSchema = z.infer<typeof RubricSchemaJson>;

interface FormBuilderProps {
  orgId: string;
  formId?: string;
  initialForm?: {
    name: string;
    slug: string;
    status: string;
    openAt: string | null;
    closeAt: string | null;
    minReviewsRequired: number;
    visibilityMode: string;
    visibilityThreshold: number | null;
    formSchema: FormSchema;
    rubricSchema: RubricSchema;
  };
}

export default function FormBuilder({ orgId, formId, initialForm }: FormBuilderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('fields');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Form schema state
  const [formSchema, setFormSchema] = useState<FormSchema>(
    initialForm?.formSchema || {
      fields: [],
      title: '',
      description: '',
    }
  );

  // Rubric schema state
  const [rubricSchema, setRubricSchema] = useState<RubricSchema>(
    initialForm?.rubricSchema || {
      questions: [],
      scaleMin: 1,
      scaleMax: 5,
      scaleStep: 1,
    }
  );

  // Form settings
  const formSettingsSchema = formId
    ? UpdateFormSchema.partial()
    : CreateFormSchema.omit({ formSchema: true, rubricSchema: true });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(formSettingsSchema),
    defaultValues: initialForm
      ? {
          name: initialForm.name,
          slug: initialForm.slug,
          status: initialForm.status,
          openAt: initialForm.openAt || undefined,
          closeAt: initialForm.closeAt || undefined,
          minReviewsRequired: initialForm.minReviewsRequired,
          visibilityMode: initialForm.visibilityMode,
          visibilityThreshold: initialForm.visibilityThreshold || undefined,
        }
      : {
          name: '',
          slug: '',
          status: 'draft',
          minReviewsRequired: 1,
          visibilityMode: 'REVEAL_AFTER_ME_SUBMIT',
        },
  });

  // Auto-save to localStorage
  useEffect(() => {
    const saveDraft = () => {
      const draft = {
        formSchema,
        rubricSchema,
        settings: watch(),
      };
      localStorage.setItem(`form-draft-${formId || 'new'}`, JSON.stringify(draft));
    };

    const timer = setTimeout(saveDraft, 1000);
    return () => clearTimeout(timer);
  }, [formSchema, rubricSchema, watch, formId]);

  const onSave = async (data: any) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        formSchema,
        rubricSchema,
      };

      if (formId) {
        // Update existing form
        const response = await fetch(`/api/forms/${formId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update form');
        }

        toast({
          title: 'Form updated',
          description: 'Your form has been saved successfully.',
        });
      } else {
        // Create new form
        const response = await fetch(`/api/org/${orgId}/forms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            orgId,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create form');
        }

        const newForm = await response.json();
        toast({
          title: 'Form created',
          description: 'Your form has been created successfully.',
        });
        router.push(`/forms/${newForm.id}/edit`);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save form',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const onPublish = async () => {
    if (formSchema.fields.length === 0) {
      toast({
        title: 'Cannot publish',
        description: 'Please add at least one form field.',
        variant: 'destructive',
      });
      return;
    }

    if (rubricSchema.questions.length === 0) {
      toast({
        title: 'Cannot publish',
        description: 'Please add at least one rubric question.',
        variant: 'destructive',
      });
      return;
    }

    if (!formId) {
      toast({
        title: 'Cannot publish',
        description: 'Please save the form first.',
        variant: 'destructive',
      });
      return;
    }

    setPublishing(true);
    try {
      const response = await fetch(`/api/forms/${formId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formSchema,
          rubricSchema,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to publish form');
      }

      toast({
        title: 'Form published',
        description: 'Your form is now live and accepting submissions.',
      });
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to publish form',
        variant: 'destructive',
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSave)}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Form
                </>
              )}
            </Button>
            {formId && (
              <Button type="button" onClick={onPublish} disabled={publishing} variant="default">
                {publishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  'Publish Form'
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="fields">Form Fields</TabsTrigger>
            <TabsTrigger value="rubric">Rubric</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fields" className="mt-6">
            <FormSchemaEditor
              schema={formSchema}
              onChange={setFormSchema}
            />
          </TabsContent>

          <TabsContent value="rubric" className="mt-6">
            <RubricEditor
              schema={rubricSchema}
              onChange={setRubricSchema}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <FormSettingsPanel
              register={register}
              errors={errors}
              watch={watch}
              setValue={setValue}
            />
          </TabsContent>

          <TabsContent value="preview" className="mt-6">
            <FormPreview
              formSchema={formSchema}
              rubricSchema={rubricSchema}
            />
          </TabsContent>
        </Tabs>
      </div>
    </form>
  );
}

