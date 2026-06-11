/* ═══════════════════════════════════════════════════════
   定数
   ═══════════════════════════════════════════════════════ */
const ROLES     = ['mt','st','h1','h2','d1','d2','d3','d4'];
const CHIP_TYPE = { mt:'t', st:'t', h1:'h', h2:'h', d1:'m', d2:'m', d3:'r', d4:'r' };
const TH_ALL    = ['mt','st','h1','h2'];
const DPS_ALL   = ['d1','d2','d3','d4'];
const TH_ORDER  = ['h2','h1','st','mt'];
const DPS_ORDER = ['d1','d2','d3','d4'];

function rnd(arr)  { return arr[Math.floor(Math.random()*arr.length)]; }
function pick2(arr) {
  const s = [...arr]; const i = Math.floor(Math.random()*s.length);
  s.splice(i,1); const j = Math.floor(Math.random()*s.length);
  return [arr[i], s[j]].sort((a,b)=>arr.indexOf(a)-arr.indexOf(b));
}

/* ═══════════════════════════════════════════════════════
   ポジションデータ
   ═══════════════════════════════════════════════════════ */
const TOBASHI = {
  th: [
    { name:'集合', positions:{ mt:[ 87, 87], st:[124, 87], h1:[ 87,124], h2:[124,124], d1:[242,162], d2:[278,162], d3:[242,198], d4:[278,198] },
      assignments:[{ chips:['MT','ST','H1','H2'], types:['t','t','h','h'], dest:'北西（KB待機）' }, { chips:['D1','D2','D3','D4'], types:['m','m','r','r'], dest:'東中央' }] },
    { name:'KB後', positions:{ mt:[ 87,162], st:[124,162], h1:[ 87,199], h2:[124,199], d1:[242,162], d2:[278,162], d3:[242,198], d4:[278,198] },
      assignments:[{ chips:['MT','ST','H1','H2'], types:['t','t','h','h'], dest:'西側・南へスライド（2×2）' }, { chips:['D1','D2','D3','D4'], types:['m','m','r','r'], dest:'東中央（そのまま）' }] },
  ],
  dps: [
    { name:'集合', positions:{ mt:[ 88,162], st:[120,162], h1:[ 88,198], h2:[120,198], d1:[236, 87], d2:[273, 87], d3:[236,124], d4:[273,124] },
      assignments:[{ chips:['MT','ST','H1','H2'], types:['t','t','h','h'], dest:'西中央' }, { chips:['D1','D2','D3','D4'], types:['m','m','r','r'], dest:'北東（KB待機）' }] },
    { name:'KB後', positions:{ mt:[ 88,162], st:[120,162], h1:[ 88,198], h2:[120,198], d1:[236,162], d2:[273,162], d3:[236,199], d4:[273,199] },
      assignments:[{ chips:['MT','ST','H1','H2'], types:['t','t','h','h'], dest:'西中央（そのまま）' }, { chips:['D1','D2','D3','D4'], types:['m','m','r','r'], dest:'東側・南へスライド（2×2）' }] },
  ],
};

