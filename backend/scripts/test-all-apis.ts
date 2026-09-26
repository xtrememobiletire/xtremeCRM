/**
 * Comprehensive API Test Suite
 * Tests every GET, POST, and PATCH endpoint across all modules.
 * Validates status codes, response data structures, data integrity, and multi-tenancy.
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

interface TestResult {
  category: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  endpoint: string;
  passed: boolean;
  statusCode: number;
  message?: string;
  dataSnippet?: string;
}

const results: TestResult[] = [];

function record(
  category: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  endpoint: string,
  passed: boolean,
  statusCode: number,
  message?: string,
  dataSnippet?: any
) {
  const snippet = dataSnippet ? JSON.stringify(dataSnippet).slice(0, 120) : undefined;
  results.push({ category, method, endpoint, passed, statusCode, message, dataSnippet: snippet });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${method}] ${endpoint} (${statusCode}) - ${passed ? 'OK' : message || 'FAIL'}`);
}

async function request(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  token?: string,
  body?: any,
  headers: Record<string, string> = {}
) {
  const reqHeaders: Record<string, string> = {
    ...headers,
  };
  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }
  if (body) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return { status: res.status, ok: res.ok, json };
}

async function run() {
  console.log('===========================================================');
  console.log('🚀 STARTING COMPREHENSIVE API TEST SUITE: GET, POST, PATCH');
  console.log(`📡 Target Base URL: ${BASE_URL}`);
  console.log('===========================================================\n');

  // Shared state across sequential tests
  let adminToken = '';
  let accountantToken = '';
  let driverToken = '';
  let createdUserId = '';
  let createdCustomerId = '';
  let createdFleetId = '';
  let createdVehicleId = '';
  let createdJobId = '';
  let createdInvoiceId = '';
  let createdLeadId = '';
  let createdPortalMsgId = '';
  let createdCashLedgerId = '';
  let driverId = '';

  // -------------------------------------------------------------
  // 1. HEALTH & SYSTEM (GET)
  // -------------------------------------------------------------
  console.log('\n--- 1. SYSTEM & HEALTH ENDPOINTS ---');
  {
    const r = await request('GET', '/health');
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.database?.includes('connected');
    record('System', 'GET', '/health', valid, r.status, undefined, r.json?.data);
  }
  {
    const r = await request('GET', '/hello');
    const valid = r.status === 200 && r.json?.success === true;
    record('System', 'GET', '/hello', valid, r.status, undefined, r.json);
  }
  {
    const r = await request('GET', '/docs/json');
    const valid = r.status === 200 && !!r.json?.openapi;
    record('System', 'GET', '/docs/json', valid, r.status, undefined, { openapi: r.json?.openapi, info: r.json?.info?.title });
  }

  // -------------------------------------------------------------
  // 2. AUTHENTICATION (POST & GET)
  // -------------------------------------------------------------
  console.log('\n--- 2. AUTHENTICATION ENDPOINTS ---');
  {
    // Login Admin
    const r = await request('POST', '/auth/login', undefined, {
      email: 'admin@xtremecrm.com',
      password: 'AdminPassword123!',
    });
    adminToken = r.json?.data?.token;
    const valid = r.status === 200 && r.json?.success === true && !!adminToken && r.json?.data?.user?.role === 'ADMIN';
    record('Auth', 'POST', '/auth/login (Admin)', valid, r.status, undefined, { user: r.json?.data?.user?.email, role: r.json?.data?.user?.role });
  }
  {
    // Login Accountant
    const r = await request('POST', '/auth/login', undefined, {
      email: 'accountant@xtremecrm.com',
      password: 'AdminPassword123!',
    });
    accountantToken = r.json?.data?.token;
    const valid = r.status === 200 && r.json?.success === true && !!accountantToken && r.json?.data?.user?.role === 'ACCOUNTANT';
    record('Auth', 'POST', '/auth/login (Accountant)', valid, r.status, undefined, { role: r.json?.data?.user?.role });
  }
  {
    // Login Driver
    const r = await request('POST', '/auth/login', undefined, {
      email: 'driver@xtremecrm.com',
      password: 'AdminPassword123!',
    });
    driverToken = r.json?.data?.token;
    driverId = r.json?.data?.user?.id;
    const valid = r.status === 200 && r.json?.success === true && !!driverToken && r.json?.data?.user?.role === 'DRIVER';
    record('Auth', 'POST', '/auth/login (Driver)', valid, r.status, undefined, { id: driverId, role: r.json?.data?.user?.role });
  }
  {
    // GET /auth/me
    const r = await request('GET', '/auth/me', adminToken);
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.email === 'admin@xtremecrm.com';
    record('Auth', 'GET', '/auth/me', valid, r.status, undefined, r.json?.data);
  }
  {
    // POST /auth/register
    const uniqueEmail = `testuser_${Date.now()}@xtremetest.com`;
    const r = await request('POST', '/auth/register', undefined, {
      email: uniqueEmail,
      password: 'Password123!',
      fullName: 'API Registered User',
      phone: '+14165559876',
      countryCode: 'CA',
      role: 'CALL_AGENT',
    });
    const valid = (r.status === 200 || r.status === 201) && r.json?.success === true && !!r.json?.data?.token;
    record('Auth', 'POST', '/auth/register', valid, r.status, undefined, { email: r.json?.data?.user?.email });
  }
  {
    // POST /auth/logout
    const r = await request('POST', '/auth/logout', adminToken);
    const valid = r.status === 200 && r.json?.success === true;
    record('Auth', 'POST', '/auth/logout', valid, r.status, undefined, r.json);
  }

  // -------------------------------------------------------------
  // 3. USERS MANAGEMENT (GET, POST, PATCH)
  // -------------------------------------------------------------
  console.log('\n--- 3. USERS ENDPOINTS ---');
  {
    // GET /users
    const r = await request('GET', '/users', adminToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Users', 'GET', '/users', valid, r.status, undefined, { count: r.json?.data?.length, pagination: r.json?.pagination });
  }
  {
    // POST /users (Admin creates a staff user)
    const testEmail = `staff_${Date.now()}@xtremecrm.com`;
    const r = await request('POST', '/users', adminToken, {
      email: testEmail,
      password: 'StrongStaffPassword123!',
      fullName: 'API Created Dispatcher',
      role: 'DISPATCHER',
      countryCode: 'CA',
      phone: '+14165551122',
      isAgentActive: false,
    });
    createdUserId = r.json?.data?.id;
    const valid = (r.status === 200 || r.status === 201) && r.json?.success === true && !!createdUserId;
    record('Users', 'POST', '/users', valid, r.status, undefined, { id: createdUserId, email: r.json?.data?.email });
  }
  if (createdUserId) {
    // GET /users/:id
    const r = await request('GET', `/users/${createdUserId}`, adminToken);
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.id === createdUserId;
    record('Users', 'GET', `/users/:id`, valid, r.status, undefined, { fullName: r.json?.data?.fullName, role: r.json?.data?.role });
  }
  if (createdUserId) {
    // PATCH /users/:id (update name and role)
    const r = await request('PATCH', `/users/${createdUserId}`, adminToken, {
      fullName: 'API Updated Senior Dispatcher',
      phone: '+14165559900',
    });
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.fullName === 'API Updated Senior Dispatcher';
    record('Users', 'PATCH', `/users/:id`, valid, r.status, undefined, { updatedName: r.json?.data?.fullName });
  }
  if (createdUserId) {
    // PATCH /users/:id/active (toggle active status)
    const r = await request('PATCH', `/users/${createdUserId}/active`, adminToken);
    const valid = r.status === 200 && r.json?.success === true;
    record('Users', 'PATCH', `/users/:id/active`, valid, r.status, undefined, { isAgentActive: r.json?.data?.isAgentActive });
  }
  {
    // PATCH /users/me/active (toggle self active status)
    const r = await request('PATCH', `/users/me/active`, adminToken);
    const valid = r.status === 200 && r.json?.success === true;
    record('Users', 'PATCH', `/users/me/active`, valid, r.status, undefined, { isAgentActive: r.json?.data?.isAgentActive });
  }

  // -------------------------------------------------------------
  // 4. CUSTOMERS (GET, POST, PATCH)
  // -------------------------------------------------------------
  console.log('\n--- 4. CUSTOMERS ENDPOINTS ---');
  {
    // GET /customers
    const r = await request('GET', '/customers', adminToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Customers', 'GET', '/customers', valid, r.status, undefined, { count: r.json?.data?.length, pagination: r.json?.pagination });
  }
  {
    // POST /customers
    const uniquePhone = `+1416${Math.floor(1000000 + Math.random() * 9000000)}`;
    const r = await request('POST', '/customers', adminToken, {
      fullName: 'John API Tester',
      phone: uniquePhone,
      email: `customer_${Date.now()}@test.com`,
      countryCode: 'CA',
      customerType: 'RETAIL',
      notes: 'Automated test customer',
    });
    createdCustomerId = r.json?.data?.id;
    const valid = (r.status === 200 || r.status === 201) && r.json?.success === true && !!createdCustomerId;
    record('Customers', 'POST', '/customers', valid, r.status, undefined, { id: createdCustomerId, phone: uniquePhone });
  }
  if (createdCustomerId) {
    // GET /customers/:id
    const r = await request('GET', `/customers/${createdCustomerId}`, adminToken);
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.id === createdCustomerId;
    record('Customers', 'GET', `/customers/:id`, valid, r.status, undefined, { fullName: r.json?.data?.fullName, phone: r.json?.data?.phone });
  }
  if (createdCustomerId) {
    // PATCH /customers/:id
    const r = await request('PATCH', `/customers/${createdCustomerId}`, adminToken, {
      fullName: 'John API Tester (Gold Member)',
      membershipTier: 'GOLD',
    });
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.membershipTier === 'GOLD';
    record('Customers', 'PATCH', `/customers/:id`, valid, r.status, undefined, { tier: r.json?.data?.membershipTier });
  }
  {
    // GET /customers/lookup
    const r = await request('GET', '/customers/lookup?phone=416555', adminToken);
    const valid = r.status === 200 && r.json?.success === true;
    record('Customers', 'GET', '/customers/lookup', valid, r.status, undefined, { found: !!r.json?.data?.customer || !!r.json?.data?.fleet });
  }
  {
    // GET /customers/search
    const r = await request('GET', '/customers/search?query=John', adminToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Customers', 'GET', '/customers/search', valid, r.status, undefined, { matches: r.json?.data?.length });
  }

  // -------------------------------------------------------------
  // 5. FLEETS (GET, POST, PATCH)
  // -------------------------------------------------------------
  console.log('\n--- 5. FLEETS ENDPOINTS ---');
  {
    // GET /fleets
    const r = await request('GET', '/fleets', adminToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Fleets', 'GET', '/fleets', valid, r.status, undefined, { count: r.json?.data?.length });
  }
  {
    // POST /fleets
    const code = `FLT-${Math.floor(1000 + Math.random() * 9000)}`;
    const r = await request('POST', '/fleets', adminToken, {
      companyName: 'Apex Logistics Express',
      fleetCode: code,
      contactPerson: 'Apex Dispatcher',
      phone: '+14165554433',
      email: `apex_${Date.now()}@logistics.com`,
      address: '7000 Airport Rd, Mississauga, ON',
      countryCode: 'CA',
      status: 'APPROVED',
      paymentTerms: 'NET30',
      creditLimitCents: 500000,
    });
    createdFleetId = r.json?.data?.id;
    const valid = (r.status === 200 || r.status === 201) && r.json?.success === true && !!createdFleetId;
    record('Fleets', 'POST', '/fleets', valid, r.status, undefined, { id: createdFleetId, code: r.json?.data?.fleetCode });
  }
  if (createdFleetId) {
    // GET /fleets/:id
    const r = await request('GET', `/fleets/${createdFleetId}`, adminToken);
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.id === createdFleetId;
    record('Fleets', 'GET', `/fleets/:id`, valid, r.status, undefined, { name: r.json?.data?.name, code: r.json?.data?.fleetCode });
  }
  if (createdFleetId) {
    // PATCH /fleets/:id
    const r = await request('PATCH', `/fleets/${createdFleetId}`, adminToken, {
      contactPerson: 'Apex Senior Manager',
      status: 'APPROVED',
    });
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.contactPerson === 'Apex Senior Manager';
    record('Fleets', 'PATCH', `/fleets/:id`, valid, r.status, undefined, { contactPerson: r.json?.data?.contactPerson });
  }
  {
    // GET /fleets/lookup
    const r = await request('GET', '/fleets/lookup?query=Apex', adminToken);
    const valid = r.status === 200 && r.json?.success === true;
    record('Fleets', 'GET', '/fleets/lookup', valid, r.status, undefined, { found: !!r.json?.data?.fleet });
  }
  if (createdFleetId) {
    // POST /fleets/:id/drivers
    const r = await request('POST', `/fleets/${createdFleetId}/drivers`, adminToken, {
      fullName: 'Fleet Driver Tom',
      phone: '+14165558899',
      licensePlate: 'TRK-9901',
    });
    const valid = (r.status === 200 || r.status === 201) && r.json?.success === true;
    record('Fleets', 'POST', `/fleets/:id/drivers`, valid, r.status, undefined, r.json?.data);
  }
  if (createdFleetId) {
    // GET /fleets/:id/drivers
    const r = await request('GET', `/fleets/${createdFleetId}/drivers`, adminToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Fleets', 'GET', `/fleets/:id/drivers`, valid, r.status, undefined, { drivers: r.json?.data?.length });
  }

  // -------------------------------------------------------------
  // 6. VEHICLES (GET, POST, PATCH)
  // -------------------------------------------------------------
  console.log('\n--- 6. VEHICLES ENDPOINTS ---');
  {
    // GET /vehicles
    const r = await request('GET', '/vehicles', adminToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Vehicles', 'GET', '/vehicles', valid, r.status, undefined, { count: r.json?.data?.length });
  }
  {
    // POST /vehicles
    const plate = `TST-${Math.floor(100 + Math.random() * 900)}`;
    const r = await request('POST', '/vehicles', adminToken, {
      customerId: createdCustomerId || undefined,
      fleetId: createdFleetId || undefined,
      make: 'Ford',
      model: 'F-550 Super Duty',
      year: 2023,
      licensePlate: plate,
      tireSize: '225/70R19.5',
      countryCode: 'CA',
    });
    createdVehicleId = r.json?.data?.id;
    const valid = (r.status === 200 || r.status === 201) && r.json?.success === true && !!createdVehicleId;
    record('Vehicles', 'POST', '/vehicles', valid, r.status, undefined, { id: createdVehicleId, plate });
  }
  if (createdVehicleId) {
    // GET /vehicles/:id
    const r = await request('GET', `/vehicles/${createdVehicleId}`, adminToken);
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.id === createdVehicleId;
    record('Vehicles', 'GET', `/vehicles/:id`, valid, r.status, undefined, { vehicle: `${r.json?.data?.year} ${r.json?.data?.make} ${r.json?.data?.model}` });
  }
  if (createdVehicleId) {
    // PATCH /vehicles/:id
    const r = await request('PATCH', `/vehicles/${createdVehicleId}`, adminToken, {
      tireSize: '245/70R19.5',
      vin: '1FT8W4DT4PE123456',
    });
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.tireSize === '245/70R19.5';
    record('Vehicles', 'PATCH', `/vehicles/:id`, valid, r.status, undefined, { updatedTireSize: r.json?.data?.tireSize });
  }

  // -------------------------------------------------------------
  // 7. JOBS (GET, POST, PATCH)
  // -------------------------------------------------------------
  console.log('\n--- 7. JOBS ENDPOINTS ---');
  {
    // POST /jobs/public-booking (Unauthenticated self booking)
    const r = await request('POST', '/jobs/public-booking', undefined, {
      recipientName: 'Public Self Booker',
      recipientPhone: '+14165553311',
      serviceAddress: '100 Queen St W, Toronto, ON M5H 2N2',
      countryCode: 'CA',
      services: ['Roadside Tire Replacement'],
      serviceItems: [
        {
          serviceName: 'Roadside Tire Replacement',
          category: 'TIRE_SERVICE',
          unitPriceCents: 22000,
          quantity: 1,
        },
      ],
      totalCents: 22000,
      currency: 'CAD',
      paymentMethod: 'CASH',
    });
    const valid = (r.status === 200 || r.status === 201) && r.json?.success === true && !!r.json?.data?.id;
    record('Jobs', 'POST', '/jobs/public-booking', valid, r.status, undefined, { jobCode: r.json?.data?.jobCode, status: r.json?.data?.status });
  }
  {
    // POST /jobs (Authenticated staff job creation)
    const r = await request('POST', '/jobs', adminToken, {
      customerId: createdCustomerId,
      vehicleId: createdVehicleId,
      fleetId: createdFleetId,
      serviceAddress: 'Highway 401 East & Dixie Rd, Mississauga, ON',
      recipientName: 'Fleet Truck Driver',
      recipientPhone: '+14165557766',
      urgency: 'URGENT',
      countryCode: 'CA',
      currency: 'CAD',
      serviceItems: [
        {
          serviceName: 'Commercial Blowout Replacement',
          category: 'TIRE_SERVICE',
          unitPriceCents: 35000,
          quantity: 1,
        },
        {
          serviceName: 'Emergency Roadside Dispatch',
          category: 'ROADSIDE_ASSISTANCE',
          unitPriceCents: 15000,
          quantity: 1,
        },
      ],
      quotedPriceCents: 50000,
      subtotalCents: 50000,
      taxCents: 6500,
      totalCents: 56500,
      paymentMethod: 'CASH',
    });
    createdJobId = r.json?.data?.id;
    const valid = (r.status === 200 || r.status === 201) && r.json?.success === true && !!createdJobId;
    record('Jobs', 'POST', '/jobs', valid, r.status, undefined, { id: createdJobId, code: r.json?.data?.jobCode, total: r.json?.data?.totalCents });
  }
  {
    // GET /jobs (All regions)
    const r = await request('GET', '/jobs?countryCode=ALL', adminToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Jobs', 'GET', '/jobs?countryCode=ALL', valid, r.status, undefined, { total: r.json?.data?.length, pagination: r.json?.pagination });
  }
  {
    // GET /jobs (CA region)
    const r = await request('GET', '/jobs?countryCode=CA', adminToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Jobs', 'GET', '/jobs?countryCode=CA', valid, r.status, undefined, { count: r.json?.data?.length });
  }
  {
    // GET /jobs (UK region)
    const r = await request('GET', '/jobs?countryCode=UK', adminToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Jobs', 'GET', '/jobs?countryCode=UK', valid, r.status, undefined, { count: r.json?.data?.length });
  }
  {
    // GET /jobs (US region)
    const r = await request('GET', '/jobs?countryCode=US', adminToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Jobs', 'GET', '/jobs?countryCode=US', valid, r.status, undefined, { count: r.json?.data?.length });
  }
  if (createdJobId) {
    // GET /jobs/:id
    const r = await request('GET', `/jobs/${createdJobId}`, adminToken);
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.id === createdJobId;
    record('Jobs', 'GET', `/jobs/:id`, valid, r.status, undefined, { code: r.json?.data?.jobCode, status: r.json?.data?.status });
  }
  if (createdJobId && driverId) {
    // PATCH /jobs/:id/assign-driver
    const r = await request('PATCH', `/jobs/${createdJobId}/assign-driver`, adminToken, {
      driverId,
    });
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.driverId === driverId;
    record('Jobs', 'PATCH', `/jobs/:id/assign-driver`, valid, r.status, undefined, { driverId, status: r.json?.data?.status });
  }
  if (createdJobId) {
    // PATCH /jobs/:id/status (advance to IN_PROGRESS)
    const r = await request('PATCH', `/jobs/${createdJobId}/status`, adminToken, {
      status: 'IN_PROGRESS',
    });
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.status === 'IN_PROGRESS';
    record('Jobs', 'PATCH', `/jobs/:id/status (IN_PROGRESS)`, valid, r.status, undefined, { status: r.json?.data?.status });
  }
  if (createdJobId) {
    // PATCH /jobs/:id/status (complete with cash collected)
    const r = await request('PATCH', `/jobs/${createdJobId}/status`, adminToken, {
      status: 'COMPLETED',
      cashCollected: 565.0,
      cashAmountCents: 56500,
    });
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.status === 'COMPLETED';
    record('Jobs', 'PATCH', `/jobs/:id/status (COMPLETED with cash)`, valid, r.status, undefined, { status: r.json?.data?.status, paymentStatus: r.json?.data?.paymentStatus });
  }
  if (createdJobId) {
    // PATCH /jobs/:id/expenses (State job expenses)
    const r = await request('PATCH', `/jobs/${createdJobId}/expenses`, adminToken, {
      materialCostCents: 18000,
      otherExpenseCents: 2000,
      expenseNotes: 'Purchased commercial tire at wholesale warehouse',
    });
    const valid = r.status === 200 && r.json?.success === true;
    record('Jobs', 'PATCH', `/jobs/:id/expenses`, valid, r.status, undefined, r.json?.data);
  }
  {
    // POST /jobs/disposition
    const r = await request('POST', '/jobs/disposition', adminToken, {
      callerPhone: '+14165551234',
      disposition: 'Price Too High',
      reason: 'Customer found cheaper roadside service',
      countryCode: 'CA',
    });
    const valid = (r.status === 200 || r.status === 201) && r.json?.success === true;
    record('Jobs', 'POST', '/jobs/disposition', valid, r.status, undefined, r.json?.data);
  }

  // -------------------------------------------------------------
  // 8. ACCOUNTING (GET, POST, PATCH)
  // -------------------------------------------------------------
  console.log('\n--- 8. ACCOUNTING ENDPOINTS ---');
  {
    // GET /accounting/summary (ALL)
    const r = await request('GET', '/accounting/summary?countryCode=ALL', accountantToken);
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.metrics !== undefined;
    record('Accounting', 'GET', '/accounting/summary?countryCode=ALL', valid, r.status, undefined, r.json?.data?.metrics);
  }
  {
    // GET /accounting/summary (CA)
    const r = await request('GET', '/accounting/summary?countryCode=CA', accountantToken);
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.countryCode === 'CA';
    record('Accounting', 'GET', '/accounting/summary?countryCode=CA', valid, r.status, undefined, { code: r.json?.data?.countryCode, gross: r.json?.data?.metrics?.grossRevenueCents });
  }
  {
    // GET /accounting/summary (UK)
    const r = await request('GET', '/accounting/summary?countryCode=UK', accountantToken);
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.countryCode === 'UK';
    record('Accounting', 'GET', '/accounting/summary?countryCode=UK', valid, r.status, undefined, { code: r.json?.data?.countryCode, gross: r.json?.data?.metrics?.grossRevenueCents });
  }
  {
    // GET /accounting/summary (US)
    const r = await request('GET', '/accounting/summary?countryCode=US', accountantToken);
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.countryCode === 'US';
    record('Accounting', 'GET', '/accounting/summary?countryCode=US', valid, r.status, undefined, { code: r.json?.data?.countryCode, gross: r.json?.data?.metrics?.grossRevenueCents });
  }
  {
    // GET /accounting/reconciliation (ALL)
    const r = await request('GET', '/accounting/reconciliation?countryCode=ALL', accountantToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Accounting', 'GET', '/accounting/reconciliation?countryCode=ALL', valid, r.status, undefined, { count: r.json?.data?.length, pagination: r.json?.pagination });
  }
  {
    // GET /accounting/jobs
    const r = await request('GET', '/accounting/jobs?countryCode=CA', accountantToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Accounting', 'GET', '/accounting/jobs', valid, r.status, undefined, { count: r.json?.data?.length });
  }
  if (createdJobId) {
    // POST /accounting/job-expenses
    const r = await request('POST', '/accounting/job-expenses', accountantToken, {
      jobId: createdJobId,
      materialCostCents: 16000,
      repairerFeeCents: 8000,
      otherExpenseCents: 1500,
      expenseNotes: 'Actual COGS verified with supplier invoice',
    });
    const valid = r.status === 200 && r.json?.success === true && (r.json?.data?.id === createdJobId || r.json?.data?.jobId === createdJobId);
    record('Accounting', 'POST', '/accounting/job-expenses', valid, r.status, undefined, {
      id: r.json?.data?.id,
      statedAt: r.json?.data?.expenseStatedAt,
    });
  }
  if (driverId) {
    // POST /accounting/cash-ledger
    const r = await request('POST', '/accounting/cash-ledger', accountantToken, {
      driverId,
      amountCents: 56500,
      type: 'JOB_COLLECTION',
      jobId: createdJobId || undefined,
      notes: 'Roadside cash collection verified',
    });
    createdCashLedgerId = r.json?.data?.id;
    const valid = (r.status === 200 || r.status === 201) && r.json?.success === true && !!createdCashLedgerId;
    record('Accounting', 'POST', '/accounting/cash-ledger', valid, r.status, undefined, { id: createdCashLedgerId, amount: r.json?.data?.amountCents });
  }
  {
    // GET /accounting/cash-ledger
    const r = await request('GET', '/accounting/cash-ledger', accountantToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Accounting', 'GET', '/accounting/cash-ledger', valid, r.status, undefined, { count: r.json?.data?.length });
  }
  if (createdCashLedgerId) {
    // PATCH /accounting/cash-ledger/:id/verify
    const r = await request('PATCH', `/accounting/cash-ledger/${createdCashLedgerId}/verify`, accountantToken);
    const valid = r.status === 200 && r.json?.success === true && !!r.json?.data?.verifiedById;
    record('Accounting', 'PATCH', `/accounting/cash-ledger/:id/verify`, valid, r.status, undefined, { verifiedById: r.json?.data?.verifiedById });
  }
  {
    // GET /accounting/developer-profit (ADMIN - should SUCCEED with 3 containers)
    const r = await request('GET', '/accounting/developer-profit', adminToken);
    const valid =
      r.status === 200 &&
      r.json?.success === true &&
      r.json?.data?.canada?.countryCode === 'CA' &&
      r.json?.data?.unitedKingdom?.countryCode === 'UK' &&
      r.json?.data?.unitedStates?.countryCode === 'US';
    record('Accounting', 'GET', '/accounting/developer-profit (Admin)', valid, r.status, undefined, {
      caProfit: r.json?.data?.canada?.formattedProfit,
      ukProfit: r.json?.data?.unitedKingdom?.formattedProfit,
      usProfit: r.json?.data?.unitedStates?.formattedProfit,
    });
  }
  {
    // GET /accounting/developer-profit (ACCOUNTANT - must FAIL with 403 Forbidden for security!)
    const r = await request('GET', '/accounting/developer-profit', accountantToken);
    const valid = r.status === 403;
    record('Accounting', 'GET', '/accounting/developer-profit (Accountant - Privacy Guard)', valid, r.status, valid ? 'Correctly forbidden (403)' : 'Failed: Non-admin accessed confidential IT profit!', r.json);
  }

  // -------------------------------------------------------------
  // 9. INVOICES (GET, POST, PATCH)
  // -------------------------------------------------------------
  console.log('\n--- 9. INVOICES ENDPOINTS ---');
  {
    // GET /invoices
    const r = await request('GET', '/invoices', adminToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Invoices', 'GET', '/invoices', valid, r.status, undefined, { count: r.json?.data?.length });
  }
  {
    // POST /invoices (manual invoice)
    const r = await request('POST', '/invoices', adminToken, {
      customerId: createdCustomerId,
      fleetId: createdFleetId,
      countryCode: 'CA',
      currency: 'CAD',
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      notes: 'B2B Monthly Fleet Invoice',
      items: [
        {
          itemDetails: 'Roadside Commercial Tire Replacement (F-550)',
          unitPriceCents: 35000,
          quantity: 2,
        },
        {
          itemDetails: 'Emergency Night Dispatch Surcharge',
          unitPriceCents: 7500,
          quantity: 1,
        },
      ],
    });
    createdInvoiceId = r.json?.data?.id;
    const valid = (r.status === 200 || r.status === 201) && r.json?.success === true && !!createdInvoiceId;
    record('Invoices', 'POST', '/invoices', valid, r.status, undefined, { id: createdInvoiceId, number: r.json?.data?.invoiceNumber, total: r.json?.data?.totalCents });
  }
  if (createdJobId) {
    // POST /invoices/generate (1-Click generate from job)
    const r = await request('POST', '/invoices/generate', adminToken, {
      jobId: createdJobId,
      notes: 'Generated from completed job',
    });
    const valid = (r.status === 200 || r.status === 201) && r.json?.success === true && !!r.json?.data?.id;
    record('Invoices', 'POST', '/invoices/generate', valid, r.status, undefined, { id: r.json?.data?.id, number: r.json?.data?.invoiceNumber });
  }
  if (createdInvoiceId) {
    // GET /invoices/:id
    const r = await request('GET', `/invoices/${createdInvoiceId}`, adminToken);
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.id === createdInvoiceId;
    record('Invoices', 'GET', `/invoices/:id`, valid, r.status, undefined, { number: r.json?.data?.invoiceNumber, total: r.json?.data?.totalCents });
  }
  if (createdInvoiceId) {
    // PATCH /invoices/:id/status
    const r = await request('PATCH', `/invoices/${createdInvoiceId}/status`, adminToken, {
      status: 'PAID',
      paymentMethod: 'E_TRANSFER',
      paidAt: new Date().toISOString(),
    });
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.status === 'PAID';
    record('Invoices', 'PATCH', `/invoices/:id/status`, valid, r.status, undefined, { status: r.json?.data?.status, paidAt: r.json?.data?.paidAt });
  }
  if (createdInvoiceId) {
    // GET /invoices/:id/pdf
    const r = await request('GET', `/invoices/${createdInvoiceId}/pdf`, adminToken);
    const valid = r.status === 200 && r.json?.success === true && !!r.json?.data?.company?.name;
    record('Invoices', 'GET', `/invoices/:id/pdf`, valid, r.status, undefined, { company: r.json?.data?.company?.name, total: r.json?.data?.summary?.grandTotal });
  }

  // -------------------------------------------------------------
  // 10. LEADS & OUTBOUND (GET, POST, PATCH)
  // -------------------------------------------------------------
  console.log('\n--- 10. LEADS ENDPOINTS ---');
  {
    // GET /leads
    const r = await request('GET', '/leads', adminToken);
    const valid = r.status === 200 && r.json?.success === true && (Array.isArray(r.json?.data) || Array.isArray(r.json?.data?.data));
    record('Leads', 'GET', '/leads', valid, r.status, undefined, { count: Array.isArray(r.json?.data) ? r.json?.data?.length : r.json?.data?.data?.length });
  }
  {
    // POST /leads
    const phone = `+1416${Math.floor(2000000 + Math.random() * 8000000)}`;
    const r = await request('POST', '/leads', adminToken, {
      companyName: 'Ontime Transport Services',
      contactPerson: 'Rick Leadman',
      phone,
      email: `lead_${Date.now()}@ontime.com`,
      address: '2200 Dixie Rd, Mississauga, ON',
      numberOfUnits: 15,
      countryCode: 'CA',
      notes: 'Interested in fleet mobile tire roadside contract',
    });
    createdLeadId = r.json?.data?.id;
    const valid = (r.status === 200 || r.status === 201) && r.json?.success === true && !!createdLeadId;
    record('Leads', 'POST', '/leads', valid, r.status, undefined, { id: createdLeadId, company: r.json?.data?.companyName });
  }
  if (createdLeadId) {
    // GET /leads/:id
    const r = await request('GET', `/leads/${createdLeadId}`, adminToken);
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.id === createdLeadId;
    record('Leads', 'GET', `/leads/:id`, valid, r.status, undefined, { company: r.json?.data?.companyName, status: r.json?.data?.status });
  }
  if (createdLeadId) {
    // PATCH /leads/:id
    const r = await request('PATCH', `/leads/${createdLeadId}`, adminToken, {
      notes: 'Followed up via phone call; scheduling contract discussion',
      whatsappFollowUp: true,
      whatsappNotes: 'Sent fleet rate sheet via WhatsApp',
    });
    const valid = r.status === 200 && r.json?.success === true && r.json?.data?.whatsappFollowUp === true;
    record('Leads', 'PATCH', `/leads/:id`, valid, r.status, undefined, { whatsappFollowUp: r.json?.data?.whatsappFollowUp });
  }
  if (createdLeadId) {
    // PATCH /leads/:id/disposition
    const r = await request('PATCH', `/leads/${createdLeadId}/disposition`, adminToken, {
      disposition: 'CALLBACK',
      notes: 'Customer requested a callback tomorrow morning',
      callbackDate: new Date(Date.now() + 86400000).toISOString(),
    });
    const valid = r.status === 200 && r.json?.success === true && (r.json?.data?.lead?.disposition === 'CALLBACK' || r.json?.data?.disposition === 'CALLBACK');
    record('Leads', 'PATCH', `/leads/:id/disposition`, valid, r.status, undefined, { disposition: r.json?.data?.lead?.disposition || r.json?.data?.disposition });
  }
  {
    // GET /leads/agent-queue
    const r = await request('GET', '/leads/agent-queue', adminToken);
    const valid = r.status === 200 && r.json?.success === true;
    record('Leads', 'GET', '/leads/agent-queue', valid, r.status, undefined, { queueCount: Array.isArray(r.json?.data) ? r.json?.data?.length : 0 });
  }

  // -------------------------------------------------------------
  // 11. MESSAGES & JOB CHAT (GET, POST, PATCH)
  // -------------------------------------------------------------
  console.log('\n--- 11. MESSAGES ENDPOINTS ---');
  {
    // GET /messages/portal
    const r = await request('GET', '/messages/portal', adminToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Messages', 'GET', '/messages/portal', valid, r.status, undefined, { count: r.json?.data?.length });
  }
  {
    // POST /messages/portal
    const r = await request('POST', '/messages/portal', adminToken, {
      customerId: createdCustomerId,
      subject: 'Service Confirmation',
      content: 'Your mobile tire roadside service order has been received.',
      relatedEntityType: 'JOB',
      relatedEntityId: createdJobId,
    });
    createdPortalMsgId = r.json?.data?.id;
    const valid = (r.status === 200 || r.status === 201) && r.json?.success === true && !!createdPortalMsgId;
    record('Messages', 'POST', '/messages/portal', valid, r.status, undefined, { id: createdPortalMsgId, subject: r.json?.data?.subject });
  }
  if (createdPortalMsgId) {
    // PATCH /messages/portal/:id/read
    const r = await request('PATCH', `/messages/portal/${createdPortalMsgId}/read`, adminToken);
    const valid = r.status === 200 && r.json?.success === true && (r.json?.data?.readAt !== null || r.json?.data?.isRead === true);
    record('Messages', 'PATCH', `/messages/portal/:id/read`, valid, r.status, undefined, { readAt: r.json?.data?.readAt });
  }
  if (createdJobId) {
    // POST /messages/job/:jobId (Driver/Dispatcher chat)
    const r = await request('POST', `/messages/job/${createdJobId}`, adminToken, {
      content: 'Dispatcher: Technician is 5 minutes away from scene.',
    });
    const valid = (r.status === 200 || r.status === 201) && r.json?.success === true && !!r.json?.data?.id;
    record('Messages', 'POST', `/messages/job/:jobId`, valid, r.status, undefined, { msgId: r.json?.data?.id, content: r.json?.data?.content });
  }
  if (createdJobId) {
    // GET /messages/job/:jobId
    const r = await request('GET', `/messages/job/${createdJobId}`, adminToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Messages', 'GET', `/messages/job/:jobId`, valid, r.status, undefined, { messages: r.json?.data?.length });
  }

  // -------------------------------------------------------------
  // 12. FLEET PORTAL & MEMBER PORTAL (GET)
  // -------------------------------------------------------------
  console.log('\n--- 12. PORTALS ENDPOINTS ---');
  {
    // GET /fleet-portal/dashboard
    const r = await request('GET', '/fleet-portal/dashboard', adminToken);
    const valid = r.status === 200 && r.json?.success === true;
    record('Portals', 'GET', '/fleet-portal/dashboard', valid, r.status, undefined, { totalVehicles: r.json?.data?.totalVehicles, totalJobs: r.json?.data?.totalJobs });
  }
  {
    // GET /fleet-portal/vehicles
    const r = await request('GET', '/fleet-portal/vehicles', adminToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Portals', 'GET', '/fleet-portal/vehicles', valid, r.status, undefined, { count: r.json?.data?.length });
  }
  {
    // GET /fleet-portal/drivers
    const r = await request('GET', '/fleet-portal/drivers', adminToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Portals', 'GET', '/fleet-portal/drivers', valid, r.status, undefined, { count: r.json?.data?.length });
  }
  {
    // GET /fleet-portal/jobs
    const r = await request('GET', '/fleet-portal/jobs', adminToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Portals', 'GET', '/fleet-portal/jobs', valid, r.status, undefined, { count: r.json?.data?.length });
  }
  {
    // GET /fleet-portal/invoices
    const r = await request('GET', '/fleet-portal/invoices', adminToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Portals', 'GET', '/fleet-portal/invoices', valid, r.status, undefined, { count: r.json?.data?.length });
  }
  {
    // GET /fleet-portal/messages
    const r = await request('GET', '/fleet-portal/messages', adminToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Portals', 'GET', '/fleet-portal/messages', valid, r.status, undefined, { count: r.json?.data?.length });
  }
  {
    // GET /member-portal/vehicles
    const r = await request('GET', '/member-portal/vehicles', adminToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Portals', 'GET', '/member-portal/vehicles', valid, r.status, undefined, { count: r.json?.data?.length });
  }
  {
    // GET /member-portal/jobs
    const r = await request('GET', '/member-portal/jobs', adminToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Portals', 'GET', '/member-portal/jobs', valid, r.status, undefined, { count: r.json?.data?.length });
  }
  {
    // GET /member-portal/receipts
    const r = await request('GET', '/member-portal/receipts', adminToken);
    const valid = r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data);
    record('Portals', 'GET', '/member-portal/receipts', valid, r.status, undefined, { count: r.json?.data?.length });
  }

  // -------------------------------------------------------------
  // 13. TELEPHONY (GET)
  // -------------------------------------------------------------
  console.log('\n--- 13. TELEPHONY ENDPOINTS ---');
  {
    const r = await request('GET', '/telephony/token', adminToken);
    const valid = r.status === 200 && r.json?.success === true;
    record('Telephony', 'GET', '/telephony/token', valid, r.status, undefined, { enabled: r.json?.data?.enabled, user: r.json?.data?.user?.email });
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n===========================================================');
  console.log('📊 FINAL TEST RESULTS SUMMARY');
  console.log('===========================================================');

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  const byMethod = {
    GET: results.filter((r) => r.method === 'GET'),
    POST: results.filter((r) => r.method === 'POST'),
    PATCH: results.filter((r) => r.method === 'PATCH'),
    DELETE: results.filter((r) => r.method === 'DELETE'),
  };

  console.log(`Total Endpoints Tested: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`\nBreakdown by HTTP Method:`);
  console.log(`- GET:   ${byMethod.GET.filter((r) => r.passed).length} / ${byMethod.GET.length} passed`);
  console.log(`- POST:  ${byMethod.POST.filter((r) => r.passed).length} / ${byMethod.POST.length} passed`);
  console.log(`- PATCH: ${byMethod.PATCH.filter((r) => r.passed).length} / ${byMethod.PATCH.length} passed`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`❌ [${r.method}] ${r.endpoint} -> Status ${r.statusCode}: ${r.message || 'Validation failed'}`);
      });
    process.exit(1);
  } else {
    console.log('\n🎉 ALL APIS (GET, POST, PATCH) VALIDATED AND VERIFIED WORKING PROPERLY!');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
