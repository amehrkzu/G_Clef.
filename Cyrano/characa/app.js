"use strict";

const WORKER = "https://characa.game-rain-0406.workers.dev";
const STORAGE_KEY = "characa:v1";
const HANDLE = 14; // 選択枠の拡大縮小ハンドル(画面上の px)

const FONTS = [
  ["Noto Sans JP", "ゴシック"],
  ["Noto Serif JP", "明朝"],
  ["M PLUS Rounded 1c", "丸ゴシック"],
  ["Zen Maru Gothic", "Zen 丸ゴシック"],
  ["Dela Gothic One", "極太ゴシック"],
  ["Yusei Magic", "手書き風"],
  ["Shippori Mincho", "しっぽり明朝"],
  ["Kaisei Decol", "カイセイ デコール"],
  ["Cinzel", "Cinzel(英字)"],
  ["Cormorant Garamond", "Cormorant(英字)"],
];

// テキスト中で {key} と書くと取得データに置き換わる
const VARS = [
  ["name", "キャラ名"],
  ["title", "称号"],
  ["server", "ワールド"],
  ["dataCenter", "DC"],
  ["race", "種族"],
  ["tribe", "部族"],
  ["gender", "性別"],
  ["birthday", "誕生日"],
  ["guardian", "守護神"],
  ["hometown", "開始都市"],
  ["grandCompany", "GC"],
  ["grandCompanyRank", "GC階級"],
  ["freeCompany", "FC"],
  ["selfIntroduction", "自己紹介"],
];

const BATTLE_JOBS = ["ナイト", "戦士", "暗黒騎士", "ガンブレイカー", "白魔道士", "学者", "占星術師", "賢者", "モンク", "竜騎士", "忍者", "侍", "リーパー", "ヴァイパー", "魔獣使い", "吟遊詩人", "機工士", "踊り子", "黒魔道士", "召喚士", "赤魔道士", "ピクトマンサー", "青魔道士"];
const CRAFT_GATHER = new Set(["木工師", "鍛冶師", "甲冑師", "彫金師", "革細工師", "裁縫師", "錬金術師", "調理師", "採掘師", "園芸師", "漁師"]);
const SPECIAL = new Set(["エレメンタルレベル", "レジスタンスランク", "ナレッジレベル"]);
// ジョブ未取得のキャラは Lodestone にクラス名で出るので、対応するジョブのアイコンを使う
const CLASS_TO_JOB = { 剣術士: "ナイト", 斧術士: "戦士", 幻術士: "白魔道士", 格闘士: "モンク", 槍術士: "竜騎士", 双剣士: "忍者", 弓術士: "吟遊詩人", 呪術士: "黒魔道士", 巴術士: "召喚士" };

const SIZES = [
  [1920, 1080, "横 16:9(1920×1080)"],
  [1200, 675, "横 X向け(1200×675)"],
  [1080, 1080, "正方形(1080×1080)"],
  [1080, 1350, "縦 4:5(1080×1350)"],
  [1080, 1920, "縦 9:16(1080×1920)"],
];

const TYPE_LABEL = { text: "テキスト", image: "画像", rect: "図形", jobs: "ジョブ" };

const DEFAULTS = {
  text: { text: "テキスト", font: "Noto Sans JP", size: 48, color: "#ffffff", bold: false, italic: false, align: "left", lineHeight: 1.4, spacing: 0, width: 0, strokeColor: "#000000", strokeWidth: 0, shadow: true, opacity: 1 },
  image: { src: "", bind: "", w: 640, h: 360, fit: "cover", zoom: 1, posX: 0, posY: 0, radius: 0, flip: false, opacity: 1 },
  rect: { w: 400, h: 240, color: "#000000", radius: 16, borderColor: "#ffffff", borderWidth: 0, opacity: 0.4 },
  jobs: { display: "icon", filter: "battle", hideUnlearned: false, cols: 6, cellW: 155, font: "Noto Sans JP", size: 28, bold: false, iconColor: "#e6e9f0", color: "#e6e9f0", levelColor: "#f2d27a", dimColor: "#6b7280", shadow: true, opacity: 1 },
};

