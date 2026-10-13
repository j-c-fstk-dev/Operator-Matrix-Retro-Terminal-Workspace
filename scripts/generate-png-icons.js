// Script to generate valid PNG icon files for PWA (192x192, 512x512, maskable 512x512, apple-touch 180x180)
// Uses pure Node.js zlib and Buffer to construct uncompressed/deflated standard PNG chunks.
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, isMaskable = false) {
  // RGBA buffer: 4 bytes per pixel + 1 filter byte per row
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  // Background: #030704 (RGB: 3, 7, 4)
  // Accent matrix green: #22c55e (RGB: 34, 197, 94)
  // Bright glow: #4ade80 (RGB: 74, 222, 128)
  // Border: #15803d (RGB: 21, 128, 61)

  const scale = width / 512;
  const padding = isMaskable ? 0.18 : 0.08;
  const contentWidth = width * (1 - padding * 2);
  const contentHeight = height * (1 - padding * 2);
  const startX = width * padding;
  const startY = height * padding;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Default background color
      let r = 3, g = 7, b = 4, a = 255;

      // Inner card box
      if (x >= startX && x <= startX + contentWidth && y >= startY && y <= startY + contentHeight) {
        r = 5; g = 18; b = 7;

        // Border
        const borderWidth = Math.max(2, 6 * scale);
        if (
          x < startX + borderWidth ||
          x > startX + contentWidth - borderWidth ||
          y < startY + borderWidth ||
          y > startY + contentHeight - borderWidth
        ) {
          r = 34; g = 197; b = 94;
        }

        // Header bar
        const headerHeight = 40 * scale;
        if (y >= startY && y <= startY + headerHeight) {
          r = 8; g = 30; b = 12;
        }

        // Terminal Prompt '>'
        // Left arm of '>' from (140, 200) to (230, 260) to (140, 320)
        const relX = (x - startX) / contentWidth * 512;
        const relY = (y - startY) / contentHeight * 512;

        const inChevronTop = Math.abs((relY - 180) - (relX - 120) * 0.72) < 22 && relX >= 115 && relX <= 225 && relY >= 170 && relY <= 265;
        const inChevronBot = Math.abs((340 - relY) - (relX - 120) * 0.72) < 22 && relX >= 115 && relX <= 225 && relY >= 255 && relY <= 350;

        if (inChevronTop || inChevronBot) {
          r = 34; g = 197; b = 94;
        }

        // Underscore cursor '_' from (250, 325) to (370, 350)
        if (relX >= 250 && relX <= 380 && relY >= 325 && relY <= 350) {
          r = 74; g = 222; b = 128;
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type: 6 (RGBA)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const compressed = zlib.deflateSync(rawData);
  const idat = makeChunk('IDAT', compressed);

  // IEND chunk
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate all standard PWA icons
console.log('Generating PWA icons...');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(64, 64, false));

console.log('All PWA icons generated successfully in /public!');
