// loader.js
const engineFiles = [
    'mini-engine.js',
    'camera.js',
    'monoBehaviour.js',
    'spriteRenderer.js',
    'gameObject.js',
    'scene.js',
    'uiElements.js',
    'uiRenderer.js',

// - 必ず最後にする -----------------------------
//  'game.js' 
];

/**
 * 
 * @param {*} src 
 * @returns 
 */
function loadScript(src){
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`読み込み失敗: ${src}`));
    document.head.appendChild(s);
  });
}

/**
 * 
 */
async function loadAll(){
  for(const file of engineFiles){
    await loadScript(file); // 1個ずつ確実に順番通り読み込む
  }
  await loadScript('game.js'); // 全部読み終わってから最後にgame.jsを起動
}

loadAll().catch(err => console.error(err));