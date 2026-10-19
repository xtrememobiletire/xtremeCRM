import sharp from "sharp";

async function checkBorders() {
  const image = sharp("public/founders-story.jpg");
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  // Check bottom edge, left edge, right edge, top edge
  console.log("Checking left edge (x=0..5):");
  for (let y = 0; y < h; y += 50) {
    let maxB = 0;
    for (let x = 0; x < 5; x++) {
      const idx = (y * w + x) * 4;
      const b = (data[idx] + data[idx+1] + data[idx+2]) / 3;
      if (b > maxB) maxB = b;
    }
    if (maxB > 15) console.log(`  Left edge at y=${y}: brightness=${maxB.toFixed(1)}`);
  }

  console.log("Checking right edge (x=w-5..w-1):");
  for (let y = 0; y < h; y += 50) {
    let maxB = 0;
    for (let x = w - 5; x < w; x++) {
      const idx = (y * w + x) * 4;
      const b = (data[idx] + data[idx+1] + data[idx+2]) / 3;
      if (b > maxB) maxB = b;
    }
    if (maxB > 15) console.log(`  Right edge at y=${y}: brightness=${maxB.toFixed(1)}`);
  }
}

checkBorders().catch(console.error);
