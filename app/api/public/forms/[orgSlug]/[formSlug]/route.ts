import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SubmissionCreateSchema } from '@/lib/zod-schemas';
import { validateTurnstile } from '@/lib/turnstile';
import {
  rateLimitByIP,
  rateLimitByEmail,
  getClientIP,
} from '@/lib/rate-limit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgSlug: string; formSlug: string }> }
) {
  try {
    const { orgSlug, formSlug } = await params;
    const form = await prisma.form.findFirst({
      where: {
        slug: formSlug,
        org: { slug: orgSlug },
        status: 'open',
      },
      include: {
        org: {
          select: {
            name: true,
          },
        },
        versions: {
          where: {
            publishedAt: { not: null },
          },
          orderBy: { version: 'desc' },
          take: 1,
        },
        rubricVersions: {
          where: {
            publishedAt: { not: null },
          },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!form || form.versions.length === 0 || form.rubricVersions.length === 0) {
      return NextResponse.json(
        { error: 'Form not found or not available' },
        { status: 404 }
      );
    }

    const formVersion = form.versions[0];
    const rubricVersion = form.rubricVersions[0];

    return NextResponse.json({
      form: {
        id: form.id,
        name: form.name,
        status: form.status,
        openAt: form.openAt,
        closeAt: form.closeAt,
      },
      formVersion: {
        id: formVersion.id,
        version: formVersion.version,
        schemaJson: formVersion.schemaJson,
      },
      rubricVersion: {
        id: rubricVersion.id,
        version: rubricVersion.version,
        questionsJson: rubricVersion.questionsJson,
        scaleMin: rubricVersion.scaleMin,
        scaleMax: rubricVersion.scaleMax,
        scaleStep: rubricVersion.scaleStep,
      },
    });
  } catch (error) {
    console.error('Get form error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgSlug: string; formSlug: string }> }
) {
  try {
    const { orgSlug, formSlug } = await params;
    // Rate limiting
    const clientIP = getClientIP(request);
    const ipLimit = await rateLimitByIP(clientIP, 60 * 1000, 10); // 10 requests per minute
    if (!ipLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(ipLimit.reset),
            'X-RateLimit-Limit': String(ipLimit.limit),
            'X-RateLimit-Remaining': String(ipLimit.remaining),
            'X-RateLimit-Reset': String(ipLimit.reset),
          },
        }
      );
    }

    const body = await request.json();
    const { submitterEmail, data, honeypot, turnstileToken } =
      SubmissionCreateSchema.parse(body);

    // Check honeypot
    if (honeypot && honeypot.trim() !== '') {
      return NextResponse.json(
        { error: 'Invalid submission' },
        { status: 400 }
      );
    }

    // Rate limiting by email
    const emailLimit = await rateLimitByEmail(
      submitterEmail,
      60 * 60 * 1000,
      5
    ); // 5 requests per hour
    if (!emailLimit.success) {
      return NextResponse.json(
        { error: 'Too many submissions from this email. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(emailLimit.reset),
            'X-RateLimit-Limit': String(emailLimit.limit),
            'X-RateLimit-Remaining': String(emailLimit.remaining),
            'X-RateLimit-Reset': String(emailLimit.reset),
          },
        }
      );
    }

    // Validate CAPTCHA
    const captchaValid = await validateTurnstile(
      turnstileToken,
      clientIP
    );
    if (!captchaValid) {
      return NextResponse.json(
        { error: 'CAPTCHA validation failed' },
        { status: 400 }
      );
    }

    // Get form with published versions
    const form = await prisma.form.findFirst({
      where: {
        slug: formSlug,
        org: { slug: orgSlug },
        status: 'open',
      },
      include: {
        versions: {
          where: {
            publishedAt: { not: null },
          },
          orderBy: { version: 'desc' },
          take: 1,
        },
        rubricVersions: {
          where: {
            publishedAt: { not: null },
          },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!form || form.versions.length === 0 || form.rubricVersions.length === 0) {
      return NextResponse.json(
        { error: 'Form not found or not available' },
        { status: 404 }
      );
    }

    const formVersion = form.versions[0];
    const rubricVersion = form.rubricVersions[0];

    // Validate submission data against form schema
    // TODO: Add schema validation logic here

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        orgId: form.orgId,
        formId: form.id,
        formVersionId: formVersion.id,
        rubricVersionId: rubricVersion.id,
        submitterEmail: submitterEmail.toLowerCase(),
        dataJson: data,
        status: 'ungraded',
        aggregate: {
          create: {},
        },
      },
    });

    // Create domain event
    await prisma.domainEvent.create({
      data: {
        orgId: form.orgId,
        type: 'submission.created',
        payloadJson: {
          submissionId: submission.id,
          formId: form.id,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      id: submission.id,
      submittedAt: submission.submittedAt,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid submission data', details: error },
        { status: 400 }
      );
    }

    console.error('Submission error:', error);
    return NextResponse.json(
      { error: 'An error occurred during submission' },
      { status: 500 }
    );
  }
}

