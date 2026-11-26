// 静态导出：生成 900 档（交付稿）和 200 档（对比稿）两张 SVG，
// 以及一张“先横排再旋转”的等价稿。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPriceTag } from '../src/vertical-tag/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const CHARS = ['Ç', 'Ć', 'Č'];

const targets = [
  { name: 'price-tag-w900.svg', opts: { wght: 900 } },
  { name: 'price-tag-w200.svg', opts: { wght: 200 } },
  { name: 'price-tag-w900-rotated.svg', opts: { wght: 900, rotated: true } },
];

for (const { name, opts } of targets) {
  const { svg, layout, tagWidth, totalHeight } = renderPriceTag(CHARS, opts);
  const out = path.join(here, name);
  fs.writeFileSync(out, svg);
  const origins = layout.glyphs.map((g) => g.y).join(', ');
  console.log(
    `wrote ${name}: 字宽=${tagWidth} 起点=[${origins}] 总长=${totalHeight}`
  );
}
