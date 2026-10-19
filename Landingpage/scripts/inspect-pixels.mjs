import sharp from "sharp";
import path from "path";

const inputPath = "d:/Projects/xtremeCRM/Landingpage/public/founders-story.jpg";

async function run() {
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  console.log("Metadata:", metadata.width, metadata.height, metadata.channels);

  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  function getPixel(x, y) {
    const idx = (y * w + x) * 4;
    return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
  }

  console.log("Top-left (0,0):", getPixel(0, 0));
  console.log("Top-left (10,10):", getPixel(10, 10));
  console.log("Top-right (w-10,10):", getPixel(w - 10, 10));
  console.log("Top-center (w/2, 10):", getPixel(Math.floor(w / 2), 10));
  console.log("Middle-left (5, h/2):", getPixel(5, Math.floor(h / 2)));
  console.log("Middle-right (w-5, h/2):", getPixel(w - 5, Math.floor(h / 2)));
}

run().catch(console.error);
