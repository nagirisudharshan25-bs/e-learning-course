import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../backend/src/app.ts';
import http from 'node:http';

function makeRequest(
  server: http.Server,
  path: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string; json?: any }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as { port: number };
    const req = http.request(
      {
        host: '127.0.0.1',
        port: addr.port,
        path,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let parsed: any = undefined;
          try {
            parsed = JSON.parse(raw);
          } catch {
            // Not JSON
          }
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: raw,
            json: parsed,
          });
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

describe('Administrator Password Authentication & Authorization Suite', () => {
  let server: http.Server;

  test.beforeEach(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });
  });

  test.afterEach(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  test('1. POST /api/auth/login rejects incorrect password with HTTP 401 Unauthorized', async () => {
    const res = await makeRequest(server, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'admin',
        password: 'IncorrectPassword123!',
      }),
    });
    assert.equal(res.status, 401);
    assert.ok(res.json);
    assert.equal(res.json.error, 'Unauthorized');
    assert.ok(res.json.message.includes('Invalid administrator credentials'));
  });

  test('2. POST /api/auth/login rejects empty or missing fields with HTTP 400 Validation Error', async () => {
    const res = await makeRequest(server, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: '',
        password: '',
      }),
    });
    assert.equal(res.status, 400);
    assert.ok(res.json);
    assert.equal(res.json.error, 'Validation Error');
  });

  test('3. POST /api/auth/login succeeds with valid administrator credentials and returns token', async () => {
    const testUsername = process.env.ADMIN_USERNAME?.trim() || 'admin';
    const testPassword = process.env.ADMIN_PASSWORD?.trim() || 'Admin@EduPulse2026!';

    const res = await makeRequest(server, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: testUsername,
        password: testPassword,
      }),
    });
    assert.equal(res.status, 200);
    assert.ok(res.json);
    assert.equal(res.json.message, 'Authentication successful');
    assert.ok(typeof res.json.token === 'string' && res.json.token.length > 20);
    assert.equal(res.json.user.role, 'administrator');
    assert.equal(res.json.user.username.toLowerCase(), testUsername.toLowerCase());
    assert.ok(typeof res.json.expiresAt === 'number');
  });

  test('4. GET /api/auth/me returns authenticated: false when unauthenticated', async () => {
    const res = await makeRequest(server, '/api/auth/me');
    assert.equal(res.status, 200);
    assert.ok(res.json);
    assert.equal(res.json.authenticated, false);
    assert.equal(res.json.role, 'analyst');
  });

  test('5. GET /api/auth/me returns authenticated: true when valid Bearer token is provided', async () => {
    const testUsername = process.env.ADMIN_USERNAME?.trim() || 'admin';
    const testPassword = process.env.ADMIN_PASSWORD?.trim() || 'Admin@EduPulse2026!';

    // 1. Log in
    const loginRes = await makeRequest(server, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: testUsername,
        password: testPassword,
      }),
    });
    const token = loginRes.json.token;

    // 2. Query /api/auth/me with Bearer token
    const res = await makeRequest(server, '/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    assert.equal(res.status, 200);
    assert.ok(res.json);
    assert.equal(res.json.authenticated, true);
    assert.equal(res.json.user.username.toLowerCase(), testUsername.toLowerCase());
    assert.equal(res.json.user.role, 'administrator');
  });

  test('6. Unauthenticated requests to mutating endpoints return HTTP 401 Unauthorized', async () => {
    // Attempt course creation without token
    const res = await makeRequest(server, '/api/courses', {
      method: 'POST',
      body: JSON.stringify({
        course_name: 'Hacking Course Attempt',
        category: 'Security',
      }),
    });
    assert.equal(res.status, 401);
    assert.ok(res.json);
    assert.equal(res.json.error, 'Unauthorized');
    assert.ok(res.json.message.includes('Authentication required'));
  });

  test('7. Requests with invalid or forged Bearer tokens return HTTP 401 Unauthorized', async () => {
    const res = await makeRequest(server, '/api/courses', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer invalid.forged.token.12345',
      },
      body: JSON.stringify({
        course_name: 'Forged Token Course',
        category: 'Security',
      }),
    });
    assert.equal(res.status, 401);
    assert.ok(res.json);
    assert.equal(res.json.error, 'Unauthorized');
    assert.ok(res.json.message.includes('Invalid or expired administrator token'));
  });

  test('8. Requests with valid Bearer token successfully authorize administrator mutations', async () => {
    const testUsername = process.env.ADMIN_USERNAME?.trim() || 'admin';
    const testPassword = process.env.ADMIN_PASSWORD?.trim() || 'Admin@EduPulse2026!';

    // 1. Authenticate
    const loginRes = await makeRequest(server, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: testUsername,
        password: testPassword,
      }),
    });
    const token = loginRes.json.token;

    // 2. Perform protected mutation with Bearer token
    const res = await makeRequest(server, '/api/courses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        course_name: 'Authenticated Microservices Architecture',
        category: 'Cloud Engineering',
        description: 'Advanced course created by verified administrator.',
      }),
    });
    assert.equal(res.status, 201);
    assert.ok(res.json);
    assert.equal(res.json.message, 'Course created successfully');
    assert.equal(res.json.data.course_name, 'Authenticated Microservices Architecture');
  });

  test('9. Analyst role returns HTTP 403 Forbidden for mutating endpoints', async () => {
    const res = await makeRequest(server, '/api/courses', {
      method: 'POST',
      headers: {
        'x-user-role': 'analyst',
      },
      body: JSON.stringify({
        course_name: 'Analyst Mutation Attempt',
        category: 'Testing',
      }),
    });
    assert.equal(res.status, 403);
    assert.ok(res.json);
    assert.equal(res.json.error, 'Forbidden');
  });

  test('10. POST /api/auth/logout invalidates session token and revokes access', async () => {
    const testUsername = process.env.ADMIN_USERNAME?.trim() || 'admin';
    const testPassword = process.env.ADMIN_PASSWORD?.trim() || 'Admin@EduPulse2026!';

    // 1. Log in
    const loginRes = await makeRequest(server, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: testUsername,
        password: testPassword,
      }),
    });
    const token = loginRes.json.token;

    // 2. Verify token works before logout
    const preCheck = await makeRequest(server, '/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(preCheck.json.authenticated, true);

    // 3. Log out
    const logoutRes = await makeRequest(server, '/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(logoutRes.status, 200);

    // 4. Verify token is now revoked
    const postCheck = await makeRequest(server, '/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(postCheck.json.authenticated, false);

    // 5. Protected action with logged-out token must fail
    const mutRes = await makeRequest(server, '/api/system/reset', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(mutRes.status, 401);
  });

  test('11. Read-only endpoints remain freely accessible to Analyst without authentication', async () => {
    const endpoints = ['/api/courses', '/api/learners', '/api/enrollments', '/api/analytics/overview'];
    for (const ep of endpoints) {
      const res = await makeRequest(server, ep, {
        headers: { 'x-user-role': 'analyst' },
      });
      assert.equal(res.status, 200, `${ep} must be accessible to analyst`);
      assert.ok(res.json);
    }
  });
});