const BLIZZFIRE = {
  'ne-sw_stack':  { aoe:['NE','SW'], positions:{ mt:[ 87, 87], st:[124, 87], h1:[ 87,124], h2:[124,124], d1:[236,236], d2:[273,236], d3:[236,273], d4:[273,273] },
    assignments:[{ chips:['MT','ST','H1','H2'], types:['t','t','h','h'], dest:'北西（頭割り）' }, { chips:['D1','D2','D3','D4'], types:['m','m','r','r'], dest:'南東（頭割り）' }] },
  'nw-se_stack':  { aoe:['NW','SE'], positions:{ mt:[ 87,236], st:[124,236], h1:[ 87,273], h2:[124,273], d1:[236, 87], d2:[273, 87], d3:[236,124], d4:[273,124] },
    assignments:[{ chips:['MT','ST','H1','H2'], types:['t','t','h','h'], dest:'南西（頭割り）' }, { chips:['D1','D2','D3','D4'], types:['m','m','r','r'], dest:'北東（頭割り）' }] },
  'ne-sw_spread': { aoe:['NE','SW'], positions:{ mt:[180,130], st:[130,162], h1:[109,109], h2:[ 58,162], d1:[180,230], d2:[230,198], d3:[251,251], d4:[300,198] },
    assignments:[{ chips:['MT'], types:['t'], dest:'北〜中央' }, { chips:['ST'], types:['t'], dest:'西〜中央（北より）' }, { chips:['H1'], types:['h'], dest:'1マーカー' }, { chips:['H2'], types:['h'], dest:'西（北より）' }, { chips:['D1'], types:['m'], dest:'南〜中央' }, { chips:['D2'], types:['m'], dest:'東〜中央（南より）' }, { chips:['D3'], types:['r'], dest:'3マーカー' }, { chips:['D4'], types:['r'], dest:'東（南より）' }] },
  'nw-se_spread': { aoe:['NW','SE'], positions:{ mt:[180,230], st:[130,198], h1:[109,251], h2:[ 58,198], d1:[180,130], d2:[230,162], d3:[251,109], d4:[300,162] },
    assignments:[{ chips:['MT'], types:['t'], dest:'南〜中央' }, { chips:['ST'], types:['t'], dest:'西〜中央（南より）' }, { chips:['H1'], types:['h'], dest:'4マーカー' }, { chips:['H2'], types:['h'], dest:'西（南より）' }, { chips:['D1'], types:['m'], dest:'北〜中央' }, { chips:['D2'], types:['m'], dest:'東〜中央（北より）' }, { chips:['D3'], types:['r'], dest:'2マーカー' }, { chips:['D4'], types:['r'], dest:'東（北より）' }] },
};

const BEAM_LINE = { h2:[40,180], h1:[80,180], st:[120,180], mt:[160,180], d1:[200,180], d2:[240,180], d3:[280,180], d4:[320,180] };

function computeBeam(thBeam, dpsBeam) {
  const pos = {};
  function resolve(beam, order) {
    const sorted  = [...beam].sort((a,b)=>order.indexOf(a)-order.indexOf(b));
    const nonBeam = order.filter(r=>!beam.includes(r));
    nonBeam.forEach((r,i) => { pos[r] = [...BEAM_LINE[sorted[i]]]; });
    sorted.forEach((r,i) => { const [bx,by]=BEAM_LINE[r]; pos[r]=[bx, by+(i===0?-30:30)]; });
  }
  resolve(thBeam, TH_ORDER);
  resolve(dpsBeam, DPS_ORDER);
  return pos;
}

function beamAssignments(thBeam, dpsBeam) {
  const rows = [];
  function addRows(beam, order) {
    const sorted  = [...beam].sort((a,b)=>order.indexOf(a)-order.indexOf(b));
    const nonBeam = order.filter(r=>!beam.includes(r));
    rows.push({ chips:sorted.map(r=>r.toUpperCase()), types:sorted.map(r=>CHIP_TYPE[r]), dest:'ビーム受け → 少し北/南へ' });
    nonBeam.forEach((r,i) => { rows.push({ chips:[r.toUpperCase()], types:[CHIP_TYPE[r]], dest:`${sorted[i].toUpperCase()} の塔を踏む` }); });
  }
  addRows(thBeam, TH_ORDER);
  addRows(dpsBeam, DPS_ORDER);
  return rows;
}

function computeDebuff(thDebuff, dpsDebuff) {
  const thNon  = TH_ALL.filter(r=>r!==thDebuff);
  const dpsNon = DPS_ALL.filter(r=>r!==dpsDebuff);
  const p1={}, p2={};
  p1[thDebuff]  = [110,180]; thNon.forEach((r,i)=>{ p1[r]=[128,162+i*18]; });
  p1[dpsDebuff] = [250,180]; dpsNon.forEach((r,i)=>{ p1[r]=[232,162+i*18]; });
  p2[thDebuff]  = [110,180]; thNon.forEach((r,i)=>{ p2[r]=[258,162+i*18]; });
  p2[dpsDebuff] = [250,180]; dpsNon.forEach((r,i)=>{ p2[r]=[102,162+i*18]; });
  return [p1, p2];
}

