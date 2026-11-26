// 试验字：只有一条字重轴（wght: 200–900，默认 200）。
// 字符只有 Ç(0x00C7)、Ć(0x0106)、Č(0x010C)。
// 每个字符在两个字重主控（200 / 900）各有一条路径，两条路径的
// 命令骨架完全一致，只有坐标不同——这是一条真正可插值的可变字体数据模型。
//
// 约定的关键数据：
//   200（不拉轴）：hAdv = 562，vAdv(Ç) = 1000，路径开头 M328 -12
//   900（最重档）：hAdv = 586，vAdv = 962 / 1058 / 1014，路径开头 M354 -12
//
// 坐标沿用字体坐标系：y 向上为正，基线 y=0。

export const WEIGHT_AXIS = Object.freeze({
  tag: 'wght',
  name: 'Weight',
  min: 200,
  default: 200,
  max: 900,
});

export const GLYPH_ORDER = Object.freeze([
  { char: 'Ç', codePoint: 0x00c7, name: 'Ccedilla' },
  { char: 'Ć', codePoint: 0x0106, name: 'Cacute' },
  { char: 'Č', codePoint: 0x010c, name: 'Ccaron' },
]);

// C 主体的命令骨架（两个字重主控共用）。
const C_SKELETON = [
  ['M'],
  ['L'],
  ['C'],
  ['C'],
  ['C'],
  ['L'],
  ['C'],
  ['C'],
  ['C'],
  ['L'],
  ['Z'],
];

// 200 主控的 C 主体坐标。起点就是 M328 -12。
const C_MASTER_200 = [
  [328, -12],
  [250, -12],
  [195, -12, 150, 33, 150, 88],
  [150, 253, 195, 340, 250, 340],
  [279, 340, 306, 328, 328, 308],
  [328, 245],
  [292, 268, 245, 268, 245, 203],
  [245, 140, 292, 60, 328, 83],
  [328, 61, 328, 37, 328, 12],
  [328, -12],
  [],
];

// 900 主控的 C 主体坐标。笔画更粗、字宽 586。起点是 M354 -12（另一条路径）。
const C_MASTER_900 = [
  [354, -12],
  [266, -12],
  [196, -12, 140, 44, 140, 114],
  [140, 300, 196, 394, 266, 394],
  [299, 394, 330, 380, 354, 356],
  [354, 282],
  [309, 310, 252, 310, 252, 236],
  [252, 162, 309, 72, 354, 100],
  [354, 74, 354, 46, 354, 16],
  [354, -12],
  [],
];

// 音符的命令骨架（三个音符共用同一种四点闭合骨架）。
const MARK_SKELETON = [
  ['M'],
  ['L'],
  ['L'],
  ['L'],
  ['Z'],
];

const CEDILLA_200 = [
  [238, -36],
  [300, -36],
  [282, -118],
  [222, -92],
  [],
];

const CEDILLA_900 = [
  [252, -40],
  [322, -40],
  [302, -132],
  [234, -102],
  [],
];

const ACUTE_200 = [
  [268, 372],
  [318, 452],
  [286, 476],
  [236, 392],
  [],
];

const ACUTE_900 = [
  [288, 430],
  [344, 522],
  [308, 550],
  [252, 454],
  [],
];

const CARON_200 = [
  [226, 470],
  [278, 418],
  [330, 470],
  [304, 470],
  [],
];

const CARON_900 = [
  [244, 540],
  [300, 482],
  [356, 540],
  [326, 540],
  [],
];

// 每个字符：骨架 + 两个主控的坐标与度量。
const GLYPH_DATA = {
  'Ç': {
    skeleton: [...C_SKELETON, ...MARK_SKELETON],
    masters: {
      200: {
        coords: [...C_MASTER_200, ...CEDILLA_200],
        hAdv: 562,
        vAdv: 1000,
      },
      900: {
        coords: [...C_MASTER_900, ...CEDILLA_900],
        hAdv: 586,
        vAdv: 962,
      },
    },
  },
  'Ć': {
    skeleton: [...C_SKELETON, ...MARK_SKELETON],
    masters: {
      // 题目只钉住了 Ç 在 200 档的路径；Ć/Č 的 200 档用同一 C 主体
      // 加各自音符，便于和 900 档做完整对比。
      200: {
        coords: [...C_MASTER_200, ...ACUTE_200],
        hAdv: 562,
        vAdv: 1000,
      },
      900: {
        coords: [...C_MASTER_900, ...ACUTE_900],
        hAdv: 586,
        vAdv: 1058,
      },
    },
  },
  'Č': {
    skeleton: [...C_SKELETON, ...MARK_SKELETON],
    masters: {
      200: {
        coords: [...C_MASTER_200, ...CARON_200],
        hAdv: 562,
        vAdv: 1000,
      },
      900: {
        coords: [...C_MASTER_900, ...CARON_900],
        hAdv: 586,
        vAdv: 1014,
      },
    },
  },
};

