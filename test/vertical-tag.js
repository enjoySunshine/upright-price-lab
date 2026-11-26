import assert from 'assert';
import {
  WEIGHT_AXIS,
  GLYPH_ORDER,
  glyphAt,
  glyphForCodePoint,
  layoutVertical,
  layoutRotated,
  renderPriceTag,
} from '../src/vertical-tag/index.js';

const CHARS = ['Ç', 'Ć', 'Č'];

// SVG 路径序列化时命令与数字间会带空格（"M 354 -12"），
// 归一化后再和无空格的 pathStart（"M354 -12"）比较。
const squash = (s) => s.replace(/\s+/g, ' ').replace(/([MLCZ]) /g, '$1');

describe('vertical-tag experimental font', function () {
  it('只有一条 wght 轴，范围 200–900，默认停在 200', function () {
    assert.deepEqual(
      { tag: WEIGHT_AXIS.tag, min: WEIGHT_AXIS.min, def: WEIGHT_AXIS.default, max: WEIGHT_AXIS.max },
      { tag: 'wght', min: 200, def: 200, max: 900 }
    );
  });

  it('字符集只有 Ç、Ć、Č', function () {
    assert.deepEqual(GLYPH_ORDER.map((g) => g.char), CHARS);
    assert.throws(() => glyphAt('A'), /没有字符/);
  });

  it('900 档：三字字宽都是 586，vAdv 分别为 962/1058/1014', function () {
    const glyphs = CHARS.map((c) => glyphAt(c, 900));
    assert.deepEqual(glyphs.map((g) => g.hAdv), [586, 586, 586]);
    assert.deepEqual(glyphs.map((g) => g.vAdv), [962, 1058, 1014]);
  });

  it('900 档：三条路径开头都是 M354 -12', function () {
    for (const c of CHARS) {
      assert.equal(glyphAt(c, 900).pathStart, 'M354 -12');
    }
  });

  it('200 档（不拉轴）：Ç 字宽 562、vAdv 1000、路径开头 M328 -12', function () {
    const cedilla = glyphAt('Ç', 200);
    assert.equal(cedilla.hAdv, 562);
    assert.equal(cedilla.vAdv, 1000);
    assert.equal(cedilla.pathStart, 'M328 -12');
    // 默认参数就是不拉轴。
    assert.equal(glyphAt('Ç').pathStart, 'M328 -12');
  });

  it('200 与 900 不是同一条路径（M328 ≠ M354）', function () {
    assert.notEqual(glyphAt('Ç', 200).path, glyphAt('Ç', 900).path);
    assert.notEqual(glyphAt('Ç', 200).pathStart, glyphAt('Ç', 900).pathStart);
  });

  it('按码位取字与按字符取字得到同一条路径', function () {
    const byChar = glyphAt('Č', 900);
    const byCode = glyphForCodePoint(0x010c, 900);
    assert.equal(byCode.path, byChar.path);
    assert.equal(byCode.vAdv, 1014);
  });

  it('字重被夹在 200–900 之间，端点精确回到整数度量', function () {
    assert.equal(glyphAt('Ç', 50).vAdv, glyphAt('Ç', 200).vAdv);
    assert.equal(glyphAt('Ç', 9999).pathStart, 'M354 -12');
    assert.equal(glyphAt('Ç', 900).hAdv, 586);
  });

  it('中间字重的度量是两端的线性插值', function () {
    const mid = glyphAt('Ç', 550); // t = 0.5
    assert.equal(mid.hAdv, (562 + 586) / 2);
    assert.equal(mid.vAdv, (1000 + 962) / 2);
  });

  it('200 与 900 是同一命令骨架、不同坐标（可插值的可变字重）', function () {
    const commands = (d) => d.match(/[MLCZ]/g).join('');
    for (const c of CHARS) {
      assert.equal(
        commands(glyphAt(c, 200).path),
        commands(glyphAt(c, 900).path),
        `${c} 两档命令序列必须一致`
      );
      assert.notEqual(glyphAt(c, 200).path, glyphAt(c, 900).path);
    }
  });

  it('中间字重的路径开头在 328→354 之间连续插值', function () {
    const mid = glyphAt('Ç', 550); // t = 0.5，x 起点 = (328+354)/2 = 341
    assert.equal(mid.pathStart, 'M341 -12');
  });
});

