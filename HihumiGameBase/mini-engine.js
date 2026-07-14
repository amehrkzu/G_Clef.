/* =========================================================
   MiniEngine v2 ─ Unity風API層
   ゲームを書く側(game.js)は HTML/DOM をいっさい意識せず、
   Unity の知識(MonoBehaviour / Instantiate / Time / Input / transform)
   だけで書けるようにしたバージョン。
   ========================================================= */

class Vector2 {
  constructor(x=0, y=0){ this.x=x; this.y=y; }
  add(v){ return new Vector2(this.x+v.x, this.y+v.y); }
  sub(v){ return new Vector2(this.x-v.x, this.y-v.y); }
  mul(s){ return new Vector2(this.x*s, this.y*s); }
}

// ---------- Time (UnityのTimeクラス相当) ----------
const Time = { deltaTime: 0, time: 0 };

// ---------- Screen (UnityのScreenクラス相当) ----------
const Screen = { width: 0, height: 0 };

// ---------- SortingLayers (Unityのソーティングレイヤー相当) ----------
// 描画順は「レイヤーの並び順」→「同レイヤー内はsortingOrderの昇順」で決まる。
// 未登録のレイヤー名は最背面より後ろ(常に一番手前)として扱われないよう最後尾扱いにする。
const SortingLayers = (function(){
  let order = ['Default'];
  return {
    setOrder(names){ order = [...names]; },
    indexOf(name){
      const i = order.indexOf(name);
      return i === -1 ? order.length : i;
    }
  };
})();

/**
 * GameObjectの描画順比較関数。SortingLayers→sortingOrderの順で比較する。
 * 同順位の場合はArray.sortが安定ソートなので元の並び順(生成順)が維持される。
 */
function compareBySortOrder(a, b){
  const la = SortingLayers.indexOf(a.sortingLayer);
  const lb = SortingLayers.indexOf(b.sortingLayer);
  if(la !== lb) return la - lb;
  return a.sortingOrder - b.sortingOrder;
}

// ---------- Input (UnityのInputクラス相当) ----------
const Input = (function(){
  const keys = new Set();
  const keysDown = new Set(); // 押した瞬間のフレームだけ入る
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if(!keys.has(k)) keysDown.add(k);
    keys.add(k);
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  return {
    getKey(k){ return keys.has(k.toLowerCase()); },
    getKeyDown(k){ return keysDown.has(k.toLowerCase()); },
    // 上下左右をまとめて取得(GetAxis的な)
    axis(){
      let x=0, y=0;
      if(this.getKey('arrowleft')  || this.getKey('a')) x -= 1;
      if(this.getKey('arrowright') || this.getKey('d')) x += 1;
      if(this.getKey('arrowup')    || this.getKey('w')) y -= 1;
      if(this.getKey('arrowdown')  || this.getKey('s')) y += 1;
      return new Vector2(x, y);
    },
    _clearFrame(){ keysDown.clear(); }
  };
})();

/**
 * 
 * @param {*} ScriptClass 
 * @param {*} opts 
 * @param  {...any} scriptArgs 
 * @returns 
 */
function Instantiate(ScriptClass, opts = {}, ...scriptArgs){
  const { parent, ...goOpts } = opts;
  const go = new GameObject(goOpts);
  Engine.current.scene.add(go);
  if(parent) go.setParent(parent instanceof GameObject ? parent : parent.gameObject, false);
  return go.addScript(new ScriptClass(...scriptArgs));
}

/**
 * ゲームオブジェクト削除(子オブジェクトも一緒に削除される)
 * @param {*} target
 */
function Destroy(target){
  const go = target instanceof GameObject ? target : target.gameObject;
  go.destroy();
}

/**
 * 親子関係を設定する(Unityの transform.SetParent 相当)
 * @param {*} target 親を設定するGameObject(またはMonoBehaviour)
 * @param {*} parent 親にするGameObject(またはMonoBehaviour)。nullで親子関係解除
 * @param {boolean} keepWorldPosition trueならワールド座標を維持したまま付け替える
 */
function SetParent(target, parent, keepWorldPosition=true){
  const go = target instanceof GameObject ? target : target.gameObject;
  const parentGo = parent == null ? null : (parent instanceof GameObject ? parent : parent.gameObject);
  go.setParent(parentGo, keepWorldPosition);
}

