import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import { buildApiBundle } from '../scripts/build-api.mjs';

/**
 * Exercises the artifact that is actually deployed.
 *
 * api/audit.js is a committed build output, so nothing else in the suite touches
 * it and a stale copy would otherwise only be discovered by deploying. This test
 * rebuilds it with the project's own script, asserts the committed bytes match
 * the source, then drives the built handler the way the serverless platform does
 * (plain (req, res) invocation) rather than importing the app from source.
 */

const COMMITTED_BUNDLE = 'api/audit.js';

const ECO_INVOICE_TEXT = [
  'INVOICE: INV-2026-EP-8921',
  'ISSUER: EcoPack Logistics GmbH',
  'DATE: 2026-02-14',
  'CURRENCY: USD',
  'LINE ITEMS:',
  '1. Recycled Corrugated Packaging (Single-wall B-flute, 400x300x250mm)',
  '   - Quantity: 5,000 unit',
  '   - Billed Unit Price: $1.20',
  '   - Line Total: $6,000.00',
  '   - Claimed Scope 3 Carbon: 2,250.0 kg CO2e',
  '2. Cold-Chain Freight (Per Km)',
  '   - Quantity: 500 km',
  '   - Billed Unit Price: $2.10',
  '   - Line Total: $1,050.00',
  '   - Claimed Scope 3 Carbon: 575.0 kg CO2e',
  'TOTAL BILLED AMOUNT: $7,050.00',
  'TOTAL CLAIMED SCOPE 3 EMISSIONS: 2,825.0 kg CO2e',
].join('\n');

// Vite's module loader cannot resolve a generated file that lives outside its
// graph, so the built bundle is loaded through Node's own loader instead.
const requireBundle = createRequire(import.meta.url);

describe('Deployed serverless function (built artifact)', () => {
  const builtPath = join(tmpdir(), `greenledger-audit-${process.pid}.mjs`);
  let server: Server | undefined;
  let baseUrl: string;
  let built: Buffer;

  beforeAll(async () => {
    // Force the deterministic extraction path so the test never calls a model.
    // dotenv does not override variables that are already defined.
    process.env.GEMINI_API_KEY = '';

    await buildApiBundle(builtPath);
    built = readFileSync(builtPath);

    const app = requireBundle(builtPath).default as (req: any, res: any) => void;
    const activeServer = createServer((req, res) => app(req, res));
    server = activeServer;
    await new Promise<void>((resolve) => activeServer.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(activeServer.address() as AddressInfo).port}`;
  }, 60_000);

  afterAll(async () => {
    const activeServer = server;
    if (activeServer) {
      await new Promise<void>((resolve) => activeServer.close(() => resolve()));
    }
    rmSync(builtPath, { force: true });
  });

  it('committed artifact matches a fresh build of the source', () => {
    const committed = readFileSync(COMMITTED_BUNDLE);
    expect(
      built.equals(committed),
      'api/audit.js is stale: run `npm run build` and commit the regenerated bundle'
    ).toBe(true);
  });

  it('POST /api/audit returns a real verdict from the bundled handler', async () => {
    const response = await fetch(`${baseUrl}/api/audit`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ gateEnabled: 'true', rawPayload: ECO_INVOICE_TEXT }).toString(),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.decision.verdict).toBe('AUTO_APPROVED');
    expect(body.extraction.vendorName).toBe('EcoPack Logistics GmbH');
    expect(body.extraction.totalAmount).toBe(7050);
    expect(body.verification.maxPriceVariancePercent).toBe(0);
    expect(body.security.blockedBeforeModel).toBe(false);
  });

  it('GET /api/health reports the API is up without a model key', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.geminiConfigured).toBe(false);
    expect(body.benchmarkVersion).toBeTruthy();
  });

  it('rejects a malformed body with the JSON error shape, not a crash page', async () => {
    const response = await fetch(`${baseUrl}/api/audit`, {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=---broken' },
      body: '------broken--\r\n',
    });

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/json');

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe('string');
    expect(body.error.length).toBeGreaterThan(0);
  });
});