function debuffAssignments(thDebuff, dpsDebuff, phase) {
  const thNon  = TH_ALL.filter(r=>r!==thDebuff);
  const dpsNon = DPS_ALL.filter(r=>r!==dpsDebuff);
  if (phase===0) return [
    { chips:[thDebuff.toUpperCase()],          types:[CHIP_TYPE[thDebuff]],       dest:'西（Dと中央の間）頭割り受け' },
    { chips:thNon.map(r=>r.toUpperCase()),      types:thNon.map(r=>CHIP_TYPE[r]),  dest:'デバフ持ちより少し中央よりで頭割り' },
    { chips:[dpsDebuff.toUpperCase()],          types:[CHIP_TYPE[dpsDebuff]],      dest:'東（Bと中央の間）頭割り受け' },
    { chips:dpsNon.map(r=>r.toUpperCase()),     types:dpsNon.map(r=>CHIP_TYPE[r]), dest:'デバフ持ちより少し中央よりで頭割り' },
  ];
  return [
    { chips:[thDebuff.toUpperCase()],           types:[CHIP_TYPE[thDebuff]],       dest:'西にとどまる' },
    { chips:thNon.map(r=>r.toUpperCase()),       types:thNon.map(r=>CHIP_TYPE[r]),  dest:'Bマーカー方向へ吹き飛び' },
    { chips:[dpsDebuff.toUpperCase()],           types:[CHIP_TYPE[dpsDebuff]],      dest:'東にとどまる' },
    { chips:dpsNon.map(r=>r.toUpperCase()),      types:dpsNon.map(r=>CHIP_TYPE[r]), dest:'Dマーカー方向へ吹き飛び' },
  ];
}

function computeGravigaSpread(statue2ThDir) {
  const nwRoles = statue2ThDir === 'NW' ? ['mt','st','h1','h2'] : ['d1','d2','d3','d4'];
  const neRoles = statue2ThDir === 'NW' ? ['d1','d2','d3','d4'] : ['mt','st','h1','h2'];
  const pos = {};
  const nwCluster = [[170,175],[185,175],[170,185],[185,185]];
  nwRoles.forEach((r,i) => { pos[r] = nwCluster[i]; });
  const neSpots = [[110,180],[250,180],[85,265],[275,265]];
  neRoles.forEach((r,i) => { pos[r] = neSpots[i]; });
  return pos;
}

function gravigaSpreadAssignments(statue2ThDir) {
  const nwGroup = statue2ThDir === 'NW' ? ['MT','ST','H1','H2'] : ['D1','D2','D3','D4'];
  const nwTypes = statue2ThDir === 'NW' ? ['t','t','h','h'] : ['m','m','r','r'];
  const neGroup = statue2ThDir === 'NW' ? ['D1','D2','D3','D4'] : ['MT','ST','H1','H2'];
  const neTypes = statue2ThDir === 'NW' ? ['m','m','r','r'] : ['t','t','h','h'];
  return [
    { chips: nwGroup, types: nwTypes, dest: 'NW線 → 中央' },
    { chips: [neGroup[0]], types: [neTypes[0]], dest: 'NE線 → Y軸中央・D〜中央（D寄り）' },
    { chips: [neGroup[1]], types: [neTypes[1]], dest: 'NE線 → Y軸中央・中央〜B（B寄り）' },
    { chips: [neGroup[2]], types: [neTypes[2]], dest: 'NE線 → グラビガ西側　4外周寄り' },
    { chips: [neGroup[3]], types: [neTypes[3]], dest: 'NE線 → グラビガ東側　3外周寄り' },
  ];
}

/* ═══════════════════════════════════════════════════════
   なぞなぞマジック 安置
   キー: `${fanDir}_${lineDir}`
   west/east それぞれ4スポット（2×2）、合計8人分
   ═══════════════════════════════════════════════════════ */
