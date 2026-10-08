"use strict";
/* 絶妖星乱舞 P5 回避シミュレーター
   ギミックごとに「セグメント」として定義し、エンジンが順番に再生する。
   今は個別練習のみ。全編通しは MODES に複数セグメントを並べれば動く作り。
   タイミング・範囲の数値は仮置き（各セグメント冒頭の定数で調整）。 */
(() => {
  const canvas = document.getElementById("arena");
  const ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id);
  const UI = {
    time: $("timeDisplay"), next: $("nextDisplay"), debuff: $("debuffDisplay"),
    menu: $("menuModal"), modeButtons: $("modeButtons"), roleSelection: $("roleSelection"), roleButtons: $("roleButtons"),
    speed: $("speedSelect"), guide: $("guideToggle"), guideSide: $("guideToggleSide"),
    result: $("resultModal"), resultKicker: $("resultKicker"), resultTitle: $("resultTitle"), resultReason: $("resultReason"),
    retry: $("retryButton"), back: $("menuButton"), openMenu: $("openMenuButton"),
    roleIcon: $("roleIcon"), roleName: $("roleName"), modeName: $("modeName"), debuffBadges: $("debuffBadges"), guideText: $("guideText"),
    timeline: $("timeline"), segDisplay: $("segmentDisplay"), mechTitle: $("mechTitle"), mechDesc: $("mechDesc"),
    castBar: $("castBar"), castName: $("castName"), castFill: $("castFill"), banner: $("banner"),
    joystick: $("joystick"),
  };

  // ───────── 基本定数・ヘルパー ─────────
  const W = 800, CX = 400, CY = 400, ARENA_R = 350, TAU = Math.PI * 2;
  const CENTER = { x: CX, y: CY };
  const PLAYER_SPEED = 105, SPRINT = 1.45, NPC_SPEED = 150;
  // ?auto=1 で自分も正解位置へ自動移動（動作確認用）
  const AUTOPLAY = new URLSearchParams(location.search).get("auto") === "1";
  const ROLES = [
    { id: "MT", kind: "tank", icon: "./files/TankRole.png", color: "#4b7fe0" },
    { id: "ST", kind: "tank", icon: "./files/TankRole.png", color: "#4b7fe0" },
    { id: "H1", kind: "healer", icon: "./files/HealerRole.png", color: "#3fae6a" },
    { id: "H2", kind: "healer", icon: "./files/HealerRole.png", color: "#3fae6a" },
    { id: "D1", kind: "dps", icon: "./files/DPSRole.png", color: "#d0464b" },
    { id: "D2", kind: "dps", icon: "./files/DPSRole.png", color: "#d0464b" },
    { id: "D3", kind: "dps", icon: "./files/DPSRole.png", color: "#d0464b" },
    { id: "D4", kind: "dps", icon: "./files/DPSRole.png", color: "#d0464b" },
  ];
  const HEALERS = ["H1", "H2"], DPS = ["D1", "D2", "D3", "D4"];

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const dot = (pt, v) => (pt.x - CX) * v.x + (pt.y - CY) * v.y;
  // 北を0度として時計回りの角度
  const polar = (deg, r) => { const a = deg * Math.PI / 180; return { x: CX + Math.sin(a) * r, y: CY - Math.cos(a) * r }; };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const roleIndex = (id) => ROLES.findIndex((r) => r.id === id);
  const kindOf = (id) => ROLES[roleIndex(id)].kind;
  // 同じ地点に集まるときに重ならないよう、ロールごとに少しずらす
  const near = (pt, id, r = 9) => { const a = roleIndex(id) / 8 * TAU; return { x: pt.x + Math.cos(a) * r, y: pt.y + Math.sin(a) * r }; };

  // フィールドマーカー（A=北 / 1=北西 2=北東 3=南東 4=南西）
  const MARK_R = 206; // P3と同じ比率（マーカー半径 / フィールド半径 ≒ 0.59）
  const MARK_ORDER = ["A", "2", "B", "3", "C", "4", "D", "1"];
  // 並び・色は P3（アルテマブラスター）と同じ
  const MARK_COLOR = { A: "#e2483f", 1: "#e2483f", B: "#e8c34a", 2: "#e8c34a", C: "#4aa8e0", 3: "#4aa8e0", D: "#a855f7", 4: "#a855f7" };
  const MARKS = {};
  MARK_ORDER.forEach((k, i) => { MARKS[k] = polar(i * 45, MARK_R); });
  const markNeighbors = (m) => { const i = MARK_ORDER.indexOf(m); return [MARK_ORDER[(i + 7) % 8], MARK_ORDER[(i + 1) % 8]]; };

  // 散開位置（狂気のオーケストラ・終末の渦）：A〜D・1〜4に1人ずつ
  const SPREAD_MARK = { MT: "A", D2: "2", ST: "B", D4: "3", H2: "C", D3: "4", H1: "D", D1: "1" };
  const SPREAD_ANGLE = Object.fromEntries(Object.entries(SPREAD_MARK).map(([id, m]) => [id, MARK_ORDER.indexOf(m) * 45]));
  const spreadPos = (id) => MARKS[SPREAD_MARK[id]];

  // ───────── 状態 ─────────
  const S = {
    running: false, finished: false, time: 0, mode: null, playerId: null,
    players: [], segments: [], segIndex: 0, hate: ["MT", "ST"],
    cast: null, bannerUntil: 0, fx: [], moveTarget: null, bossAura: null,
    items: [], lastFrame: performance.now(), guide: false,
  };
  const keys = new Set();
  const me = () => S.players.find((p) => p.id === S.playerId);
  const byId = (id) => S.players.find((p) => p.id === id);
  const seg = () => S.segments[S.segIndex];
  const localTime = () => S.time - seg().start;

  function addDebuff(p, key, label, color, short = label) { removeDebuff(p, key); p.debuffs.push({ key, label, color, short }); }
  function removeDebuff(p, key) { p.debuffs = p.debuffs.filter((d) => d.key !== key); }
  function setCast(name, dur, color) { S.cast = { name, start: S.time, end: S.time + dur, color }; }
  function banner(text, dur = 1.4) {
    UI.banner.textContent = text;
    UI.banner.classList.remove("hidden");
    S.bannerUntil = S.time + dur;
  }
  function fx(dur, draw) { S.fx.push({ start: S.time, end: S.time + dur, draw }); }
  function fxCircle(x, y, r, color, dur = 0.55) {
    fx(dur, (k) => { ctx.globalAlpha = 0.6 * (1 - k); disc(x, y, r, color); ctx.globalAlpha = 1; });
  }

  // ───────── 描画ヘルパー ─────────
  function disc(x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function ring(x, y, r, color, width = 3, dash = null) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore();
  }
  function label(text, x, y, color = "#fff", size = 14, weight = 800) {
    ctx.save();
    ctx.font = `${weight} ${size}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(5,8,14,0.85)"; ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
    ctx.restore();
  }
  // 頭割りマーカー（内向き矢印つき）
  function stackMarker(pt, r, color = "#ffd36b") {
    const pulse = 0.5 + 0.5 * Math.sin(S.time * 8);
    ctx.globalAlpha = 0.12 + 0.08 * pulse; disc(pt.x, pt.y, r, color); ctx.globalAlpha = 1;
    ring(pt.x, pt.y, r, color, 2.5, [10, 6]);
    ctx.fillStyle = color;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      const tip = { x: pt.x + Math.cos(a) * (r + 4), y: pt.y + Math.sin(a) * (r + 4) };
      const base = r + 18;
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(pt.x + Math.cos(a + 0.12) * base, pt.y + Math.sin(a + 0.12) * base);
      ctx.lineTo(pt.x + Math.cos(a - 0.12) * base, pt.y + Math.sin(a - 0.12) * base);
      ctx.fill();
    }
  }
  function polygon(points, fill, stroke) {
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }

  // ───────── 失敗・クリア ─────────
  function fail(reason) {
    if (!S.running) return;
    S.running = false; S.finished = true;
    UI.resultKicker.textContent = "DUTY FAILED";
    UI.resultKicker.style.color = "";
    UI.resultTitle.textContent = "GAME OVER";
    UI.resultReason.textContent = reason;
    UI.result.classList.remove("hidden");
  }
  function clearRun() {
    S.running = false; S.finished = true;
    UI.resultKicker.textContent = "DUTY COMPLETE";
    UI.resultKicker.style.color = "var(--cyan)";
    UI.resultTitle.textContent = `${MODES[S.mode].name} 突破`;
    UI.resultReason.textContent = "すべての判定を処理しました。";
    UI.result.classList.remove("hidden");
  }

  // ════════════════════════════════════════
  //  魔撃（AA）— 他セグメントからも使う
  // ════════════════════════════════════════
  const AA_SPOT = { tank: "A", healer: "4", dps: "3" };
  const AA_SPOT_LABEL = { tank: "A（北）", healer: "4（南西）", dps: "3（南東）" };
  const AA_RULE = {
    tank: { r: 55, need: 2, label: "タンク" },
    healer: { r: 75, need: 2, label: "ヒーラー" },
    dps: { r: 75, need: 4, label: "DPS" },
  };
  const aaTarget = (p) => near(MARKS[AA_SPOT[kindOf(p.id)]], p.id, 14);
  const pickAATargets = () => ({ tank: S.hate[0], healer: pick(HEALERS), dps: pick(DPS) });

  function resolveAA(targets, n) {
    const circles = Object.entries(targets).map(([kind, id]) => {
      const t = byId(id);
      return { kind, center: { x: t.x, y: t.y }, ...AA_RULE[kind] };
    });
    circles.forEach((c) => fxCircle(c.center.x, c.center.y, c.r, "#ffd36b"));
    const p = me();
    const mine = circles.find((c) => c.kind === kindOf(p.id));
    const inside = circles.filter((c) => dist(p, c.center) <= c.r);
    if (inside.length > 1) return fail(`魔撃${n}回目：頭割りが重なり、被魔法ダメージ増加で即死しました。`);
    if (!inside.includes(mine)) return fail(`魔撃${n}回目：${mine.label}の頭割り（${AA_SPOT_LABEL[mine.kind]}）に入れませんでした。`);
    const count = S.players.filter((q) => dist(q, mine.center) <= mine.r).length;
    if (count < mine.need) return fail(`魔撃${n}回目：${mine.label}の頭割りが${count}人でした（${mine.need}人必要）。`);
    banner(`魔撃 ${n}`, 0.7);
  }
  function drawAAMarkers(targets) {
    if (!targets) return;
    for (const [kind, id] of Object.entries(targets)) stackMarker(byId(id), AA_RULE[kind].r);
  }
  // AA列をイベントに展開（firstから gap 秒おきに count 回）
  function aaEvents(list, first, count, gap = 2.4) {
    const times = Array.from({ length: count }, (_, i) => first + i * gap);
    const ev = [];
    times.forEach((t, i) => {
      ev.push([t - 2, () => { list[i] = pickAATargets(); }]);
      ev.push([t, () => resolveAA(list[i], i + 1)]);
    });
    return { times, ev };
  }

  function segAA(count = 3) {
    const FIRST = 3.5, GAP = 2.4;
    const times = Array.from({ length: count }, (_, i) => FIRST + i * GAP);
    let targets = [];
    return {
      key: "aa", name: "魔撃（AA）",
      desc: "ヘイト1位・ヒーラー1名・DPS1名の3か所に頭割り。タンク2人はA、ヒーラー2人は4（南西）、DPS4人は3（南東）で受けます。頭割りが重なると被魔法ダメージ増加で即死。",
      duration: times[count - 1] + 1.2,
      timeline: times.map((t, i) => [t, `魔撃 ${i + 1}`]),
      init() { targets = []; },
      events() { return aaEvents(targets, FIRST, count, GAP).ev; },
      target: (p) => aaTarget(p),
      guide: (p) => `${AA_SPOT_LABEL[kindOf(p.id)]}で魔撃を頭割り`,
      draw(lt) { times.forEach((t, i) => { if (lt >= t - 2 && lt < t) drawAAMarkers(targets[i]); }); },
    };
  }

  // ════════════════════════════════════════
  //  フラッド＋カオティックフラッド
  // ════════════════════════════════════════
  const GRID0 = 50, CELL = 175;
  const BAND_STRIPS = [[0, 1], [1, 3], [0, 2], [2, 3]]; // 中央列をちょうど1本含む組み合わせ
  const bandHit = (band, pt) => band.strips.includes(Math.floor(((band.axis === "v" ? pt.x : pt.y) - GRID0) / CELL));
  const qHit = (band, q) => band.strips.includes(band.axis === "v" ? q.c : q.r);
  const qName = (q) => (q.r === 1 ? "北" : "南") + (q.c === 1 ? "西" : "東");
  const qPoint = (q, id) => near({ x: q.c === 1 ? 368 : 432, y: q.r === 1 ? 368 : 432 }, id, 7);

  function genFlood() {
    const Q = [{ c: 1, r: 1 }, { c: 2, r: 1 }, { c: 1, r: 2 }, { c: 2, r: 2 }];
    const adj = (a, b) => Math.abs(a.c - b.c) + Math.abs(a.r - b.r) === 1;
    for (let tries = 0; tries < 1000; tries++) {
      const bands = Array.from({ length: 4 }, () => ({ axis: pick(["v", "h"]), strips: pick(BAND_STRIPS) }));
      if (bands[0].axis === bands[1].axis) continue;
      const sols = [];
      for (const s of Q) {
        if (qHit(bands[0], s)) continue;
        for (const s1 of Q) {
          if (!adj(s, s1) || !qHit(bands[0], s1) || qHit(bands[1], s1)) continue;
          for (const s2 of Q) {
            if (!adj(s1, s2) || !qHit(bands[1], s2) || qHit(bands[2], s2) || qHit(bands[3], s2)) continue;
            sols.push({ s, s1, s2 });
          }
        }
      }
      if (sols.length) return { bands, sol: pick(sols) };
    }
    throw new Error("flood generation failed");
  }

  function segFlood() {
    const APPEAR = [0.6, 1.2, 1.8, 2.4], IMPACT = [5.5, 7.1, 8.7, 10.3], STACK = [6.3, 7.9, 9.5, 11.1];
    const STACK_R = 70;
    let plan, stackIds = [];
    return {
      key: "flood", name: "フラッド",
      desc: "4×4に区切られた場に直線範囲の予兆が4本、順番に出ます。中央付近の①②の予兆の隣で待機し、①が着弾したら①の範囲へ、②が着弾したら②の範囲へ入ります。それ以上は動きません。着弾中にカオティックフラッド（4連続頭割り）が来るので全員で固まって動きます。",
      duration: 12.2,
      timeline: [[0.6, "フラッド予兆"], ...IMPACT.map((t, i) => [t, `フラッド${"①②③④"[i]}着弾`])],
      init() { plan = genFlood(); stackIds = []; },
      events() {
        const ev = [[0, () => setCast("カオティックフラッド", 5.5)]];
        IMPACT.forEach((t, i) => ev.push([t, () => {
          const band = plan.bands[i];
          if (bandHit(band, me())) fail(`フラッド${"①②③④"[i]}に被弾しました。`);
        }]));
        STACK.forEach((t, i) => {
          ev.push([t - 1.6, () => { stackIds[i] = pick(S.players).id; }]);
          ev.push([t, () => {
            const c = byId(stackIds[i]);
            fxCircle(c.x, c.y, STACK_R, "#ffd36b");
            if (dist(me(), c) > STACK_R) fail(`カオティックフラッド${i + 1}回目の頭割りに入れませんでした。`);
          }]);
        });
        return ev;
      },
      target(p, lt) {
        if (lt < APPEAR[3]) return near(CENTER, p.id, 30);
        if (lt < IMPACT[0] + 0.05) return qPoint(plan.sol.s, p.id);
        if (lt < IMPACT[1] + 0.05) return qPoint(plan.sol.s1, p.id);
        return qPoint(plan.sol.s2, p.id);
      },
      guide(p, lt) {
        const { s, s1, s2 } = plan.sol;
        const step = lt < IMPACT[0] ? 0 : lt < IMPACT[1] ? 1 : 2;
        const parts = [`中央${qName(s)}で待機`, `①着弾→${qName(s1)}`, `②着弾→${qName(s2)}`];
        return parts.map((t, i) => (i === step ? `▶${t}` : t)).join("　");
      },
      draw(lt) {
        ctx.strokeStyle = "rgba(160,190,230,0.18)"; ctx.lineWidth = 1.5;
        for (let i = 1; i < 4; i++) {
          const v = GRID0 + CELL * i;
          ctx.beginPath(); ctx.moveTo(v, 0); ctx.lineTo(v, W); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, v); ctx.lineTo(W, v); ctx.stroke();
        }
        plan.bands.forEach((band, i) => {
          if (lt < APPEAR[i] || lt > IMPACT[i] + 0.35) return;
          const hit = lt >= IMPACT[i];
          const fill = hit ? "rgba(140,210,255,0.55)" : "rgba(255,140,60,0.15)";
          band.strips.forEach((st) => {
            const a = GRID0 + CELL * st;
            if (band.axis === "v") polygon([{ x: a, y: 0 }, { x: a + CELL, y: 0 }, { x: a + CELL, y: W }, { x: a, y: W }], fill, hit ? null : "rgba(255,150,70,0.6)");
            else polygon([{ x: 0, y: a }, { x: W, y: a }, { x: W, y: a + CELL }, { x: 0, y: a + CELL }], fill, hit ? null : "rgba(255,150,70,0.6)");
            if (!hit) {
              const c = a + CELL / 2, o = 200 + i * 36;
              band.axis === "v" ? label("①②③④"[i], c, o, "#ffb070", 24) : label("①②③④"[i], o, c, "#ffb070", 24);
            }
          });
        });
        STACK.forEach((t, i) => { if (lt >= t - 1.6 && lt < t && stackIds[i]) stackMarker(byId(stackIds[i]), STACK_R); });
      },
    };
  }

  // ════════════════════════════════════════
  //  狂気のオーケストラ（＋直後のAA）
  // ════════════════════════════════════════
  const SOUTH_WAIT = {
    H1: { x: 330, y: 600 }, H2: { x: 352, y: 632 },
    D1: { x: 450, y: 598 }, D2: { x: 480, y: 606 }, D3: { x: 452, y: 634 }, D4: { x: 484, y: 638 },
  };
  function segOrchestra(aaCount = 2) {
    const CAST = 5, RES = 12, HIT_R = 80, FLARE_R = 330, HOLY_R = 90;
    const FLARE_SPOT = { x: 400, y: 85 }, HOLY_SPOT = { x: 400, y: 330 };
    let flareId, holyId, hitIds = [];
    const aaTargets = [];
    const AA = aaEvents(aaTargets, 14.6, aaCount);
    return {
      key: "orchestra", name: "狂気のオーケストラ",
      desc: "詠唱開始で散開。詠唱完了でヘイト1位にフレア、2位にホーリーのデバフ（7秒）＋ランダム3名に円範囲。デバフを受けたら挑発でスイッチ。フレアのタンクは北端へ、ホーリーのタンクはボス前で無敵。他6名は南側でフレアに巻き込まれない位置で待機し、直後の魔撃に備えて自分の受け側（ヒラ南西・DPS南東）へ寄っておきます。",
      duration: AA.times[aaCount - 1] + 1.2,
      timeline: [[0, "狂気のオーケストラ詠唱"], [CAST, "散開判定／デバフ付与"], [RES, "フレア・ホーリー"], ...AA.times.map((t, i) => [t, `魔撃 ${i + 1}`])],
      init() { aaTargets.length = 0; hitIds = []; },
      events() {
        return [
          [0, () => setCast("狂気のオーケストラ", CAST)],
          [CAST, () => {
            flareId = S.hate[0]; holyId = S.hate[1];
            hitIds = [flareId, holyId, ...shuffle(["H1", "H2", ...DPS]).slice(0, 3)];
            const p = me();
            for (const id of hitIds) {
              const t = byId(id);
              fxCircle(t.x, t.y, HIT_R, id === flareId ? "#ff6a3c" : "#fff2b0");
              if (id !== p.id && dist(p, t) <= HIT_R) return fail(`散開が不十分で、${id}への円範囲に巻き込まれました。`);
              if (id === p.id && S.players.some((q) => q !== p && dist(q, p) <= HIT_R)) return fail("自分への円範囲で味方を巻き込みました。");
            }
            addDebuff(byId(flareId), "flare", "フレア", "#ff6a3c");
            addDebuff(byId(holyId), "holy", "ホーリー", "#fff2b0");
          }],
          [CAST + 1, () => { S.hate = [holyId, flareId]; banner("挑発 → タンクスイッチ", 1.2); }],
          [RES, () => {
            const p = me(), flare = byId(flareId), holy = byId(holyId);
            fxCircle(flare.x, flare.y, FLARE_R, "#ff3c28", 0.8);
            fxCircle(holy.x, holy.y, HOLY_R, "#fff2b0", 0.6);
            removeDebuff(flare, "flare"); removeDebuff(holy, "holy");
            if (p.id === flareId) {
              const hit = S.players.find((q) => q !== p && q.id !== holyId && dist(q, p) < FLARE_R);
              if (hit) return fail(`フレアで${hit.id}を巻き込みました。北端まで離れましょう。`);
            } else if (p.id !== holyId && dist(p, flare) < FLARE_R) {
              return fail("フレアに巻き込まれました（距離減衰で即死）。");
            }
            if (p.id === holyId) {
              const hit = S.players.find((q) => q !== p && q.id !== flareId && dist(q, p) <= HOLY_R);
              if (hit) return fail(`ホーリーに${hit.id}を巻き込みました。ボス前で1人で受けましょう。`);
            } else if (dist(p, holy) <= HOLY_R) {
              return fail("タンクのホーリーに入ってしまいました。");
            }
            banner("フレア・ホーリー", 0.9);
          }],
          ...AA.ev,
        ];
      },
      target(p, lt) {
        if (lt < CAST + 0.2) return spreadPos(p.id);
        if (lt < RES + 0.2) {
          if (p.id === flareId) return FLARE_SPOT;
          if (p.id === holyId) return HOLY_SPOT;
          return SOUTH_WAIT[p.id];
        }
        return aaTarget(p);
      },
      guide(p, lt) {
        if (lt < CAST) return `散開：マーカー「${SPREAD_MARK[p.id]}」へ`;
        if (lt < RES) {
          if (p.id === flareId) return "フレア：北端へ離れる";
          if (p.id === holyId) return "ホーリー：ボス前で無敵";
          return "南側で待機（フレアから離れる・AAの受け側へ寄る）";
        }
        return `${AA_SPOT_LABEL[kindOf(p.id)]}で魔撃を頭割り`;
      },
      draw(lt) {
        if (lt >= CAST && lt < RES) {
          const flare = byId(flareId), holy = byId(holyId);
          ring(flare.x, flare.y, FLARE_R, "rgba(255,90,60,0.55)", 2, [12, 8]);
          ring(holy.x, holy.y, HOLY_R, "rgba(255,240,170,0.6)", 2, [8, 6]);
        }
        AA.times.forEach((t, i) => { if (lt >= t - 2 && lt < t) drawAAMarkers(aaTargets[i]); });
      },
    };
  }

  // ════════════════════════════════════════
  //  スリースターズ（＋2択のカタストロフ）
  // ════════════════════════════════════════
  const ELEM = {
    ice: { label: "氷", color: "#7fd3ff" },
    fire: { label: "炎", color: "#ff7a45" },
    thunder: { label: "雷", color: "#c08bff" },
  };
  // 塔は9本固定（北を避けて20°から40°おき＝南に1本）。属性の割り当てだけランダム
  const TOWER_RING = 158, TOWER_R = 48;
  const setElem = (p, el) => addDebuff(p, "elem", `${ELEM[el].label}耐性低下`, ELEM[el].color, `${ELEM[el].label}↓`);
  function segThreeStars() {
    const LIGHT = [5, 13, 21], RESOLVE = [12, 19.5, 28], CATA = { 0: 7, 2: 23 };
    // cur: 今持っている属性（最初はランダム付与、塔を踏むとその塔の属性に付け替わる）
    // nashi: 無職の2人（塔を踏んでも無職の役割のまま）
    let order, towers, cur, nashi, rounds, cataColor;
    const cw = (el) => order[(order.indexOf(el) + 1) % 3];
    function assignedTower(p, k) {
      const { doubleEl, lit } = rounds[k];
      if (nashi.has(p.id)) return lit[doubleEl][1]; // 無職：2本のうち時計回りで奥側
      return lit[cw(cur[p.id])][0]; // デバフ持ち：時計回りで次の属性。2本なら手前側
    }
    const activeRound = (lt) => LIGHT.findIndex((l, k) => lt >= l && lt < RESOLVE[k] + 0.2);
    return {
      key: "stars", name: "スリースターズ",
      desc: "円形に9本の塔（氷・炎・雷 各3本）。氷・炎・雷の耐性低下デバフが2名ずつ、残り2名は無職。毎回4本が光り（1属性だけ2本）、2人頭割りで踏みます。デバフ持ちは自分の属性から時計回りの属性の塔へ（2本光っていれば時計回りで手前）。踏んだ塔の属性のデバフに付け替わるので、毎回時計回りに1つずつ進みます。無職は2本光っている属性の奥側。1回目と3回目はカタストロフ：緑＝ドーナツ（塔の内側）、茶＝円（塔の外側）。",
      duration: 29,
      timeline: [[0, "スリースターズ詠唱"], [4, "塔出現・デバフ付与"], ...RESOLVE.map((t, k) => [t, `塔踏み${k + 1}回目${CATA[k] !== undefined ? "＋カタストロフ" : ""}`])],
      init() {
        order = shuffle(["ice", "fire", "thunder"]);
        towers = Array.from({ length: 9 }, (_, i) => {
          const el = order[Math.floor(i / 3)];
          const angle = 20 + i * 40;
          return { i, el, angle, ...polar(angle, TOWER_RING) };
        });
        const els = shuffle(["ice", "ice", "fire", "fire", "thunder", "thunder", null, null]);
        cur = {};
        nashi = new Set();
        ROLES.forEach((r, i) => { cur[r.id] = els[i]; if (!els[i]) nashi.add(r.id); });
        const doubles = shuffle(["ice", "fire", "thunder"]);
        rounds = doubles.map((doubleEl) => {
          const lit = {};
          for (const el of order) {
            const cluster = towers.filter((t) => t.el === el);
            lit[el] = el === doubleEl ? shuffle(cluster).slice(0, 2).sort((a, b) => a.i - b.i) : [pick(cluster)];
          }
          return { doubleEl, lit, all: Object.values(lit).flat() };
        });
        cataColor = { 0: pick(["green", "brown"]), 2: pick(["green", "brown"]) };
      },
      events() {
        const ev = [
          [0, () => setCast("スリースターズ", 4)],
          [4, () => {
            for (const p of S.players) {
              if (nashi.has(p.id)) addDebuff(p, "nashi", "無職", "#9aa6b8");
              else setElem(p, cur[p.id]);
            }
          }],
        ];
        for (const k of [0, 2]) {
          ev.push([CATA[k], () => {
            const green = cataColor[k] === "green";
            setCast(`カタストロフ（${green ? "緑" : "茶"}）`, RESOLVE[k] - CATA[k]);
            S.bossAura = { color: green ? "#4fd16b" : "#a8743c", until: S.time + RESOLVE[k] - CATA[k] };
          }]);
        }
        RESOLVE.forEach((t, k) => ev.push([t, () => {
          const r = rounds[k], p = me();
          r.all.forEach((tw) => fxCircle(tw.x, tw.y, TOWER_R, ELEM[tw.el].color));
          if (cataColor[k]) {
            const green = cataColor[k] === "green";
            fx(0.7, (q) => {
              ctx.globalAlpha = 0.45 * (1 - q);
              ctx.fillStyle = green ? "#4fd16b" : "#a8743c";
              ctx.beginPath();
              if (green) { ctx.arc(CX, CY, ARENA_R, 0, TAU); ctx.arc(CX, CY, TOWER_RING, 0, TAU, true); } else ctx.arc(CX, CY, TOWER_RING, 0, TAU);
              ctx.fill(); ctx.globalAlpha = 1;
            });
          }
          const mine = r.all.find((tw) => dist(p, tw) <= TOWER_R);
          if (!mine) return fail(`塔踏み${k + 1}回目：光っている塔を踏めませんでした。`);
          if (mine.el === cur[p.id]) return fail(`塔踏み${k + 1}回目：${ELEM[mine.el].label}耐性低下中に${ELEM[mine.el].label}の塔を踏んで即死しました。`);
          const count = S.players.filter((q) => dist(q, mine) <= TOWER_R).length;
          if (count !== 2) return fail(`塔踏み${k + 1}回目：塔の人数が${count}人でした（2人頭割り）。`);
          const empty = r.all.find((tw) => !S.players.some((q) => dist(q, tw) <= TOWER_R));
          if (empty) return fail(`塔踏み${k + 1}回目：誰も踏んでいない${ELEM[empty.el].label}の塔が爆発しました。`);
          if (cataColor[k] === "green" && dist(p, CENTER) > TOWER_RING) return fail("カタストロフ（緑・ドーナツ）：塔の内側に立つ必要がありました。");
          if (cataColor[k] === "brown" && dist(p, CENTER) < TOWER_RING) return fail("カタストロフ（茶・円）：塔の外側に立つ必要がありました。");
          // 踏んだ塔の属性の耐性低下に付け替わる（無職も付くが、役割は無職のまま）
          for (const q of S.players) {
            const tw = q === p ? mine : assignedTower(q, k);
            cur[q.id] = tw.el;
            setElem(q, tw.el);
          }
          banner(`塔踏み ${k + 1}`, 0.8);
        }]));
        ev.push([28.6, () => { S.players.forEach((p) => { removeDebuff(p, "elem"); removeDebuff(p, "nashi"); }); }]);
        return ev;
      },
      target(p, lt) {
        const k = activeRound(lt);
        if (k < 0) return lt < LIGHT[0] ? near(polar(SPREAD_ANGLE[p.id], 90), p.id, 0) : null; // 踏んだ後は次が光るまでその場
        const tw = assignedTower(p, k);
        let r = TOWER_RING;
        if (cataColor[k] && lt >= CATA[k]) r += cataColor[k] === "green" ? -26 : 26;
        const side = (["H1", "D1", "D3", "MT"].includes(p.id) ? -1 : 1) * 4; // 同じ塔の2人を左右にずらす
        return polar(tw.angle + side, r);
      },
      guide(p, lt) {
        if (lt < 4) return "塔の出現を待つ";
        let k = activeRound(lt);
        if (k < 0) k = LIGHT.findIndex((l) => lt < l);
        if (k < 0) return "—";
        const tw = assignedTower(p, k);
        const el = cur[p.id];
        const why = nashi.has(p.id) ? "無職：2本のうち奥側"
          : cw(el) === rounds[k].doubleEl ? `${ELEM[el].label}→時計回り＝${ELEM[tw.el].label}（2本のうち手前側）` : `${ELEM[el].label}→時計回り＝${ELEM[tw.el].label}`;
        const cata = cataColor[k] && lt >= CATA[k] ? (cataColor[k] === "green" ? "・内側" : "・外側") : "";
        return `${k + 1}回目：${ELEM[tw.el].label}の塔${cata}（${why}）`;
      },
      draw(lt) {
        if (lt < 4) return;
        const k = LIGHT.findIndex((l, i) => lt >= l && lt < RESOLVE[i]);
        const lit = k >= 0 ? rounds[k].all : [];
        if (k >= 0 && cataColor[k] && lt >= CATA[k]) ring(CX, CY, TOWER_RING, cataColor[k] === "green" ? "rgba(79,209,107,0.5)" : "rgba(168,116,60,0.6)", 2, [6, 6]);
        for (const tw of towers) {
          const on = lit.includes(tw);
          const col = ELEM[tw.el].color;
          ctx.globalAlpha = on ? 0.32 + 0.1 * Math.sin(S.time * 6) : 0.08;
          disc(tw.x, tw.y, TOWER_R, col);
          ctx.globalAlpha = 1;
          ring(tw.x, tw.y, TOWER_R, col, on ? 3.5 : 1.5, on ? null : [5, 5]);
          label(ELEM[tw.el].label, tw.x, tw.y, on ? "#fff" : col, on ? 20 : 15);
        }
      },
    };
  }

  // ════════════════════════════════════════
  //  混沌の終末（高速エクサフレア）＋終末の渦
  // ════════════════════════════════════════
  const SQ = Math.SQRT1_2;
  const EXA_DIR = [
    { d: { x: SQ, y: SQ }, p: { x: SQ, y: -SQ }, from: "北西" },
    { d: { x: -SQ, y: SQ }, p: { x: SQ, y: SQ }, from: "北東" },
  ];
  const LANE_W = 700 / 6;
  const laneC = (i) => -350 + LANE_W * (i + 0.5);
  const laneOf = (pt, dir) => Math.floor((dot(pt, EXA_DIR[dir].p) + 350) / LANE_W);
  const lanePoint = (l0, l1) => ({
    x: CX + EXA_DIR[0].p.x * laneC(l0) + EXA_DIR[1].p.x * laneC(l1),
    y: CY + EXA_DIR[0].p.y * laneC(l0) + EXA_DIR[1].p.y * laneC(l1),
  });
  const laneValid = (l0, l1) => Math.hypot(laneC(l0), laneC(l1)) <= 300;

  function segExa() {
    const LEAD = 1.6, TRAVEL = 1.6, FRONT = 34, SWIRL_R = 75;
    const START = Array.from({ length: 6 }, (_, k) => 5 + 1.6 * k);
    const SPREAD_AT = START[5] + TRAVEL + 0.2, SWIRL_CAST = 14, SWIRL = 19.5;
    let waves, lanes;
    const active = (w, t) => t >= w.T - LEAD && t < w.T + TRAVEL;
    const front = (w, t) => -350 + 700 * Math.max(0, t - w.T) / TRAVEL;
    // 交点(l0,l1)に、まだ通過していないエクサが来るか
    function pairBlocked(l0, l1, t) {
      const pt = lanePoint(l0, l1);
      return waves.some((w) => active(w, t) && w.lanes.includes(w.dir === 0 ? l0 : l1) &&
        front(w, t) - FRONT - 25 < dot(pt, EXA_DIR[w.dir].d));
    }
    // 今の交点が危なければ、安全な交点のうち一番近いところへ（平行移動になる）
    function chooseLanes(t) {
      if (!pairBlocked(lanes[0], lanes[1], t)) return;
      const here = lanePoint(lanes[0], lanes[1]);
      let best = null, bestD = Infinity;
      for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) {
        if (!laneValid(a, b) || pairBlocked(a, b, t)) continue;
        const d = dist(here, lanePoint(a, b)) + 0.01 * Math.hypot(laneC(a), laneC(b));
        if (d < bestD) { bestD = d; best = [a, b]; }
      }
      if (best) lanes = best;
    }
    return {
      key: "exa", name: "混沌の終末",
      desc: "北西→南東、北東→南西の各6レーンに、2レーン分（必ず1レーン空き）の高速エクサが交互に3回ずつ迫ります。エクサのない軸に合わせて平行移動で次の安地へ。5回目あたりで終末の渦（全員に円範囲）の詠唱が始まりますが、散開はエクサを6回すべて避けきってから。",
      duration: SWIRL + 1.2,
      timeline: [[0, "混沌の終末詠唱"], ...START.map((t, k) => [t, `エクサ${k + 1}（${EXA_DIR[k % 2].from}）`]), [SWIRL, "終末の渦（散開）"]],
      init() {
        waves = START.map((T, k) => { const i = Math.floor(Math.random() * 4); return { k, T, dir: k % 2, lanes: [i, i + 2] }; });
        lanes = [2, 2];
      },
      events() {
        return [
          [0, () => setCast("混沌の終末", 4)],
          [SWIRL_CAST, () => setCast("終末の渦", SWIRL - SWIRL_CAST)],
          [SWIRL, () => {
            const p = me();
            S.players.forEach((q) => fxCircle(q.x, q.y, SWIRL_R, "#c06bff"));
            const hit = S.players.find((q) => q !== p && dist(q, p) <= SWIRL_R);
            if (hit) return fail(`終末の渦：${hit.id}と範囲が重なりました。散開しましょう。`);
            banner("終末の渦", 0.9);
          }],
        ];
      },
      tick(lt) {
        chooseLanes(lt);
        const p = me();
        for (const w of waves) {
          if (lt < w.T || lt >= w.T + TRAVEL) continue;
          const dir = EXA_DIR[w.dir];
          if (!w.lanes.includes(laneOf(p, w.dir))) continue;
          const s = -350 + 700 * (lt - w.T) / TRAVEL;
          if (Math.abs(dot(p, dir.d) - s) < FRONT) return fail(`${dir.from}からのエクサフレア（${w.k + 1}回目）に被弾しました。`);
        }
      },
      target(p, lt) {
        if (lt >= SPREAD_AT) return spreadPos(p.id);
        return near(lanePoint(lanes[0], lanes[1]), p.id, 10);
      },
      guide(p, lt) {
        if (lt >= SPREAD_AT) return `エクサ終了 → マーカー「${SPREAD_MARK[p.id]}」で散開（終末の渦）`;
        return "エクサのないレーンの交点へ平行移動";
      },
      draw(lt) {
        for (const w of waves) {
          if (!active(w, lt)) continue;
          const dir = EXA_DIR[w.dir];
          const pt = (a, u) => ({ x: CX + dir.d.x * a + dir.p.x * u, y: CY + dir.d.y * a + dir.p.y * u });
          const s = lt >= w.T ? -350 + 700 * (lt - w.T) / TRAVEL : -350;
          for (const l of w.lanes) {
            const u0 = laneC(l) - LANE_W / 2, u1 = laneC(l) + LANE_W / 2;
            polygon([pt(s, u0), pt(400, u0), pt(400, u1), pt(s, u1)], "rgba(255,80,90,0.13)", "rgba(255,110,110,0.45)");
            // 進行方向の矢印
            for (let a = Math.max(s + 40, -300); a < 330; a += 90) {
              const c = laneC(l);
              polygon([pt(a + 22, c), pt(a - 8, c - 18), pt(a - 8, c + 18)], "rgba(255,140,140,0.35)");
            }
            if (lt >= w.T) {
              polygon([pt(s - FRONT, u0), pt(s + FRONT, u0), pt(s + FRONT, u1), pt(s - FRONT, u1)], "rgba(255,200,120,0.8)");
            }
          }
        }
      },
    };
  }

  // ════════════════════════════════════════
  //  ミッシング・ゼロ
  // ════════════════════════════════════════
  function segMissingZero() {
    const CYCLES = 4, C0 = 4.5, PERIOD = 7.5, HOLE_R = 60, ORANGE_R = 85, STACK_R = 70;
    const cyc = (k) => C0 + PERIOD * k;
    let plan, stackIds;
    function genPlan() {
      const holes = new Set();
      const steps = [];
      let letter = "A";
      for (let k = 0; k < CYCLES; k++) {
        const free = markNeighbors(letter).filter((m) => !holes.has(m));
        let purple, safe;
        if (free.length === 2) { purple = pick(free); safe = free.find((m) => m !== purple); } else {
          safe = free[0];
          purple = pick(["1", "2", "3", "4"].filter((m) => !holes.has(m) && m !== safe)) || null;
        }
        if (purple) holes.add(purple);
        const orange = pick(markNeighbors(safe));
        const next = markNeighbors(safe).find((m) => m !== orange);
        steps.push({ from: letter, purple, safe, orange, next });
        letter = next;
      }
      return steps;
    }
    const holesAt = (lt) => plan.filter((st, k) => st.purple && lt >= cyc(k) + 3.2).map((st) => MARKS[st.purple]);
    return {
      key: "missing", name: "ミッシング・ゼロ",
      desc: "全員Aに集合。詠唱完了で全体攻撃＋頭割り予兆、紫の床予兆（着弾後に黒い穴＝触れると即死）とオレンジの予兆が出ます。黒床予兆のない数字マーカーへ移動して頭割り → オレンジのないアルファベットマーカーへ移動、を繰り返します。",
      duration: cyc(CYCLES - 1) + PERIOD,
      timeline: [[0, "ミッシング・ゼロ詠唱"], ...Array.from({ length: CYCLES }, (_, k) => [cyc(k) + 3.2, `頭割り${k + 1}／黒穴`])],
      init() { plan = genPlan(); stackIds = []; },
      events() {
        const ev = [[0, () => setCast("ミッシング・ゼロ", C0)]];
        plan.forEach((st, k) => {
          const t = cyc(k);
          ev.push([t, () => { banner("ミッシング", 0.8); stackIds[k] = pick(S.players).id; }]);
          ev.push([t + 3.2, () => {
            const c = byId(stackIds[k]);
            fxCircle(c.x, c.y, STACK_R, "#ffd36b");
            if (dist(me(), c) > STACK_R) return fail(`頭割り${k + 1}回目に入れませんでした（数字マーカー${st.safe}で頭割り）。`);
          }]);
          ev.push([t + 6.8, () => {
            const o = MARKS[st.orange];
            fxCircle(o.x, o.y, ORANGE_R, "#ff9a3c");
            if (dist(me(), o) <= ORANGE_R) return fail(`オレンジの範囲（${st.orange}）に被弾しました。`);
          }]);
        });
        return ev;
      },
      tick(lt) {
        const p = me();
        if (holesAt(lt).some((h) => dist(p, h) <= HOLE_R)) fail("黒い穴に触れてしまいました（ミッシングイグジスタンス）。");
      },
      target(p, lt) {
        if (lt < C0) return near(MARKS.A, p.id, 10);
        const k = Math.min(CYCLES - 1, Math.floor((lt - C0) / PERIOD));
        const st = plan[k];
        return near(MARKS[lt - cyc(k) < 3.6 ? st.safe : st.next], p.id, 10);
      },
      guide(p, lt) {
        if (lt < C0) return "Aに集合";
        const k = Math.min(CYCLES - 1, Math.floor((lt - C0) / PERIOD));
        const st = plan[k];
        return lt - cyc(k) < 3.6 ? `${k + 1}回目：黒床のない数字「${st.safe}」で頭割り` : `${k + 1}回目：オレンジのない「${st.next}」へ`;
      },
      draw(lt) {
        plan.forEach((st, k) => {
          const t = cyc(k), m = st.purple && MARKS[st.purple];
          if (m && lt >= t && lt < t + 3.2) {
            ctx.globalAlpha = 0.35 + 0.1 * Math.sin(S.time * 7);
            disc(m.x, m.y, HOLE_R, "#a050ff"); ctx.globalAlpha = 1;
            ring(m.x, m.y, HOLE_R, "#c890ff", 2.5);
          }
          if (lt >= t + 3.6 && lt < t + 6.8) {
            const o = MARKS[st.orange];
            ctx.globalAlpha = 0.3; disc(o.x, o.y, ORANGE_R, "#ff9a3c"); ctx.globalAlpha = 1;
            ring(o.x, o.y, ORANGE_R, "#ffb46b", 2.5);
          }
          if (lt >= t && lt < t + 3.2 && stackIds[k]) stackMarker(byId(stackIds[k]), STACK_R);
        });
        for (const h of holesAt(lt)) {
          disc(h.x, h.y, HOLE_R, "#05030a");
          ring(h.x, h.y, HOLE_R, "#7a3cc8", 4);
        }
      },
    };
  }

  // ───────── モード（個別練習）─────────
  const MODES = {
    aa: { name: "魔撃（AA）", build: () => [segAA(3)] },
    flood: { name: "フラッド", build: () => [segFlood()] },
    orchestra: { name: "狂気のオーケストラ", build: () => [segOrchestra(2)] },
    stars: { name: "スリースターズ", build: () => [segThreeStars()] },
    exa: { name: "混沌の終末", build: () => [segExa()] },
    missing: { name: "ミッシング・ゼロ", build: () => [segMissingZero()] },
  };

  // ───────── エンジン ─────────
  function startRun(mode, roleId) {
    S.mode = mode; S.playerId = roleId;
    S.segments = MODES[mode].build();
    S.hate = ["MT", "ST"];
    S.players = ROLES.map((r) => {
      const pos = near({ x: CX, y: CY + 70 }, r.id, 40);
      return { id: r.id, kind: r.kind, color: r.color, x: pos.x, y: pos.y, debuffs: [], goal: { ...pos } };
    });
    let t = 0;
    S.segments.forEach((s) => { s.start = t; t += s.duration; });
    S.total = t;
    S.items = S.segments.flatMap((s) => s.timeline.map(([at, text]) => [s.start + at, text]));
    S.time = -3; S.cast = null; S.fx = []; S.bossAura = null; S.moveTarget = null; S.bannerUntil = 0;
    S.running = true; S.finished = false;
    enterSegment(0);
    buildTimeline();
    const role = ROLES[roleIndex(roleId)];
    UI.roleIcon.src = role.icon; UI.roleName.textContent = role.id; UI.modeName.textContent = MODES[mode].name;
    UI.menu.classList.add("hidden"); UI.result.classList.add("hidden");
    syncJoystick();
  }
  function enterSegment(i) {
    S.segIndex = i;
    const s = seg();
    s.init?.();
    s._events = (s.events ? s.events() : []).sort((a, b) => a[0] - b[0]);
    s._fired = 0;
    UI.mechTitle.textContent = s.name;
    UI.mechDesc.textContent = s.desc;
    UI.segDisplay.textContent = `${i + 1} / ${S.segments.length}`;
  }
  function update(dt) {
    S.time += dt;
    if (S.time >= 0) {
      let s = seg();
      let lt = localTime();
      while (s._fired < s._events.length && s._events[s._fired][0] <= lt) {
        s._events[s._fired++][1]();
        if (!S.running) return;
      }
      if (lt >= s.duration) {
        if (S.segIndex + 1 < S.segments.length) enterSegment(S.segIndex + 1);
        else return clearRun();
      }
    }
    movePlayers(dt);
    if (S.time >= 0) {
      seg().tick?.(localTime());
      if (S.running && dist(me(), CENTER) > ARENA_R - 10) fail("フィールド外へ落下しました。");
    }
  }
  function moveToward(p, target, step) {
    const dx = target.x - p.x, dy = target.y - p.y, d = Math.hypot(dx, dy);
    if (d <= step) { p.x = target.x; p.y = target.y; return true; }
    p.x += dx / d * step; p.y += dy / d * step;
    return false;
  }
  function correctTarget(p) {
    const s = seg();
    return S.time >= 0 && s.target ? s.target(p, localTime()) : null;
  }
  function movePlayers(dt) {
    for (const p of S.players) {
      if (p.id === S.playerId) continue;
      const goal = correctTarget(p);
      if (goal) p.goal = goal;
      moveToward(p, p.goal, NPC_SPEED * dt);
    }
    const p = me();
    if (AUTOPLAY) {
      const goal = correctTarget(p);
      if (goal) moveToward(p, goal, PLAYER_SPEED * dt);
      return;
    }
    let dx = 0, dy = 0;
    if (keys.has("w") || keys.has("ArrowUp")) dy -= 1;
    if (keys.has("s") || keys.has("ArrowDown")) dy += 1;
    if (keys.has("a") || keys.has("ArrowLeft")) dx -= 1;
    if (keys.has("d") || keys.has("ArrowRight")) dx += 1;
    const js = window.joystickDirection;
    if (js && (js.dx || js.dy)) { dx = js.dx; dy = js.dy; }
    const step = PLAYER_SPEED * (keys.has("Shift") ? SPRINT : 1) * dt;
    if (dx || dy) {
      S.moveTarget = null;
      const len = Math.hypot(dx, dy);
      const mag = Math.min(1, len);
      p.x += dx / len * step * mag; p.y += dy / len * step * mag;
    } else if (S.moveTarget && moveToward(p, S.moveTarget, step)) {
      S.moveTarget = null;
    }
  }

  // ───────── 描画 ─────────
  function draw() {
    ctx.clearRect(0, 0, W, W);
    const g = ctx.createRadialGradient(CX, CY - 20, 80, CX, CY, ARENA_R + 5);
    g.addColorStop(0, "#1c1a30"); g.addColorStop(1, "#0d0c18");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(CX, CY, ARENA_R, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#4b4470"; ctx.lineWidth = 5; ctx.stroke();

    ctx.save();
    ctx.beginPath(); ctx.arc(CX, CY, ARENA_R - 2, 0, TAU); ctx.clip();
    ctx.strokeStyle = "rgba(120,110,170,0.16)"; ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const e = polar(i * 45, ARENA_R);
      ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(e.x, e.y); ctx.stroke();
    }
    drawWaymarks();
    const s = S.segments.length ? seg() : null;
    if (s && S.time >= 0) s.draw?.(localTime());
    S.fx = S.fx.filter((f) => S.time < f.end);
    for (const f of S.fx) f.draw((S.time - f.start) / (f.end - f.start));
    ctx.restore();

    drawBoss();
    if (S.guide && S.running) {
      const t = correctTarget(me());
      if (t) {
        ring(t.x, t.y, 15, "rgba(120,255,170,0.9)", 2.5, [5, 4]);
        ctx.strokeStyle = "rgba(120,255,170,0.35)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(me().x, me().y); ctx.lineTo(t.x, t.y); ctx.stroke();
      }
    }
    drawPlayers();
    label("N", CX, 26, "#9fb0cc", 14);
  }
  function drawWaymarks() {
    for (const k of MARK_ORDER) {
      const m = MARKS[k], col = MARK_COLOR[k];
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.fillStyle = col + "22";
      ctx.beginPath();
      if (/\d/.test(k)) ctx.rect(m.x - 17, m.y - 17, 34, 34); else ctx.arc(m.x, m.y, 18, 0, TAU);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      label(k, m.x, m.y, col, 17, 900);
    }
  }
  // ボスのターゲットサークル（散開の基準）。北が正面、南（背面）が途切れている
  const TARGET_R = 128;
  function drawTargetCircle() {
    const gap = 40 * Math.PI / 180, south = Math.PI / 2;
    ctx.save();
    ctx.strokeStyle = "rgba(255,90,90,0.32)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(CX, CY, TARGET_R, south + gap, south - gap + TAU);
    ctx.stroke();
    // 正面（北）の三角と、左右（東西）の山形
    ctx.fillStyle = "rgba(255,110,110,0.4)";
    ctx.beginPath();
    ctx.moveTo(CX, CY - TARGET_R - 16);
    ctx.lineTo(CX - 9, CY - TARGET_R + 2);
    ctx.lineTo(CX + 9, CY - TARGET_R + 2);
    ctx.closePath(); ctx.fill();
    ctx.lineWidth = 3;
    for (const sx of [-1, 1]) {
      const x = CX + sx * TARGET_R;
      ctx.beginPath();
      ctx.moveTo(x - 8, CY + 4); ctx.lineTo(x, CY - 6); ctx.lineTo(x + 8, CY + 4);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawBoss() {
    drawTargetCircle();
    if (S.bossAura && S.time < S.bossAura.until) {
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(S.time * 6);
      disc(CX, CY, 40, S.bossAura.color); ctx.globalAlpha = 1;
    }
    disc(CX, CY, 24, "rgba(110,50,130,0.75)");
    ring(CX, CY, 24, "#e8c26a", 2);
    label("ケフカ", CX, CY, "#ffe9b0", 11);
  }
  function drawPlayers() {
    for (const p of S.players) {
      const controlled = p.id === S.playerId;
      if (controlled) ring(p.x, p.y, 18, "#fff4a8", 3);
      disc(p.x, p.y, 12, p.color);
      ring(p.x, p.y, 12, "#07101b", 3);
      label(p.id, p.x, p.y + 25, "#fff", 11, controlled ? 900 : 700);
      p.debuffs.forEach((d, i) => label(d.short, p.x, p.y - 22 - i * 14, d.color, 11, 800));
    }
  }

  // ───────── HUD ─────────
  const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  function setText(el, text) { if (el.textContent !== text) el.textContent = text; }
  function buildTimeline() {
    UI.timeline.innerHTML = "";
    for (const [t, text] of S.items) {
      const li = document.createElement("li");
      li.dataset.time = t;
      li.innerHTML = `<time>${fmt(t)}</time><span>${text}</span>`;
      UI.timeline.appendChild(li);
    }
  }
  function updateHUD() {
    if (!S.segments.length) return;
    const t = Math.max(0, S.time);
    setText(UI.time, fmt(t));
    const next = S.items.find(([at]) => at > t + 0.05);
    setText(UI.next, next ? `${Math.max(0, Math.ceil(next[0] - t))}s ${next[1]}` : "終了");
    const items = [...UI.timeline.children];
    items.forEach((li, i) => {
      const on = Number(li.dataset.time) <= t && (i + 1 >= items.length || Number(items[i + 1].dataset.time) > t);
      li.classList.toggle("active", on);
    });

    if (S.time < 0 && S.running) {
      setText(UI.banner, String(Math.ceil(-S.time)));
      UI.banner.classList.remove("hidden");
    } else if (S.time > S.bannerUntil) {
      UI.banner.classList.add("hidden");
    }

    const c = S.cast;
    const casting = c && S.time < c.end && S.time >= c.start;
    UI.castBar.classList.toggle("hidden", !casting);
    if (casting) {
      setText(UI.castName, c.name);
      UI.castFill.style.width = `${((S.time - c.start) / (c.end - c.start)) * 100}%`;
    }

    const p = me();
    if (p) {
      const labels = p.debuffs.map((d) => d.label).join(" / ") || "—";
      setText(UI.debuff, labels);
      const html = p.debuffs.map((d) => `<span class="debuff-badge" style="--c:${d.color}">${d.label}</span>`).join("") || `<span class="debuff-none">デバフなし</span>`;
      if (UI.debuffBadges.innerHTML !== html) UI.debuffBadges.innerHTML = html;
      const s = seg();
      const text = !S.guide ? "ガイドOFF（右下の設定でONにできます）" : S.time < 0 ? "開始前" : (s.guide ? s.guide(p, localTime()) : "—");
      setText(UI.guideText, text);
    }
  }

  function loop(now) {
    const raw = Math.min(0.04, (now - S.lastFrame) / 1000);
    S.lastFrame = now;
    if (S.running) update(raw * Number(UI.speed.value));
    draw();
    updateHUD();
    window.__p5Running = S.running;
    requestAnimationFrame(loop);
  }

  // ───────── 入力・メニュー ─────────
  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
  window.addEventListener("blur", () => keys.clear());
  canvas.addEventListener("pointerdown", (e) => {
    if (!S.running || e.pointerType === "touch" || window.__joystickActive) return;
    const rect = canvas.getBoundingClientRect();
    S.moveTarget = { x: (e.clientX - rect.left) / rect.width * W, y: (e.clientY - rect.top) / rect.height * W };
  });

  // 画面が狭いとき（スマホ・小さいウィンドウ）はジョイスティックを出す
  function syncJoystick() {
    if (UI.joystick) UI.joystick.style.display = S.running && window.innerWidth <= 960 ? "block" : "none";
  }
  window.addEventListener("resize", syncJoystick);

  let pendingMode = null;
  for (const [key, mode] of Object.entries(MODES)) {
    const b = document.createElement("button");
    b.className = "strategy-button";
    b.dataset.mode = key;
    b.innerHTML = `<strong>${mode.name}</strong><span>${mode.build()[0].desc.slice(0, 46)}…</span>`;
    b.addEventListener("click", () => {
      pendingMode = key;
      [...UI.modeButtons.children].forEach((x) => x.classList.toggle("selected", x === b));
      UI.roleSelection.classList.remove("hidden");
      UI.roleSelection.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    UI.modeButtons.appendChild(b);
  }
  for (const r of ROLES) {
    const b = document.createElement("button");
    b.className = "role-button";
    b.innerHTML = `<img src="${r.icon}" alt=""><strong>${r.id}</strong>`;
    b.addEventListener("click", () => { if (pendingMode) startRun(pendingMode, r.id); });
    UI.roleButtons.appendChild(b);
  }
  function setGuide(on) { S.guide = on; UI.guide.checked = on; UI.guideSide.checked = on; }
  UI.guide.addEventListener("change", () => setGuide(UI.guide.checked));
  UI.guideSide.addEventListener("change", () => setGuide(UI.guideSide.checked));
  UI.retry.addEventListener("click", () => startRun(S.mode, S.playerId));
  const openMenu = () => { S.running = false; syncJoystick(); UI.result.classList.add("hidden"); UI.menu.classList.remove("hidden"); };
  UI.back.addEventListener("click", openMenu);
  UI.openMenu.addEventListener("click", openMenu);

  // 動作確認用：?auto=1 のとき、指定モードを同期実行して結果を返す
  if (AUTOPLAY) {
    window.__p5test = (mode, role) => {
      startRun(mode, role);
      while (S.running) update(1 / 60);
      return `${UI.resultKicker.textContent}: ${UI.resultReason.textContent}`;
    };
  }

  requestAnimationFrame(loop);
})();
