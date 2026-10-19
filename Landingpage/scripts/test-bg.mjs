import sharp from "sharp";

async function test() {
  const image = sharp("public/founders-story.jpg");
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  // Let's sample along the border edges: top edge (y=0..50), left edge, right edge
  let topMax = 0;
  for (let y = 0; y < 50; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const b = (data[idx] + data[idx+1] + data[idx+2]) / 3;
      if (b > topMax) topMax = b;
    }
  }
  console.log("Max brightness in top 50 rows:", topMax);

  let leftMax = 0;
  for (let y = 0; y < h / 3; y++) {
    for (let x = 0; x < 50; x++) {
      const idx = (y * w + x) * 4;
      const b = (data[idx] + data[idx+1] + data[idx+2]) / 3;
      if (b > leftMax) leftMax = b;
    }
  }
  console.log("Max brightness in top-left 50x(h/3):", leftMax);

  let rightMax = 0;
  for (let y = 0; y < h / 3; y++) {
    for (let x = w - 50; x < w; x++) {
      const idx = (y * w + x) * 4;
      const b = (data[idx] + data[idx+1] + data[idx+2]) / 3;
      if (b > rightMax) rightMax = b;
    }
  }
  console.log("Max brightness in top-right 50x(h/3):", rightMax);
}

test().catch(console.error);
