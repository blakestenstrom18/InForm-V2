import { z } from 'zod';

// ============================================================================
// Auth Schemas
// ============================================================================

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional(),
});

export const InviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['org_admin', 'reviewer', 'viewer']),
  orgId: z.string().uuid(),
});

export const AcceptInviteSchema = z.object({
  token: z.string(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional(),
});

// ============================================================================
// Organization Schemas
// ============================================================================

export const CreateOrgSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
});

export const UpdateOrgSchema = z.object({
  name: z.string().min(1, 'Organization name is required').optional(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
});

// ============================================================================
// Form Schemas
// ============================================================================

export const FormFieldSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'textarea', 'email', 'url', 'number', 'select', 'checkbox', 'radio']),
  label: z.string(),
  description: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(), // for select, radio
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
    })
    .optional(),
});

export const FormSchemaJson = z.object({
  fields: z.array(FormFieldSchema),
  title: z.string().optional(),
  description: z.string().optional(),
});

export const RubricQuestionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  weight: z.number().min(0).max(1),
  required: z.boolean().default(true),
});

export const RubricSchemaJson = z.object({
  questions: z.array(RubricQuestionSchema),
  scaleMin: z.number().int().default(1),
  scaleMax: z.number().int().default(5),
  scaleStep: z.number().int().default(1),
});

export const CreateFormSchema = z.object({
  name: z.string().min(1, 'Form name is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  orgId: z.string().uuid(),
  formSchema: FormSchemaJson,
  rubricSchema: RubricSchemaJson,
});

export const UpdateFormSchema = z.object({
  name: z.string().min(1, 'Form name is required').optional(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  status: z.enum(['draft', 'open', 'closed', 'archived']).optional(),
  openAt: z.string().datetime().optional().nullable(),
  closeAt: z.string().datetime().optional().nullable(),
  minReviewsRequired: z.number().int().min(1).optional(),
  visibilityMode: z
    .enum(['REVEAL_AFTER_ME_SUBMIT', 'REVEAL_AFTER_MIN_REVIEWS', 'NEVER', 'AVERAGES_ONLY_UNTIL_LOCK'])
    .optional(),
  visibilityThreshold: z.number().int().min(1).optional().nullable(),
});

export const PublishFormSchema = z.object({
  formSchema: FormSchemaJson.optional(),
  rubricSchema: RubricSchemaJson.optional(),
  notes: z.string().optional(),
});

// ============================================================================
// Submission Schemas
// ============================================================================

export const SubmissionCreateSchema = z.object({
  submitterEmail: z.string().email('Invalid email address'),
  data: z.record(z.any()),
  honeypot: z.string().optional(),
  turnstileToken: z.string().min(1, 'CAPTCHA token is required'),
});

export const SubmissionFilterSchema = z.object({
  status: z.enum(['ungraded', 'partially_graded', 'fully_graded']).optional(),
  submitterEmail: z.string().optional(),
  minScore: z.number().optional(),
  maxScore: z.number().optional(),
  tags: z.array(z.string()).optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

// ============================================================================
// Review Schemas
// ============================================================================

export const ReviewUpsertSchema = z.object({
  scores: z.record(z.number().int()),
  commentText: z.string().optional(),
  submit: z.boolean().default(false),
});

// ============================================================================
// Tag Schemas
// ============================================================================

export const CreateTagSchema = z.object({
  label: z.string().min(1, 'Tag label is required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  orgId: z.string().uuid(),
});

export const AddTagToSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  tagId: z.string().uuid(),
});

// ============================================================================
// Pagination Schemas
// ============================================================================

export const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

// ============================================================================
// Type exports
// ============================================================================

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type InviteUserInput = z.infer<typeof InviteUserSchema>;
export type AcceptInviteInput = z.infer<typeof AcceptInviteSchema>;
export type CreateOrgInput = z.infer<typeof CreateOrgSchema>;
export type UpdateOrgInput = z.infer<typeof UpdateOrgSchema>;
export type FormField = z.infer<typeof FormFieldSchema>;
export type FormSchemaJsonType = z.infer<typeof FormSchemaJson>;
export type RubricQuestion = z.infer<typeof RubricQuestionSchema>;
export type RubricSchemaJsonType = z.infer<typeof RubricSchemaJson>;
export type CreateFormInput = z.infer<typeof CreateFormSchema>;
export type UpdateFormInput = z.infer<typeof UpdateFormSchema>;
export type PublishFormInput = z.infer<typeof PublishFormSchema>;
export type SubmissionCreateInput = z.infer<typeof SubmissionCreateSchema>;
export type SubmissionFilterInput = z.infer<typeof SubmissionFilterSchema>;
export type ReviewUpsertInput = z.infer<typeof ReviewUpsertSchema>;
export type CreateTagInput = z.infer<typeof CreateTagSchema>;
export type AddTagToSubmissionInput = z.infer<typeof AddTagToSubmissionSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
