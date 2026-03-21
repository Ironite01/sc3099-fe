/**
 * SAIV Smokescreen Test (plain ASCII, no emojis)
 * Full end-to-end flow using seeded admin credentials
 */

const BASE = 'http://localhost:3000';

const TEST_LAT = 1.3468380321270712;
const TEST_LNG = 103.68135277116436;
const GEOFENCE_M = 200;

const NOW = Date.now();
const STUDENT_EMAIL = `smokestudent${NOW}@example.com`;
const PASSWORD = 'Password123!';

// Use the seeded admin from schema.ts (SEED_ADMIN_EMAIL env var or default)
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

async function req(method, path, body, cookies = '') {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    };
    if (cookies) opts.headers['Cookie'] = cookies;

    const res = await fetch(`${BASE}${path}`, opts);
    const ct = res.headers.get('content-type') || '';
    const json = ct.includes('json') ? await res.json() : await res.text();
    // Collect ALL set-cookie headers into a single cookie string
    const rawSetCookies = res.headers.getSetCookie?.() ?? [];
    const cookieStr = rawSetCookies.map(c => c.split(';')[0].trim()).join('; ');
    return { status: res.status, json, setCookie: cookieStr };
}

let passed = 0, failed = 0;
function ok(label, condition, detail = '') {
    const tag = condition ? '[PASS]' : '[FAIL]';
    console.log(`  ${tag} ${label}${detail ? ' => ' + detail : ''}`);
    condition ? passed++ : failed++;
    return condition;
}
function section(n, title) { console.log(`\nSTEP ${n}: ${title}`); }

// ---------------------------------------------------------------------------

