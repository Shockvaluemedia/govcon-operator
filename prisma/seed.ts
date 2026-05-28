import { PrismaClient } from "@prisma/client";

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

  // Seed opportunities
  const opportunities = [
    {
      id: "opp-seed-001",
      title: "Office Supplies - Toner Cartridges and Paper Products",
      agency: "Department of Defense - DLA",
      solicitationNumber: "SPE7LX-24-R-0142",
      naicsCode: "424120",
      pscCode: "7510",
      setAsideType: "Total Small Business",
      dueDate: new Date("2026-06-15T17:00:00Z"),
      estimatedValue: 125000,
      source: "DLA",
      status: "active",
      matchScore: 87,
      riskScore: 25,
      description: "The Defense Logistics Agency is seeking qualified small businesses to provide toner cartridges, paper products, and general office supplies for military installations across the continental United States.",
      requirements: ["Must be registered in SAM.gov", "Must have CAGE code", "Small business certification required", "Delivery within 30 days of order", "Must meet Berry Amendment requirements"],
      deliveryRequirements: "FOB Destination, 30 days ARO",
      placeOfPerformance: "Multiple CONUS locations",
      postedDate: new Date("2026-05-01T00:00:00Z"),
      responseDate: new Date("2026-06-15T17:00:00Z"),
      productCategory: "Office Supplies",
      certifications: ["SAM.gov", "Small Business"],
    },
    {
      id: "opp-seed-002",
      title: "IT Hardware - Laptops and Monitors for VA Medical Centers",
      agency: "Department of Veterans Affairs",
      solicitationNumber: "36C10X24R0089",
      naicsCode: "423430",
      pscCode: "7021",
      setAsideType: "Service-Disabled Veteran-Owned Small Business",
      dueDate: new Date("2026-06-22T14:00:00Z"),
      estimatedValue: 450000,
      source: "SAM.gov",
      status: "active",
      matchScore: 72,
      riskScore: 45,
      description: "The Department of Veterans Affairs requires laptops and monitors for deployment across VA Medical Centers nationwide. Equipment must meet current security standards and be TAA-compliant.",
      requirements: ["SDVOSB certification required", "TAA-compliant products only", "Must provide 3-year warranty", "Section 508 accessibility compliance"],
      deliveryRequirements: "FOB Destination, 45 days ARO",
      placeOfPerformance: "VA Medical Centers Nationwide",
      postedDate: new Date("2026-05-10T00:00:00Z"),
      responseDate: new Date("2026-06-22T14:00:00Z"),
      productCategory: "IT Hardware",
      certifications: ["SDVOSB", "TAA Compliant"],
    },
    {
      id: "opp-seed-003",
      title: "Janitorial Supplies - Cleaning Products and Equipment",
      agency: "General Services Administration",
      solicitationNumber: "GS-07F-0142Y",
      naicsCode: "424690",
      pscCode: "7930",
      setAsideType: "8(a) Business Development",
      dueDate: new Date("2026-07-01T16:00:00Z"),
      estimatedValue: 85000,
      source: "SAM.gov",
      status: "active",
      matchScore: 91,
      riskScore: 15,
      description: "GSA seeks qualified 8(a) firms to provide janitorial supplies including cleaning chemicals, paper products, trash bags, and cleaning equipment for federal buildings in Region 4.",
      requirements: ["8(a) certification required", "Green Seal or EcoLogo certified products preferred", "Must provide SDS for all chemical products", "Monthly delivery schedule"],
      deliveryRequirements: "Monthly delivery, FOB Destination",
      placeOfPerformance: "GSA Region 4 - Southeast",
      postedDate: new Date("2026-05-15T00:00:00Z"),
      responseDate: new Date("2026-07-01T16:00:00Z"),
      productCategory: "Janitorial Supplies",
      certifications: ["8(a)", "SAM.gov"],
    },
  ];

  for (const opp of opportunities) {
    await prisma.opportunity.upsert({
      where: { id: opp.id },
      update: {},
      create: opp,
    });
  }

  console.log(`  ✓ ${opportunities.length} opportunities`);

  // Seed suppliers
  const suppliers = [
    {
      id: "sup-seed-001",
      name: "Pacific Office Products",
      website: "https://pacificoffice.example.com",
      contactName: "David Park",
      contactEmail: "david@pacificoffice.example.com",
      contactPhone: "(555) 123-4567",
      productCategory: "Office Supplies",
      leadTime: "5-7 business days",
      unitCost: 24.99,
      moq: 100,
      shippingEstimate: 450,
      reliabilityRating: 4.5,
      notes: "Reliable supplier, good bulk pricing. Has government experience.",
      organizationId: org.id,
    },
    {
      id: "sup-seed-002",
      name: "TechDirect Solutions",
      website: "https://techdirect.example.com",
      contactName: "Maria Santos",
      contactEmail: "maria@techdirect.example.com",
      contactPhone: "(555) 234-5678",
      productCategory: "IT Hardware",
      leadTime: "10-14 business days",
      unitCost: 899.00,
      moq: 25,
      shippingEstimate: 1200,
      reliabilityRating: 4.2,
      notes: "TAA-compliant products available. Good warranty support.",
      organizationId: org.id,
    },
    {
      id: "sup-seed-003",
      name: "CleanPro Distributors",
      website: "https://cleanpro.example.com",
      contactName: "James Wilson",
      contactEmail: "james@cleanpro.example.com",
      contactPhone: "(555) 345-6789",
      productCategory: "Janitorial Supplies",
      leadTime: "3-5 business days",
      unitCost: 12.50,
      moq: 200,
      shippingEstimate: 350,
      reliabilityRating: 4.8,
      notes: "Green Seal certified products. Excellent fill rates.",
      organizationId: org.id,
    },
  ];

  for (const sup of suppliers) {
    await prisma.supplier.upsert({
      where: { id: sup.id },
      update: {},
      create: sup,
    });
  }

  console.log(`  ✓ ${suppliers.length} suppliers`);

  // Seed bid workflows
  const workflows = [
    {
      id: "wf-seed-001",
      opportunityId: "opp-seed-001",
      organizationId: org.id,
      stage: "supplier_sourcing",
      assignedTo: user.id,
      priority: "high",
      dueDate: new Date("2026-06-10T00:00:00Z"),
      notes: "Good match for our capabilities. Need to finalize supplier pricing.",
    },
    {
      id: "wf-seed-002",
      opportunityId: "opp-seed-002",
      organizationId: org.id,
      stage: "under_review",
      assignedTo: user.id,
      priority: "medium",
      dueDate: new Date("2026-06-18T00:00:00Z"),
      notes: "Need to verify SDVOSB eligibility and TAA compliance.",
    },
    {
      id: "wf-seed-003",
      opportunityId: "opp-seed-003",
      organizationId: org.id,
      stage: "pricing",
      assignedTo: user.id,
      priority: "high",
      dueDate: new Date("2026-06-25T00:00:00Z"),
      notes: "Supplier confirmed. Working on margin calculations.",
    },
  ];

  for (const wf of workflows) {
    await prisma.bidWorkflow.upsert({
      where: { id: wf.id },
      update: {},
      create: wf,
    });
  }

  console.log(`  ✓ ${workflows.length} bid workflows`);

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
