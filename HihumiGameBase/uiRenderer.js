/**
 * UI (HUDやゲームオーバー画面をCanvas上に直接描く。DOM操作なし)
 * UIElement(Text/Panel/Image/Button)をキー付きで登録し、追加順に描画する。
 */
class UIRenderer {
    constructor(){
        this.elements = new Map(); // key -> UIElement
        this._order = [];          // 描画順(追加順)を保持するキーの一覧
        this._legacyKeys = [];     // setText()の呼び出し順(HUD行の並び用)
    }

    /**
     * UI要素を登録する。同じキーで再登録すると要素そのものを差し替える。
     * @param {string} key
     * @param {UIElement} element
     */
    add(key, element){
        if(!this.elements.has(key)) this._order.push(key);
        this.elements.set(key, element);
        return element;
    }

    get(key){ return this.elements.get(key); }

    remove(key){
        this.elements.delete(key);
        const i = this._order.indexOf(key);
        if(i >= 0) this._order.splice(i, 1);
    }

    clear(){
        this.elements.clear();
        this._order = [];
        this._legacyKeys = [];
    }

    // ---- UI要素の追加(Unityの Instantiate<Text/Button/Image>() 的な使い方を想定) ----
    text(key, opts){ return this.add(key, new UIText(opts)); }
    panel(key, opts){ return this.add(key, new UIPanel(opts)); }
    image(key, src, opts){ return this.add(key, new UIImage(src, opts)); }
    button(key, opts){ return this.add(key, new UIButton(opts)); }

    // ---- 旧API互換: 左上に積み上がるHUDテキスト ----
    /**
     * @param {*} key
     * @param {*} text
     */
    setText(key, text){
        const elKey = '__legacy_' + key;
        let idx = this._legacyKeys.indexOf(key);
        if(idx === -1){ idx = this._legacyKeys.length; this._legacyKeys.push(key); }
        let el = this.get(elKey);
        if(!el){
            el = this.text(elKey, { anchor:'top-left', x:10, y:10 + idx*18, font:'13px monospace', color:'#5ee3a5' });
        }
        el.setText(text);
    }

    // ---- 旧API互換: 画面全体を暗くして中央にタイトル+ボタンを出すオーバーレイ ----
    /**
     * @param {*} title
     * @param {*} buttonText
     * @param {*} onClick
     */
    showOverlay(title, buttonText, onClick){
        this.panel('__overlay_bg', { anchor:'top-left', x:0, y:0, width:Screen.width, height:Screen.height, color:'rgba(0,0,0,0.6)' });
        this.text('__overlay_title', { anchor:'center', x:0, y:-30, text:title, font:'20px monospace', color:'#ffffff' });
        this.button('__overlay_btn', { anchor:'center', x:0, y:20, width:160, height:36, text:buttonText, onClick });
    }

    hideOverlay(){
        this.remove('__overlay_bg');
        this.remove('__overlay_title');
        this.remove('__overlay_btn');
    }

    /**
     * @param {*} ctx
     */
    draw(ctx){
        for(const key of this._order){
            this.elements.get(key).draw(ctx, Screen.width, Screen.height);
        }
    }

    /**
     * @param {*} x
     * @param {*} y
     */
    handleClick(x, y){
        for(let i = this._order.length - 1; i >= 0; i--){
            const el = this.elements.get(this._order[i]);
            if(el.handleClick(x, y, Screen.width, Screen.height)) return;
        }
    }

    /**
     * @param {*} x
     * @param {*} y
     */
    handleMove(x, y){
        for(const key of this._order){
            const el = this.elements.get(key);
            if(el.handleMove) el.handleMove(x, y, Screen.width, Screen.height);
        }
    }

    isHoveringInteractive(){
        for(const key of this._order){
            const el = this.elements.get(key);
            if(el instanceof UIButton && el._hover && el.visible) return true;
        }
        return false;
    }
}
