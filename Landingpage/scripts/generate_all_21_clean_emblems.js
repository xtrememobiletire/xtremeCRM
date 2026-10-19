const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const brandsDir = path.join(__dirname, '..', 'public', 'brands');
const simpleIconsDir = path.join(__dirname, '..', 'node_modules', 'simple-icons', 'icons');

// Helper to recolor simple monochrome SVGs to silver/white (#f5f5f7) so they pop on dark cards
function recolorSvgToSilver(svgString, color = '#f5f5f7') {
  // If fill exists, replace it, otherwise add fill to path
  let result = svgString;
  if (/fill="[^"]+"/.test(result)) {
    result = result.replace(/fill="[^"]+"/g, `fill="${color}"`);
  } else {
    result = result.replace(/<path/g, `<path fill="${color}"`);
  }
  // Also remove any fill in styles
  result = result.replace(/fill:\s*[^;"]+/g, `fill:${color}`);
  return result;
}

async function renderToBrandPng(svgContent, targetName, options = {}) {
  const targetPath = path.join(brandsDir, `${targetName}.png`);
  
  // Ensure viewBox exists
  if (!svgContent.includes('viewBox')) {
    const wMatch = svgContent.match(/width=["']([^"']+)["']/);
    const hMatch = svgContent.match(/height=["']([^"']+)["']/);
    if (wMatch && hMatch) {
      const w = parseFloat(wMatch[1]);
      const h = parseFloat(hMatch[1]);
      svgContent = svgContent.replace('<svg', `<svg viewBox="0 0 ${w} ${h}"`);
    }
  }

  const density = options.density || 300;
  let img = sharp(Buffer.from(svgContent), { density, limitInputPixels: false });

  try {
    const trimmed = await img.trim().toBuffer();
    await sharp(trimmed)
      .resize({
        width: 260,
        height: 120,
        fit: 'inside',
        withoutEnlargement: false
      })
      .png()
      .toFile(targetPath);
  } catch (err) {
    await sharp(Buffer.from(svgContent), { density, limitInputPixels: false })
      .resize({
        width: 260,
        height: 120,
        fit: 'inside',
        withoutEnlargement: false
      })
      .png()
      .toFile(targetPath);
  }

  const meta = await sharp(targetPath).metadata();
  console.log(`✓ Generated ${targetName}.png (${meta.width}x${meta.height})`);
}

async function buildAll() {
  console.log('Generating all 21 brand emblems...');

  // 1. AUDI (4 rings in bright silver)
  let audiSvg = fs.readFileSync(path.join(brandsDir, 'audi.svg'), 'utf8');
  audiSvg = recolorSvgToSilver(audiSvg, '#ffffff');
  await renderToBrandPng(audiSvg, 'audi');

  // 2. BMW (Full-color official roundel)
  const bmwSvg = fs.readFileSync(path.join(brandsDir, 'bmw.svg'), 'utf8');
  await renderToBrandPng(bmwSvg, 'bmw');

  // 3. MERCEDES (3D silver chrome star)
  const mercedesSvg = fs.readFileSync(path.join(brandsDir, 'mercedes.svg'), 'utf8');
  await renderToBrandPng(mercedesSvg, 'mercedes');

  // 4. VOLKSWAGEN (Crisp silver/white circular VW emblem)
  let vwSvg = fs.readFileSync(path.join(brandsDir, 'volkswagen.svg'), 'utf8');
  vwSvg = vwSvg.replace(/style="fill:[^"]*"/g, 'fill="#ffffff"');
  vwSvg = recolorSvgToSilver(vwSvg, '#ffffff');
  await renderToBrandPng(vwSvg, 'volkswagen');

  // 5. PORSCHE (Official crest gold/red/black)
  const porscheSvg = fs.readFileSync(path.join(brandsDir, 'porsche.svg'), 'utf8');
  await renderToBrandPng(porscheSvg, 'porsche');

  // 6. MINI (Winged emblem in bright crisp silver/white)
  let miniSvg = fs.readFileSync(path.join(brandsDir, 'mini.svg'), 'utf8');
  miniSvg = miniSvg.replace(/style="fill:[^"]*"/g, 'fill="#ffffff"');
  miniSvg = miniSvg.replace(/fill="#120a08"/g, 'fill="#ffffff"');
  miniSvg = recolorSvgToSilver(miniSvg, '#ffffff');
  await renderToBrandPng(miniSvg, 'mini');

  // 7. VOLVO (Iron Mark in bright silver)
  let volvoSvg = fs.readFileSync(path.join(simpleIconsDir, 'volvo.svg'), 'utf8');
  volvoSvg = recolorSvgToSilver(volvoSvg, '#003057'); // Volvo classic navy blue with white or silver
  // Or pure silver:
  volvoSvg = recolorSvgToSilver(volvoSvg, '#ffffff');
  await renderToBrandPng(volvoSvg, 'volvo');

  // 8. ALFA ROMEO (Official circular crest)
  const alfaSvg = fs.readFileSync(path.join(brandsDir, 'alfa-romeo.svg'), 'utf8');
  await renderToBrandPng(alfaSvg, 'alfa-romeo');

  // 9. TOYOTA (3 ovals emblem in silver/white)
  let toyotaSvg = fs.readFileSync(path.join(simpleIconsDir, 'toyota.svg'), 'utf8');
  toyotaSvg = recolorSvgToSilver(toyotaSvg, '#ffffff');
  await renderToBrandPng(toyotaSvg, 'toyota');

  // 10. LEXUS (L in oval emblem isolated)
  let lexusSvg = fs.readFileSync(path.join(brandsDir, 'lexus.svg'), 'utf8');
  // Crop to L emblem only: viewBox="15 15 135 105"
  lexusSvg = lexusSvg.replace('<svg xmlns="http://www.w3.org/2000/svg" width="602.36218" height="131.70473">', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="15 15 135 105" width="135" height="105">');
  lexusSvg = recolorSvgToSilver(lexusSvg, '#ffffff');
  await renderToBrandPng(lexusSvg, 'lexus');

  // 11. NISSAN (Nissan emblem in silver/white)
  let nissanSvg = fs.readFileSync(path.join(simpleIconsDir, 'nissan.svg'), 'utf8');
  nissanSvg = recolorSvgToSilver(nissanSvg, '#ffffff');
  await renderToBrandPng(nissanSvg, 'nissan');

  // 12. MAZDA (Winged M emblem in silver/white)
  let mazdaSvg = fs.readFileSync(path.join(simpleIconsDir, 'mazda.svg'), 'utf8');
  mazdaSvg = recolorSvgToSilver(mazdaSvg, '#ffffff');
  await renderToBrandPng(mazdaSvg, 'mazda');

  // 13. SUBARU (Subaru 6 stars oval in iconic Subaru blue/silver)
  let subaruSvg = fs.readFileSync(path.join(simpleIconsDir, 'subaru.svg'), 'utf8');
  subaruSvg = recolorSvgToSilver(subaruSvg, '#1ba3e1'); // vibrant subaru rally blue / cyan
  await renderToBrandPng(subaruSvg, 'subaru');

  // 14. HONDA (Honda H emblem in silver/white)
  let hondaSvg = fs.readFileSync(path.join(simpleIconsDir, 'honda.svg'), 'utf8');
  hondaSvg = recolorSvgToSilver(hondaSvg, '#ffffff');
  await renderToBrandPng(hondaSvg, 'honda');

  // 15. MITSUBISHI (3 bright red diamonds)
  let mitsubishiSvg = fs.readFileSync(path.join(brandsDir, 'mitsubishi.svg'), 'utf8');
  await renderToBrandPng(mitsubishiSvg, 'mitsubishi');

  // 16. SUZUKI (Bright red S emblem)
  let suzukiSvg = fs.readFileSync(path.join(brandsDir, 'suzuki.svg'), 'utf8');
  await renderToBrandPng(suzukiSvg, 'suzuki');

  // 17. INFINITI (Pure emblem without wordmark)
  let infinitiSvg = fs.readFileSync(path.join(brandsDir, 'infiniti.svg'), 'utf8');
  infinitiSvg = infinitiSvg.replace('viewBox="0 0 3000 1441"', 'viewBox="750 0 1500 800"');
  infinitiSvg = recolorSvgToSilver(infinitiSvg, '#ffffff');
  await renderToBrandPng(infinitiSvg, 'infiniti');

  // 18. HYUNDAI (Hyundai slanted H in silver/white)
  let hyundaiSvg = fs.readFileSync(path.join(simpleIconsDir, 'hyundai.svg'), 'utf8');
  hyundaiSvg = recolorSvgToSilver(hyundaiSvg, '#ffffff');
  await renderToBrandPng(hyundaiSvg, 'hyundai');

  // 19. KIA (Kia oval emblem in silver/white)
  let kiaSvg = fs.readFileSync(path.join(brandsDir, 'kia.svg'), 'utf8');
  kiaSvg = recolorSvgToSilver(kiaSvg, '#ffffff');
  await renderToBrandPng(kiaSvg, 'kia');

  // 20. FORD (Official blue oval)
  const fordSvg = fs.readFileSync(path.join(brandsDir, 'ford.svg'), 'utf8');
  await renderToBrandPng(fordSvg, 'ford');

  // 21. HOLDEN (Authentic red circle + white lion emblem)
  let holdenSvg = fs.readFileSync(path.join(brandsDir, 'holden.svg'), 'utf8');
  await renderToBrandPng(holdenSvg, 'holden');

  console.log('ALL 21 EMBLEMS GENERATED SUCCESSFULLY!');
}

buildAll().catch(err => {
  console.error('Fatal error building emblems:', err);
});
