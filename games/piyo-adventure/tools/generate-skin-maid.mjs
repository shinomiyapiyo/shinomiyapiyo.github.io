// ─────────────────────────────────────────────────────────────────────────────
// generate-skin-maid.mjs
// プレイヤーの「黄色メイド服スキン」を生成する開発用スクリプト。
//
// 方針: ゼロから7ポーズを描く（歩行サイクルが揃わない）のではなく、
//   既存プレイヤースプライト(player_*.png)を image-to-image で「再スキン」する。
//   = ポーズ・骨格・向き・コマ割りはそのまま、服とアクセだけ title.jpg のメイド服へ。
//   これで歩行アニメ等の一貫性を保ったままスキンだけ差し替えられる。
//
// 出力: ../images/skin_maid_<key>.png （64×64 透過PNG・7枚）
//
// 使い方:
//   cd games/piyo-adventure/tools
//   (npm install は既存boss用に済み。@google/genai と sharp を使用)
//   export GEMINI_API_KEY=...   ※対話シェルなら zsh -ic 経由で自動継承
//   node generate-skin-maid.mjs            # 7枚すべて
//   node generate-skin-maid.mjs --only=idle  # idleだけ（プロンプト確認用）
//   オプション: --model=<id> / --chroma（四隅キー） / --no-key（透過化なし）
// ─────────────────────────────────────────────────────────────────────────────

import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(__dirname, '..', 'images');
const RAW_DIR    = path.resolve(__dirname, '_raw');
const DEFAULT_MODEL = 'gemini-3-pro-image';

const args = process.argv.slice(2);
const getArg  = (n) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : null; };
const hasFlag = (n) => args.includes(`--${n}`);
const MODEL      = getArg('model') || process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;
const ONLY       = (getArg('only') || '').split(',').map(s => s.trim()).filter(Boolean);
const USE_CHROMA = hasFlag('chroma');
const NO_KEY     = hasFlag('no-key');
const OUT_SIZE   = 64;

// 再スキンする7ポーズ: key=出力 skin_maid_<key>.png, base=元プレイヤースプライト
const FRAMES = [
  { key: 'idle',   base: 'player_idle_v1.png' },
  { key: 'walk_1', base: 'player_walk_1.png' },
  { key: 'walk_2', base: 'player_walk_2.png' },
  { key: 'walk_3', base: 'player_walk_3.png' },
  { key: 'walk_4', base: 'player_walk_4.png' },
  { key: 'jump',   base: 'player_jump.png' },
  { key: 'fall',   base: 'player_fall.png' },
];

const PROMPT = [
  'Re-skin a tiny SUPER-DEFORMED (SD) chibi sprite for a retro pixel-art platformer. Two reference images:',
  '- The SECOND image is the BASE SPRITE. Copy its EXACT body proportions, pose, silhouette, facing direction,',
  '  and the size/position of the character in the frame. The base is drawn in an EXTREME 2-heads-tall',
  '  "nitoushin" super-deformed style: a HUGE round head and a very small, short, stubby body (the head is',
  '  about as tall as the entire body; stubby little arms and legs). You MUST keep these exact squashed',
  '  2-heads-tall proportions.',
  '- The FIRST image is a COSTUME/COLOR reference ONLY (what the maid outfit looks like). Do NOT copy its tall,',
  '  slim, realistic body proportions — ignore its body shape completely.',
  'Change ONLY the base sprite\'s outfit, hair accessories and colors to this maid costume:',
  '- black long twin-tails, a yellow cat-ear headband with small yellow bows,',
  '- a frilly yellow-and-black maid dress (yellow bodice, black short puffy sleeves, layered yellow/black',
  '  ruffled skirt with tiny white skull motifs), black thigh-high stockings and small black shoes.',
  'CRITICAL: do NOT make the character taller, slimmer, or more realistically proportioned. It MUST stay an',
  'extremely cute 2-heads-tall chibi with a giant head and a tiny stubby body, identical in proportion and',
  'height-to-width ratio to the SECOND base sprite. Same cute chibi pixel-art outline and shading.',
  'STRICT: single character only, same scale/position as the base sprite, plain solid WHITE background,',
  'no scenery, no shadow, no weapon/hammer, no text, no UI, no border, no watermark, no grid.',
].join('\n');

