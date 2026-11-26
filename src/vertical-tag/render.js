// 矢量预览渲染器：把竖排结果画成一张可量坐标的 SVG。
//
// 字体坐标 y 向上，SVG 坐标 y 向下，所以每个字套 scale(1,-1) 并平移到
// 它的竖向起点 y。这样在 SVG 里直接量到的第二个字左上角起点就是 962。

import { layoutVertical, layoutRotated } from './layout.js';

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      default:
        return '&quot;';
    }
  });
}

// 标尺：在标签左侧的留白里标出每个竖向起点和总长。
function renderRuler(glyphs, totalHeight, gutter) {
  const marks = glyphs
    .map((g, i) => {
      const label = `第${i + 1}字 y=${g.y}`;
      return [
        `<line x1="${gutter - 18}" y1="${g.y}" x2="${gutter}" y2="${g.y}" stroke="#c0392b" stroke-width="2" stroke-dasharray="8 6"/>`,
        `<text x="${gutter - 24}" y="${g.y + 10}" text-anchor="end" font-family="monospace" font-size="26" fill="#c0392b">${escapeXml(
          label
        )}</text>`,
      ].join('\n  ');
    })
    .join('\n  ');
  const bottom = [
    `<line x1="${gutter - 18}" y1="${totalHeight}" x2="${gutter}" y2="${totalHeight}" stroke="#c0392b" stroke-width="2" stroke-dasharray="8 6"/>`,
    `<text x="${gutter - 24}" y="${totalHeight - 8}" text-anchor="end" font-family="monospace" font-size="26" fill="#c0392b">总长 y=${totalHeight}</text>`,
  ].join('\n  ');
  return [marks, bottom].join('\n  ');
}

// options:
//   wght     字重（默认 200）
//   rotated  true 时用“先横排再旋转 90°”的等价方案
//   gutter   左侧标尺留白宽度
//   ruler    是否画标尺（默认 true）
export function renderPriceTag(chars, options = {}) {
  const { wght = 200, rotated = false, gutter = 360, ruler = true } = options;
  const layout = rotated
    ? layoutRotated(chars, wght)
    : layoutVertical(chars, wght);
  const tagWidth = layout.glyphs[0]
    ? Math.max(...layout.glyphs.map((g) => g.hAdv))
    : 0;
  const totalHeight = layout.totalHeight;

  const body = layout.glyphs
    .map((g, i) => {
      // scale(1,-1) 把字体坐标翻成 SVG 坐标；translate 的 y 即竖向起点。
      // 旋转方案：在字体坐标里沿 x 按 vAdv 横排，再 rotate(90)（SVG 的 y
      // 向下，顺时针 90° 把横排方向映射成竖直向下）。旋转会把字形甩到负 x，
      // 最外层再平移一个字宽 hAdv 把整列移回标签宽度内；路径命令本身不动，
      // 所以三条路径开头仍是原样，起点和总长与直排一致。
      const transform = rotated
        ? `translate(${tagWidth} ${g.y}) rotate(90) scale(1 -1)`
        : `translate(0 ${g.y}) scale(1 -1)`;
      return [
        `<g class="glyph glyph-${i + 1}" data-char="${escapeXml(g.char)}" data-x="${g.x}" data-y="${g.y}" data-vadv="${g.vAdv}" data-hadv="${g.hAdv}">`,
        `  <path d="${g.path}" transform="${transform}" fill="#1a1a1a"/>`,
        `  <circle cx="${gutter + 4}" cy="${g.y + 4}" r="5" fill="#c0392b"/>`,
        `</g>`,
      ].join('\n  ');
    })
    .join('\n  ');

  const viewBoxWidth = ruler ? tagWidth + gutter : tagWidth;
  const offsetX = ruler ? gutter : 0;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxWidth} ${totalHeight}" width="${viewBoxWidth}" height="${totalHeight}">
  <title>竖排价签 ${escapeXml(chars.join(''))} @wght${wght}</title>
  <g transform="translate(${offsetX} 0)">
    <rect x="0" y="0" width="${tagWidth}" height="${totalHeight}" fill="#f7f3e8" stroke="#888" stroke-width="2"/>
    ${ruler ? renderRuler(layout.glyphs, totalHeight, gutter) : ''}
    ${body}
  </g>
</svg>
`;
  return { svg, layout, tagWidth, totalHeight };
}
