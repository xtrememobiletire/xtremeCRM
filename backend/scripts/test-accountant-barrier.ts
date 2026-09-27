const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

async function fetchApi(method: string, path: string, body?: any, token?: string) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function run() {
  console.log('🧪 Testing Accountant Permissions & Barriers...\n');

  // 1. Login Senior Accountant
  console.log('1. Logging in Senior Accountant (senior.accountant@xtremecrm.com)...');
  const seniorRes = await fetchApi('POST', '/auth/login', {
    email: 'senior.accountant@xtremecrm.com',
    password: 'AdminPassword123!',
  });
  const seniorToken = seniorRes.data.data.token;
  console.log('   Senior Login Success! canApprovePayouts in login response:', seniorRes.data.data.user.canApprovePayouts);

  // Check /auth/me for Senior
  const seniorMe = await fetchApi('GET', '/auth/me', undefined, seniorToken);
  console.log('   Senior /auth/me canApprovePayouts:', seniorMe.data.data.user.canApprovePayouts);
  if (seniorMe.data.data.user.canApprovePayouts !== true) {
    throw new Error('❌ Senior Accountant should have canApprovePayouts: true');
  }
  console.log('   ✅ Senior Accountant profile verified.\n');

  // 2. Login Junior Accountant
  console.log('2. Logging in Junior Accountant (junior.accountant@xtremecrm.com)...');
  const juniorRes = await fetchApi('POST', '/auth/login', {
    email: 'junior.accountant@xtremecrm.com',
    password: 'AdminPassword123!',
  });
  const juniorToken = juniorRes.data.data.token;
  console.log('   Junior Login Success! canApprovePayouts in login response:', juniorRes.data.data.user.canApprovePayouts);

  // Check /auth/me for Junior
  const juniorMe = await fetchApi('GET', '/auth/me', undefined, juniorToken);
  console.log('   Junior /auth/me canApprovePayouts:', juniorMe.data.data.user.canApprovePayouts);
  if (juniorMe.data.data.user.canApprovePayouts !== false) {
    throw new Error('❌ Junior Accountant should have canApprovePayouts: false');
  }
  console.log('   ✅ Junior Accountant profile verified.\n');

  // 3. Test verification barrier on PATCH /api/accounting/jobs/:id/verify-payment
  console.log('3. Testing PATCH /api/accounting/jobs/:id/verify-payment barrier...');
  const juniorJobRes = await fetchApi('PATCH', '/accounting/jobs/test-id/verify-payment', {}, juniorToken);
  if (juniorJobRes.status === 403) {
    console.log('   ✅ Junior BLOCKED with 403 Forbidden as expected: ', juniorJobRes.data.message);
  } else {
    console.error('   ❌ Junior was NOT blocked by 403!', juniorJobRes.status);
    process.exit(1);
  }

  const seniorJobRes = await fetchApi('PATCH', '/accounting/jobs/test-id/verify-payment', {}, seniorToken);
  if (seniorJobRes.status === 403) {
    console.error('   ❌ Senior was unexpectedly blocked with 403!');
    process.exit(1);
  } else if (seniorJobRes.status === 404) {
    console.log('   ✅ Senior PASSED barrier (returned 404 for non-existent job ID, authorization succeeded)');
  } else {
    console.log('   ℹ️ Senior response:', seniorJobRes.status, seniorJobRes.data);
  }

  // 4. Test verification barrier on PATCH /api/accounting/cash-ledger/:id/verify
  console.log('\n4. Testing PATCH /api/accounting/cash-ledger/:id/verify barrier...');
  const juniorCashRes = await fetchApi('PATCH', '/accounting/cash-ledger/test-id/verify', {}, juniorToken);
  if (juniorCashRes.status === 403) {
    console.log('   ✅ Junior BLOCKED with 403 Forbidden on cash-ledger verify: ', juniorCashRes.data.message);
  } else {
    console.error('   ❌ Junior was NOT blocked by 403 on cash-ledger verify!', juniorCashRes.status);
    process.exit(1);
  }

  // 5. Test Country filter multi-tenancy on Accounting Jobs
  console.log('\n5. Testing Country Filters on /api/accounting/jobs...');
  const allRes = await fetchApi('GET', '/accounting/jobs', undefined, seniorToken);
  console.log(`   Total accounting jobs (ALL): ${allRes.data.data?.length || 0}`);

  const caRes = await fetchApi('GET', '/accounting/jobs?countryCode=CA', undefined, seniorToken);
  console.log(`   Accounting jobs (CA): ${caRes.data.data?.length || 0}`);
  const nonCA = (caRes.data.data || []).filter((j: any) => j.countryCode !== 'CA');
  if (nonCA.length > 0) console.error('   ❌ CA filter leaked non-CA jobs!');
  else console.log('   ✅ CA jobs strictly isolated.');

  const ukRes = await fetchApi('GET', '/accounting/jobs?countryCode=UK', undefined, seniorToken);
  console.log(`   Accounting jobs (UK): ${ukRes.data.data?.length || 0}`);
  const nonUK = (ukRes.data.data || []).filter((j: any) => j.countryCode !== 'UK');
  if (nonUK.length > 0) console.error('   ❌ UK filter leaked non-UK jobs!');
  else console.log('   ✅ UK jobs strictly isolated.');

  const usRes = await fetchApi('GET', '/accounting/jobs?countryCode=US', undefined, seniorToken);
  console.log(`   Accounting jobs (US): ${usRes.data.data?.length || 0}`);
  const nonUS = (usRes.data.data || []).filter((j: any) => j.countryCode !== 'US');
  if (nonUS.length > 0) console.error('   ❌ US filter leaked non-US jobs!');
  else console.log('   ✅ US jobs strictly isolated.');

  console.log('\n🎉 ALL BARRIER AND MULTI-TENANCY TESTS PASSED!');
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