async function fileToInlinePart(absPath) {
  const buf = await fs.readFile(absPath);
  const ext = path.extname(absPath).toLowerCase();
  const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  return { inlineData: { mimeType, data: buf.toString('base64') } };
}

function extractImageBuffer(response) {
  const parts = response?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) if (p.inlineData?.data) return Buffer.from(p.inlineData.data, 'base64');
  const text = parts.map(p => p.text).filter(Boolean).join('\n');
  throw new Error('画像が返りませんでした。' + (text ? `\nモデル応答:\n${text}` : ''));
}

// 白背景キーイング（グラデ式）: 暗さ/彩度が高いほど不透明。白背景→透明。
async function gradedWhiteKey(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const LO = 40, HI = 100;
  const ss = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
    const fg = Math.max(255 - mn, mx - mn);
    const a = Math.round(ss(LO, HI, fg) * 255);
    if (a < data[i + 3]) data[i + 3] = a;
  }
  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

async function chromaKeyToAlpha(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const corners = [[0,0],[width-1,0],[0,height-1],[width-1,height-1]].map(([x,y]) => {
    const i = (y*width+x)*channels; return [data[i],data[i+1],data[i+2]];
  });
  const key = [0,1,2].map(c => Math.round(corners.reduce((s,p)=>s+p[c],0)/corners.length));
  const TOL = 38;
  for (let i = 0; i < data.length; i += channels) {
    const d = Math.abs(data[i]-key[0]) + Math.abs(data[i+1]-key[1]) + Math.abs(data[i+2]-key[2]);
    if (d <= TOL*3) data[i+3] = 0;
  }
  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

async function postProcess(rawBuf) {
  let buf = rawBuf;
  if (USE_CHROMA) buf = await chromaKeyToAlpha(buf);
  else if (!NO_KEY) buf = await gradedWhiteKey(buf);
  return sharp(buf).ensureAlpha().trim()
    .resize(OUT_SIZE, OUT_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { console.error('✗ GEMINI_API_KEY 未設定（zsh -ic 経由で実行してください）'); process.exit(1); }
  await fs.mkdir(RAW_DIR, { recursive: true });
  const ai = new GoogleGenAI({ apiKey });
  console.log(`モデル: ${MODEL}\n出力先: ${IMAGES_DIR}`);

  const outfitRef = await fileToInlinePart(path.join(IMAGES_DIR, 'title.jpg')); // 服の参照(FIRST)
  const targets = ONLY.length ? FRAMES.filter(f => ONLY.includes(f.key)) : FRAMES;

  for (const fr of targets) {
    console.log(`\n● skin_maid_${fr.key} を生成中 (base: ${fr.base})...`);
    const baseRef = await fileToInlinePart(path.join(IMAGES_DIR, fr.base)); // 元ポーズ(SECOND)
    const contents = [ outfitRef, baseRef, { text: PROMPT } ];
    let raw, lastErr;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try { const resp = await ai.models.generateContent({ model: MODEL, contents }); raw = extractImageBuffer(resp); break; }
      catch (e) { lastErr = e; const w = 2000*attempt; console.warn(`  失敗(${attempt}/4): ${e.message}  ${w}ms待機...`); await new Promise(r=>setTimeout(r,w)); }
    }
    if (!raw) throw lastErr;
    await fs.writeFile(path.join(RAW_DIR, `skin_maid_${fr.key}_raw.png`), raw);
    const out = await postProcess(raw);
    await fs.writeFile(path.join(IMAGES_DIR, `skin_maid_${fr.key}.png`), out);
    console.log(`  ✓ 保存: images/skin_maid_${fr.key}.png（64×64 透過）`);
  }
  console.log('\n完了。images/skin_maid_*.png を確認してください。気に入らないコマは --only=<key> で作り直せます。');
}

main().catch(e => { console.error('\n✗ エラー:', e); process.exit(1); });
