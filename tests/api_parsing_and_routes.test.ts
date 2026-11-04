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

describe('API Route Verification and Safe Parsing Suite', () => {
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

  test('1. GET /api/health returns HTTP 200 with valid JSON and database verification', async () => {
    const res = await makeRequest(server, '/api/health');
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type']?.includes('application/json'));
    assert.equal(res.json.status, 'ok');
    assert.equal(res.json.service, 'EduPulse Analytics API');
    assert.ok(res.json.database);
    assert.equal(res.json.database.status, 'healthy');
    assert.equal(res.json.database.mysql_connection.connected, false, 'Reports truthful MySQL connection status');
  });

  test('2. GET /api/system/db-status returns relational store metrics and schema verification', async () => {
    const res = await makeRequest(server, '/api/system/db-status');
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type']?.includes('application/json'));
    assert.ok(res.json.data);
    assert.ok(res.json.data.relational_store.tables.courses > 0);
    assert.ok(res.json.data.relational_store.tables.learners > 0);
  });

  test('3. Unmatched /api/* routes return HTTP 404 JSON, NEVER HTML', async () => {
    const paths = ['/api/nonexistent', '/api/courses/invalid/subroute', '/api/v2/unknown'];
    for (const p of paths) {
      const res = await makeRequest(server, p);
      assert.equal(res.status, 404, `Path ${p} should return 404`);
      assert.ok(res.headers['content-type']?.includes('application/json'), `Path ${p} content-type must be JSON`);
      assert.ok(res.json, `Response for ${p} must parse as valid JSON`);
      assert.equal(res.json.error, 'Not Found');
      assert.equal(res.body.includes('<!doctype'), false, 'Response body must not contain HTML markup');
    }
  });

  test('4. GET /api/courses returns valid JSON array with enriched lesson counts', async () => {
    const res = await makeRequest(server, '/api/courses');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json.data));
    assert.ok(res.json.data.length > 0);
    const sample = res.json.data[0];
    assert.ok('course_id' in sample);
    assert.ok('required_lessons' in sample);
    assert.ok('enrolment_count' in sample);
  });

  test('5. POST /api/courses with empty fields returns HTTP 400 JSON validation error', async () => {
    // Authenticate as administrator first
    const testUsername = process.env.ADMIN_USERNAME?.trim() || 'admin';
    const testPassword = process.env.ADMIN_PASSWORD?.trim() || 'Admin@EduPulse2026!';
    const loginRes = await makeRequest(server, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: testUsername, password: testPassword }),
    });
    const token = loginRes.json.token;

    const res = await makeRequest(server, '/api/courses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ course_name: '', category: '' }),
    });
    assert.equal(res.status, 400);
    assert.ok(res.headers['content-type']?.includes('application/json'));
    assert.equal(res.json.error, 'Validation Error');
  });

  test('6. POST /api/courses with analyst role returns HTTP 403 Forbidden JSON', async () => {
    const res = await makeRequest(server, '/api/courses', {
      method: 'POST',
      headers: { 'x-user-role': 'analyst' },
      body: JSON.stringify({ course_name: 'Unauthorized Course', category: 'General' }),
    });
    assert.equal(res.status, 403);
    assert.ok(res.headers['content-type']?.includes('application/json'));
    assert.equal(res.json.error, 'Forbidden');
  });

  test('7. CSV reports return text/csv with correct attachment headers', async () => {
    const endpoints = [
      '/api/reports/course-completion?format=csv',
      '/api/reports/inactive-enrollments?format=csv&threshold=14',
      '/api/reports/activity?format=csv',
    ];
    for (const ep of endpoints) {
      const res = await makeRequest(server, ep);
      assert.equal(res.status, 200);
      assert.ok(res.headers['content-type']?.includes('text/csv'));
      assert.ok(res.headers['content-disposition']?.includes('attachment'));
      assert.equal(res.body.includes('<!doctype'), false, 'CSV must not contain HTML');
    }
  });
});