// STEP 1: Admin login (uses seeded account from schema.ts)
section(1, 'Admin login (seeded account)');
let r = await req('POST', '/api/v1/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
ok('Admin login -> 200', r.status === 200, `status=${r.status} body=${JSON.stringify(r.json).slice(0,120)}`);
const adminCookies = r.setCookie;
ok('Admin cookies received', !!adminCookies, adminCookies?.slice(0,80));

// STEP 2: Create course
section(2, 'Create course');
r = await req('POST', '/api/v1/courses/', {
    code: `SC${NOW}`,
    name: 'Smokescreen Test Course',
    semester: 'AY2024-25 Sem 2',
    venue_name: 'Test Venue',
    venue_latitude: TEST_LAT,
    venue_longitude: TEST_LNG,
    geofence_radius_meters: GEOFENCE_M,
    risk_threshold: 0.8
}, adminCookies);
ok('Course creation -> 201', r.status === 201, `status=${r.status} detail=${JSON.stringify(r.json).slice(0,150)}`);
const courseId = r.json?.id;
ok('Course ID received', !!courseId, courseId);

// STEP 3: Create session
section(3, 'Create session (open for checkin, status=scheduled)');
const openISO = new Date(Date.now() - 10 * 60_000).toISOString();
const closeISO = new Date(Date.now() + 30 * 60_000).toISOString();
const startISO = new Date(Date.now() - 5 * 60_000).toISOString();
const endISO = new Date(Date.now() + 2 * 60 * 60_000).toISOString();

r = await req('POST', '/api/v1/sessions/', {
    course_id: courseId,
    name: 'Smoke Test Session',
    session_type: 'lecture',
    scheduled_start: startISO,
    scheduled_end: endISO,
    checkin_opens_at: openISO,
    checkin_closes_at: closeISO,
    venue_name: 'Test Venue',
    venue_latitude: TEST_LAT,
    venue_longitude: TEST_LNG,
    geofence_radius_meters: GEOFENCE_M,
    require_liveness_check: true,
    require_face_match: false,
    risk_threshold: 0.8
}, adminCookies);
ok('Session creation -> 201', r.status === 201, `status=${r.status} id=${r.json?.id}`);
const sessionId = r.json?.id;
ok('Session ID received', !!sessionId, sessionId);

// STEP 4: Register student
section(4, 'Register student');
r = await req('POST', '/api/v1/auth/register', {
    email: STUDENT_EMAIL, password: PASSWORD, full_name: 'Smoke Student'
});
ok('Student registration -> 201', r.status === 201, `status=${r.status} body=${JSON.stringify(r.json).slice(0,100)}`);
const studentId = r.json?.id;
ok('Student ID received', !!studentId, studentId);

// STEP 5: Enroll student  
section(5, 'Enroll student in course');
r = await req('POST', '/api/v1/admin/enrollments/', {
    student_id: studentId, course_id: courseId
}, adminCookies);
ok('Enrollment -> 201', r.status === 201, `status=${r.status}`);

// STEP 6: Activate session
section(6, 'Activate session');
r = await req('PATCH', `/api/v1/admin/sessions/${sessionId}/status`,
    { status: 'active' }, adminCookies);
ok('Session activated -> 200', r.status === 200, `status=${r.status} sessionStatus=${r.json?.status}`);

// STEP 7: Student login
section(7, 'Student login');
r = await req('POST', '/api/v1/auth/login', { email: STUDENT_EMAIL, password: PASSWORD });
ok('Student login -> 200', r.status === 200, `status=${r.status}`);
const studentCookies = r.setCookie;
ok('Student cookies received', !!studentCookies, studentCookies?.slice(0,80));

// STEP 8: Register device
section(8, 'Register device');
const deviceFP = `smoke-device-fp-${NOW}`;
r = await req('POST', '/api/v1/devices/register', {
    device_fingerprint: deviceFP,
    device_name: 'Smokescreen Test Device',
    platform: 'web'
}, studentCookies);
ok('Device register -> 201', r.status === 201, `status=${r.status} body=${JSON.stringify(r.json).slice(0,100)}`);
ok('Device is active', r.json?.is_active === true, `is_active=${r.json?.is_active}`);

// STEP 9: my-devices
section(9, 'Verify device in /devices/my-devices');
r = await req('GET', '/api/v1/devices/my-devices', null, studentCookies);
ok('My devices list -> 200', r.status === 200, `status=${r.status}`);
const myDevices = Array.isArray(r.json) ? r.json : [];
ok('At least 1 device found', myDevices.length > 0, `count=${myDevices.length}`);

// STEP 10: Submit check-in
section(10, 'Submit check-in at same lat/lng as venue');
console.log(`  Venue location:   lat=${TEST_LAT}, lng=${TEST_LNG}`);
console.log(`  Student location: lat=${TEST_LAT}, lng=${TEST_LNG} (same -> distance=0m)`);
console.log(`  Geofence: ${GEOFENCE_M}m`);

const livenessToken = Buffer.from(`liveness_${Date.now()}_smoketest`).toString('base64');
r = await req('POST', '/api/v1/checkins/', {
    session_id: sessionId,
    latitude: TEST_LAT,
    longitude: TEST_LNG,
    location_accuracy_meters: 5.0,
    device_fingerprint: deviceFP,
    liveness_challenge_response: livenessToken
}, studentCookies);

const checkinOk = ok('Check-in -> 201', r.status === 201, `status=${r.status} body=${JSON.stringify(r.json).slice(0,200)}`);
if (r.status === 201) {
    ok('Status is approved or flagged', ['approved','flagged'].includes(r.json?.status), `status=${r.json?.status}`);
    ok('Distance within geofence', r.json?.distance_from_venue_meters <= GEOFENCE_M, `dist=${r.json?.distance_from_venue_meters}m`);
    ok('Liveness passed', r.json?.liveness_passed === true, `liveness=${r.json?.liveness_passed}`);
    console.log(`  Risk score: ${r.json?.risk_score}`);
    console.log(`  Distance:   ${r.json?.distance_from_venue_meters}m`);
    console.log(`  Status:     ${r.json?.status}`);
    console.log(`  Risk factors: ${JSON.stringify(r.json?.risk_factors)}`);
} else {
    console.log(`  Response body: ${JSON.stringify(r.json)}`);
}

// STEP 11: Verify in admin list
section(11, 'Verify check-in in admin session list');
r = await req('GET', `/api/v1/checkins/session/${sessionId}`, null, adminCookies);
ok('Admin checkins list -> 200', r.status === 200, `status=${r.status}`);
const checkins = Array.isArray(r.json) ? r.json : [];
ok('Check-in record exists', checkins.length > 0, `count=${checkins.length}`);

// SUMMARY
const line = '='.repeat(60);
console.log('\n' + line);
console.log(`SMOKESCREEN RESULT: ${passed} passed, ${failed} failed out of ${passed+failed} tests`);
console.log(failed === 0 ? 'ALL TESTS PASSED - check-in flow working end-to-end!' : 'SOME TESTS FAILED - see [FAIL] entries above');
console.log(line + '\n');
