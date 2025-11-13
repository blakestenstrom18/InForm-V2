'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

// Dynamically load Turnstile script
declare global {
  interface Window {
    turnstile: {
      render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void }) => string;
      reset: (widgetId: string) => void;
    };
  }
}

interface FormField {
  id: string;
  type: string;
  label: string;
  description?: string;
  required?: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface FormData {
  formVersion: {
    schemaJson: {
      fields: FormField[];
      title?: string;
      description?: string;
    };
  };
  rubricVersion: {
    scaleMin: number;
    scaleMax: number;
    scaleStep: number;
  };
}

export default function PublicFormPage() {
  const params = useParams();
  const router = useRouter();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileWidgetId, setTurnstileWidgetId] = useState<string | null>(null);

  const orgSlug = params.orgSlug as string;
  const formSlug = params.formSlug as string;

  // Load form data
  useEffect(() => {
    async function loadForm() {
      try {
        const response = await fetch(
          `/api/public/forms/${orgSlug}/${formSlug}`
        );
        if (!response.ok) {
          setError('Form not found');
          setLoading(false);
          return;
        }
        const data = await response.json();
        setFormData(data);
      } catch (err) {
        setError('Failed to load form');
      } finally {
        setLoading(false);
      }
    }

    loadForm();
  }, [orgSlug, formSlug]);

  // Load Turnstile script
  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) {
      // In development, allow submission without CAPTCHA
      setTurnstileToken('dev-token');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      const widgetId = window.turnstile.render(
        document.getElementById('turnstile-widget')!,
        {
          sitekey: siteKey,
          callback: (token: string) => {
            setTurnstileToken(token);
          },
        }
      );
      setTurnstileWidgetId(widgetId);
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Build form schema dynamically
  const buildFormSchema = () => {
    if (!formData?.formVersion.schemaJson.fields) {
      return z.object({});
    }

    const schemaFields: Record<string, z.ZodTypeAny> = {
      submitterEmail: z.string().email('Invalid email address'),
      honeypot: z.string().optional(),
    };

    formData.formVersion.schemaJson.fields.forEach((field) => {
      let fieldSchema: z.ZodTypeAny;

      switch (field.type) {
        case 'email':
          fieldSchema = z.string().email('Invalid email address');
          break;
        case 'url':
          fieldSchema = z.string().url('Invalid URL');
          break;
        case 'number':
          let numberSchema = z.number();
          if (field.validation?.min !== undefined) {
            numberSchema = numberSchema.min(field.validation.min);
          }
          if (field.validation?.max !== undefined) {
            numberSchema = numberSchema.max(field.validation.max);
          }
          fieldSchema = numberSchema;
          break;
        default:
          let stringSchema = z.string();
          if (field.validation?.pattern) {
            stringSchema = stringSchema.regex(
              new RegExp(field.validation.pattern),
              'Invalid format'
            );
          }
          fieldSchema = stringSchema;
      }

      if (field.required) {
        schemaFields[field.id] = fieldSchema;
      } else {
        schemaFields[field.id] = fieldSchema.optional();
      }
    });

    return z.object(schemaFields);
  };

  const formSchema = formData ? buildFormSchema() : z.object({});
  type FormValues = z.infer<typeof formSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<any>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormValues) => {
    if (!turnstileToken && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      setError('Please complete the CAPTCHA');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Extract submitterEmail and honeypot, keep rest as data
      const { submitterEmail, honeypot, ...formFields } = data as any;

      const response = await fetch(
        `/api/public/forms/${orgSlug}/${formSlug}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            submitterEmail,
            data: formFields,
            honeypot: honeypot || '',
            turnstileToken: turnstileToken || 'dev-token',
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Submission failed');
        setSubmitting(false);
        // Reset CAPTCHA if needed
        if (turnstileWidgetId && window.turnstile) {
          window.turnstile.reset(turnstileWidgetId);
          setTurnstileToken(null);
        }
        return;
      }

      // Redirect to success page
      router.push(`/${orgSlug}/${formSlug}/success`);
    } catch (err) {
      setError('An unexpected error occurred');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error && !formData) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!formData) {
    return null;
  }

  const { formVersion, rubricVersion } = formData;
  const schema = formVersion.schemaJson;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{schema.title || 'Form Submission'}</CardTitle>
            {schema.description && (
              <CardDescription>{schema.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Honeypot field (hidden) */}
              <div className="hidden">
                <Label htmlFor="honeypot">Leave this field empty</Label>
                <Input id="honeypot" {...register('honeypot')} />
              </div>

              {/* Email field (required) */}
              <div className="space-y-2">
                <Label htmlFor="submitterEmail">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="submitterEmail"
                  type="email"
                  placeholder="you@example.com"
                  {...register('submitterEmail')}
                  disabled={submitting}
                />
                {errors.submitterEmail && (
                  <p className="text-sm text-destructive">
                    {errors.submitterEmail.message as string}
                  </p>
                )}
              </div>

              {/* Dynamic form fields */}
              {schema.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id}>
                    {field.label}
                    {field.required && (
                      <span className="text-destructive"> *</span>
                    )}
                  </Label>
                  {field.description && (
                    <p className="text-sm text-muted-foreground">
                      {field.description}
                    </p>
                  )}

                  {field.type === 'textarea' ? (
                    <Textarea
                      id={field.id}
                      {...register(field.id)}
                      disabled={submitting}
                    />
                  ) : field.type === 'select' ? (
                    <Select
                      onValueChange={(value) => setValue(field.id, value)}
                      disabled={submitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={field.id}
                      type={field.type === 'number' ? 'number' : 'text'}
                      {...register(field.id, {
                        valueAsNumber: field.type === 'number',
                      })}
                      disabled={submitting}
                    />
                  )}

                  {errors[field.id] && (
                    <p className="text-sm text-destructive">
                      {String(errors[field.id]?.message)}
                    </p>
                  )}
                </div>
              ))}

              {/* Turnstile CAPTCHA */}
              {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                <div id="turnstile-widget" />
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