const FIELDS = {
  text: [
    ["text", "テキスト", "textarea"],
    ["font", "フォント", "font"],
    ["size", "サイズ", "number", { min: 4 }],
    ["color", "色", "color"],
    ["align", "揃え(X が基準点)", "select", { options: [["left", "左"], ["center", "中央"], ["right", "右"]] }],
    ["bold", "太字", "checkbox"],
    ["italic", "斜体", "checkbox"],
    ["lineHeight", "行間", "number", { min: 0.5, step: 0.1 }],
    ["spacing", "字間", "number"],
    ["width", "折り返し幅(0=しない)", "number", { min: 0 }],
    ["shadow", "影", "checkbox"],
    ["strokeColor", "縁取りの色", "color"],
    ["strokeWidth", "縁取りの太さ", "number", { min: 0 }],
  ],
  image: [
    ["bind", "表示する画像", "select", { options: [["", "アップロードしたスクショ"], ["image", "Lodestone 全身"], ["face", "Lodestone 顔"]] }],
    ["fit", "収め方", "select", { options: [["cover", "枠いっぱい(はみ出しは切る)"], ["contain", "全体を収める"]] }],
    ["w", "枠の幅", "number", { min: 10 }],
    ["h", "枠の高さ", "number", { min: 10 }],
    ["zoom", "ズーム", "range", { min: 0.2, max: 4, step: 0.01 }],
    ["radius", "角丸", "number", { min: 0 }],
    ["posX", "位置(横)", "range", { min: -100, max: 100, step: 1 }],
    ["posY", "位置(縦)", "range", { min: -100, max: 100, step: 1 }],
    ["flip", "左右反転", "checkbox"],
  ],
  rect: [
    ["w", "幅", "number", { min: 4 }],
    ["h", "高さ", "number", { min: 4 }],
    ["color", "色", "color"],
    ["radius", "角丸", "number", { min: 0 }],
    ["borderColor", "枠線の色", "color"],
    ["borderWidth", "枠線の太さ", "number", { min: 0 }],
  ],
  jobs: [
    ["display", "表示形式", "select", { options: [["icon", "アイコン+レベル"], ["iconName", "アイコン+名前+レベル"], ["name", "名前+レベル"]] }],
    ["filter", "表示するジョブ", "select", { options: [["battle", "戦闘職"], ["craft", "クラフター・ギャザラー"], ["all", "すべて"]] }],
    ["hideUnlearned", "未習得を隠す", "checkbox"],
    ["cols", "列数", "number", { min: 1 }],
    ["cellW", "列の幅", "number", { min: 20 }],
    ["font", "フォント", "font"],
    ["size", "サイズ", "number", { min: 4 }],
    ["iconColor", "アイコンの色", "color"],
    ["color", "ジョブ名の色", "color"],
    ["levelColor", "レベルの色", "color"],
    ["dimColor", "未習得の色", "color"],
    ["bold", "太字", "checkbox"],
    ["shadow", "影", "checkbox"],
  ],
};
const COMMON_FIELDS = [
  ["x", "X", "number"],
  ["y", "Y", "number"],
  ["opacity", "不透明度", "range", { min: 0, max: 1, step: 0.05 }],
];

// ---------- 状態 ----------

const $ = (id) => document.getElementById(id);
const canvas = $("card");
const ctx = canvas.getContext("2d");

let project = load() ?? defaultProject();
let selectedId = null;
let exporting = false;
const boundsById = new Map();

function emptyData() {
  const data = Object.fromEntries(VARS.map(([k, label]) => [k, label]));
  Object.assign(data, { gender: "♂", birthday: "", guardian: "", hometown: "", grandCompany: "", grandCompanyRank: "", selfIntroduction: "", face: "", image: "" });
  data.levels = BATTLE_JOBS.map((name) => ({ name, level: "--" }));
  return data;
}

function makeLayer(type, props = {}) {
  return { id: uid(), type, hidden: false, x: 0, y: 0, ...structuredClone(DEFAULTS[type]), ...props };
}

function uid() {
  return "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function defaultProject() {
  return {
    card: { w: 1920, h: 1080, bg: { type: "gradient", color1: "#1c2333", color2: "#4a3558", angle: 135, image: "", dim: 0.3 } },
    data: emptyData(),
    layers: [
      makeLayer("rect", { x: 840, y: 70, w: 1010, h: 940, color: "#000000", opacity: 0.35, radius: 28, borderColor: "#c9a85c", borderWidth: 2 }),
      makeLayer("image", { x: 90, y: 70, w: 690, h: 940, radius: 20 }),
      makeLayer("text", { text: "{title}", x: 900, y: 120, size: 36, color: "#e8d9a8" }),
      makeLayer("text", { text: "{name}", x: 900, y: 170, size: 104, font: "Cinzel", bold: true }),
      makeLayer("text", { text: "{server} [{dataCenter}]", x: 900, y: 305, size: 40, color: "#cfd6e6" }),
      makeLayer("text", { text: "{race} / {tribe} / {gender}\nFC: {freeCompany}", x: 900, y: 375, size: 34, lineHeight: 1.5, color: "#cfd6e6" }),
      makeLayer("jobs", { x: 900, y: 525 }),
      makeLayer("text", { text: "ここに好きなテキストを書けます\nクリックで選択して、右のパネルで編集", x: 900, y: 815, size: 30, width: 900 }),
      makeLayer("text", { text: "(C) SQUARE ENIX", x: 1890, y: 1040, size: 20, align: "right", opacity: 0.7 }),
    ],
  };
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved?.card || !Array.isArray(saved.layers)) return null;
    return normalize(saved);
  } catch {
    return null;
  }
}