describe('vertical-tag vertical layout', function () {
  it('900 档：竖向起点严格为 0、962、2020，总长 3034', function () {
    const layout = layoutVertical(CHARS, 900);
    assert.deepEqual(layout.glyphs.map((g) => g.y), [0, 962, 2020]);
    assert.equal(layout.totalHeight, 3034);
    // 2020 必须是 962+1058，而不是 962×2。
    assert.equal(layout.glyphs[2].y, 962 + 1058);
    assert.notEqual(layout.glyphs[2].y, 962 * 2);
  });

  it('900 档：三个字 x 全部为 0（左对齐，不按 586 横错）', function () {
    const layout = layoutVertical(CHARS, 900);
    assert.ok(layout.glyphs.every((g) => g.x === 0));
    // 任何一个字的 y 都不允许等于字宽 586。
    assert.ok(!layout.glyphs.some((g) => g.y === 586));
  });

  it('字宽 586 不参与竖向定位，定位只用 vAdv', function () {
    const layout = layoutVertical(CHARS, 900);
    let acc = 0;
    for (const g of layout.glyphs) {
      assert.equal(g.y, acc);
      acc += g.vAdv;
    }
    assert.equal(acc, 962 + 1058 + 1014);
  });

  it('切回 200 档：vAdv 回到 1000，第二字起点回到 1000，不残留 962', function () {
    const layout = layoutVertical(CHARS, 200);
    assert.deepEqual(layout.glyphs.map((g) => g.vAdv), [1000, 1000, 1000]);
    assert.deepEqual(layout.glyphs.map((g) => g.y), [0, 1000, 2000]);
    assert.equal(layout.totalHeight, 3000);
    assert.ok(!layout.glyphs.some((g) => g.y === 962));
  });

  it('拖动字重时起点随 vAdv 连续变化（预览联动）', function () {
    const w700 = layoutVertical(CHARS, 700);
    // Ç 的 vAdv 在 700（t=5/7）: 1000 + (962-1000)*5/7
    const expectedCedilla = Math.round(1000 + (962 - 1000) * (500 / 700));
    assert.equal(w700.glyphs[0].vAdv, expectedCedilla);
    assert.equal(w700.glyphs[1].y, expectedCedilla);
    assert.equal(
      w700.glyphs[2].y,
      w700.glyphs[0].vAdv + w700.glyphs[1].vAdv
    );
  });

  it('旋转等价方案：路径原样不动，起点与总长和直排一致', function () {
    const direct = layoutVertical(CHARS, 900);
    const rotated = layoutRotated(CHARS, 900);
    assert.equal(rotated.totalHeight, 3034);
    assert.deepEqual(rotated.glyphs.map((g) => g.y), [0, 962, 2020]);
    assert.deepEqual(
      rotated.glyphs.map((g) => g.pathStart),
      direct.glyphs.map((g) => g.pathStart)
    );
    // 路径命令本身完全没有被改写。
    assert.deepEqual(
      rotated.glyphs.map((g) => g.path),
      direct.glyphs.map((g) => g.path)
    );
  });
});

describe('vertical-tag SVG preview', function () {
  it('900 档 SVG：第二字 data-y=962、第三字 data-y=2020、viewBox 高 3034', function () {
    const { svg, totalHeight, tagWidth } = renderPriceTag(CHARS, { wght: 900 });
    assert.equal(totalHeight, 3034);
    assert.equal(tagWidth, 586);
    assert.match(svg, /data-y="0"/);
    assert.match(svg, /data-y="962"/);
    assert.match(svg, /data-y="2020"/);
    assert.match(svg, /viewBox="0 0 \d+ 3034"/);
    // 标尺上直接标出 962，打开即可量。
    assert.match(svg, /第2字 y=962/);
  });

  it('SVG 里画出的轮廓就是按字符取到的那条路径', function () {
    const { svg, layout } = renderPriceTag(CHARS, { wght: 900, ruler: false });
    const flat = squash(svg);
    for (const g of layout.glyphs) {
      assert.ok(flat.includes(`d="${squash(g.path)}"`), `缺少 ${g.char} 的路径`);
      assert.equal(g.pathStart, 'M354 -12');
    }
  });

  it('200 档 SVG：轮廓切回 M328 -12，标尺显示第二字 y=1000', function () {
    const { svg } = renderPriceTag(CHARS, { wght: 200 });
    assert.match(squash(svg), /d="M328 -12/);
    assert.ok(!/M354 -12/.test(squash(svg)));
    assert.match(svg, /第2字 y=1000/);
    assert.ok(!/y=962/.test(svg));
  });

  it('所有字形组的 data-x 都是 0，不存在横向错位', function () {
    const { svg } = renderPriceTag(CHARS, { wght: 900 });
    assert.ok(!/data-x="[1-9]/.test(svg));
  });

  it('旋转方案的 SVG 同样保留 M354 -12 与 3034 总长', function () {
    const { svg, totalHeight } = renderPriceTag(CHARS, { wght: 900, rotated: true });
    assert.equal(totalHeight, 3034);
    assert.equal((squash(svg).match(/M354 -12/g) || []).length, 3);
    assert.match(svg, /rotate\(90\)/);
  });
});
