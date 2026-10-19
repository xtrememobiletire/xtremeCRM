const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const brands = [
  'audi', 'bmw', 'mercedes', 'volkswagen', 'porsche', 'mini', 'volvo',
  'alfa-romeo', 'toyota', 'lexus', 'nissan', 'mazda', 'subaru', 'honda',
  'mitsubishi', 'suzuki', 'infiniti', 'hyundai', 'kia', 'ford', 'holden'
];

async function processLogos() {
  const dir = path.join(__dirname, '..', 'public', 'brands');
  for (const b of brands) {
    const svgFile = path.join(dir, `${b}.svg`);
    const pngFile = path.join(dir, `${b}.png`);
    if (!fs.existsSync(svgFile)) {
      console.log(`Missing SVG: ${svgFile}`);
      continue;
    }
    try {
      let svgBuffer = fs.readFileSync(svgFile, 'utf8');
      
      // If viewBox is missing, add it from width/height
      if (!svgBuffer.includes('viewBox')) {
        const wMatch = svgBuffer.match(/width=["']([^"']+)["']/);
        const hMatch = svgBuffer.match(/height=["']([^"']+)["']/);
        if (wMatch && hMatch) {
          const w = parseFloat(wMatch[1]);
          const h = parseFloat(hMatch[1]);
          svgBuffer = svgBuffer.replace('<svg', `<svg viewBox="0 0 ${w} ${h}"`);
        }
      }

      // Convert to crisp transparent PNG at high resolution
      const image = sharp(Buffer.from(svgBuffer), { density: 300 });
      
      let processedBuffer;
      try {
        processedBuffer = await image.trim().toBuffer();
      } catch (e) {
        processedBuffer = await sharp(Buffer.from(svgBuffer), { density: 300 }).toBuffer();
      }
      
      // Resize nicely inside 240x100
      await sharp(processedBuffer)
        .resize({
          width: 240,
          height: 100,
          fit: 'inside',
          withoutEnlargement: false
        })
        .png()
        .toFile(pngFile);
      
      const meta = await sharp(pngFile).metadata();
      console.log(`✓ Processed ${b}.png: ${meta.width}x${meta.height}`);
    } catch (err) {
      console.error(`✗ Error processing ${b}:`, err.message);
    }
  }
}

processLogos();
