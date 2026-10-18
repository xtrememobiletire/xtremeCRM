import sharp from "sharp";
import fs from "fs";
import path from "path";

const sourceImage = "C:/Users/bil_l/.gemini/antigravity/brain/4bb30556-d9ea-45ca-b1ce-91071719dd3f/.user_uploaded/media_1792312618340_78d41d2d.png";
const outputDir = "d:/Projects/xtremeCRM/Landingpage/public/brands";

// Exact manually defined / verified brand boxes from span analysis:
// Row 1: y=10..85
// 1. Audi: x=40..150
// 2. BMW: x=158..275
// 3. Mercedes: x=282..420
// 4. Volkswagen: x=430..580
// 5. Porsche: x=595..720
// 6. Mini: x=728..838
// 7. Volvo: x=845..965
//
// Row 2: y=95..175
// 8. Alfa Romeo: x=32..182
// 9. Toyota: x=188..314
// 10. Lexus: x=322..442
// 11. Nissan: x=450..574
// 12. Mazda: x=580..704
// 13. Subaru: x=710..838
// 14. Honda: x=846..968
//
// Row 3: y=185..265
// 15. Mitsubishi: x=45..188
// 16. Suzuki: x=196..318
// 17. Infiniti: x=326..448
// 18. Hyundai: x=458..588
// 19. Kia: x=595..700
// 20. Ford: x=708..820
// 21. Holden: x=830..955

const brandBoxes = [
  // Row 1
  { id: "audi", name: "Audi", left: 40, top: 10, width: 110, height: 75 },
  { id: "bmw", name: "BMW", left: 158, top: 10, width: 117, height: 75 },
  { id: "mercedes", name: "Mercedes", left: 282, top: 10, width: 138, height: 75 },
  { id: "volkswagen", name: "Volkswagen", left: 430, top: 10, width: 150, height: 75 },
  { id: "porsche", name: "Porsche", left: 595, top: 10, width: 125, height: 75 },
  { id: "mini", name: "Mini", left: 728, top: 10, width: 110, height: 75 },
  { id: "volvo", name: "Volvo", left: 845, top: 10, width: 120, height: 75 },

  // Row 2
  { id: "alfa-romeo", name: "Alfa Romeo", left: 32, top: 95, width: 150, height: 80 },
  { id: "toyota", name: "Toyota", left: 188, top: 95, width: 126, height: 80 },
  { id: "lexus", name: "Lexus", left: 322, top: 95, width: 120, height: 80 },
  { id: "nissan", name: "Nissan", left: 450, top: 95, width: 124, height: 80 },
  { id: "mazda", name: "Mazda", left: 580, top: 95, width: 124, height: 80 },
  { id: "subaru", name: "Subaru", left: 710, top: 95, width: 128, height: 80 },
  { id: "honda", name: "Honda", left: 846, top: 95, width: 122, height: 80 },

  // Row 3
  { id: "mitsubishi", name: "Mitsubishi", left: 45, top: 185, width: 143, height: 80 },
  { id: "suzuki", name: "Suzuki", left: 196, top: 185, width: 122, height: 80 },
  { id: "infiniti", name: "Infiniti", left: 326, top: 185, width: 122, height: 80 },
  { id: "hyundai", name: "Hyundai", left: 458, top: 185, width: 130, height: 80 },
  { id: "kia", name: "Kia", left: 595, top: 185, width: 105, height: 80 },
  { id: "ford", name: "Ford", left: 708, top: 185, width: 112, height: 80 },
  { id: "holden", name: "Holden", left: 830, top: 185, width: 125, height: 80 },
];

async function extractExact() {
  for (const box of brandBoxes) {
    const outPath = path.join(outputDir, `${box.id}.png`);
    await sharp(sourceImage)
      .extract({ left: box.left, top: box.top, width: box.width, height: box.height })
      .trim({ threshold: 12 }) // trim black outer margin so it's perfectly centered
      .extend({
        top: 6,
        bottom: 6,
        left: 10,
        right: 10,
        background: { r: 0, g: 0, b: 0, alpha: 1 } // uniform padding
      })
      .png()
      .toFile(outPath);
    console.log(`Saved exact: ${box.id}.png`);
  }
  console.log("All 21 exact brand logos extracted with ZERO overlaps!");
}

extractExact().catch(console.error);
