// ─────────────────────────────────────────────────────────────────────────────
// generate-boss2.mjs
// 空中ボス（hawk）のスプライト5ポーズを Gemini (Nano Banana 2 / Gemini 3 Pro Image)
// で生成し、128×128 透過PNGに整えて ../images/ に保存する開発用スクリプト。
//
// ゲーム本体には同梱しない（dev tool）。sw.js / sprites.js への登録は不要。
//
// 【使い方】
//   1) cd games/piyo-adventure/tools
//   2) npm install            （@google/genai と sharp が入る）
//   3) export GEMINI_API_KEY=（あなたのキー）   ※Windowsは set / $env:GEMINI_API_KEY=
//   4) node generate-boss2.mjs
//
//   オプション:
//     --only=idle,dive      指定ポーズだけ生成（カンマ区切り）
//     --chroma              背景が透過にならなかった場合、四隅の色をキーにして透過化
//     --no-postprocess      128化/透過化をせず、生成された生画像だけ _raw/ に残す
//     --model=<id>          モデルIDを上書き（環境変数 GEMINI_IMAGE_MODEL でも可）
//
// 【一貫性のコツ（初代Nano Bananaでポーズが揃わなかった対策）】
//   - まず idle を生成し、その idle を「キャラ参照」として他ポーズへ渡す（同一個体を維持）。
//   - 既存ボス boss_idle.png / boss_walk.png を「画風参照」として全生成に渡す（世界観を揃える）。
//   - プロンプトの“型”（STYLE_PREAMBLE）を全ポーズで固定する。
//
// 生成がイマイチなら、プロンプト（POSES）や MODEL を調整して再実行すればよい。
// ─────────────────────────────────────────────────────────────────────────────

import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(__dirname, '..', 'images');
const RAW_DIR    = path.resolve(__dirname, '_raw');

// ── モデルID ───────────────────────────────────────────────────────────────
// Nano Banana 2 = Gemini 3 Pro Image 系。正確なIDは Google AI Studio / 公式docs で確認し、
// 違っていればここか --model / GEMINI_IMAGE_MODEL で上書きすること。
// 動かない場合のフォールバック（初代Nano Banana）: 'gemini-2.5-flash-image-preview'
const DEFAULT_MODEL = 'gemini-3-pro-image-preview';

// ── 引数パース ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg  = (name) => { const a = args.find(x => x.startsWith(`--${name}=`)); return a ? a.split('=')[1] : null; };
const hasFlag = (name) => args.includes(`--${name}`);

const MODEL        = getArg('model') || process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;
const ONLY         = (getArg('only') || '').split(',').map(s => s.trim()).filter(Boolean);
const USE_CHROMA   = hasFlag('chroma');
const POSTPROCESS  = !hasFlag('no-postprocess');
const OUT_SIZE     = 128;

// ── 画風の固定文言（全ポーズ共通） ───────────────────────────────────────────
const STYLE_PREAMBLE = [
  'A single boss enemy character for a retro side-scrolling pixel-art game.',
  'Subject: a menacing dark aerial bird boss — a giant hawk/eagle with sharp talons,',
  'glowing eyes, and a sinister presence, matching the "dark giant chicken boss" art style',
  'of the reference images (same painterly-pixel look, same lighting and color depth).',
  'Color palette: dark purples, blacks, and deep crimson accents to fit a night/boss stage.',
  'IMPORTANT REQUIREMENTS:',
  '- Character FACING LEFT.',
  '- Fully TRANSPARENT background (alpha), no scenery, no ground, no shadow baked in.',
  '- Single character only, centered, full body visible with margin around it.',
  '- Clean readable silhouette suitable for downscaling to 128x128 pixels.',
  '- No text, no UI, no watermark, no border.',
].join('\n');

// ── 生成するポーズ ───────────────────────────────────────────────────────────
// key は出力ファイル名 boss2_<key>.png に対応（HANDOFF.md §3 と一致させること）
const POSES = [
  { key: 'idle',    anchor: true,
    pose: 'POSE: hovering in place, wings spread wide and steady, calm but threatening. Neutral idle pose.' },
  { key: 'flap',
    pose: 'POSE: mid wing-flap, wings raised upward, gaining a little altitude. Used as the alternate hover frame.' },
  { key: 'dive',
    pose: 'POSE: diving attack, wings tucked back, body angled steeply downward, beak/talons leading, aggressive and fast.' },
  { key: 'shoot',
    pose: 'POSE: launching attack, wings flared forward, releasing sharp feather projectiles, dynamic offensive stance.' },
  { key: 'damaged',
    pose: 'POSE: taking damage, recoiling backward, head thrown back, wings flailing, hurt expression.' },
];

// ─────────────────────────────────────────────────────────────────────────────

async function fileToInlinePart(absPath) {
  const buf = await fs.readFile(absPath);
  const ext = path.extname(absPath).toLowerCase();
  const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  return { inlineData: { mimeType, data: buf.toString('base64') } };
}

function extractImageBuffer(response) {
  const parts = response?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) {
    if (p.inlineData?.data) return Buffer.from(p.inlineData.data, 'base64');
  }
  // テキストしか返らなかった場合はプロンプト調整のヒントとしてログ
  const text = parts.map(p => p.text).filter(Boolean).join('\n');
  throw new Error('画像が返りませんでした。' + (text ? `\nモデルの応答テキスト:\n${text}` : ''));
}

