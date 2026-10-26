/**
 * DEVICE PRO — STAGE 33: PRODUCT PICTURE UPLOAD & MEDIA ASSET MANAGEMENT TEST SUITE
 *
 * Verifies:
 * 1. Image listing endpoint: GET /api/admin/uploads/images (authentication, permissions, structure).
 * 2. Product image upload endpoint: POST /api/admin/uploads/product-image.
 * 3. Rejection of unauthenticated and unauthorized uploads.
 * 4. Rejection of invalid file formats (non-image extensions and MIME types).
 * 5. Successful multipart upload of valid image files (PNG/JPG/WEBP).
 * 6. File storage in public/images/products with unique sanitized filenames.
 * 7. Catalog product update with newly uploaded image URL.
 * 8. Cleanup and database invariance restoration.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { connectMongo } = require('../db/mongo/connection');
const { Product, User } = require('../db/mongo/models');
const app = require('../server');

async function runTests() {
  console.log('========================================================================');
  console.log('DEVICE PRO — STAGE 33: PRODUCT PICTURE UPLOAD & MEDIA ASSETS TEST SUITE');
  console.log('========================================================================\n');

  await connectMongo();

  // Start ephemeral test server on random free port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const BASE_URL = `http://localhost:${port}`;
  console.log(`[TEST SERVER] Listening on ephemeral port ${port}`);

  let passed = 0;
  let failed = 0;
  const createdTestFiles = [];
  let originalProductImage = null;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    Error: ${err.message}`);
      if (err.actual !== undefined && err.expected !== undefined) {
        console.error(`    Actual: ${err.actual}`);
        console.error(`    Expected: ${err.expected}`);
      }
      failed++;
    }
  }

  async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = { ...(options.headers || {}) };
    let body = options.body;

    if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Buffer)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body
    });

    const contentType = res.headers.get('content-type') || '';
    let resBody = null;
    if (contentType.includes('application/json')) {
      resBody = await res.json();
    } else {
      resBody = await res.text();
    }

    return { status: res.status, headers: res.headers, body: resBody };
  }

  try {
    // ---------------------------------------------------------------------------
    // 0. AUTHENTICATION SETUP
    // ---------------------------------------------------------------------------
    console.log('--- 0. Authentication Setup ---');

    const adminLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'Admin@DevicePro2026!' }
    });
    assert.strictEqual(adminLoginRes.status, 200, 'Admin login must succeed');
    const adminToken = adminLoginRes.body.token;

    const engLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'engineer.babatunde', password: 'Engineer@DevicePro2026!' }
    });
    assert.strictEqual(engLoginRes.status, 200, 'Engineer login must succeed');
    const engineerToken = engLoginRes.body.token;

    // ---------------------------------------------------------------------------
    // 1. MEDIA LISTING ENDPOINT AUDIT (GET /api/admin/uploads/images)
    // ---------------------------------------------------------------------------
    console.log('\n--- 1. Media Library Listing Audit ---');

    await test('1.1: Unauthenticated request to /api/admin/uploads/images returns 401', async () => {
      const res = await request('/api/admin/uploads/images');
      assert.strictEqual(res.status, 401, 'Must require authentication');
    });

    await test('1.2: Authorized staff can retrieve images list with filename, url, size, and timestamp', async () => {
      const res = await request('/api/admin/uploads/images', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200, 'Must return HTTP 200 for admin');
      assert.strictEqual(res.body.success, true, 'Response success must be true');
      assert.ok(Array.isArray(res.body.images), 'Images must be an array');
      assert.ok(res.body.images.length > 0, 'Must list existing product images');

      const first = res.body.images[0];
      assert.ok(first.filename, 'Image must have filename');
      assert.ok(first.url.startsWith('/images/products/'), 'Image URL must point to /images/products/');
      assert.ok(typeof first.size === 'number', 'Image must have file size');
      assert.ok(first.modifiedAt, 'Image must have modifiedAt timestamp');
    });

    // ---------------------------------------------------------------------------
    // 2. PRODUCT IMAGE UPLOAD AUDIT (POST /api/admin/uploads/product-image)
    // ---------------------------------------------------------------------------
    console.log('\n--- 2. Product Image Upload Audit ---');

    await test('2.1: Upload without authentication returns 401', async () => {
      const formData = new FormData();
      const fakeBlob = new Blob(['fake content'], { type: 'image/png' });
      formData.append('image', fakeBlob, 'test.png');

      const res = await request('/api/admin/uploads/product-image', {
        method: 'POST',
        body: formData
      });
      assert.strictEqual(res.status, 401, 'Must reject unauthenticated upload');
    });

    await test('2.2: Upload without file returns 400', async () => {
      const formData = new FormData();
      formData.append('something_else', 'value');

      const res = await request('/api/admin/uploads/product-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData
      });
      assert.strictEqual(res.status, 400, 'Must return 400 when no image is uploaded');
      assert.ok(res.body.error.includes('No image file was uploaded'), 'Must explain error');
    });

    await test('2.3: Upload with non-image file type (e.g. .txt) is rejected with 400', async () => {
      const formData = new FormData();
      const textBlob = new Blob(['this is not an image'], { type: 'text/plain' });
      formData.append('image', textBlob, 'script.txt');

      const res = await request('/api/admin/uploads/product-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData
      });
      assert.strictEqual(res.status, 400, 'Must reject invalid image format');
      assert.ok(res.body.error.includes('Invalid image format'), 'Must explain invalid format');
    });

    let uploadedImageUrl = null;
    let uploadedFilename = null;

    await test('2.4: Valid PNG image upload succeeds and saves file in public/images/products/', async () => {
      // 1x1 transparent PNG binary bytes
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });
      const formData = new FormData();
      formData.append('image', pngBlob, 'solar-inverter-test.png');

      const res = await request('/api/admin/uploads/product-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData
      });

      assert.strictEqual(res.status, 200, 'Upload must succeed with HTTP 200');
      assert.strictEqual(res.body.success, true, 'Upload response must be success');
      assert.ok(res.body.imageUrl.startsWith('/images/products/prod-'), 'Must generate sanitized path');
      assert.ok(res.body.filename.endsWith('.png'), 'Must preserve valid extension');

      uploadedImageUrl = res.body.imageUrl;
      uploadedFilename = res.body.filename;

      const physicalPath = path.join(__dirname, '..', 'public', 'images', 'products', uploadedFilename);
      assert.strictEqual(fs.existsSync(physicalPath), true, 'File must physically exist in products folder');
      createdTestFiles.push(physicalPath);
    });

    await test('2.5: Lead engineer role can also upload product photos', async () => {
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      const pngBlob = new Blob([pngBuffer], { type: 'image/png' });
      const formData = new FormData();
      formData.append('image', pngBlob, 'engineer-photo.png');

      const res = await request('/api/admin/uploads/product-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${engineerToken}` },
        body: formData
      });

      assert.strictEqual(res.status, 200, 'Engineer role must be authorized to upload product images');
      assert.strictEqual(res.body.success, true);
      const engFilePath = path.join(__dirname, '..', 'public', 'images', 'products', res.body.filename);
      createdTestFiles.push(engFilePath);
    });

    // ---------------------------------------------------------------------------
    // 3. PRODUCT CATALOG INTEGRATION AUDIT
    // ---------------------------------------------------------------------------
    console.log('\n--- 3. Product Catalog Integration & Update Audit ---');

    await test('3.1: Updating Product 1 with newly uploaded image succeeds and reflects in DB', async () => {
      assert.ok(uploadedImageUrl, 'Must have uploaded image URL from earlier step');

      const p1Before = await Product.findOne({ id: 1 }).lean();
      assert.ok(p1Before, 'Product 1 must exist');
      originalProductImage = p1Before.image_url;

      const patchRes = await request('/api/admin/products/1', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { image_url: uploadedImageUrl }
      });

      assert.strictEqual(patchRes.status, 200, 'PATCH must return 200');
      assert.strictEqual(patchRes.body.success, true);
      assert.strictEqual(patchRes.body.product.image_url, uploadedImageUrl, 'Returned product must reflect new image URL');

      const p1After = await Product.findOne({ id: 1 }).lean();
      assert.strictEqual(p1After.image_url, uploadedImageUrl, 'Database record must store new image URL');
    });

    await test('3.2: Revert Product 1 image to baseline to maintain database invariance', async () => {
      const revertRes = await request('/api/admin/products/1', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { image_url: originalProductImage }
      });

      assert.strictEqual(revertRes.status, 200);
      const p1Reverted = await Product.findOne({ id: 1 }).lean();
      assert.strictEqual(p1Reverted.image_url, originalProductImage, 'Product 1 image URL must be restored to baseline');
    });

  } finally {
    // Teardown created test files
    for (const filePath of createdTestFiles) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        console.warn(`[TEARDOWN] Could not remove test file: ${filePath}`);
      }
    }

    server.close();

    console.log('\n========================================================================');
    console.log(`STAGE 33 TEST EXECUTION SUMMARY:`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Total:  ${passed + failed}`);
    console.log('========================================================================\n');
  }

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('[FATAL ERROR]:', err);
  process.exit(1);
});
