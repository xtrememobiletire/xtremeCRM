import sharp from "sharp";
import fs from "fs";
import path from "path";

const sourceImage = "C:/Users/bil_l/.gemini/antigravity/brain/4bb30556-d9ea-45ca-b1ce-91071719dd3f/.user_uploaded/media_1792312618340_78d41d2d.png";
const outputDir = "d:/Projects/xtremeCRM/Landingpage/public/brands";

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const brands = [
  // Row 1
  [
    { id: "audi", name: "Audi" },
    { id: "bmw", name: "BMW" },
    { id: "mercedes", name: "Mercedes" },
    { id: "volkswagen", name: "Volkswagen" },
    { id: "porsche", name: "Porsche" },
    { id: "mini", name: "Mini" },
    { id: "volvo", name: "Volvo" },
  ],
  // Row 2
  [
    { id: "alfa-romeo", name: "Alfa Romeo" },
    { id: "toyota", name: "Toyota" },
    { id: "lexus", name: "Lexus" },
    { id: "nissan", name: "Nissan" },
    { id: "mazda", name: "Mazda" },
    { id: "subaru", name: "Subaru" },
    { id: "honda", name: "Honda" },
  ],
  // Row 3
  [
    { id: "mitsubishi", name: "Mitsubishi" },
    { id: "suzuki", name: "Suzuki" },
    { id: "infiniti", name: "Infiniti" },
    { id: "hyundai", name: "Hyundai" },
    { id: "kia", name: "Kia" },
    { id: "ford", name: "Ford" },
    { id: "holden", name: "Holden" },
  ],
];

async function slice() {
  const metadata = await sharp(sourceImage).metadata();
  const W = metadata.width;
  const H = metadata.height;

  for (let r = 0; r < 3; r++) {
    const top = Math.round((r * H) / 3);
    const bottom = Math.round(((r + 1) * H) / 3);
    const height = bottom - top;

    for (let c = 0; c < 7; c++) {
      const left = Math.round((c * W) / 7);
      const right = Math.round(((c + 1) * W) / 7);
      const width = right - left;

      const item = brands[r][c];
      const outPath = path.join(outputDir, `${item.id}.png`);

      console.log(`Extracting ${item.id}: left=${left}, top=${top}, width=${width}, height=${height} (max bounds ${W}x${H})`);

      await sharp(sourceImage)
        .extract({ left, top, width, height })
        .png()
        .toFile(outPath);

      console.log(`Saved ${item.id}.png`);
    }
  }

  console.log("All 21 brand logos sliced successfully!");
}

slice().catch(console.error);
