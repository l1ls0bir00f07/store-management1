const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const archiver = require('archiver');
const { wrapper: db } = require('../models/db');
const auth = require('../middleware/auth');
const { requireAdmin } = auth;

// Builds the JSON payload encoded inside each product's QR code.
// Keeping it small matters: smaller payload = denser-readable QR at small print sizes.
function buildPayload(product) {
  return JSON.stringify({ id: product.id, sku: product.sku || '', name: product.name });
}

// Sanitizes a product name/sku into a safe filename fragment (ASCII-safe core).
function safeFilename(str) {
  return String(str || '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 60);
}

// HTTP headers must be latin1/ASCII — Cyrillic product names break a plain
// Content-Disposition header. We send both a plain ASCII fallback name and
// the proper UTF-8 filename* (RFC 5987) so browsers show the real Cyrillic name
// while older clients still get a safe ASCII fallback instead of crashing.
function contentDispositionHeader(filename) {
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '_');
  const utf8Encoded = encodeURIComponent(filename);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`;
}

// GET /api/qrcodes/:id  → single PNG for one product
router.get('/:id', auth, requireAdmin, async (req, res) => {
  const product = db.prepare('SELECT id, name, sku FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Товар не найден' });

  try {
    const payload = buildPayload(product);
    const buffer = await QRCode.toBuffer(payload, {
      type: 'png',
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M'
    });
    const filename = `${safeFilename(product.sku || product.id)}_${safeFilename(product.name)}.png`;
    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': contentDispositionHeader(filename)
    });
    res.send(buffer);
  } catch (e) {
    console.error('Ошибка генерации QR:', e);
    res.status(500).json({ error: 'Не удалось сгенерировать QR-код' });
  }
});

// GET /api/qrcodes/bulk/all?category_id=  → ZIP with QR PNGs for all (or filtered) products
router.get('/bulk/all', auth, requireAdmin, async (req, res) => {
  const { category_id } = req.query;
  let sql = 'SELECT id, name, sku FROM products WHERE 1=1';
  const params = [];
  if (category_id) { sql += ' AND category_id = ?'; params.push(category_id); }
  sql += ' ORDER BY name';

  const products = db.prepare(sql).all(...params);
  if (!products.length) return res.status(404).json({ error: 'Нет товаров для генерации QR-кодов' });

  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="qrcodes_${new Date().toISOString().slice(0, 10)}.zip"`
  });

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => {
    console.error('Ошибка архивации QR-кодов:', err);
    if (!res.headersSent) res.status(500).end();
  });
  archive.pipe(res);

  const usedNames = new Set();
  for (const product of products) {
    try {
      const payload = buildPayload(product);
      const buffer = await QRCode.toBuffer(payload, {
        type: 'png',
        width: 400,
        margin: 2,
        errorCorrectionLevel: 'M'
      });
      let filename = `${safeFilename(product.sku || product.id)}_${safeFilename(product.name)}.png`;
      // Guard against duplicate filenames (e.g. identical SKU+name edge case)
      if (usedNames.has(filename)) filename = `${product.id}_${filename}`;
      usedNames.add(filename);
      archive.append(buffer, { name: filename });
    } catch (e) {
      console.error(`Ошибка генерации QR для товара #${product.id}:`, e);
    }
  }

  archive.finalize();
});

module.exports = router;