/**
 * GameObjectの有効/無効を切り替える(Unityの gameObject.SetActive 相当)
 * @param {*} target GameObject(またはMonoBehaviour)
 * @param {boolean} value
 */
function SetActive(target, value){
  const go = target instanceof GameObject ? target : target.gameObject;
  go.setActive(value);
}

/**
 * タグのゲームオブジェクトサーチ
 * @param {*} tag 
 * @returns 
 */
function FindWithTag(tag){
  return Engine.current.scene.objects.find(o => o.tag === tag && !o.destroyed);
}

/**
 * タグのゲームオブジェクト（複数）をサーチ
 * @param {*} tag 
 * @returns 
 */
function FindObjectsWithTag(tag){
  return Engine.current.scene.objects.filter(o => o.tag === tag && !o.destroyed);
}

/**
 * ゲーム側からは常にこの UI (シングルトン)経由で呼ぶ
 */
const UI = {
  setText(key, text){ Engine.current.ui.setText(key, text); },
  showOverlay(title, buttonText, onClick){ Engine.current.ui.showOverlay(title, buttonText, onClick); },
  hideOverlay(){ Engine.current.ui.hideOverlay(); },

  // ---- UI要素(Text/Panel/Image/Button)をキー付きで登録する ----
  text(key, opts){ return Engine.current.ui.text(key, opts); },
  panel(key, opts){ return Engine.current.ui.panel(key, opts); },
  image(key, src, opts){ return Engine.current.ui.image(key, src, opts); },
  button(key, opts){ return Engine.current.ui.button(key, opts); },
  get(key){ return Engine.current.ui.get(key); },
  remove(key){ Engine.current.ui.remove(key); },
  clear(){ Engine.current.ui.clear(); }
};

/**
 * SceneManager (Unityのシーン切り替え相当)
 */
const SceneManager = {
  scenes: {},
  register(name, setupFn){ this.scenes[name] = setupFn; },
  loadScene(name){
    const setup = this.scenes[name];
    const scene = new Scene();
    Engine.current.scene = scene;
    Engine.current.ui.clear();
    Engine.current.paused = false;
    Engine.current.camera.position = new Vector2(Screen.width / 2, Screen.height / 2);
    Engine.current.camera.zoom = 1;
    setup(scene);
  }
};

/**
 * エンジン本体（DOMでの表示を行う）
 */
class Engine {
  static current = null;
  constructor({ width=480, height=320, parent=document.body } = {}){
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.background = '#0b0c10';
    canvas.style.borderRadius = '10px';
    canvas.style.boxShadow = '0 12px 40px rgba(150, 150, 150, 0.5)';
    parent.appendChild(canvas);

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    Screen.width = width;
    Screen.height = height;

    this.scene = new Scene();
    this.ui = new UIRenderer();
    // カメラ位置=画面中心をデフォルトにすることで、ワールド座標=画面座標(左上原点)という
    // これまでの座標系との後方互換性を保つ(カメラを動かして初めてスクロールが発生する)
    this.camera = new Camera();
    this.camera.position = new Vector2(width / 2, height / 2);
    Camera.main = this.camera;
    this.running = false;
    this.paused = false;
    this.time = 0;
    this._last = 0;

    canvas.addEventListener('click', e => {
      const rect = canvas.getBoundingClientRect();
      this.ui.handleClick(e.clientX - rect.left, e.clientY - rect.top);
    });
    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      this.ui.handleMove(e.clientX - rect.left, e.clientY - rect.top);
      canvas.style.cursor = this.ui.isHoveringInteractive() ? 'pointer' : 'default';
    });

    Engine.current = this;
  }

/**
  * 
  */
start(){
    this.running = true;
    this._last = performance.now();
    requestAnimationFrame(this._loop.bind(this));
  }

/**
 * 
 * @param {*} now 
 * @returns 
 */
_loop(now){
    if(!this.running) return;
    const dt = Math.min((now - this._last) / 1000, 0.05);
    this._last = now;
    Time.deltaTime = this.paused ? 0 : dt;
    if(!this.paused){
      this.time += dt;
      Time.time = this.time;
      this.scene.update();
    }
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    this.camera.applyTransform(ctx);
    this.scene.draw(ctx);
    ctx.restore();
    this.ui.draw(ctx, this.canvas); // UIはカメラの影響を受けない画面固定のHUD
    Input._clearFrame();
    requestAnimationFrame(this._loop.bind(this));
  }
}
