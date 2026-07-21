import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const iconsDir = path.join(root, "public", "icons");
const source = path.join(iconsDir, "icon-source.png");
const appIcon = path.join(root, "src", "app", "icon.png");

if (!fs.existsSync(source)) {
  console.error(`
לא נמצא: public/icons/icon-source.png

שים כאן את האייקון שבחרת (PNG מרובע, מומלץ 512×512 ומעלה), ואז הרץ שוב:
  npm run icons
`);
  process.exit(1);
}

await sharp(source)
  .resize(192, 192, { fit: "cover" })
  .png()
  .toFile(path.join(iconsDir, "icon-192.png"));

await sharp(source)
  .resize(512, 512, { fit: "cover" })
  .png()
  .toFile(path.join(iconsDir, "icon-512.png"));

await sharp(source)
  .resize(512, 512, { fit: "cover" })
  .png()
  .toFile(appIcon);

console.log("נוצרו: public/icons/icon-192.png, icon-512.png, src/app/icon.png");