// 古い保存データや読み込んだテンプレートに足りない項目を補う
function normalize(p) {
  const base = defaultProject();
  return {
    card: { ...base.card, ...p.card, bg: { ...base.card.bg, ...p.card?.bg } },
    data: { ...emptyData(), ...p.data },
    layers: p.layers.filter((l) => DEFAULTS[l.type]).map((l) => ({ ...makeLayer(l.type), ...l })),
  };
}

let saveTimer;
function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch {
      setStatus("自動保存できませんでした(画像が大きすぎる可能性があります)。PNG保存とテンプレート書き出しは使えます", "error");
    }
  }, 300);
}

function selected() {
  return project.layers.find((l) => l.id === selectedId) ?? null;
}

// ---------- 描画 ----------

let drawQueued = false;
function requestDraw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => {
    drawQueued = false;
    draw();
  });
}

function draw() {
  const { w, h } = project.card;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  drawBackground();

  boundsById.clear();
  for (const l of project.layers) {
    if (l.hidden) continue;
    ctx.save();
    ctx.globalAlpha = l.opacity ?? 1;
    boundsById.set(l.id, DRAW[l.type](l));
    ctx.restore();
  }
  if (!exporting) drawSelection();
}

function drawBackground() {
  const { w, h, bg } = project.card;
  if (bg.type === "gradient") {
    const a = (bg.angle * Math.PI) / 180;
    const r = (Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a))) / 2;
    const dx = Math.cos(a) * r, dy = Math.sin(a) * r;
    const g = ctx.createLinearGradient(w / 2 - dx, h / 2 - dy, w / 2 + dx, h / 2 + dy);
    g.addColorStop(0, bg.color1);
    g.addColorStop(1, bg.color2);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = bg.color1;
  }
  ctx.fillRect(0, 0, w, h);

  const img = bg.image && getImage(bg.image);
  if (img) {
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const iw = img.naturalWidth * s, ih = img.naturalHeight * s;
    ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
    if (bg.dim > 0) {
      ctx.fillStyle = `rgba(0,0,0,${bg.dim})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}

const DRAW = {
  text(l) {
    ctx.font = fontString(l);
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${l.spacing || 0}px`;
    ctx.textBaseline = "top";
    ctx.textAlign = l.align;
    const text = resolveText(l.text);
    ensureFont(ctx.font, text);

    const lines = wrapLines(text, l.width);
    const lh = l.size * l.lineHeight;
    const bw = l.width || Math.max(1, ...lines.map((s) => ctx.measureText(s).width));
    const bx = l.align === "center" ? l.x - bw / 2 : l.align === "right" ? l.x - bw : l.x;

    lines.forEach((s, i) => {
      const y = l.y + i * lh;
      if (l.shadow) setShadow(l.size);
      if (l.strokeWidth > 0) {
        ctx.lineJoin = "round";
        ctx.lineWidth = l.strokeWidth * 2;
        ctx.strokeStyle = l.strokeColor;
        ctx.strokeText(s, l.x, y);
        clearShadow(); // 影は縁取りにだけ付ける
      }
      ctx.fillStyle = l.color;
      ctx.fillText(s, l.x, y);
      clearShadow();
    });
    return { x: bx, y: l.y, w: bw, h: Math.max(lh * (lines.length - 1) + l.size, l.size) };
  },

  // 枠(w×h)の中に画像を収める。posX/posY は -100(左・上端)〜100(右・下端)
  image(l) {
    const src = imageSrc(l);
    const img = src && getImage(src);
    const b = { x: l.x, y: l.y, w: l.w, h: l.h, dw: l.w, dh: l.h };
    ctx.save();
    roundRectPath(l.x, l.y, l.w, l.h, l.radius);
    ctx.clip();
    if (img) {
      const fit = l.fit === "contain" ? Math.min : Math.max;
      const s = fit(l.w / img.naturalWidth, l.h / img.naturalHeight) * l.zoom;
      b.dw = img.naturalWidth * s;
      b.dh = img.naturalHeight * s;
      const dx = l.x + ((l.w - b.dw) / 2) * (1 + l.posX / 100);
      const dy = l.y + ((l.h - b.dh) / 2) * (1 + l.posY / 100);
      if (l.flip) {
        ctx.translate(2 * l.x + l.w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(img, dx, dy, b.dw, b.dh);
    } else if (!exporting) {
      ctx.fillStyle = "rgba(255,255,255,.08)";
      ctx.fillRect(l.x, l.y, l.w, l.h);
      ctx.strokeStyle = "rgba(255,255,255,.35)";
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.strokeRect(l.x + 2, l.y + 2, l.w - 4, l.h - 4);
      ctx.fillStyle = "rgba(255,255,255,.6)";
      ctx.font = `${Math.max(16, Math.min(l.w, l.h) / 18)}px "Noto Sans JP", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const msg = l.bind ? ["Lodestoneから取得すると", "ここに表示されます"] : ["スクショをここにドロップ", "またはパネルからアップロード"];
      msg.forEach((s, i) => ctx.fillText(s, l.x + l.w / 2, l.y + l.h / 2 + (i - 0.5) * Math.max(24, Math.min(l.w, l.h) / 12)));
    }
    ctx.restore();
    return b;
  },

  rect(l) {
    roundRectPath(l.x, l.y, l.w, l.h, l.radius);
    ctx.fillStyle = l.color;
    ctx.fill();
    if (l.borderWidth > 0) {
      ctx.lineWidth = l.borderWidth;
      ctx.strokeStyle = l.borderColor;
      ctx.stroke();
    }
    return { x: l.x, y: l.y, w: l.w, h: l.h };
  },

  jobs(l) {
    const list = jobList(l);
    ctx.font = fontString(l);
    ctx.textBaseline = "middle";
    ensureFont(ctx.font, list.map((j) => j.name + j.level).join(""));
    if (l.shadow) setShadow(l.size);

    const withIcon = l.display !== "name";
    const iconSize = l.size * 1.4;
    const lineH = withIcon ? iconSize : l.size;
    const rowH = lineH + l.size * (withIcon ? 0.5 : 0.6);
    const gap = l.size * 0.35;
    const nameX = withIcon ? iconSize + gap : 0;
    // 長いジョブ名はレベルと重ならないよう横に縮める
    const nameMax = Math.max(1, l.cellW - nameX - l.size * 1.1 - ctx.measureText("100").width);

    list.forEach((j, i) => {
      const x = l.x + (i % l.cols) * l.cellW;
      const cy = l.y + Math.floor(i / l.cols) * rowH + lineH / 2;
      const learned = /^\d+$/.test(j.level);
      const dim = learned ? null : l.dimColor;

      if (withIcon) {
        const icon = jobIcon(j.name, dim ?? l.iconColor);
        if (icon) {
          ctx.drawImage(icon, x, cy - iconSize / 2, iconSize, iconSize);
        } else {
          // アイコンが無いジョブ(魔獣使い・クラフター等)は頭文字で代用
          ctx.textAlign = "center";
          ctx.fillStyle = dim ?? l.iconColor;
          ctx.fillText(j.name[0], x + iconSize / 2, cy);
        }
      }
      ctx.fillStyle = dim ?? l.levelColor;
      if (l.display === "icon") {
        ctx.textAlign = "left";
        ctx.fillText(j.level, x + nameX, cy);
        return;
      }
      ctx.textAlign = "right";
      ctx.fillText(j.level, x + l.cellW - l.size * 0.6, cy);
      ctx.textAlign = "left";
      ctx.fillStyle = dim ?? l.color;
      ctx.fillText(j.name, x + nameX, cy, nameMax);
    });
    const rows = Math.max(1, Math.ceil(list.length / l.cols));
    return { x: l.x, y: l.y, w: l.cols * l.cellW, h: (rows - 1) * rowH + lineH };
  },
};

function jobList(l) {
  return project.data.levels.filter((j) => {
    if (SPECIAL.has(j.name)) return false;
    if (l.hideUnlearned && !/^\d+$/.test(j.level)) return false;
    if (l.filter === "battle") return !CRAFT_GATHER.has(j.name);
    if (l.filter === "craft") return CRAFT_GATHER.has(j.name);
    return true;
  });
}

function fontString(l) {
  return `${l.italic ? "italic " : ""}${l.bold ? 700 : 400} ${l.size}px "${l.font}", sans-serif`;
}

function resolveText(text) {
  const d = project.data;
  return text
    .replace(/\{lv:([^}]+)\}/g, (_, name) => d.levels.find((j) => j.name === name)?.level ?? "-")
    .replace(/\{(\w+)\}/g, (m, k) => (typeof d[k] === "string" ? d[k] : m));
}

// 日本語向けに1文字単位で折り返す
function wrapLines(text, maxW) {
  const out = [];
  for (const para of text.split("\n")) {
    if (!maxW) {
      out.push(para);
      continue;
    }
    let line = "";
    for (const ch of para) {
      if (line && ctx.measureText(line + ch).width > maxW) {
        out.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    out.push(line);
  }
  return out;
}

function setShadow(size) {
  ctx.shadowColor = "rgba(0,0,0,.65)";
  ctx.shadowBlur = size * 0.2;
  ctx.shadowOffsetY = size * 0.06;
}

function clearShadow() {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function roundRectPath(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r || 0, w / 2, h / 2)));
}

// Google Fonts は使う文字ごとに読み込まれるので、描く文字列を渡して読み込み後に再描画する
const fontRequests = new Set();
function ensureFont(font, text) {
  const key = font + "\n" + text;
  if (fontRequests.has(key)) return;
  fontRequests.add(key);
  document.fonts.load(font, text || "あA").then(requestDraw, () => {});
}

const images = new Map();
function getImage(src) {
  let entry = images.get(src);
  if (!entry) {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Worker 経由の画像を使っても PNG 書き出しできるように
    entry = { img, ok: false };
    img.onload = () => {
      entry.ok = true;
      requestDraw();
    };
    img.src = src;
    images.set(src, entry);
  }
  return entry.ok ? entry.img : null;
}

// job-icons.js の単色 SVG を指定色の画像にする(色ごとに getImage でキャッシュされる)
function jobIcon(name, color) {
  const svg = JOB_ICONS[CLASS_TO_JOB[name] ?? name];
  if (!svg) return null;
  const colored = svg.replace("<svg ", `<svg width="128" height="128" color="${color}" `);
  return getImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(colored));
}

function imageSrc(l) {
  if (l.bind) {
    const url = project.data[l.bind];
    return url ? `${WORKER}/img?url=${encodeURIComponent(url)}` : "";
  }
  return l.src;
}

function viewScale() {
  return canvas.getBoundingClientRect().width / canvas.width || 1;
}

function drawSelection() {
  const b = boundsById.get(selectedId);
  if (!b) return;
  const s = viewScale();
  ctx.save();
  ctx.strokeStyle = "#4da3ff";
  ctx.lineWidth = 2 / s;
  ctx.setLineDash([6 / s, 4 / s]);
  ctx.strokeRect(b.x, b.y, b.w, b.h);
  const hs = HANDLE / s;
  ctx.setLineDash([]);
  ctx.fillStyle = "#4da3ff";
  ctx.fillRect(b.x + b.w - hs / 2, b.y + b.h - hs / 2, hs, hs);
  ctx.restore();
}

// ---------- キャンバス操作 ----------

let drag = null;

function toCard(e) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * canvas.width, y: ((e.clientY - r.top) / r.height) * canvas.height };
}

function inside(p, b) {
  return b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
}

function onHandle(p) {
  const b = boundsById.get(selectedId);
  const r = (HANDLE * 1.5) / viewScale();
  return b && Math.abs(p.x - (b.x + b.w)) <= r && Math.abs(p.y - (b.y + b.h)) <= r;
}

function hitTest(p) {
  return [...project.layers].reverse().find((l) => !l.hidden && inside(p, boundsById.get(l.id))) ?? null;
}

canvas.addEventListener("pointerdown", (e) => {
  const p = toCard(e);
  const sel = selected();
  if (sel && onHandle(p)) {
    drag = { mode: "resize", start: p, layer: sel, orig: { ...sel }, b: { ...boundsById.get(sel.id) } };
  } else {
    const hit = hitTest(p);
    select(hit?.id ?? null);
    // Alt+ドラッグで画像を枠の中で動かす
    const mode = hit?.type === "image" && e.altKey ? "pan" : "move";
    if (hit) drag = { mode, start: p, layer: hit, orig: { ...hit }, b: { ...boundsById.get(hit.id) } };
  }
  if (drag) canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", (e) => {
  const p = toCard(e);
  if (!drag) {
    canvas.style.cursor = selectedId && onHandle(p) ? "nwse-resize" : hitTest(p) ? "move" : "default";
    return;
  }
  const dx = p.x - drag.start.x, dy = p.y - drag.start.y;
  if (drag.mode === "move") {
    drag.layer.x = Math.round(drag.orig.x + dx);
    drag.layer.y = Math.round(drag.orig.y + dy);
  } else if (drag.mode === "pan") {
    pan(drag, dx, dy);
  } else {
    resize(drag, dx, dy);
  }
  requestDraw();
});

const endDrag = () => {
  if (!drag) return;
  drag = null;
  renderProps();
  renderLayers();
  saveSoon();
};
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

// 右下ハンドル: 図形・画像は枠の縦横、それ以外は幅の比率で全体を拡大縮小
function resize({ layer: l, orig: o, b }, dx, dy) {
  const f = Math.max(0.05, (b.w + dx) / b.w);
  switch (l.type) {
    case "rect":
    case "image":
      l.w = Math.max(10, Math.round(o.w + dx));
      l.h = Math.max(10, Math.round(o.h + dy));
      break;
    case "text":
      l.size = Math.max(4, Math.round(o.size * f));
      if (o.width) l.width = Math.round(o.width * f);
      break;
    case "jobs":
      l.size = Math.max(4, Math.round(o.size * f));
      l.cellW = Math.max(20, Math.round(o.cellW * f));
      break;
  }
}

// 描画位置は (枠 - 画像) / 2 × (1 + pos/100) なので、マウス移動量を pos の変化量に換算する
function pan({ layer: l, orig: o, b }, dx, dy) {
  const clamp = (v) => Math.max(-100, Math.min(100, Math.round(v)));
  const sx = l.flip ? -1 : 1;
  if (Math.abs(b.w - b.dw) > 1) l.posX = clamp(o.posX + (sx * dx * 200) / (b.w - b.dw));
  if (Math.abs(b.h - b.dh) > 1) l.posY = clamp(o.posY + (dy * 200) / (b.h - b.dh));
}

// 選択中の画像の上でホイール → ズーム
canvas.addEventListener("wheel", (e) => {
  const l = selected();
  if (l?.type !== "image" || !inside(toCard(e), boundsById.get(l.id))) return;
  e.preventDefault();
  l.zoom = Math.max(0.2, Math.min(4, Math.round(l.zoom * (e.deltaY < 0 ? 1.05 : 1 / 1.05) * 100) / 100));
  requestDraw();
  renderProps();
  saveSoon();
}, { passive: false });

// 画像ファイルのドロップ: 画像枠の上ならその枠に、それ以外は新しい画像として追加
canvas.addEventListener("dragover", (e) => e.preventDefault());
canvas.addEventListener("drop", async (e) => {
  e.preventDefault();
  const file = [...e.dataTransfer.files].find((f) => f.type.startsWith("image/"));
  if (!file) return;
  const p = toCard(e);
  const hit = hitTest(p);
  const src = await readImage(file);
  if (hit?.type === "image") {
    setImage(hit, src);
  } else {
    const { width, height } = await imageSize(src);
    const w = Math.min(800, project.card.w / 2);
    const l = makeLayer("image", { src, w, h: Math.round((w * height) / width), x: Math.round(p.x - w / 2), y: Math.round(p.y - (w * height) / width / 2) });
    project.layers.push(l);
    changed();
    select(l.id);
  }
});

function setImage(l, src) {
  Object.assign(l, { src, bind: "", zoom: 1, posX: 0, posY: 0 });
  changed();
  if (l.id === selectedId) renderProps();
  else select(l.id);
}

function imageSize(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 16, height: 9 });
    img.src = src;
  });
}

document.addEventListener("keydown", (e) => {
  if (e.target.closest?.("input, textarea, select")) return;
  const l = selected();
  if (!l) return;
  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    removeLayer(l.id);
    return;
  }
  const step = e.shiftKey ? 10 : 1;
  const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
  if (!move) return;
  e.preventDefault();
  l.x += move[0];
  l.y += move[1];
  requestDraw();
  renderProps();
  saveSoon();
});

// ---------- 要素の操作 ----------

function select(id) {
  if (selectedId === id) return;
  selectedId = id;
  renderLayers();
  renderProps();
  requestDraw();
}

function addLayer(type) {
  const { w, h } = project.card;
  const props = {
    text: { x: Math.round(w / 2 - 150), y: Math.round(h / 2 - 30), text: "テキスト" },
    image: { x: Math.round(w / 2 - 200), y: Math.round(h / 2 - 270) },
    rect: { x: Math.round(w / 2 - 200), y: Math.round(h / 2 - 120) },
    jobs: { x: Math.round(w / 2 - 470), y: Math.round(h / 2 - 120) },
  }[type];
  const l = makeLayer(type, props);
  project.layers.push(l);
  changed();
  select(l.id);
}

function removeLayer(id) {
  project.layers = project.layers.filter((l) => l.id !== id);
  if (selectedId === id) selectedId = null;
  changed();
  renderProps();
}

function duplicateLayer(id) {
  const i = project.layers.findIndex((l) => l.id === id);
  const copy = { ...structuredClone(project.layers[i]), id: uid(), x: project.layers[i].x + 30, y: project.layers[i].y + 30 };
  project.layers.splice(i + 1, 0, copy);
  changed();
  select(copy.id);
}

function moveLayer(id, dir) {
  const i = project.layers.findIndex((l) => l.id === id);
  const j = i + dir;
  if (j < 0 || j >= project.layers.length) return;
  [project.layers[i], project.layers[j]] = [project.layers[j], project.layers[i]];
  changed();
}

function changed() {
  requestDraw();
  renderLayers();
  saveSoon();
}

// ---------- パネル ----------

function field(obj, key, label, type, opt = {}, onChange = changed) {
  const wrap = document.createElement("label");
  wrap.className = `field field--${type}${opt.wide ? " field--wide" : ""}`;
  const span = document.createElement("span");
  span.textContent = label;

  let input;
  if (type === "textarea") {
    input = document.createElement("textarea");
    input.rows = opt.rows ?? 3;
  } else if (type === "select" || type === "font") {
    input = document.createElement("select");
    for (const [value, text] of type === "font" ? FONTS : opt.options) {
      const o = new Option(text, value);
      if (type === "font") o.style.fontFamily = `"${value}"`;
      input.add(o);
    }
  } else {
    input = document.createElement("input");
    input.type = type;
    if (opt.min != null) input.min = opt.min;
    if (opt.max != null) input.max = opt.max;
    if (opt.step != null) input.step = opt.step;
  }
  if (type === "checkbox") input.checked = !!obj[key];
  else input.value = obj[key] ?? "";

  const instant = type === "checkbox" || type === "select" || type === "font";
  input.addEventListener(instant ? "change" : "input", () => {
    if (type === "checkbox") obj[key] = input.checked;
    else if (type === "number" || type === "range") {
      if (input.value === "") return;
      obj[key] = Number(input.value);
    } else obj[key] = input.value;
    onChange(key);
  });

  wrap.append(span, input);
  return wrap;
}

function button(text, onClick, cls = "btn btn--small") {
  const b = document.createElement("button");
  b.type = "button";
  b.className = cls;
  b.textContent = text;
  b.addEventListener("click", onClick);
  return b;
}

function uploadButton(text, onLoad) {
  const label = document.createElement("label");
  label.className = "btn btn--small";
  label.textContent = text;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.hidden = true;
  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (file) onLoad(await readImage(file));
  });
  label.append(input);
  return label;
}

// 大きすぎる画像は縮小して保存容量を抑える
function readImage(file, max = 2400) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * s);
        c.height = Math.round(img.naturalHeight * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(file.type === "image/jpeg" ? c.toDataURL("image/jpeg", 0.9) : c.toDataURL("image/png"));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function layerLabel(l) {
  if (l.type === "text") return resolveText(l.text).replace(/\n/g, " ").slice(0, 30) || "(空)";
  if (l.type === "image") return l.bind ? `Lodestone ${l.bind === "face" ? "顔" : "全身"}` : l.src ? "スクショ" : "(未設定)";
  if (l.type === "rect") return `${l.w}×${l.h}`;
  return { battle: "戦闘職", craft: "クラフター・ギャザラー", all: "すべて" }[l.filter];
}

function renderLayers() {
  const ul = $("layers");
  ul.replaceChildren();
  // 上にあるほど前面
  for (const l of [...project.layers].reverse()) {
    const li = document.createElement("li");
    li.className = (l.id === selectedId ? "selected " : "") + (l.hidden ? "hidden" : "");
    const type = document.createElement("span");
    type.className = "layer-type";
    type.textContent = TYPE_LABEL[l.type];
    const label = document.createElement("span");
    label.className = "layer-label";
    label.textContent = layerLabel(l);
    const eye = document.createElement("button");
    eye.className = "layer-eye";
    eye.title = l.hidden ? "表示する" : "隠す";
    eye.textContent = l.hidden ? "表示" : "隠す";
    eye.addEventListener("click", (e) => {
      e.stopPropagation();
      l.hidden = !l.hidden;
      changed();
    });
    li.append(type, label, eye);
    li.addEventListener("click", () => select(l.id));
    ul.append(li);
  }
}

function renderProps() {
  const box = $("props");
  box.replaceChildren();
  const l = selected();
  if (!l) {
    const p = document.createElement("p");
    p.className = "note";
    p.textContent = "カード上の要素をクリックすると、ここで編集できます。";
    box.append(p);
    return;
  }

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.append(
    button("前面へ", () => moveLayer(l.id, 1)),
    button("背面へ", () => moveLayer(l.id, -1)),
    button("複製", () => duplicateLayer(l.id)),
    button("削除", () => removeLayer(l.id), "btn btn--small btn--danger"),
  );
  box.append(actions);

  for (const [key, label, type, opt] of FIELDS[l.type]) {
    // 表示形式を変えたら列の幅もそれに合う幅にする
    const onChange = key === "display" ? () => {
      l.cellW = Math.round(l.size * { icon: 5.5, iconName: 10, name: 9 }[l.display]);
      changed();
      renderProps();
    } : changed;
    const f = field(l, key, label, type, opt, onChange);
    box.append(f);
    if (key === "text") box.append(varChips(f.querySelector("textarea"), l));
  }
  if (l.type === "image") {
    const row = document.createElement("div");
    row.className = "actions";
    row.append(uploadButton("スクショをアップロード", (src) => setImage(l, src)));
    box.append(row);
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = "画像の上でホイール → ズーム / Alt+ドラッグ → 枠の中で位置調整";
    box.append(note);
  }
  for (const [key, label, type, opt] of COMMON_FIELDS) box.append(field(l, key, label, type, opt));
}

function varChips(textarea, layer) {
  const wrap = document.createElement("div");
  wrap.className = "chips";
  for (const [key, label] of VARS) {
    const chip = button(label, () => {
      const { selectionStart: s, selectionEnd: e, value } = textarea;
      textarea.value = value.slice(0, s) + `{${key}}` + value.slice(e);
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = s + key.length + 2;
      layer.text = textarea.value;
      changed();
    }, "chip");
    chip.title = `{${key}} を挿入`;
    wrap.append(chip);
  }
  const note = document.createElement("p");
  note.className = "note";
  note.textContent = "ボタンで差し込み項目を挿入できます。{lv:ナイト} のように書くとそのジョブのレベルになります。";
  wrap.append(note);
  return wrap;
}

function renderData() {
  const box = $("dataForm");
  box.replaceChildren();
  for (const [key, label] of VARS) {
    const type = key === "selfIntroduction" ? "textarea" : "text";
    box.append(field(project.data, key, label, type, {}, changed));
  }
}

function renderCard() {
  const box = $("cardForm");
  box.replaceChildren();
  const card = project.card;

  const size = document.createElement("select");
  for (const [w, h, label] of SIZES) size.add(new Option(label, `${w}x${h}`));
  size.add(new Option("カスタム", "custom"));
  size.value = SIZES.some(([w, h]) => w === card.w && h === card.h) ? `${card.w}x${card.h}` : "custom";
  size.addEventListener("change", () => {
    if (size.value === "custom") return;
    [card.w, card.h] = size.value.split("x").map(Number);
    changed();
    renderCard();
  });
  const sizeField = document.createElement("label");
  sizeField.className = "field field--wide";
  sizeField.append(Object.assign(document.createElement("span"), { textContent: "サイズ" }), size);

  const onSize = () => {
    card.w = Math.max(100, Math.min(4000, card.w));
    card.h = Math.max(100, Math.min(4000, card.h));
    changed();
  };
  box.append(
    sizeField,
    field(card, "w", "幅", "number", { min: 100, max: 4000 }, onSize),
    field(card, "h", "高さ", "number", { min: 100, max: 4000 }, onSize),
    field(card.bg, "type", "背景", "select", { options: [["gradient", "グラデーション"], ["solid", "単色"]] }),
    field(card.bg, "angle", "グラデーションの角度", "number"),
    field(card.bg, "color1", "色1", "color"),
    field(card.bg, "color2", "色2", "color"),
  );

  const row = document.createElement("div");
  row.className = "actions";
  row.append(uploadButton("背景画像をアップロード", (src) => {
    card.bg.image = src;
    changed();
    renderCard();
  }));
  if (card.bg.image) {
    row.append(button("背景画像を外す", () => {
      card.bg.image = "";
      changed();
      renderCard();
    }));
  }
  box.append(row, field(card.bg, "dim", "背景画像を暗く", "range", { min: 0, max: 1, step: 0.05, wide: true }));
}

function renderAll() {
  renderData();
  renderLayers();
  renderProps();
  renderCard();
  requestDraw();
}

// ---------- 取得・保存 ----------

function setStatus(text, kind = "") {
  const el = $("fetchStatus");
  el.textContent = text;
  el.className = "status" + (kind ? ` status--${kind}` : "");
}

$("fetchForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const raw = $("lodestoneId").value.trim();
  const id = raw.match(/character\/(\d+)/)?.[1] ?? raw.match(/^\d+$/)?.[0];
  if (!id) {
    setStatus("ID(数字)か、キャラページの URL を入れてください", "error");
    return;
  }

  const btn = $("fetchBtn");
  btn.disabled = true;
  setStatus("取得中…");
  try {
    const res = await fetch(`${WORKER}/?id=${id}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(res.status === 404 ? "キャラクターが見つかりませんでした" : `取得に失敗しました(${body.error ?? res.status})`);
    }
    project.data = { ...emptyData(), ...body };
    setStatus(`${body.name} を取得しました`, "ok");
    renderAll();
    saveSoon();
  } catch (err) {
    setStatus(err instanceof TypeError ? "通信に失敗しました。時間をおいて試してください" : err.message, "error");
  } finally {
    btn.disabled = false;
  }
});

function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function safeName(s) {
  return (s || "card").replace(/[\\/:*?"<>|\s]+/g, "_");
}

$("exportPng").addEventListener("click", () => {
  exporting = true;
  draw();
  try {
    canvas.toBlob((blob) => {
      if (blob) download(blob, `characa_${safeName(project.data.name)}.png`);
    }, "image/png");
  } catch (err) {
    alert("PNG の書き出しに失敗しました: " + err.message);
  } finally {
    exporting = false;
    draw();
  }
});

$("exportJson").addEventListener("click", () => {
  const json = JSON.stringify({ version: 1, card: project.card, layers: project.layers }, null, 1);
  download(new Blob([json], { type: "application/json" }), "characa_template.json");
});

$("importJson").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const t = JSON.parse(await file.text());
    if (!t.card || !Array.isArray(t.layers)) throw new Error("形式が違います");
    project = normalize({ ...t, data: project.data });
    selectedId = null;
    renderAll();
    saveSoon();
  } catch (err) {
    alert("テンプレートを読み込めませんでした: " + err.message);
  }
});

$("reset").addEventListener("click", () => {
  if (!confirm("レイアウトを初期状態に戻します(キャラ情報はそのまま)。よろしいですか?")) return;
  project = { ...defaultProject(), data: project.data };
  selectedId = null;
  renderAll();
  saveSoon();
});

// メインのスクショ: いちばん背面側の画像枠に入れる(無ければ作る)
$("mainShot").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  const src = await readImage(file);
  let l = project.layers.find((x) => x.type === "image");
  if (!l) {
    l = makeLayer("image", { x: 90, y: 70, w: 690, h: 940, radius: 20 });
    project.layers.unshift(l);
  }
  setImage(l, src);
});

document.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => addLayer(b.dataset.add)));
window.addEventListener("resize", requestDraw); // 選択枠の太さを表示倍率に合わせる

renderAll();
