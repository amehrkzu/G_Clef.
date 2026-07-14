// ---------- Scene ----------
class Scene {
  constructor(){ this.objects = []; }
  add(o){ o.scene = this; this.objects.push(o); return o; }
  update(){
    for(const o of this.objects) o.update();
    this._checkCollisions();
    this.objects = this.objects.filter(o => !o.destroyed);
  }
  _checkCollisions(){
    const objs = this.objects.filter(o => !o.destroyed && o.activeInHierarchy);
    for(let i=0; i<objs.length; i++){
      for(let j=i+1; j<objs.length; j++){
        const a = objs[i], b = objs[j];
        if(a.intersects(b)){
          for(const s of a.scripts) s.onCollisionEnter(b);
          for(const s of b.scripts) s.onCollisionEnter(a);
        }
      }
    }
  }
  draw(ctx){
    const roots = this.objects.filter(o => !o.parent);
    roots.sort(compareBySortOrder);
    for(const o of roots) o.draw(ctx);
  }
}
