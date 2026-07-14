// ---------- Camera (UnityのCamera.main相当) ----------
// GameObjectはこれまで通りワールド座標(transform.position)のまま描けばよい。
// Cameraはワールド座標と画面(canvas)座標の変換だけを担当し、
// Engineが毎フレーム scene.draw() の前後でこの変換をctxに適用する。
class Camera {
  constructor(){
    this.transform = { position: new Vector2(0, 0) };
    this.zoom = 1;
  }

  get position(){ return this.transform.position; }
  set position(v){ this.transform.position = v; }

  /**
   * 描画前にctxへこのカメラの変換を適用する(呼び出し元でsave/restoreすること)
   * @param {*} ctx
   */
  applyTransform(ctx){
    ctx.translate(Screen.width / 2, Screen.height / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.position.x, -this.position.y);
  }

  /**
   * ワールド座標→画面(canvas)座標
   * @param {Vector2} worldPos
   */
  worldToScreen(worldPos){
    return new Vector2(
      (worldPos.x - this.position.x) * this.zoom + Screen.width / 2,
      (worldPos.y - this.position.y) * this.zoom + Screen.height / 2
    );
  }

  /**
   * 画面(canvas)座標→ワールド座標。クリック座標をゲーム内座標に変換する時などに使う
   * @param {Vector2} screenPos
   */
  screenToWorld(screenPos){
    return new Vector2(
      (screenPos.x - Screen.width / 2) / this.zoom + this.position.x,
      (screenPos.y - Screen.height / 2) / this.zoom + this.position.y
    );
  }
}
Camera.main = null; // Engineが生成時にセットする
