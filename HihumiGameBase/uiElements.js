/* =========================================================
   UI要素 (UnityのCanvas以下のUI部品: Text/Image/Button/Panel 相当)
   すべてアンカー(画面上の基準点)+オフセットで配置する。
   要素のピボットは常にアンカーと同じ点になるため、
   例えば 'top-left' なら要素の左上が、'bottom-right' なら右下が
   アンカー+オフセットの位置に固定される(画面サイズが変わっても位置が崩れにくい)。
   ========================================================= */

const UIAnchors = {
  'top-left':      { x: 0,   y: 0   },
  'top-center':    { x: 0.5, y: 0   },
  'top-right':     { x: 1,   y: 0   },
  'middle-left':   { x: 0,   y: 0.5 },
  'center':        { x: 0.5, y: 0.5 },
  'middle-right':  { x: 1,   y: 0.5 },
  'bottom-left':   { x: 0,   y: 1   },
  'bottom-center': { x: 0.5, y: 1   },
  'bottom-right':  { x: 1,   y: 1   },
};

function resolveUIAnchor(name){
  return UIAnchors[name] || UIAnchors['top-left'];
}

// ---------- UIElement (すべてのUI部品の基底クラス) ----------
class UIElement {
  constructor({ anchor='top-left', x=0, y=0, width=0, height=0, visible=true } = {}){
    this.anchor = anchor;
    this.x = x; // アンカー基準点からのオフセット(px)
    this.y = y;
    this.width = width;
    this.height = height;
    this.visible = visible;
  }

  /**
   * この要素の矩形をスクリーン座標で計算する。
   * ピボット=アンカーなので、アンカーのx/y(0/0.5/1)の分だけ自分のサイズを引く。
   */
  getRect(screenW, screenH){
    const a = resolveUIAnchor(this.anchor);
    const px = a.x * screenW + this.x;
    const py = a.y * screenH + this.y;
    return { x: px - a.x * this.width, y: py - a.y * this.height, width: this.width, height: this.height };
  }

  contains(px, py, screenW, screenH){
    const r = this.getRect(screenW, screenH);
    return px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height;
  }

  draw(ctx, screenW, screenH){}
  handleClick(px, py, screenW, screenH){ return false; }
}

// ---------- UIPanel (色付きの矩形。ボタン背景やウィンドウ枠に使う) ----------
class UIPanel extends UIElement {
  constructor(opts = {}){
    super(opts);
    this.color = opts.color ?? '#1c1f26';
    this.borderColor = opts.borderColor ?? null;
    this.borderWidth = opts.borderWidth ?? 2;
  }
  draw(ctx, screenW, screenH){
    if(!this.visible) return;
    const r = this.getRect(screenW, screenH);
    if(this.color){
      ctx.fillStyle = this.color;
      ctx.fillRect(r.x, r.y, r.width, r.height);
    }
    if(this.borderColor){
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = this.borderWidth;
      ctx.strokeRect(r.x, r.y, r.width, r.height);
    }
  }
}

// ---------- UIText (widthは使わず、アンカーの点に対してtextAlign/baselineを自動設定する) ----------
class UIText extends UIElement {
  constructor(opts = {}){
    super(opts);
    this.text = opts.text ?? '';
    this.font = opts.font ?? '14px monospace';
    this.color = opts.color ?? '#e6e8ec';
  }
  setText(text){ this.text = text; }
  draw(ctx, screenW, screenH){
    if(!this.visible) return;
    const a = resolveUIAnchor(this.anchor);
    const px = a.x * screenW + this.x;
    const py = a.y * screenH + this.y;
    ctx.font = this.font;
    ctx.fillStyle = this.color;
    ctx.textAlign = a.x === 0 ? 'left' : a.x === 1 ? 'right' : 'center';
    ctx.textBaseline = a.y === 0 ? 'top' : a.y === 1 ? 'bottom' : 'middle';
    ctx.fillText(this.text, px, py);
  }
}

// ---------- UIImage (画像をアンカー+width/heightの矩形に描画する) ----------
class UIImage extends UIElement {
  constructor(src, opts = {}){
    super(opts);
    this.image = new Image();
    this.loaded = false;
    this.image.onload = () => { this.loaded = true; };
    this.image.src = src;
  }
  draw(ctx, screenW, screenH){
    if(!this.visible || !this.loaded) return;
    const r = this.getRect(screenW, screenH);
    ctx.drawImage(this.image, r.x, r.y, r.width, r.height);
  }
}

// ---------- UIButton (背景+ラベル+クリックコールバック。ホバーで色が変わる) ----------
class UIButton extends UIElement {
  constructor(opts = {}){
    super(opts);
    this.text = opts.text ?? '';
    this.font = opts.font ?? '14px monospace';
    this.color = opts.color ?? '#2f6b52';
    this.hoverColor = opts.hoverColor ?? '#3c8467';
    this.textColor = opts.textColor ?? '#ffffff';
    this.borderColor = opts.borderColor ?? '#5ee3a5';
    this.onClick = opts.onClick ?? (() => {});
    this._hover = false;
  }
  draw(ctx, screenW, screenH){
    if(!this.visible) return;
    const r = this.getRect(screenW, screenH);
    ctx.fillStyle = this._hover ? this.hoverColor : this.color;
    ctx.fillRect(r.x, r.y, r.width, r.height);
    if(this.borderColor){
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x, r.y, r.width, r.height);
    }
    ctx.font = this.font;
    ctx.fillStyle = this.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, r.x + r.width / 2, r.y + r.height / 2 + 1);
  }
  handleClick(px, py, screenW, screenH){
    if(!this.visible || !this.contains(px, py, screenW, screenH)) return false;
    this.onClick();
    return true;
  }
  handleMove(px, py, screenW, screenH){
    this._hover = this.visible && this.contains(px, py, screenW, screenH);
  }
}
