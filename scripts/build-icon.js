const fs = require('fs');
const path = require('path');

try {
  const pngPath = path.join(__dirname, '../public/icono.png');
  if (fs.existsSync(pngPath)) {
    const png = fs.readFileSync(pngPath);
    const h = Buffer.alloc(6);
    h.writeUInt16LE(0, 0);
    h.writeUInt16LE(1, 2);
    h.writeUInt16LE(1, 4);

    const d = Buffer.alloc(16);
    d.writeUInt8(0, 0);
    d.writeUInt8(0, 1);
    d.writeUInt8(0, 2);
    d.writeUInt8(0, 3);
    d.writeUInt16LE(1, 4);
    d.writeUInt16LE(32, 6);
    d.writeUInt32LE(png.length, 8);
    d.writeUInt32LE(22, 12);

    const ico = Buffer.concat([h, d, png]);

    const targets = [
      'resources/icon.ico',
      'public/icono_escritorio.ico',
      'public/icono_256x256.ico',
      'src/img/logo.ico'
    ];

    for (const rel of targets) {
      const full = path.join(__dirname, '..', rel);
      fs.writeFileSync(full, ico);
      console.log('Successfully updated icon:', rel);
    }
  }
} catch (err) {
  console.error('Error updating ico files:', err);
}
