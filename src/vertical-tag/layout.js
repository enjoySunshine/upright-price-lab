// 竖排布局引擎。
//
// 竖排规则：
//   - 每个字的横向位置全部相同（左对齐，x = 0），字宽 hAdv（586）只是
//     标签横向宽度，绝不是往下走的步长。
//   - 第 n 个字的竖向起点 = 前面各字竖向前进 vAdv 的累加。
//     900 档：0、962、962+1058=2020；总长 2020+1014=3034。
//   - 字重回到 200 时，vAdv 回到 1000，起点随之变成 0、1000、2000。

import { glyphAt, glyphForCodePoint, WEIGHT_AXIS } from './experimental-font.js';

export function layoutVertical(chars, wght = WEIGHT_AXIS.default) {
  let cursorY = 0;
  const glyphs = chars.map((char) => {
    const glyph =
      typeof char === 'number' ? glyphForCodePoint(char, wght) : glyphAt(char, wght);
    const positioned = {
      ...glyph,
      x: 0,
      y: cursorY,
    };
    cursorY += glyph.vAdv;
    return positioned;
  });
  return {
    wght,
    glyphs,
    // 整列竖向总长 = 各 vAdv 之和，不是字宽相加，也不是 vAdv 乘字数。
    totalHeight: cursorY,
  };
}

// 同一张价签的“先横排再整列旋转 90°”等价方案。
// 横排时各字沿 x 按 vAdv 前进（不是 hAdv），整组再绕原点转 90°，
// 旋转矩阵 (x,y) -> (-y,x) 后，原 x 偏移就变成向下的竖向起点，
// 路径命令本身保持原样，所以三条路径开头仍是 M354 -12，总长仍是 3034。
export function layoutRotated(chars, wght = WEIGHT_AXIS.default) {
  let cursorX = 0;
  const glyphs = chars.map((char) => {
    const glyph =
      typeof char === 'number' ? glyphForCodePoint(char, wght) : glyphAt(char, wght);
    const positioned = {
      ...glyph,
      x: 0,
      y: cursorX, // 旋转前沿横排方向累积 vAdv，旋转后即竖向起点
    };
    cursorX += glyph.vAdv;
    return positioned;
  });
  return {
    wght,
    glyphs,
    totalHeight: cursorX,
    rotated: true,
  };
}
