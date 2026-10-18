import sharp from "sharp";

async function createCutout() {
  const image = sharp("public/founders-story.jpg");
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  const visited = new Uint8Array(w * h);
  const queue = [];

  function push(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    queue.push(x, y);
  }

  // Seed with top row, and upper portions of left & right borders
  for (let x = 0; x < w; x++) push(x, 0);
  for (let y = 0; y < 580; y++) {
    push(0, y);
    push(w - 1, y);
  }

  let head = 0;
  const threshold = 18;

  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];

    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1]
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const nidx = ny * w + nx;
        if (!visited[nidx]) {
          const pidx = nidx * 4;
          const b = (data[pidx] + data[pidx + 1] + data[pidx + 2]) / 3;
          if (b <= threshold) {
            visited[nidx] = 1;
            queue.push(nx, ny);
          }
        }
      }
    }
  }

  // Alpha buffer
  const alphaBuffer = new Uint8Array(w * h);
  const fadeStart = h - 100; // start fading bottom 100 pixels

  for (let y = 0; y < h; y++) {
    let bottomFactor = 1.0;
    if (y > fadeStart) {
      bottomFactor = Math.max(0, 1.0 - (y - fadeStart) / (h - fadeStart));
      // smooth ease curve
      bottomFactor = bottomFactor * bottomFactor;
    }

    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (visited[idx]) {
        alphaBuffer[idx] = 0;
      } else {
        alphaBuffer[idx] = Math.round(255 * bottomFactor);
      }
    }
  }

  // Blur mask slightly for smooth anti-aliased hair & edges
  const blurredMask = await sharp(alphaBuffer, {
    raw: { width: w, height: h, channels: 1 }
  })
    .blur(1.2)
    .raw()
    .toBuffer();

  const outData = Buffer.from(data);
  for (let i = 0; i < w * h; i++) {
    outData[i * 4 + 3] = blurredMask[i];
  }

  await sharp(outData, {
    raw: { width: w, height: h, channels: 4 }
  })
    .png({ quality: 95, compressionLevel: 9 })
    .toFile("public/founders-cutout.png");

  console.log("public/founders-cutout.png created with smooth edge feathering and bottom fade!");
}

createCutout().catch(console.error);
