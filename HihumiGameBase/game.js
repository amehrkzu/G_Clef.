/* =========================================================
   サンプルゲーム: 「★キャッチ」(MiniEngine v2 / Unity風API版)
   このファイルには document / getElementById 等の
   DOM操作が一切登場しない。Unityのスクリプトを書く感覚で
   MonoBehaviour, Instantiate, Time, Input, transform だけを使う。
   ========================================================= 
*/

// ---- プレイヤーを動かすスクリプト(UnityのMonoBehaviourと同じ感覚) ----
class Player extends MonoBehaviour {
  start(){
    this.speed = 200;
    AddComponent(this, SpriteRenderer, './smail.png')
  }
  update(){
    const axis = Input.axis();
    const p = this.transform.position;
    p.x += axis.x * this.speed * Time.deltaTime;
    p.y += axis.y * this.speed * Time.deltaTime;
    // 画面内に収める(Screen.width / Screen.height はエンジンが自動で設定)
    p.x = Math.max(0, Math.min(Screen.width  - this.transform.size.x, p.x));
    p.y = Math.max(0, Math.min(Screen.height - this.transform.size.y, p.y));
  }
  // Unityの OnCollisionEnter2D 的な、衝突したら自動で呼ばれる関数
  onCollisionEnter(other){
    if(Game.over) return;
    if(other.tag === 'coin'){
      Destroy(other);
      Game.score += 10;
    } else if(other.tag === 'enemy'){
      Destroy(other);
      Game.hp -= 1;
      if(Game.hp <= 0) Game.gameOver();
    }
  }
}

// ---- 落下するコイン/敵の共通の動き ----
class Faller extends MonoBehaviour {
  constructor(speed){ super(); this.speed = speed; }
  update(){
    this.transform.position.y += this.speed * Time.deltaTime;
    if(this.transform.position.y > Screen.height) Destroy(this);
  }
}

// ---- スコアやスポーン処理などゲーム全体を管理するスクリプト ----
// (Unityで言う「空のGameObjectにアタッチしたGameManagerスクリプト」に相当)
class GameManager extends MonoBehaviour {
  update(){
    if(Game.over) return;

    Game.spawnTimer -= Time.deltaTime;
    if(Game.spawnTimer <= 0){
      Game.spawn();
      Game.spawnTimer = 0.55 - Math.min(0.35, Time.time * 0.01); // だんだん忙しくなる
    }

    UI.setText('score', `SCORE: ${Game.score}`);
    UI.setText('hp',    `HP: ${Game.hp}`);
    UI.setText('time',  `TIME: ${Math.floor(Time.time)}s`);
  }
}

// ---- ゲーム全体の状態(スコア・HPなど) ----
const Game = {
  score: 0,
  hp: 3,
  spawnTimer: 0,
  over: false,

  start(){
    this.score = 0;
    this.hp = 3;
    this.spawnTimer = 0;
    this.over = false;

    player = Instantiate(Player, { x:220, y:280, w:50, h:50, color:'#5ee3a5', tag:'player' });
    player.setCollisionSize( 25,25 );
    Instantiate(GameManager, { w:0, h:0, color:'transparent', tag:'manager' });

    // ---- 新UI要素のテスト表示(Panel/Button/Image) ----
    // HUDテキストの背景パネル(setTextより先に追加することでテキストの下に描画される)
    UI.panel('hud-bg', { anchor:'top-left', x:5, y:5, width:110, height:58, color:'rgba(0,0,0,0.35)', borderColor:'#2b2f3a' });

    // 一時停止/再開ボタン(クリックのたびにラベルが切り替わる)
    UI.button('pause-btn', {
      anchor:'top-right', x:-10, y:10, width:76, height:28,
      text:'一時停止',
      onClick: () => {
        Engine.current.paused = !Engine.current.paused;
        UI.get('pause-btn').text = Engine.current.paused ? '再開' : '一時停止';
      }
    });

    // 画像アイコン(右下に固定表示)
    UI.image('player-icon', './smail.png', { anchor:'bottom-right', x:-10, y:-10, width:32, height:32 });
  },

  spawn(){
    const isCoin = Math.random() < 0.65;
    const x = Math.random() * (Screen.width - 16);
    const speed = isCoin ? 90 + Math.random()*60 : 110 + Math.random()*90;
    // Instantiate(スクリプトクラス, GameObjectのオプション, スクリプトのコンストラクタ引数...)
    Instantiate(Faller, {
      x, y: -16,
      w: isCoin ? 14 : 18, h: isCoin ? 14 : 18,
      color: isCoin ? '#ffd166' : '#ef476f',
      tag: isCoin ? 'coin' : 'enemy'
    }, speed);
  },

  gameOver(){
    this.over = true;
    UI.showOverlay(`ゲームオーバー (SCORE: ${this.score})`, 'もう一度プレイ', () => {
      SceneManager.loadScene('main');
    });
  }
};

// ---- シーン定義(Unityの「シーンにGameObjectを配置する」に相当) ----
SceneManager.register('main', () => {
  Game.start();
});

// ---- 起動処理 ----
const engine = new Engine({ width: 480, height: 320, parent: document.getElementById('game-container') });
SceneManager.loadScene('main');
engine.start();