async function generateOne(ai, pose, styleRefs, charRef) {
  const contents = [];
  // 画風参照（既存ボス）
  for (const ref of styleRefs) contents.push(ref);
  // キャラ参照（生成済みの idle があれば同一個体を維持）
  if (charRef) {
    contents.push({ text: 'Keep the SAME character/individual as this previously generated image, only change the pose:' });
    contents.push(charRef);
  }
  contents.push({ text: `${STYLE_PREAMBLE}\n\n${pose.pose}` });

  // 簡易リトライ（レート制限・一時エラー対策）
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await ai.models.generateContent({ model: MODEL, contents });
      return extractImageBuffer(response);
    } catch (e) {
      lastErr = e;
      const wait = 2000 * attempt;
      console.warn(`  [${pose.key}] 失敗(${attempt}/4): ${e.message}\n  ${wait}ms 待って再試行...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

// 透過処理: 四隅から背景色をサンプルし、近い色をアルファ0にする（--chroma 時のみ）
async function chromaKeyToAlpha(buf) {
  const img = sharp(buf).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info; // channels === 4
  const corners = [
    [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
  ].map(([x, y]) => {
    const i = (y * width + x) * channels;
    return [data[i], data[i + 1], data[i + 2]];
  });
  // 四隅の平均をキー色に
  const key = [0, 1, 2].map(c => Math.round(corners.reduce((s, p) => s + p[c], 0) / corners.length));
  const TOL = 38; // 許容差（調整可）
  for (let i = 0; i < data.length; i += channels) {
    const d = Math.abs(data[i] - key[0]) + Math.abs(data[i + 1] - key[1]) + Math.abs(data[i + 2] - key[2]);
    if (d <= TOL * 3) data[i + 3] = 0;
  }
  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

async function postProcess(rawBuf) {
  let buf = rawBuf;
  if (USE_CHROMA) buf = await chromaKeyToAlpha(buf);
  // 余白をトリムしてから 128×128 の透明キャンバスへ contain 配置
  return sharp(buf)
    .ensureAlpha()
    .trim()
    .resize(OUT_SIZE, OUT_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('✗ 環境変数 GEMINI_API_KEY が設定されていません。');
    console.error('  例: export GEMINI_API_KEY="..."  を実行してから再度お試しください。');
    process.exit(1);
  }

  await fs.mkdir(RAW_DIR, { recursive: true });
  const ai = new GoogleGenAI({ apiKey });

  console.log(`モデル: ${MODEL}`);
  console.log(`出力先: ${IMAGES_DIR}`);
  if (USE_CHROMA) console.log('背景透過: --chroma 有効（四隅サンプルでキーイング）');

  // 画風参照（既存ボス）
  const styleRefs = [];
  for (const f of ['boss_idle.png', 'boss_walk.png']) {
    const p = path.join(IMAGES_DIR, f);
    try { styleRefs.push(await fileToInlinePart(p)); }
    catch { console.warn(`  画風参照 ${f} を読めませんでした（スキップ）`); }
  }

  const targets = ONLY.length ? POSES.filter(p => ONLY.includes(p.key)) : POSES;
  // idle を最初に処理してキャラ参照に使うため並べ替え（anchor を先頭へ）
  targets.sort((a, b) => (b.anchor ? 1 : 0) - (a.anchor ? 1 : 0));

  let charRef = null; // 生成済み idle をここに保持
  // --only で idle を含めない場合、既存の boss2_idle.png があればキャラ参照に使う
  if (!targets.some(t => t.anchor)) {
    const existingIdle = path.join(IMAGES_DIR, 'boss2_idle.png');
    try { charRef = await fileToInlinePart(existingIdle); console.log('  既存 boss2_idle.png をキャラ参照に使用'); }
    catch { /* なければ無し */ }
  }

  for (const pose of targets) {
    console.log(`\n● ${pose.key} を生成中...`);
    const raw = await generateOne(ai, pose, styleRefs, pose.anchor ? null : charRef);

    // 生画像を保存（後処理前。デバッグ・再利用用）
    const rawPath = path.join(RAW_DIR, `boss2_${pose.key}_raw.png`);
    await fs.writeFile(rawPath, raw);

    // idle はキャラ参照として後続に渡す
    if (pose.anchor) charRef = { inlineData: { mimeType: 'image/png', data: raw.toString('base64') } };

    if (POSTPROCESS) {
      const out = await postProcess(raw);
      const outPath = path.join(IMAGES_DIR, `boss2_${pose.key}.png`);
      await fs.writeFile(outPath, out);
      console.log(`  ✓ 保存: images/boss2_${pose.key}.png（128×128 透過）`);
    } else {
      console.log(`  ✓ 生画像のみ保存: tools/_raw/boss2_${pose.key}_raw.png`);
    }
  }

  console.log('\n完了。images/ の boss2_*.png を既存ボスと並べて違和感がないか確認してください。');
  console.log('気に入らないポーズは  node generate-boss2.mjs --only=<pose>  で個別に作り直せます。');
}

main().catch(e => { console.error('\n✗ エラー:', e); process.exit(1); });
