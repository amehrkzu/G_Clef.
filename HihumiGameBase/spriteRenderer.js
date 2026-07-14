// UnityのSpriteRendererに相当。画像を読み込んで transform の位置に描画する
class SpriteRenderer extends MonoBehaviour {
  constructor(src){
    super();
    this.image = new Image();
    this.image.src = src;
    this.loaded = false;
    this.image.onload = () => { this.loaded = true; };
  }
  start(){
    this.gameObject.color = 'transparent'; // 素の四角は描かない
  }
  draw(ctx){
    if(!this.loaded) return; // 読み込み前は何もしない
    // GameObject.draw() が position/rotation/scale を反映した上で
    // (0,0)原点のローカル座標系に変換済みなので、ここでは size だけ使う
    const { size } = this.transform;
    ctx.drawImage(this.image, 0, 0, size.x, size.y);
  }
}