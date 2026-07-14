import { PrismaClient } from "@prisma/client";
import { mockOpportunities } from "../src/data/mock-opportunities";
import { mockSupplierQuotes, mockSuppliers } from "../src/data/mock-suppliers";
import { mockWorkflowTasks, mockWorkflows } from "../src/data/mock-workflows";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { id: "org-demo-001" },
    update: {},
    create: {
      id: "org-demo-001",
      name: "Acme Government Solutions LLC",
      uei: "ABC123DEF456",
      cageCode: "1A2B3",
      samRegistered: true,
      naicsCodes: ["424120", "423430", "424690", "423840"],
      pscCodes: ["7510", "7021", "7930", "4240"],
    },
  });

  console.log(`  ✓ Organization: ${org.name}`);

  // Create demo user
  const user = await prisma.user.upsert({
    where: { id: "user-demo-001" },
    update: {},
    create: {
      id: "user-demo-001",
      email: "demo@govcon-operator.com",
      firstName: "Jane",
      lastName: "Doe",
      organizationId: org.id,
      cognitoId: "demo-cognito-id",
    },
  });

  // Create user role
  await prisma.userRole.upsert({
    where: {
      userId_organizationId_role: {
        userId: user.id,
        organizationId: org.id,
        role: "owner",
      },
    },
    update: {},
    create: {
      userId: user.id,
      organizationId: org.id,
      role: "owner",
    },
  });

  console.log(`  ✓ User: ${user.email} (owner)`);

  const roleFixtures = [
    {
      id: "user-demo-admin",
      email: "admin@govcon-operator.com",
      firstName: "Demo",
      lastName: "Admin",
      role: "admin" as const,
    },
    {
      id: "user-demo-operator",
      email: "operator@govcon-operator.com",
      firstName: "Demo",
      lastName: "Operator",
      role: "operator" as const,
    },
    {
      id: "user-demo-coach",
      email: "coach@govcon-operator.com",
      firstName: "Demo",
      lastName: "Coach",
      role: "coach" as const,
    },
    {
      id: "user-demo-viewer",
      email: "viewer@govcon-operator.com",
      firstName: "Demo",
      lastName: "Viewer",
      role: "viewer" as const,
    },
  ];

  for (const fixture of roleFixtures) {
    const fixtureUser = await prisma.user.upsert({
      where: { id: fixture.id },
      update: {
        email: fixture.email,
        firstName: fixture.firstName,
        lastName: fixture.lastName,
        organizationId: org.id,
      },
      create: {
        id: fixture.id,
        email: fixture.email,
        firstName: fixture.firstName,
        lastName: fixture.lastName,
        cognitoId: `demo-cognito:${fixture.email}`,
        organizationId: org.id,
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_organizationId_role: {
          userId: fixtureUser.id,
          organizationId: org.id,
          role: fixture.role,
        },
      },
      update: {},
      create: {
        userId: fixtureUser.id,
        organizationId: org.id,
        role: fixture.role,
      },
    });
  }

  console.log("  ✓ Role boundary users: admin, operator, coach, viewer");

  const externalOrg = await prisma.organization.upsert({
    where: { id: "org-demo-external" },
    update: {},
    create: {
      id: "org-demo-external",
      name: "External Demo Organization",
      naicsCodes: [],
      pscCodes: [],
    },
  });

  const externalUser = await prisma.user.upsert({
    where: { id: "user-external-001" },
    update: { organizationId: externalOrg.id },
    create: {
      id: "user-external-001",
      email: "external@govcon-operator.com",
      firstName: "External",
      lastName: "Viewer",
      cognitoId: "demo-cognito:external@govcon-operator.com",
      organizationId: externalOrg.id,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_organizationId_role: {
        userId: externalUser.id,
        organizationId: externalOrg.id,
        role: "viewer",
      },
    },
    update: {},
    create: {
      userId: externalUser.id,
      organizationId: externalOrg.id,
      role: "viewer",
    },
  });

  console.log("  ✓ Cross-organization boundary fixture");

  // Create compliance profile
  await prisma.complianceProfile.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      ueiRegistered: true,
      samRegistered: true,
      cageCode: true,
      naicsCodes: true,
      pscCodes: true,
      businessBankAccount: true,
      insurance: true,
      capabilityStatement: false,
      pastPerformance: false,
      certifications: ["Small Business", "SAM.gov Active"],
      setAsideEligibility: ["Total Small Business"],
      readinessScore: 72,
    },
  });

  console.log("  ✓ Compliance profile");

  // Seed a full demo opportunity catalog from the same records used by mock mode.
  const opportunities = mockOpportunities.map((opp) => ({
    ...opp,
    dueDate: new Date(opp.dueDate),
    postedDate: new Date(opp.postedDate),
    responseDate: new Date(opp.responseDate),
    archiveDate: opp.archiveDate ? new Date(opp.archiveDate) : undefined,
  }));

  for (const opp of opportunities) {
    await prisma.opportunity.upsert({
      where: { id: opp.id },
      update: {},
      create: opp,
    });
  }

  console.log(`  ✓ ${opportunities.length} opportunities`);

  // Seed suppliers and quotes.
  const suppliers = mockSuppliers.map(({ createdAt, ...supplier }) => ({
    ...supplier,
    organizationId: org.id,
    createdAt: createdAt ? new Date(createdAt) : undefined,
  }));

  for (const sup of suppliers) {
    await prisma.supplier.upsert({
      where: { id: sup.id },
      update: {},
      create: sup,
    });
  }

  console.log(`  ✓ ${suppliers.length} suppliers`);

  const supplierQuotes = mockSupplierQuotes.map((quote) => ({
    ...quote,
    validUntil: quote.validUntil ? new Date(quote.validUntil) : undefined,
    createdAt: new Date(quote.createdAt),
  }));

  for (const quote of supplierQuotes) {
    await prisma.supplierQuote.upsert({
      where: { id: quote.id },
      update: {},
      create: quote,
    });
  }

  console.log(`  ✓ ${supplierQuotes.length} supplier quotes`);

  // Seed bid workflows and tasks.
  const workflows = mockWorkflows.map((workflow) => ({
    id: workflow.id,
    opportunityId: workflow.opportunityId,
    organizationId: org.id,
    stage: workflow.stage,
    assignedTo: workflow.assignedTo ? user.id : undefined,
    priority: workflow.priority,
    dueDate: workflow.dueDate ? new Date(workflow.dueDate) : undefined,
    notes: workflow.notes,
    createdAt: new Date(workflow.createdAt),
    updatedAt: new Date(workflow.updatedAt),
  }));

  for (const wf of workflows) {
    await prisma.bidWorkflow.upsert({
      where: { id: wf.id },
      update: {},
      create: wf,
    });
  }

  console.log(`  ✓ ${workflows.length} bid workflows`);

  const workflowTasks = mockWorkflowTasks.map((task) => ({
    ...task,
    assignedTo: task.assignedTo ? user.id : undefined,
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    createdAt: new Date(task.createdAt),
  }));

  for (const task of workflowTasks) {
    await prisma.workflowTask.upsert({
      where: { id: task.id },
      update: {},
      create: task,
    });
  }

  console.log(`  ✓ ${workflowTasks.length} workflow tasks`);

  console.log("\n✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
