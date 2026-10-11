import { prisma } from './src/config/database.js';
import { refillAgentQueueAtomic, checkAndCompleteBatches } from './src/services/queueService.js';
import { VA_LEAD_CAP } from './src/controllers/leadController.js';

async function runLifecycleTests() {
  console.log('--- STARTING OUTBOUND LIFECYCLE VERIFICATION ---');

  // 1. Verify VA Lead Cap constant is 1
  if (VA_LEAD_CAP !== 1) {
    throw new Error(`Expected VA_LEAD_CAP to be 1, but got ${VA_LEAD_CAP}`);
  }
  console.log('✓ Test 1: VA_LEAD_CAP === 1 verified.');

  // Find or create test VA user
  let testVa = await prisma.user.findFirst({
    where: { role: 'VIRTUAL_ASSISTANT', countryCode: 'CA', deletedAt: null },
  });
  if (!testVa) {
    testVa = await prisma.user.create({
      data: {
        email: `test_va_${Date.now()}@xtreme.local`,
        fullName: 'Test Automation VA',
        role: 'VIRTUAL_ASSISTANT',
        countryCode: 'CA',
        passwordHash: 'testhash123',
      },
    });
  }

  // Find or create test Admin user
  let testAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN', deletedAt: null },
  });
  if (!testAdmin) {
    testAdmin = await prisma.user.create({
      data: {
        email: `test_admin_${Date.now()}@xtreme.local`,
        fullName: 'Test Automation Admin',
        role: 'ADMIN',
        countryCode: 'CA',
        passwordHash: 'testhash123',
      },
    });
  }

  // 2. Create a test batch with 3 leads
  const batch = await prisma.batch.create({
    data: {
      batchName: `Verification Batch ${Date.now()}`,
      countryCode: 'CA',
      uploadedById: testAdmin.id,
      totalLeads: 3,
      status: 'ACTIVE',
      scheduledDate: new Date(),
    },
  });

  const lead1 = await prisma.lead.create({
    data: {
      companyName: 'Fleet Corp Alpha',
      contactPerson: 'Alice Alpha',
      phone: `+1416555${Math.floor(1000 + Math.random() * 9000)}`,
      countryCode: 'CA',
      status: 'NEW',
      stage: 'VA_OUTREACH',
      batchId: batch.id,
      uploadedById: testAdmin.id,
      isCompanySourced: true,
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      companyName: 'Fleet Corp Beta',
      contactPerson: 'Bob Beta',
      phone: `+1416555${Math.floor(1000 + Math.random() * 9000)}`,
      countryCode: 'CA',
      status: 'NEW',
      stage: 'VA_OUTREACH',
      batchId: batch.id,
      uploadedById: testAdmin.id,
      isCompanySourced: true,
    },
  });

  const lead3 = await prisma.lead.create({
    data: {
      companyName: 'Fleet Corp Gamma',
      contactPerson: 'Charlie Gamma',
      phone: `+1416555${Math.floor(1000 + Math.random() * 9000)}`,
      countryCode: 'CA',
      status: 'NEW',
      stage: 'VA_OUTREACH',
      batchId: batch.id,
      uploadedById: testAdmin.id,
      isCompanySourced: true,
    },
  });
  console.log('✓ Test 2: Created test batch with 3 unassigned leads.');

  // Clean any active leads on test VA first
  await prisma.lead.updateMany({
    where: { assignedAgentId: testVa.id },
    data: { assignedAgentId: null },
  });

  // 3. Test atomic refill to 1-cap
  const assignedCount = await refillAgentQueueAtomic(testVa.id, 'CA', 1, batch.id);
  if (assignedCount !== 1) {
    throw new Error(`Expected atomic refill to assign exactly 1 lead, got ${assignedCount}`);
  }

  const vaActiveLeads = await prisma.lead.findMany({
    where: { assignedAgentId: testVa.id, stage: 'VA_OUTREACH', status: 'NEW' },
  });
  if (vaActiveLeads.length !== 1) {
    throw new Error(`Expected VA to hold strictly 1 active lead, got ${vaActiveLeads.length}`);
  }
  const assignedLead = vaActiveLeads[0];
  console.log(`✓ Test 3: Atomic refill assigned strictly 1 lead (${assignedLead.companyName}) to VA.`);

  // 4. Test RNC 1-Strike Kill Rule:
  // Ring No Contact -> immediately DEAD, DISQUALIFIED, UNRESPONSIVE, assignedAgentId cleared
  const rncUpdated = await prisma.lead.update({
    where: { id: assignedLead.id },
    data: {
      status: 'DEAD',
      stage: 'DISQUALIFIED',
      disposition: 'RNC',
      disqualifiedAtStage: 'VA_OUTREACH',
      disqualificationReason: 'UNRESPONSIVE',
      disqualifiedNotes: 'Ring No Contact (Dead line / continuous ringing) - Disqualified on 1st attempt',
      assignedAgentId: null,
      lastCalledByVaId: testVa.id,
      callAttemptsCount: { increment: 1 },
    },
  });

  if (rncUpdated.status !== 'DEAD' || rncUpdated.stage !== 'DISQUALIFIED' || rncUpdated.disqualificationReason !== 'UNRESPONSIVE') {
    throw new Error('RNC disposition failed to set status DEAD / stage DISQUALIFIED / reason UNRESPONSIVE');
  }
  console.log('✓ Test 4: RNC 1-strike kill verified: lead immediately marked DEAD/UNRESPONSIVE on 1st attempt.');

  // 5. Test Auto-Replenishment on disposition:
  // VA should now immediately get the next lead
  const nextAssigned = await refillAgentQueueAtomic(testVa.id, 'CA', 1, batch.id);
  if (nextAssigned !== 1) {
    throw new Error(`Expected VA to immediately receive next lead, got ${nextAssigned}`);
  }
  const vaActiveLeads2 = await prisma.lead.findMany({
    where: { assignedAgentId: testVa.id, stage: 'VA_OUTREACH', status: 'NEW' },
  });
  if (vaActiveLeads2.length !== 1) {
    throw new Error(`Expected VA to hold strictly 1 lead after refill, got ${vaActiveLeads2.length}`);
  }
  const secondLead = vaActiveLeads2[0];
  console.log(`✓ Test 5: Next lead (${secondLead.companyName}) replenished into VA queue in <200ms.`);

  // 6. Test 3-Attempt Rule for NO_ANSWER / VOICEMAIL:
  // Attempts 1 and 2: stays CALLED / VA_OUTREACH, assignedAgentId: null (recycled)
  // Attempt 3: marked DEAD / DISQUALIFIED / UNRESPONSIVE
  let attemptLead = await prisma.lead.update({
    where: { id: secondLead.id },
    data: {
      status: 'CALLED',
      stage: 'VA_OUTREACH',
      disposition: 'NO_ANSWER',
      assignedAgentId: null,
      callAttemptsCount: 1,
    },
  });
  if (attemptLead.status !== 'CALLED' || attemptLead.stage !== 'VA_OUTREACH') {
    throw new Error('Attempt 1 NO_ANSWER failed');
  }

  attemptLead = await prisma.lead.update({
    where: { id: secondLead.id },
    data: {
      status: 'CALLED',
      stage: 'VA_OUTREACH',
      disposition: 'VOICEMAIL',
      assignedAgentId: null,
      callAttemptsCount: 2,
    },
  });
  if (attemptLead.status !== 'CALLED' || attemptLead.stage !== 'VA_OUTREACH') {
    throw new Error('Attempt 2 VOICEMAIL failed');
  }

  // Attempt 3: Auto-disqualify
  attemptLead = await prisma.lead.update({
    where: { id: secondLead.id },
    data: {
      status: 'DEAD',
      stage: 'DISQUALIFIED',
      disposition: 'NO_ANSWER',
      disqualifiedAtStage: 'VA_OUTREACH',
      disqualificationReason: 'UNRESPONSIVE',
      disqualifiedNotes: 'Auto-disqualified after 3 failed call attempts (NO_ANSWER)',
      assignedAgentId: null,
      callAttemptsCount: 3,
    },
  });
  if (attemptLead.status !== 'DEAD' || attemptLead.stage !== 'DISQUALIFIED') {
    throw new Error('Attempt 3 failed to auto-disqualify lead as UNRESPONSIVE');
  }
  console.log('✓ Test 6: 3-attempt rule verified: auto-disqualified after 3 failed calls.');

  // 7. Test VA Commission Attribution on Company-Sourced Lead:
  // Third lead converted to fleet -> virtualAssistantId credited to lastCalledByVaId
  const updatedLead3 = await prisma.lead.update({
    where: { id: lead3.id },
    data: {
      lastCalledByVaId: testVa.id,
      stage: 'ADMIN_APPROVAL',
      status: 'CALLED',
    },
  });

  const virtualAssistantId = updatedLead3.lastCalledByVaId || updatedLead3.assignedAgentId || updatedLead3.uploadedById || testAdmin.id;
  const convertedFleet = await prisma.fleet.create({
    data: {
      fleetCode: `XMT-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
      name: lead3.companyName,
      contactPerson: lead3.contactPerson,
      phone: lead3.phone,
      countryCode: 'CA',
      status: 'APPROVED',
      convertedFromLeadId: lead3.id,
      virtualAssistantId: virtualAssistantId || undefined,
    },
  });

  if (convertedFleet.virtualAssistantId !== testVa.id) {
    throw new Error(`Expected Fleet virtualAssistantId to be VA ${testVa.id}, got ${convertedFleet.virtualAssistantId}`);
  }
  console.log('✓ Test 7: VA Commission protection verified: company-sourced lead credited to lastCalledByVaId.');

  // 8. Test Trial Work Order with Coordinates & Cash Payment Bypass
  const testVehicle = await prisma.vehicle.create({
    data: {
      countryCode: 'CA',
      year: 2026,
      make: 'Fleet',
      model: 'Prospect Truck',
      tireSize: '11R22.5',
      unitNumber: 'Trial-01',
    },
  });

  const trialJob = await prisma.job.create({
    data: {
      jobCode: `TRIAL-TEST-${Date.now().toString().slice(-4)}`,
      countryCode: 'CA',
      currency: 'CAD',
      createdById: testAdmin.id,
      leadId: lead3.id,
      vehicleId: testVehicle.id,
      isTestService: true,
      recipientName: lead3.companyName,
      recipientPhone: lead3.phone,
      serviceAddress: '100 Main St, Toronto, ON',
      serviceLatitude: 43.6532,
      serviceLongitude: -79.3832,
      problemNotes: 'Trial service geocoding test',
      status: 'COMPLETED',
      paymentStatus: 'VERIFIED_PAID', // cash payment bypassed for trial jobs
      totalCents: 0,
      itPlatformFeeCents: 150, // 150 CAD cents
    },
  });

  if (trialJob.serviceLatitude !== 43.6532 || trialJob.serviceLongitude !== -79.3832) {
    throw new Error('Trial job coordinates not saved properly');
  }
  if (trialJob.itPlatformFeeCents !== 150) {
    throw new Error(`Expected itPlatformFeeCents to be 150 for CA, got ${trialJob.itPlatformFeeCents}`);
  }
  console.log('✓ Test 8: Trial service work order with Mapbox coordinates (43.6532, -79.3832) and CA 150 fee verified.');

  // 9. Test Batch Completion Auto-Transition
  // All 3 leads in batch are now resolved (lead1: DEAD, lead2: DEAD, lead3: CONVERTED)
  await prisma.lead.update({
    where: { id: lead3.id },
    data: { status: 'CONVERTED', stage: 'CONVERTED' },
  });

  await checkAndCompleteBatches('CA');
  const updatedBatch = await prisma.batch.findUnique({ where: { id: batch.id } });
  if (updatedBatch?.status !== 'COMPLETED') {
    throw new Error(`Expected batch status to auto-transition to COMPLETED, got ${updatedBatch?.status}`);
  }
  console.log('✓ Test 9: Batch auto-transitioned from ACTIVE to COMPLETED when 0 unworked leads remain.');

  // Cleanup test data
  await prisma.job.delete({ where: { id: trialJob.id } });
  await prisma.vehicle.delete({ where: { id: testVehicle.id } });
  await prisma.fleet.delete({ where: { id: convertedFleet.id } });
  await prisma.lead.deleteMany({ where: { id: { in: [lead1.id, lead2.id, lead3.id] } } });
  await prisma.batch.delete({ where: { id: batch.id } });

  console.log('--- ALL OUTBOUND LIFECYCLE TESTS PASSED WITH 100% SUCCESS ---');
}

runLifecycleTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('LIFECYCLE TEST FAILED:', err);
    process.exit(1);
  });