const NAZOTOKI_SPOTS = {
  // 扇 NW+SE
  'NW-SE_AB':   { west:[[130,211],[154,211],[130,231],[154,231]], east:[[249,93],[273,93],[249,113],[273,113]] },
  'NW-SE_AB-R': { west:[[206,134],[230,134],[206,154],[230,154]], east:[[87,255],[111,255],[87,275],[111,275]] },
  'NW-SE_AD':   { west:[[141,238],[165,238],[141,258],[165,258]], east:[[233,146],[257,146],[233,166],[257,166]] },
  'NW-SE_AD-R': { west:[[103,200],[127,200],[103,220],[127,220]], east:[[195,107],[219,107],[195,127],[219,127]] },
  // 扇 NE+SW
  'NE-SW_AB':   { west:[[103,146],[127,146],[103,166],[127,166]], east:[[195,238],[219,238],[195,258],[219,258]] },
  'NE-SW_AB-R': { west:[[141,107],[165,107],[141,127],[165,127]], east:[[233,200],[257,200],[233,220],[257,220]] },
  'NE-SW_AD':   { west:[[87,93],[111,93],[87,113],[111,113]],     east:[[206,211],[230,211],[206,231],[230,231]] },
  'NE-SW_AD-R': { west:[[130,134],[154,134],[130,154],[154,154]], east:[[249,255],[273,255],[249,275],[273,275]] },
};

function computeNazotoki(fanDir, lineDir, lineTrue, fanTrue, prevPos) {
  const effFanDir  = fanTrue  ? fanDir  : (fanDir === 'NW-SE' ? 'NE-SW' : 'NW-SE');
  const effLineDir = lineTrue ? lineDir : (lineDir.endsWith('-R') ? lineDir.slice(0,-2) : lineDir+'-R');
  const key = `${effFanDir}_${effLineDir}`;
  const zone = NAZOTOKI_SPOTS[key];
  const spots = [...zone.west.map(s=>[...s]), ...zone.east.map(s=>[...s])];
  const pos = {};
  ROLES.forEach(r => {
    const [px,py] = prevPos[r] || [180,180];
    let bestIdx = 0, bestDist = Infinity;
    spots.forEach((s,i) => {
      if (!s) return;
      const d = Math.hypot(px-s[0], py-s[1]);
      if (d < bestDist) { bestDist=d; bestIdx=i; }
    });
    pos[r] = spots[bestIdx];
    spots[bestIdx] = null;
  });
  return pos;
}

/* ═══════════════════════════════════════════════════════
   アニメーション
   ═══════════════════════════════════════════════════════ */
let animId = null;
const current = {};
let kbLinesMap = {};
let gravigaActive = false;
let gravigaFixed  = false;

function applyPos(role, x, y) {
  document.getElementById(`p-${role}`).setAttribute('transform',`translate(${x.toFixed(2)},${y.toFixed(2)})`);
  current[role] = [x,y];
  if (kbLinesMap[role] !== undefined) {
    const el = document.getElementById(`kb-line-${kbLinesMap[role]}`);
    if (el) { el.setAttribute('x2', x.toFixed(2)); el.setAttribute('y2', y.toFixed(2)); }
  }
  if (gravigaActive && !gravigaFixed) {
    const el = document.getElementById(`graviga-${role}`);
    if (el) { el.setAttribute('cx', x.toFixed(2)); el.setAttribute('cy', y.toFixed(2)); }
  }
}
function easeInOut(t) { return t<0.5?2*t*t:-1+(4-2*t)*t; }
function animateTo(target, duration=850) {
  if (animId) { cancelAnimationFrame(animId); animId=null; }
  const start={};
  ROLES.forEach(r=>{ start[r]=[...(current[r]||[180,180])]; });
  const t0=performance.now();
  function step(now) {
    const t=Math.min((now-t0)/duration,1), e=easeInOut(t);
    ROLES.forEach(r=>{ const [sx,sy]=start[r],[tx,ty]=target[r]||[sx,sy]; applyPos(r,sx+(tx-sx)*e,sy+(ty-sy)*e); });
    if (t<1) animId=requestAnimationFrame(step); else animId=null;
  }
  animId=requestAnimationFrame(step);
}