function assertSkeletonConsistent(char) {
  const { skeleton, masters } = GLYPH_DATA[char];
  for (const wght of [200, 900]) {
    const coords = masters[wght].coords;
    if (coords.length !== skeleton.length) {
      throw new Error(`${char} @${wght}: 坐标段数与命令骨架不一致`);
    }
    for (let i = 0; i < skeleton.length; i++) {
      const want = skeleton[i][0];
      const got = coords[i].length;
      // M/L 各 2 个数，C 6 个数，Z 0 个数。
      const ok =
        (want === 'Z' && got === 0) ||
        ((want === 'M' || want === 'L') && got === 2) ||
        (want === 'C' && got === 6);
      if (!ok) {
        throw new Error(`${char} @${wght}: 第 ${i} 条命令 ${want} 的参数个数不对`);
      }
    }
  }
}

for (const { char } of GLYPH_ORDER) {
  assertSkeletonConsistent(char);
}

function clampWeight(wght) {
  if (Number.isNaN(wght)) {
    return WEIGHT_AXIS.default;
  }
  return Math.min(WEIGHT_AXIS.max, Math.max(WEIGHT_AXIS.min, wght));
}

// 200→900 的线性插值因子。
function weightFactor(wght) {
  return (clampWeight(wght) - WEIGHT_AXIS.min) / (WEIGHT_AXIS.max - WEIGHT_AXIS.min);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function fmt(n) {
  // 端点必须精确回到整数（328/354/562/586…），中间档保留两位小数。
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
}

function interpolatedCoords(char, wght) {
  const data = GLYPH_DATA[char];
  const t = weightFactor(wght);
  if (t === 0) {
    return data.masters[200].coords.map((row) => row.slice());
  }
  if (t === 1) {
    return data.masters[900].coords.map((row) => row.slice());
  }
  return data.masters[200].coords.map((row, i) =>
    row.map((v, j) => lerp(v, data.masters[900].coords[i][j], t))
  );
}

// 取某字重下的字形：度量 + 按字符取到的那一条路径。
export function glyphAt(char, wght = WEIGHT_AXIS.default) {
  const data = GLYPH_DATA[char];
  if (!data) {
    throw new Error(`试验字里没有字符 ${char}`);
  }
  const w = clampWeight(wght);
  const t = weightFactor(w);
  const m0 = data.masters[200];
  const m1 = data.masters[900];
  const coords = interpolatedCoords(char, w);
  const parts = [];
  for (let i = 0; i < data.skeleton.length; i++) {
    const cmd = data.skeleton[i][0];
    const row = coords[i];
    if (cmd === 'Z') {
      parts.push('Z');
    } else {
      parts.push(cmd + ' ' + row.map(fmt).join(' '));
    }
  }
  const d = parts.join(' ');
  // 题目里的路径开头形式（无空格 M + 坐标），与 SVG 序列化的 'M 354 -12' 等价。
  const first = coords[0];
  const pathStart = `M${fmt(first[0])} ${fmt(first[1])}`;
  return {
    char,
    wght: w,
    hAdv: Math.round(lerp(m0.hAdv, m1.hAdv, t)),
    vAdv: Math.round(lerp(m0.vAdv, m1.vAdv, t)),
    path: d,
    // 路径开头，便于断言“两条路径不是同一条”。
    pathStart,
  };
}

export function glyphForCodePoint(codePoint, wght = WEIGHT_AXIS.default) {
  const entry = GLYPH_ORDER.find((g) => g.codePoint === codePoint);
  if (!entry) {
    throw new Error(`试验字里没有码位 U+${codePoint.toString(16).toUpperCase()}`);
  }
  return glyphAt(entry.char, wght);
}

// 预览里那条滑块要用的字重轴描述。
export function getAxis() {
  return { ...WEIGHT_AXIS };
}
