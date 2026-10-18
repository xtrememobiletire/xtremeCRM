import sharp from "sharp";

const sourceImage = "C:/Users/bil_l/.gemini/antigravity/brain/4bb30556-d9ea-45ca-b1ce-91071719dd3f/.user_uploaded/media_1792312618340_78d41d2d.png";

async function detect() {
  const image = sharp(sourceImage);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  // Let's divide into 3 horizontal row bands
  const bands = [
    { name: "row1", top: 0, bottom: 90 },
    { name: "row2", top: 91, bottom: 180 },
    { name: "row3", top: 181, bottom: 271 }
  ];

  for (const band of bands) {
    console.log(`\n=== Analyzing ${band.name} (y=${band.top}..${band.bottom}) ===`);
    // Project horizontally: for each x from 0 to w-1, is there any bright pixel?
    const hasPixel = new Array(w).fill(false);
    for (let x = 0; x < w; x++) {
      for (let y = band.top; y <= band.bottom; y++) {
        const idx = (y * w + x) * info.channels;
        const b = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        if (b > 25) {
          hasPixel[x] = true;
          break;
        }
      }
    }

    // Find continuous spans of hasPixel = true
    const spans = [];
    let inSpan = false;
    let start = 0;
    for (let x = 0; x < w; x++) {
      if (hasPixel[x] && !inSpan) {
        inSpan = true;
        start = x;
      } else if (!hasPixel[x] && inSpan) {
        inSpan = false;
        // only keep spans of width >= 10
        if (x - start >= 10) {
          spans.push({ start, end: x - 1, width: x - start });
        }
      }
    }
    if (inSpan && w - start >= 10) {
      spans.push({ start, end: w - 1, width: w - start });
    }

    console.log(`Found ${spans.length} spans:`);
    spans.forEach((s, i) => console.log(`  Logo ${i + 1}: x=${s.start}..${s.end} (width=${s.width})`));
  }
}

detect().catch(console.error);
