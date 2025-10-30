import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Get seed credentials from environment or use defaults
  const superAdminEmail = process.env.SEED_SUPERADMIN_EMAIL || 'admin@iterate.ai';
  const superAdminPassword = process.env.SEED_SUPERADMIN_PASSWORD || 'changeme123';

  // Create Super Admin
  const passwordHash = await hash(superAdminPassword, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      passwordHash,
      name: 'Super Admin',
      isSuperAdmin: true,
    },
  });

  console.log('✅ Created Super Admin:', superAdmin.email);

  // Create sample organization
  const org = await prisma.organization.upsert({
    where: { slug: 'acme' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme',
    },
  });

  console.log('✅ Created Organization:', org.name);

  // Create org admin user
  const orgAdminPassword = await hash('password123', {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  const orgAdmin = await prisma.user.upsert({
    where: { email: 'admin@acme.com' },
    update: {},
    create: {
      email: 'admin@acme.com',
      passwordHash: orgAdminPassword,
      name: 'Acme Admin',
      isSuperAdmin: false,
    },
  });

  console.log('✅ Created Org Admin:', orgAdmin.email);

  // Create org admin membership
  await prisma.membership.upsert({
    where: {
      userId_orgId: {
        userId: orgAdmin.id,
        orgId: org.id,
      },
    },
    update: {},
    create: {
      userId: orgAdmin.id,
      orgId: org.id,
      role: 'org_admin',
    },
  });

  // Create reviewer user
  const reviewerPassword = await hash('password123', {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  const reviewer = await prisma.user.upsert({
    where: { email: 'reviewer@acme.com' },
    update: {},
    create: {
      email: 'reviewer@acme.com',
      passwordHash: reviewerPassword,
      name: 'Acme Reviewer',
      isSuperAdmin: false,
    },
  });

  console.log('✅ Created Reviewer:', reviewer.email);

  // Create reviewer membership
  await prisma.membership.upsert({
    where: {
      userId_orgId: {
        userId: reviewer.id,
        orgId: org.id,
      },
    },
    update: {},
    create: {
      userId: reviewer.id,
      orgId: org.id,
      role: 'reviewer',
    },
  });

  // Create sample form
  const form = await prisma.form.upsert({
    where: {
      orgId_slug: {
        orgId: org.id,
        slug: 'innovation-challenge',
      },
    },
    update: {},
    create: {
      orgId: org.id,
      name: 'Innovation Challenge 2025',
      slug: 'innovation-challenge',
      status: 'draft',
      minReviewsRequired: 2,
      visibilityMode: 'REVEAL_AFTER_ME_SUBMIT',
    },
  });

  console.log('✅ Created Form:', form.name);

  // Create form version with sample schema
  let formVersion = await prisma.formVersion.findUnique({
    where: {
      formId_version: {
        formId: form.id,
        version: 1,
      },
    },
  });

  if (!formVersion) {
    formVersion = await prisma.formVersion.create({
      data: {
        formId: form.id,
        version: 1,
        schemaJson: {
          title: 'Innovation Challenge Application',
          description: 'Submit your innovative idea for review',
          fields: [
            {
              id: 'company',
              type: 'text',
              label: 'Company Name',
              required: true,
            },
            {
              id: 'idea',
              type: 'textarea',
              label: 'Describe your innovation',
              description: 'Please provide a detailed description of your innovative idea',
              required: true,
            },
            {
              id: 'website',
              type: 'url',
              label: 'Website',
              required: false,
            },
          ],
        },
        publishedAt: new Date(),
      },
    });
    console.log('✅ Created Form Version:', formVersion.version);
  } else {
    console.log('✅ Form Version already exists:', formVersion.version);
  }

  // Create rubric version
  let rubricVersion = await prisma.rubricVersion.findUnique({
    where: {
      formId_version: {
        formId: form.id,
        version: 1,
      },
    },
  });

  if (!rubricVersion) {
    rubricVersion = await prisma.rubricVersion.create({
      data: {
        formId: form.id,
        version: 1,
        questionsJson: {
          questions: [
            {
              id: 'q1',
              label: 'Strategic Fit',
              description: 'How well does this align with our strategic goals?',
              weight: 0.4,
              required: true,
            },
            {
              id: 'q2',
              label: 'Feasibility',
              description: 'How feasible is this idea to implement?',
              weight: 0.3,
              required: true,
            },
            {
              id: 'q3',
              label: 'Impact',
              description: 'What is the potential impact of this innovation?',
              weight: 0.3,
              required: true,
            },
          ],
        },
        scaleMin: 1,
        scaleMax: 5,
        scaleStep: 1,
        publishedAt: new Date(),
      },
    });
    console.log('✅ Created Rubric Version:', rubricVersion.version);
  } else {
    console.log('✅ Rubric Version already exists:', rubricVersion.version);
  }

  // Create sample tags
  const tag1 = await prisma.tag.upsert({
    where: {
      orgId_label: {
        orgId: org.id,
        label: 'High Priority',
      },
    },
    update: {},
    create: {
      orgId: org.id,
      label: 'High Priority',
      color: '#ef4444',
    },
  });

  const tag2 = await prisma.tag.upsert({
    where: {
      orgId_label: {
        orgId: org.id,
        label: 'Needs Review',
      },
    },
    update: {},
    create: {
      orgId: org.id,
      label: 'Needs Review',
      color: '#f59e0b',
    },
  });

  console.log('✅ Created Tags');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Login credentials:');
  console.log(`   Super Admin: ${superAdminEmail} / ${superAdminPassword}`);
  console.log(`   Org Admin: admin@acme.com / password123`);
  console.log(`   Reviewer: reviewer@acme.com / password123`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
