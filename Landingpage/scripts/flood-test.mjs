import sharp from "sharp";

async function analyzeBackground() {
  const image = sharp("public/founders-story.jpg");
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  // We can do a BFS flood fill from the borders for any pixel with brightness <= threshold
  // Let's test what threshold works best.
  // Pixels to start flood fill:
  // Top edge (all x), left edge (y=0..500), right edge (y=0..500)
  
  const visited = new Uint8Array(w * h);
  const queue = [];

  function push(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    queue.push(x, y);
  }

  // Seed with top row, top-left column, top-right column
  for (let x = 0; x < w; x++) push(x, 0);
  for (let y = 0; y < 500; y++) {
    push(0, y);
    push(w - 1, y);
  }

  let head = 0;
  const threshold = 18; // pure black background is <= 13
  let count = 0;

  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];
    count++;

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

  console.log(`Flood-filled ${count} pixels out of ${w * h} (${((count / (w * h)) * 100).toFixed(1)}%) with threshold ${threshold}`);
}

analyzeBackground().catch(console.error);