/* ═══════════════════════════════════════════════════════
   描画
   ═══════════════════════════════════════════════════════ */
function renderBands(type) {
  ['AB','AD','AB-R','AD-R'].forEach(t => {
    document.getElementById(`bands-${t}`).setAttribute('display', t===type ? 'block' : 'none');
  });
}

function renderStep(tl, idx) {
  const step = tl[idx];
  animateTo(step.positions);
  ['NE','SW','NW','SE'].forEach(s => {
    document.getElementById(`aoe-${s}`).setAttribute('display', (step.aoe||[]).includes(s)?'block':'none');
  });
  renderBands(step.bands||null);
  document.querySelectorAll('.cf-tower').forEach((el,i) => {
    const t = (step.towers||[])[i];
    if (t) { el.setAttribute('cx',t[0]); el.setAttribute('cy',t[1]); el.setAttribute('display','block'); }
    else   { el.setAttribute('display','none'); }
  });
  document.getElementById('mech-name').textContent     = step.mechName;
  document.getElementById('mech-phase').textContent    = step.name;
  document.getElementById('step-counter').textContent  = `${idx+1} / ${tl.length}`;
  document.getElementById('nav-prev').disabled = idx===0;
  document.getElementById('nav-next').disabled = idx===tl.length-1;
  ['tobashi','blizzfire','beam','debuff','nazotoki','statue2'].forEach(id => {
    const el = document.getElementById(`cg-${id}`);
    if (el) el.classList.toggle('active', step.mechId===id);
  });
  document.getElementById('assignments').innerHTML =
    (step.assignments||[]).map(a=>`
      <div class="assign-row">
        <div class="chips">${a.chips.map((c,i)=>`<span class="chip chip-${a.types[i]}">${c}</span>`).join('')}</div>
        <span class="arrow">→</span>
        <span class="dest">${a.dest}</span>
      </div>`).join('');

  gravigaFixed  = !!step.gravigaFixed;
  gravigaActive = !!step.graviga && !gravigaFixed;
  ROLES.forEach(r => {
    const el = document.getElementById(`graviga-${r}`);
    if (!el) return;
    if (step.graviga) {
      const [cx, cy] = current[r] || [180, 180];
      el.setAttribute('cx', cx); el.setAttribute('cy', cy);
      el.setAttribute('display', 'block');
    } else if (gravigaFixed) {
      el.setAttribute('display', 'block');
    } else {
      el.setAttribute('display', 'none');
    }
  });

  kbLinesMap = {};
  const kbLines = step.kbLines || [];
  kbLines.forEach((l, i) => { kbLinesMap[l.role] = i; });
  for (let i = 0; i < 8; i++) {
    const el = document.getElementById(`kb-line-${i}`);
    if (!el) continue;
    if (i < kbLines.length) {
      const { role, x1, y1 } = kbLines[i];
      const [cx, cy] = current[role] || [180, 180];
      el.setAttribute('x1', x1); el.setAttribute('y1', y1);
      el.setAttribute('x2', cx.toFixed(2)); el.setAttribute('y2', cy.toFixed(2));
      el.setAttribute('display', 'block');
    } else {
      el.setAttribute('display', 'none');
    }
  }

  const noteEl = document.getElementById('attack-note');
  if (noteEl) {
    if (step.lineTruth !== undefined) {
      const fmt = v => v ? '<span class="note-true">真</span>' : '<span class="note-false">偽</span>';
      noteEl.innerHTML =
        `<span><span class="note-label">直線：</span>${fmt(step.lineTruth)}</span>` +
        `<span><span class="note-label">扇：</span>${fmt(step.fanTruth)}</span>`;
    } else {
      noteEl.innerHTML = '';
    }
  }
}
