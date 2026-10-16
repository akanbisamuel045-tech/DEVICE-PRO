/**
 * DEVICE PRO — Stage 16 Automated Test Suite:
 * Delivery Tracking, Certified Commissioning & After-Sales Operations Workflows
 * 
 * Verifies:
 * 1. Privacy-Safe Order Tracking Gate (rejection of unauthenticated / mismatched lookups)
 * 2. 6-Stage Fulfillment Lifecycle Stepper & Milestone Generation
 * 3. Administrative Fulfillment & Courier Waybill Dispatch
 * 4. Certified COREN Commissioning & NEMSA Electrical Safety Sign-offs
 * 5. Digital Tier-1 Equipment Warranty Verification & Serial Registry
 * 6. After-Sales Support Ticketing, SLA Guarantees & Rapid Swap Management
 * 7. End-to-End Tracking Update Propagation
 */

const assert = require('assert');
const {
  db,
  createOrder,
  getOrderByNumber,
  createWarrantyRecord,
  createSupportTicket,
  verifyUserLogin,
  createSession
} = require('../db/database');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('========================================================================');
  console.log('DEVICE PRO — STAGE 16: DELIVERY, INSTALLATION & SUPPORT TEST SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  // HTTP Helper
  async function request(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const res = await fetch(url, {
      ...options,
      headers
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }

    return { status: res.status, headers: res.headers, data };
  }

  // Obtain staff auth token for admin tests
  let adminToken = null;
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'admin',
      password: 'Admin@DevicePro2026!'
    })
  });
  if (loginRes.data && loginRes.data.token) {
    adminToken = loginRes.data.token;
  } else {
    const adminUser = verifyUserLogin('admin', 'Admin@DevicePro2026!');
    if (adminUser) {
      const session = createSession(adminUser.id);
      adminToken = session.token;
    }
  }

  const adminHeaders = {
    'Authorization': `Bearer ${adminToken}`
  };

  // Helper to create a test order
  const timestamp = Date.now();
  const testOrderNumber = `DP-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
  const testOrder = createOrder({
    orderNumber: testOrderNumber,
    customerName: 'Engr. Nnamdi Okonjo',
    customerEmail: `nnamdi.okonjo.${timestamp}@example.ng`,
    customerPhone: '+234 802 333 4455',
    deliveryAddress: 'Plot 12, Admiralty Way, Lekki Phase 1',
    deliveryState: 'Lagos',
    paymentMethod: 'paystack',
    paymentStatus: 'verified',
    orderStatus: 'processing',
    subtotalNgn: 4500000,
    deliveryFeeNgn: 35000,
    totalNgn: 4535000,
    items: [
      {
        id: 1,
        slug: 'jinko-550w-tiger-neo-solar-panel',
        name: 'Jinko Solar 550W Tiger Neo N-Type Bifacial Panel',
        price: 95000,
        quantity: 12,
        subtotal: 1140000
      },
      {
        id: 2,
        slug: 'deye-8kw-hybrid-inverter',
        name: 'Deye 8kW Hybrid Inverter Sun-8K-SG01LP1-EU',
        price: 2450000,
        quantity: 1,
        subtotal: 2450000
      }
    ],
    adminNotes: 'Initial Stage 16 test order placement'
  });

  // =========================================================================
  // TEST GROUP 1: PRIVACY-SAFE ORDER TRACKING GATE
  // =========================================================================
  console.log('--- GROUP 1: PRIVACY-SAFE TRACKING GATE ---');

  await test('Tracking lookup rejects request when contact or orderNumber is missing', async () => {
    const res1 = await request('/api/orders/track', {
      method: 'POST',
      body: JSON.stringify({ orderNumber: testOrderNumber })
    });
    assert.strictEqual(res1.status, 400);
    assert.strictEqual(res1.data.success, false);

    const res2 = await request('/api/orders/track', {
      method: 'POST',
      body: JSON.stringify({ contact: '+234 802 333 4455' })
    });
    assert.strictEqual(res2.status, 400);
    assert.strictEqual(res2.data.success, false);
  });

  await test('Tracking lookup rejects request with incorrect phone or email (Privacy Gate)', async () => {
    const res = await request('/api/orders/track', {
      method: 'POST',
      body: JSON.stringify({
        orderNumber: testOrderNumber,
        contact: '+234 809 999 0000' // wrong number
      })
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.data.success, false);
    assert.strictEqual(res.data.verified, false);
    assert.match(res.data.error, /Verification failed/);
  });

  await test('Tracking lookup succeeds with matching phone number (POST /api/orders/track)', async () => {
    const res = await request('/api/orders/track', {
      method: 'POST',
      body: JSON.stringify({
        orderNumber: testOrderNumber,
        contact: '08023334455' // Nigerian local phone format matching +234 802 333 4455
      })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.orderNumber, testOrderNumber);
    assert.strictEqual(res.data.customerName, 'Engr. Nnamdi Okonjo');
    assert.ok(Array.isArray(res.data.stages));
  });

  await test('Tracking lookup succeeds with matching email address (GET /api/orders/:orderNumber/track)', async () => {
    const res = await request(`/api/orders/${testOrderNumber}/track?contact=${encodeURIComponent(testOrder.customer_email.toUpperCase())}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.orderNumber, testOrderNumber);
    assert.strictEqual(res.data.destinationState, 'Lagos');
  });

  // =========================================================================
  // TEST GROUP 2: 6-STAGE FULFILLMENT LIFECYCLE STEPPER
  // =========================================================================
  console.log('\n--- GROUP 2: 6-STAGE FULFILLMENT LIFECYCLE STEPPER ---');

  await test('Tracking response includes exactly 6 verified engineering milestones', async () => {
    const res = await request('/api/orders/track', {
      method: 'POST',
      body: JSON.stringify({
        orderNumber: testOrderNumber,
        contact: '08023334455'
      })
    });
    assert.strictEqual(res.status, 200);
    const stages = res.data.stages;
    assert.strictEqual(stages.length, 6);

    const keys = stages.map(s => s.key);
    assert.deepStrictEqual(keys, [
      'order_placed',
      'payment_verified',
      'bench_qc',
      'logistics_transit',
      'certified_commissioning',
      'warranty_handover'
    ]);

    // Check Stage 1 & 2 are completed since order is paid & processing
    assert.strictEqual(stages[0].status, 'completed');
    assert.strictEqual(stages[1].status, 'completed');
    assert.strictEqual(stages[2].status, 'current'); // processing
  });

  await test('Milestone details include battery cell balancing, frequency calibration, and warranty terms', async () => {
    const res = await request('/api/orders/track', {
      method: 'POST',
      body: JSON.stringify({
        orderNumber: testOrderNumber,
        contact: '08023334455'
      })
    });
    const qcStage = res.data.stages.find(s => s.key === 'bench_qc');
    assert.ok(qcStage);
    assert.match(qcStage.details, /50Hz/i);
    assert.match(qcStage.details, /LiFePO4/i);

    const warrantyStage = res.data.stages.find(s => s.key === 'warranty_handover');
    assert.ok(warrantyStage);
    assert.match(warrantyStage.details, /25-yr/i);
    assert.match(warrantyStage.details, /10-yr/i);
  });

  // =========================================================================
  // TEST GROUP 3: ADMINISTRATIVE FULFILLMENT & LOGISTICS MANAGEMENT
  // =========================================================================
  console.log('\n--- GROUP 3: ADMINISTRATIVE FULFILLMENT & LOGISTICS ---');

  await test('Admin can update order logistics, courier partner, waybill, and ETA', async () => {
    const waybillNumber = `WAYBILL-GIG-${timestamp}`;
    const eta = '2026-10-20';

    const res = await request(`/api/admin/orders/${testOrder.id}/fulfillment`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        courierPartner: 'GIG Logistics Super Cargo',
        waybillNumber,
        estimatedDelivery: eta,
        orderStatus: 'dispatched',
        notes: 'Dispatched via heavy goods truck with hydraulic liftgate.'
      })
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.order.waybill_number, waybillNumber);
    assert.strictEqual(res.data.order.courier_partner, 'GIG Logistics Super Cargo');
    assert.strictEqual(res.data.order.order_status, 'dispatched');

    // Verify public tracking reflects dispatch updates
    const trackRes = await request('/api/orders/track', {
      method: 'POST',
      body: JSON.stringify({
        orderNumber: testOrderNumber,
        contact: '08023334455'
      })
    });

    assert.strictEqual(trackRes.data.orderStatus, 'dispatched');
    assert.strictEqual(trackRes.data.logistics.waybillNumber, waybillNumber);
    assert.strictEqual(trackRes.data.logistics.courierPartner, 'GIG Logistics Super Cargo');
    assert.strictEqual(trackRes.data.logistics.estimatedDelivery, eta);

    // Logistics stage is now current or completed
    const transitStage = trackRes.data.stages.find(s => s.key === 'logistics_transit');
    assert.strictEqual(transitStage.status, 'current');
  });

  // =========================================================================
  // TEST GROUP 4: CERTIFIED COREN COMMISSIONING & SAFETY TESTS
  // =========================================================================
  console.log('\n--- GROUP 4: COMMISSIONING & NEMSA ELECTRICAL SAFETY TESTS ---');

  await test('Admin can record COREN lead engineer assignment and electrical safety checklist', async () => {
    const certId = `DP-CERT-LEKKI-${timestamp}`;
    const installDate = '2026-10-22';

    const res = await request(`/api/admin/orders/${testOrder.id}/commissioning`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        assignedEngineer: 'Engr. Babatunde Adeleke (COREN #48291)',
        engineerPhone: '+234 803 111 2233',
        installationScheduledDate: installDate,
        commissioningStatus: 'commissioned',
        commissioningCertificateId: certId,
        commissioningDate: new Date().toISOString(),
        commissioningTests: {
          earthingResistancePassed: true,
          dcSurgeProtectionVerified: true,
          inverterSyncVerified: true,
          cellBalancingVerified: true
        },
        notes: 'Earth rod resistance measured at 3.2 Ohms (NEMSA compliant < 5.0 Ohms). System energized.'
      })
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.order.commissioning_status, 'commissioned');
    assert.strictEqual(res.data.order.assigned_engineer, 'Engr. Babatunde Adeleke (COREN #48291)');
    assert.strictEqual(res.data.order.commissioning_certificate_id, certId);

    // Verify public tracking reflects commissioning sign-off
    const trackRes = await request('/api/orders/track', {
      method: 'POST',
      body: JSON.stringify({
        orderNumber: testOrderNumber,
        contact: '08023334455'
      })
    });

    assert.strictEqual(trackRes.data.commissioning.status, 'commissioned');
    assert.strictEqual(trackRes.data.commissioning.assignedEngineer, 'Engr. Babatunde Adeleke (COREN #48291)');
    assert.strictEqual(trackRes.data.commissioning.tests.earthingResistancePassed, true);
    assert.strictEqual(trackRes.data.commissioning.certificateId, certId);

    // Handover milestone is completed
    const commStage = trackRes.data.stages.find(s => s.key === 'certified_commissioning');
    assert.strictEqual(commStage.status, 'completed');
  });

  // =========================================================================
  // TEST GROUP 5: DIGITAL EQUIPMENT WARRANTY VERIFICATION
  // =========================================================================
  console.log('\n--- GROUP 5: DIGITAL WARRANTY VERIFICATION & SERIAL REGISTRY ---');

  const testSerial = `DP-SN-TEST-BATT-${timestamp}`;
  const testWarrantyCode = `DP-WAR-TEST-${timestamp}`;

  await test('Create digital warranty record and verify lookup by serial number', async () => {
    // 1. Staff creates warranty record
    const createRes = await request('/api/admin/warranties', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        warrantyCode: testWarrantyCode,
        orderId: testOrder.id,
        orderNumber: testOrderNumber,
        serialNumber: testSerial,
        productName: 'Felicity Solar 15kWh LiFePO4 Battery LPBA48300',
        brand: 'Felicity Solar Tier-1',
        category: 'batteries',
        customerName: 'Engr. Nnamdi Okonjo',
        customerPhone: '+234 802 333 4455',
        customerEmail: testOrder.customer_email,
        warrantyDurationMonths: 120, // 10 Years
        status: 'active'
      })
    });

    assert.strictEqual(createRes.status, 201);
    assert.strictEqual(createRes.data.success, true);
    assert.strictEqual(createRes.data.warranty.serial_number, testSerial);

    // 2. Public lookup by Serial Number
    const verifyRes = await request(`/api/warranty/verify/${testSerial}`);
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.data.success, true);
    assert.strictEqual(verifyRes.data.verified, true);
    assert.strictEqual(verifyRes.data.record.serialNumber, testSerial);
    assert.strictEqual(verifyRes.data.record.warrantyCode, testWarrantyCode);
    assert.strictEqual(verifyRes.data.record.durationYears, 10);
    assert.strictEqual(verifyRes.data.record.isExpired, false);
    assert.match(verifyRes.data.record.serviceHub, /Victoria Island, Lagos/);
  });

  await test('Digital warranty lookup by warranty code succeeds', async () => {
    const verifyRes = await request(`/api/warranty/verify/${testWarrantyCode}`);
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.data.verified, true);
    assert.strictEqual(verifyRes.data.record.customerName, 'Engr. Nnamdi Okonjo');
  });

  await test('Digital warranty lookup rejects invalid or unauthenticated serial numbers', async () => {
    const verifyRes = await request('/api/warranty/verify/UNKNOWN-SERIAL-12345');
    assert.strictEqual(verifyRes.status, 404);
    assert.strictEqual(verifyRes.data.verified, false);
    assert.match(verifyRes.data.error, /No registered warranty record found/);
  });

  // =========================================================================
  // TEST GROUP 6: AFTER-SALES SUPPORT TICKETING & SLA GUARANTEES
  // =========================================================================
  console.log('\n--- GROUP 6: AFTER-SALES SUPPORT & RAPID SWAP TICKETS ---');

  let testTicketNumber = null;
  let testTicketId = null;

  await test('Public customer can submit warranty claim ticket with SLA guarantee', async () => {
    const res = await request('/api/support/tickets', {
      method: 'POST',
      body: JSON.stringify({
        orderNumber: testOrderNumber,
        customerName: 'Engr. Nnamdi Okonjo',
        customerPhone: '+234 802 333 4455',
        customerEmail: testOrder.customer_email,
        issueCategory: 'warranty',
        priority: 'high',
        subject: 'Inverter Error Code F24 (Auxiliary Fan Alert)',
        description: 'Deye hybrid inverter display reported fan warning during peak solar generation. Requesting rapid swap unit.'
      })
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.ticketNumber.startsWith('DP-SPT-'));
    assert.match(res.data.slaNotice, /24-48 hours/);
    assert.match(res.data.slaNotice, /Rapid swap/);

    testTicketNumber = res.data.ticketNumber;
    testTicketId = res.data.ticket.id;
  });

  await test('Support ticket status lookup enforces privacy contact matching', async () => {
    // Missing contact
    const res1 = await request(`/api/support/tickets/${testTicketNumber}`);
    assert.strictEqual(res1.status, 403);

    // Wrong contact
    const res2 = await request(`/api/support/tickets/${testTicketNumber}?contact=08099990000`);
    assert.strictEqual(res2.status, 403);

    // Matching contact
    const res3 = await request(`/api/support/tickets/${testTicketNumber}?contact=08023334455`);
    assert.strictEqual(res3.status, 200);
    assert.strictEqual(res3.data.success, true);
    assert.strictEqual(res3.data.ticket.ticketNumber, testTicketNumber);
    assert.strictEqual(res3.data.ticket.issueCategory, 'warranty');
    assert.strictEqual(res3.data.ticket.status, 'open');
  });

  await test('Staff can assign technician, update ticket status, and record resolution notes', async () => {
    const res = await request(`/api/admin/support/tickets/${testTicketId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        status: 'resolved',
        priority: 'high',
        assignedEngineer: 'Engr. Babatunde Adeleke (COREN #48291)',
        resolutionNotes: 'Dispatched service technician with replacement high-RPM auxiliary fan module. Replaced on-site within 4 hours; inverter bench-tested under 6.5kW load.'
      })
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.ticket.status, 'resolved');
    assert.strictEqual(res.data.ticket.assigned_engineer, 'Engr. Babatunde Adeleke (COREN #48291)');
    assert.ok(res.data.ticket.resolved_at);

    // Verify public query now reflects resolved state
    const pubRes = await request(`/api/support/tickets/${testTicketNumber}?contact=08023334455`);
    assert.strictEqual(pubRes.data.ticket.status, 'resolved');
    assert.match(pubRes.data.ticket.resolutionNotes, /auxiliary fan module/);
  });

  console.log('\n========================================================================');
  console.log(`STAGE 16 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
