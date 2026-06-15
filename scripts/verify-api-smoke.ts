#!/usr/bin/env npx ts-node
/**
 * Smoke-test public API endpoints and verify Swagger JSON is served.
 * Run while server is up: npm run start:dev
 * Usage: npx ts-node scripts/verify-api-smoke.ts
 */

const BASE = process.env.API_BASE_URL || 'http://127.0.0.1:4000/api';

type CheckResult = {
  method: string;
  path: string;
  status: number | 'ERR';
  ok: boolean;
  note?: string;
};

async function request(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

async function main() {
  const results: CheckResult[] = [];

  const checks: Array<{
    method: string;
    path: string;
    body?: Record<string, unknown>;
    expectStatus?: number[];
    validate?: (json: unknown) => boolean;
    note?: string;
  }> = [
    {
      method: 'GET',
      path: '/',
      expectStatus: [200],
      validate: (j) => typeof j === 'string' || j !== null,
      note: 'Health/hello',
    },
    {
      method: 'GET',
      path: '/docs-json',
      expectStatus: [200],
      validate: (j) =>
        typeof j === 'object' &&
        j !== null &&
        'paths' in (j as object) &&
        'openapi' in (j as object),
      note: 'Swagger JSON',
    },
    {
      method: 'GET',
      path: '/garages/discover?post_code=SW1A1AA&vehicle_registration_number=AB12CDE&page=1&limit=5',
      expectStatus: [200, 400, 404],
      validate: (j) => {
        const o = j as { success?: boolean };
        return o.success === true || o.success === false;
      },
      note: 'Discover garages (public)',
    },
    {
      method: 'POST',
      path: '/contact',
      body: {
        name: 'Swagger Smoke Test',
        email: 'smoke@test.local',
        subject: 'Test',
        message: 'Automated smoke test',
      },
      expectStatus: [200, 201],
      validate: (j) => {
        const o = j as { success?: boolean };
        return typeof o.success === 'boolean';
      },
      note: 'Contact form',
    },
    {
      method: 'GET',
      path: '/subscription/success',
      expectStatus: [400],
      validate: (j) => {
        const o = j as { success?: boolean; message?: string };
        return o.success === false || typeof o.message === 'string';
      },
      note: 'Subscription success without session_id (expects validation)',
    },
    {
      method: 'GET',
      path: '/auth/me',
      expectStatus: [401],
      note: 'Protected route rejects without JWT',
    },
  ];

  for (const check of checks) {
    try {
      const { status, json } = await request(
        check.method,
        check.path,
        check.body,
      );
      const statusOk =
        !check.expectStatus || check.expectStatus.includes(status);
      const validateOk = check.validate ? check.validate(json) : true;
      results.push({
        method: check.method,
        path: check.path.split('?')[0],
        status,
        ok: statusOk && validateOk,
        note: check.note,
      });
    } catch (error) {
      results.push({
        method: check.method,
        path: check.path,
        status: 'ERR',
        ok: false,
        note: `${check.note || ''} ${(error as Error).message}`.trim(),
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  console.log('\n=== API Smoke Test Report ===');
  console.log(`Base URL: ${BASE}`);
  console.log(`Passed: ${passed}/${results.length}\n`);

  for (const r of results) {
    console.log(
      `${r.ok ? 'PASS' : 'FAIL'}  ${r.method.padEnd(6)} ${r.path}  [${r.status}]  ${r.note || ''}`,
    );
  }

  if (failed.length) {
    console.log('\nFailed checks — is the server running? npm run start:dev');
    process.exit(1);
  }

  console.log('\nAll smoke checks passed.');
}

main();
