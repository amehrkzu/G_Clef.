/* ═══════════════════════════════════════════════════════
   絶妖星乱舞 散会図 ─ シナリオ抽選ロジック（共有）
   SukisugiteZetsu.html（散会図ビューア）と
   SukisugiteZetsuP3.html（実践ゲーム）の両方から読み込まれる。
   DOM書き込みは `.conditions` パネルが存在するページ（P1）向けの
   おまけ表示なので、要素が無いページでは何もしない。
   ═══════════════════════════════════════════════════════ */
const LINE_DIR_LABEL = { 'AB':'AB平行', 'AB-R':'AB平行（反転）', 'AD':'AD平行', 'AD-R':'AD平行（反転）' };

function chip(text) {
  return `<span class="cond-chip">${text}</span>`;
}

function rollAndBuild() {
  const tobashiLine  = rnd(['th','dps']);
  const blizzAoe     = rnd(['ne-sw','nw-se']);
  const blizzResolve = rnd(['stack','spread']);
  const thBeam       = pick2(TH_ORDER);
  const dpsBeam      = pick2(DPS_ORDER);
  const thDebuff     = rnd(TH_ALL);
  const dpsDebuff    = rnd(DPS_ALL);
  const fanDir       = rnd(['NW-SE','NE-SW']);
  const lineDir      = rnd(['AB','AB-R','AD','AD-R']);
  const lineTrue     = rnd([true, false]);
  const fanTrue      = rnd([true, false]);
  const statue2ThDir   = rnd(['NW','NE']);
  const hanmenSide     = rnd(['west','east']);
  const statue2FanAoe  = rnd(['NE-SW','NW-SE']);
  const statue3ThDir   = rnd(['NW','NE']);
  const hanmen2Side    = rnd(['west','east']);
  const thKbSrc        = rnd(TH_ALL.filter(r=>r!==thDebuff));
  const dpsKbSrc       = rnd(DPS_ALL.filter(r=>r!==dpsDebuff));
  const thDebuff3      = rnd(TH_ALL.filter(r=>r!==thDebuff && r!==thKbSrc));
  const dpsDebuff3     = rnd(DPS_ALL.filter(r=>r!==dpsDebuff && r!==dpsKbSrc));
  const statue2AoeList = statue2FanAoe === 'NE-SW' ? ['NE','SW'] : ['NW','SE'];
  const zubizubaResult = zubizubaDebuffAssign();

  const towerPos  = [...thBeam,...dpsBeam].map(r=>BEAM_LINE[r]);
  const blizzData = BLIZZFIRE[`${blizzAoe}_${blizzResolve}`];
  const [dp1,dp2] = computeDebuff(thDebuff, dpsDebuff);
  const [dp3_1, dp3_2] = computeKb3(thDebuff3, dpsDebuff3);
  const fanAoe    = fanDir === 'NW-SE' ? ['NW','SE'] : ['NE','SW'];

  const timeline = [
    { mechId:'default', mechName:'開始前', name:'初期位置',
      positions:{ mt:[180,125], st:[178,225], h1:[163,225], h2:[197,225],
                  d1:[154,248], d2:[172,248], d3:[188,248], d4:[206,248] },
      assignments:[] },
    { mechId:'tobashi',   mechName:'神々の像（1回目）', ...TOBASHI[tobashiLine][0],
      kbLines: (tobashiLine==='th' ? ['mt','st','h1','h2'] : ['d1','d2','d3','d4']).map(r=>({role:r,x1:180,y1:0})) },
    { mechId:'tobashi',   mechName:'神々の像（1回目）', ...TOBASHI[tobashiLine][1], aoe:blizzData.aoe },
    { mechId:'blizzfire', mechName:'神々の像（1回目）', name:'ブリザガ/ファイガ', positions:blizzData.positions, aoe:blizzData.aoe, assignments:blizzData.assignments },
    { mechId:'beam',      mechName:'神々の像（1回目）', name:'ビーム散会', positions:{...BEAM_LINE}, towers:[], assignments:[{ chips:['H2','H1','ST','MT','D1','D2','D3','D4'], types:['h','h','t','t','m','m','r','r'], dest:'横一列に並ぶ' }] },
    { mechId:'beam',      mechName:'神々の像（1回目）', name:'塔出現', positions:{...BEAM_LINE}, towers:towerPos, assignments:[{ chips:['H2','H1','ST','MT','D1','D2','D3','D4'], types:['h','h','t','t','m','m','r','r'], dest:'塔の位置を確認' }] },
    { mechId:'beam',      mechName:'神々の像（1回目）', name:'塔踏み', positions:computeBeam(thBeam,dpsBeam), towers:towerPos, assignments:beamAssignments(thBeam,dpsBeam),
      addDebuffs: { [thDebuff]:'<span class="debuff-tag debuff-kb">◆</span>', [dpsDebuff]:'<span class="debuff-tag debuff-kb">◆</span>' } },
    { mechId:'debuff',    mechName:'つぎつぎトラップ', name:'頭割り', positions:dp1, assignments:debuffAssignments(thDebuff,dpsDebuff,0) },
    { mechId:'debuff',    mechName:'つぎつぎトラップ', name:'ふきとばし後', positions:dp2, assignments:debuffAssignments(thDebuff,dpsDebuff,1),
      removeDebuffs: [thDebuff, dpsDebuff] },
    { mechId:'nazotoki',  mechName:'なぞなぞマジック', name:'－',
      aoe:fanAoe, bands:lineDir,
      positions:computeNazotoki(fanDir, lineDir, lineTrue, fanTrue, dp2),
      assignments:[{ chips:['全員'], types:['t'], dest:'最寄り安置へ' }],
      lineTruth:lineTrue, fanTruth:fanTrue },
    { mechId:'default', mechName:'裁きの光', name:'－',
      positions:{ mt:[180,125], st:[178,225], h1:[163,225], h2:[197,225],
                  d1:[154,248], d2:[172,248], d3:[188,248], d4:[206,248] },
      assignments:[] },
    { mechId:'hyperdrive', mechName:'ハイパードライブ', name:'－',
      positions:{ mt:[178,225], st:[180,125], h1:[163,225], h2:[197,225],
                  d1:[154,248], d2:[172,248], d3:[188,248], d4:[206,248] },
      assignments:[] },
    { mechId:'statue2', mechName:'神々の像（2回目）', name:'線出現',
      aoe:statue2AoeList,
      positions:{ mt:[178,225], st:[180,125], h1:[163,225], h2:[197,225],
                  d1:[154,248], d2:[172,248], d3:[188,248], d4:[206,248] },
      kbLines: [
        ...['mt','st','h1','h2'].map(r=>({ role:r, x1:statue2ThDir==='NW'?110:250, y1:25 })),
        ...['d1','d2','d3','d4'].map(r=>({ role:r, x1:statue2ThDir==='NW'?250:110, y1:25 })),
      ],
      assignments:[
        { chips:['MT','ST','H1','H2'], types:['t','t','h','h'], dest:`TH/H → ${statue2ThDir}から線` },
        { chips:['D1','D2','D3','D4'], types:['m','m','r','r'], dest:`DPS → ${statue2ThDir==='NW'?'NE':'NW'}から線` },
      ] },
    { mechId:'statue2', mechName:'神々の像（2回目）', name:'集合',
      aoe:statue2AoeList,
      positions:{ mt:[180,260], st:[180,260], h1:[180,260], h2:[180,260],
                  d1:[180,260], d2:[180,260], d3:[180,260], d4:[180,260] },
      kbLines: [
        ...['mt','st','h1','h2'].map(r=>({ role:r, x1:statue2ThDir==='NW'?110:250, y1:25 })),
        ...['d1','d2','d3','d4'].map(r=>({ role:r, x1:statue2ThDir==='NW'?250:110, y1:25 })),
      ],
      assignments:[{ chips:['全員'], types:['t'], dest:'C・中央間に集合' }] },
    { mechId:'graviga1', mechName:'神々の像（2回目）', name:'設置',
      aoe:statue2AoeList,
      positions:{ mt:[180,260], st:[180,260], h1:[180,260], h2:[180,260],
                  d1:[180,260], d2:[180,260], d3:[180,260], d4:[180,260] },
      graviga: true,
      gravigaRoles: statue2ThDir === 'NW' ? ['mt','st','h1','h2'] : ['d1','d2','d3','d4'],
      assignments:[{ chips:['全員'], types:['t'], dest:'自分の位置に円範囲設置' }] },
    { mechId:'graviga1', mechName:'神々の像（2回目）', name:'グラビガ散会',
      positions: computeGravigaSpread(statue2ThDir),
      gravigaFixed: true,
      assignments: gravigaSpreadAssignments(statue2ThDir) },
    { mechId:'ruinga', mechName:'神々の像（2回目）', name:'ルインガ',
      gravigaFixed: true,
      positions: computeRuinga(),
      assignments: ruingaAssignments() },
    { mechId:'hanmen', mechName:'神々の像（2回目）', name:'半面',
      aoe: hanmenSide === 'west' ? ['NW','SW'] : ['NE','SE'],
      gravigaFixed: true,
      positions: computeHanmen(hanmenSide),
      assignments:[{ chips:['全員'], types:['t'], dest: hanmenSide==='west' ? '東（中央〜B）へ移動' : '西（中央〜D）へ移動' }] },
    { mechId:'statue3', mechName:'神々の像（2回目）', name:'線出現2回目',
      positions: computeHanmen(hanmenSide),
      kbLines: [
        ...['mt','st','h1','h2'].map(r=>({ role:r, x1:statue3ThDir==='NW'?110:250, y1:25 })),
        ...['d1','d2','d3','d4'].map(r=>({ role:r, x1:statue3ThDir==='NW'?250:110, y1:25 })),
      ],
      assignments:[
        { chips:['MT','ST','H1','H2'], types:['t','t','h','h'], dest:`TH/H → ${statue3ThDir}から線` },
        { chips:['D1','D2','D3','D4'], types:['m','m','r','r'], dest:`DPS → ${statue3ThDir==='NW'?'NE':'NW'}から線` },
      ] },
    { mechId:'statue3', mechName:'神々の像（2回目）', name:'集合2回目',
      positions:{ mt:[180,100], st:[180,100], h1:[180,100], h2:[180,100],
                  d1:[180,100], d2:[180,100], d3:[180,100], d4:[180,100] },
      kbLines: [
        ...['mt','st','h1','h2'].map(r=>({ role:r, x1:statue3ThDir==='NW'?110:250, y1:25 })),
        ...['d1','d2','d3','d4'].map(r=>({ role:r, x1:statue3ThDir==='NW'?250:110, y1:25 })),
      ],
      assignments:[{ chips:['全員'], types:['t'], dest:'A・中央間に集合' }] },
    { mechId:'graviga2', mechName:'神々の像（2回目）', name:'設置2回目',
      positions:{ mt:[180,100], st:[180,100], h1:[180,100], h2:[180,100],
                  d1:[180,100], d2:[180,100], d3:[180,100], d4:[180,100] },
      graviga: true,
      gravigaRoles: statue3ThDir === 'NW' ? ['mt','st','h1','h2'] : ['d1','d2','d3','d4'],
      assignments:[{ chips:['全員'], types:['t'], dest:'自分の位置に円範囲設置' }] },
    { mechId:'graviga2', mechName:'神々の像（2回目）', name:'グラビガ散会2回目',
      positions: computeGravigaSpread2(statue3ThDir),
      gravigaFixed: true,
      assignments: gravigaSpreadAssignments2(statue3ThDir) },
    { mechId:'hanmen2', mechName:'神々の像（2回目）', name:'半面',
      aoe: hanmen2Side === 'west' ? ['NW','SW'] : ['NE','SE'],
      positions: computeHanmen2(hanmen2Side),
      assignments:[{ chips:['全員'], types:['t'], dest: hanmen2Side==='west' ? '東・中央へ集合' : '西・中央へ集合' }] },
    { mechId:'kb2', mechName:'つぎつぎトラップ', name:'頭割り',
      positions: computeKb2Pre(thKbSrc, dpsKbSrc),
      assignments: kb2Assignments(thKbSrc, dpsKbSrc, 0) },
    { mechId:'kb2', mechName:'神々の像（2回目）', name:'吹き飛ばし後',
      positions: computeKb2Post(thKbSrc, dpsKbSrc),
      assignments: kb2Assignments(thKbSrc, dpsKbSrc, 1) },
    { mechId:'default', mechName:'裁きの光', name:'－',
      clearGraviga: true,
      positions:{ mt:[180,125], st:[178,225], h1:[163,225], h2:[197,225],
                  d1:[154,248], d2:[172,248], d3:[188,248], d4:[206,248] },
      assignments:[] },
    { mechId:'hyperdrive', mechName:'ハイパードライブ', name:'－',
      positions:{ mt:[180,125], st:[178,225], h1:[163,225], h2:[197,225],
                  d1:[154,248], d2:[172,248], d3:[188,248], d4:[206,248] },
      assignments:[] },
    { mechId:'zubizuba', mechName:'ずびずばテレポ・デバフ付与', name:'－',
      positions:{ mt:[180,125], st:[178,225], h1:[163,225], h2:[197,225],
                  d1:[154,248], d2:[172,248], d3:[188,248], d4:[206,248] },
      addDebuffs: zubizubaResult.debuffs,
      assignments:[] },
    { mechId:'zubizuba', mechName:'ずびずばテレポ：矢印設置1回目', name:'－',
      positions: computeZubizuba1(zubizubaResult.pairs),
      fieldArrows: ROLES.map(r => ({ role: r, arrow: zubizubaResult.pairs[r][0] })),
      assignments:[] },
    { mechId:'zubizuba', mechName:'ずびずばテレポ：矢印設置2回目', name:'－',
      positions: computeZubizuba2(zubizubaResult.pairs),
      fieldArrows: ROLES.map(r => ({ role: r, arrow: zubizubaResult.pairs[r][1] })),
      assignments:[] },
    { mechId:'kb3',    mechName:'つぎつぎトラップ', name:'頭割り（3回目）', positions:dp3_1, assignments:kb3Assignments(thDebuff3, dpsDebuff3, 0) },
    { mechId:'kb3',    mechName:'つぎつぎトラップ', name:'吹き飛ばし後', positions:dp3_2, assignments:kb3Assignments(thDebuff3, dpsDebuff3, 1),
      removeDebuffs: [thDebuff3, dpsDebuff3] },
  ];

  const ccTobashi = document.getElementById('cc-tobashi');
  if (ccTobashi) ccTobashi.innerHTML = chip(tobashiLine==='th'?'TH線':'DPS線');
  const ccBlizzfire = document.getElementById('cc-blizzfire');
  if (ccBlizzfire) ccBlizzfire.innerHTML = chip(blizzAoe==='ne-sw'?'NE+SW':'NW+SE') + chip(blizzResolve==='stack'?'頭割り':'散会');
  const ccBeam = document.getElementById('cc-beam');
  if (ccBeam) ccBeam.innerHTML = chip(`TH: ${thBeam.map(r=>r.toUpperCase()).join('・')}`) + chip(`DPS: ${dpsBeam.map(r=>r.toUpperCase()).join('・')}`);
  const ccDebuff = document.getElementById('cc-debuff');
  if (ccDebuff) ccDebuff.innerHTML = chip(`TH: ${thDebuff.toUpperCase()}`) + chip(`DPS: ${dpsDebuff.toUpperCase()}`);
  const ccNazotoki = document.getElementById('cc-nazotoki');
  if (ccNazotoki) ccNazotoki.innerHTML = chip(fanDir==='NW-SE'?'NW+SE扇':'NE+SW扇') + chip(LINE_DIR_LABEL[lineDir]) + chip('扇：'+(fanTrue?'真':'偽')) + chip('直線：'+(lineTrue?'真':'偽'));
  const ccStatue2 = document.getElementById('cc-statue2');
  if (ccStatue2) ccStatue2.innerHTML = chip(statue2ThDir==='NW'?'TH→NW':'TH→NE') + chip(statue2FanAoe==='NE-SW'?'NE+SW扇':'NW+SE扇');
  const ccHanmen = document.getElementById('cc-hanmen');
  if (ccHanmen) ccHanmen.innerHTML = chip(hanmenSide==='west'?'西半面':'東半面');
  const ccStatue3 = document.getElementById('cc-statue3');
  if (ccStatue3) ccStatue3.innerHTML = chip(statue3ThDir==='NW'?'TH→NW':'TH→NE');
  const ccHanmen2 = document.getElementById('cc-hanmen2');
  if (ccHanmen2) ccHanmen2.innerHTML = chip(hanmen2Side==='west'?'西半面':'東半面');
  const ccKb2 = document.getElementById('cc-kb2');
  if (ccKb2) ccKb2.innerHTML = chip(`TH: ${thKbSrc.toUpperCase()}`) + chip(`DPS: ${dpsKbSrc.toUpperCase()}`);
  const ccKb3 = document.getElementById('cc-kb3');
  if (ccKb3) ccKb3.innerHTML = chip(`TH: ${thDebuff3.toUpperCase()}`) + chip(`DPS: ${dpsDebuff3.toUpperCase()}`);

  return timeline;
}
