import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outDir = path.join(process.cwd(), "src/lib/samples");

const items = [
  ["frame-a.jpg", "#f4efe6", "Gilt frame"],
  ["frame-b.jpg", "#efe4d4", "Gilt frame, another view"],
  ["linen.jpg", "#e7efe8", "Printed linen"],
  ["dish.jpg", "#f7f1ea", "Porcelain dish"],
  ["chair.jpg", "#e9e4dc", "Side chair"],
  ["mirror.jpg", "#f3eee6", "Wall mirror"],
  ["sketch.jpg", "#ece7df", "Unlisted sketch"],
];

function svg(fill, label) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <rect width="1200" height="900" fill="${fill}"/>
  <rect x="48" y="48" width="1104" height="804" fill="none" stroke="#b07c28" stroke-width="3"/>
  <text x="600" y="420" text-anchor="middle" font-family="Noto Serif, serif" font-size="54" fill="#000000">Sample data</text>
  <text x="600" y="490" text-anchor="middle" font-family="Noto Serif, serif" font-size="28" fill="#b07c28">${label}</text>
</svg>`;
}

await mkdir(outDir, { recursive: true });
for (const [name, fill, label] of items) {
  await sharp(Buffer.from(svg(fill, label))).jpeg({ quality: 82 }).toFile(path.join(outDir, name));
}
console.log(`wrote ${items.length} sample images`);
