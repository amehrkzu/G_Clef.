// ---------- MonoBehaviour (Unityのスクリプト基底クラス相当) ----------
class MonoBehaviour {
  constructor(){ this.gameObject = null; }
  get transform(){ return this.gameObject.transform; }
  get tag(){ return this.gameObject.tag; }
  setCollisionSize(w, h){ this.gameObject.setCollisionSize(w, h); }
  start(){}
  update(){}
  draw(ctx){}
  onEnable(){}  // GameObjectがactiveInHierarchy=trueになった時に呼ばれる(生成直後も1回呼ばれる)
  onDisable(){} // GameObjectがactiveInHierarchy=falseになった時に呼ばれる(破棄直前にも呼ばれる)
  onDestroy(){} // Destroy()で破棄される時に一度だけ呼ばれる
  onCollisionEnter(other){} // other は相手の GameObject
}
