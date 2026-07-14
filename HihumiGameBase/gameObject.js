// ---------- Transform ----------
// position/rotation/scale はワールド座標。実体は localPosition/localRotation/localScale で、
// parent が設定されている場合はそこからワールド値を都度計算する(Unityのtransform相当)。
class Transform {
    constructor(gameObject, x, y, w, h){
        this.gameObject = gameObject;
        this.localPosition = new Vector2(x, y);
        this.localRotation = 0; // ラジアン
        this.localScale = new Vector2(1, 1);
        this.size = new Vector2(w, h);
    }
    get position(){
        const parent = this.gameObject.parent;
        if(!parent) return this.localPosition;
        return parent.transform.position.add(this.localPosition);
    }
    set position(v){
        const parent = this.gameObject.parent;
        this.localPosition = parent ? v.sub(parent.transform.position) : v;
    }
    get rotation(){
        const parent = this.gameObject.parent;
        return parent ? parent.transform.rotation + this.localRotation : this.localRotation;
    }
    set rotation(r){
        const parent = this.gameObject.parent;
        this.localRotation = parent ? r - parent.transform.rotation : r;
    }
    get scale(){
        const parent = this.gameObject.parent;
        if(!parent) return this.localScale;
        const ps = parent.transform.scale;
        return new Vector2(ps.x * this.localScale.x, ps.y * this.localScale.y);
    }
    set scale(v){
        const parent = this.gameObject.parent;
        this.localScale = parent ? new Vector2(v.x / parent.transform.scale.x, v.y / parent.transform.scale.y) : v;
    }
}

// ---------- GameObject ----------
class GameObject {
    /**
     *
     * @param {*} param0
     */
    constructor({x=0, y=0, w=16, h=16, color='#fff', tag='default', sortingLayer='Default', sortingOrder=0} = {}){
        this.transform = new Transform(this, x, y, w, h);
        this.color = color;
        this.tag = tag;
        this.scripts = [];
        this.destroyed = false;
        this.scene = null;
        this.collisionSize = new Vector2(w, h);
        this.parent = null;
        this.children = [];
        this.sortingLayer = sortingLayer; // 描画順(大きなグループ分け)
        this.sortingOrder = sortingOrder; // 同レイヤー内の描画順(値が大きいほど手前)
        this.active = true; // Unityの activeSelf 相当
        this._activeInHierarchy = true; // OnEnable/OnDisableの変化検知用キャッシュ
    }

    /**
     * 自分自身とすべての祖先がactiveな場合のみtrue(Unityの activeInHierarchy 相当)
     */
    get activeInHierarchy(){
        let go = this;
        while(go){
            if(!go.active) return false;
            go = go.parent;
        }
        return true;
    }

    /**
     * GameObjectの有効/無効を切り替える。祖先の状態次第で実際の有効状態(activeInHierarchy)が
     * 変わらない場合はOnEnable/OnDisableは呼ばれない。子は再帰的に状態を再評価する。
     * @param {boolean} value
     */
    setActive(value){
        if(this.destroyed || this.active === value) return;
        this.active = value;
        this._syncActiveInHierarchy();
    }

    /**
     * activeInHierarchyの現在値をキャッシュと比較し、変化していればOnEnable/OnDisableを発火する。
     * 変化がなければ子孫も変化しないため再帰を打ち切る。
     */
    _syncActiveInHierarchy(){
        const now = this.activeInHierarchy;
        if(now === this._activeInHierarchy) return;
        this._activeInHierarchy = now;
        for(const s of this.scripts) now ? s.onEnable() : s.onDisable();
        for(const c of this.children) c._syncActiveInHierarchy();
    }

    /**
     * 親子関係を設定する
     * @param {GameObject|null} parent
     * @param {boolean} keepWorldPosition trueならワールド座標(position/rotation/scale)を維持する
     */
    setParent(parent, keepWorldPosition=true){
        if(this.parent === parent) return;
        const worldPos = keepWorldPosition ? this.transform.position : null;
        const worldRot = keepWorldPosition ? this.transform.rotation : null;
        const worldScale = keepWorldPosition ? this.transform.scale : null;

        if(this.parent){
            const idx = this.parent.children.indexOf(this);
            if(idx >= 0) this.parent.children.splice(idx, 1);
        }
        this.parent = parent;
        if(parent) parent.children.push(this);

        if(keepWorldPosition){
            this.transform.position = worldPos;
            this.transform.rotation = worldRot;
            this.transform.scale = worldScale;
        }
    }

    /**
     * 
     * @param {*} instance 
     * @returns 
     */
    addScript(instance){
        instance.gameObject = this;
        this.scripts.push(instance);
        if(this.activeInHierarchy) instance.onEnable();
        instance.start();
        return instance;

    }
    /**
     * 
     * @param {*} type 
     * @returns 
     */
    getScript(type){ return this.scripts.find(s => s instanceof type); }

    /**
     * 破棄する(子オブジェクトも道連れで破棄される)。activeInHierarchyだった場合は
     * OnDisableを、その後すべてのスクリプトにOnDestroyを一度だけ発火する。
     */
    destroy(){
        if(this.destroyed) return;
        this.destroyed = true;
        if(this._activeInHierarchy){
            this._activeInHierarchy = false;
            for(const s of this.scripts) s.onDisable();
        }
        for(const s of this.scripts) s.onDestroy();
        for(const c of [...this.children]) c.destroy();
    }

    /**
     * 
     * @param {*} other 
     * @returns 
     */
    intersects(other){
        const a = this.transform, b = other.transform;
        const aSize = this.collisionSize, bSize = other.collisionSize; // ← size → collisionSize
        return a.position.x < b.position.x + bSize.x &&
            a.position.x + aSize.x > b.position.x &&
            a.position.y < b.position.y + bSize.y &&
            a.position.y + aSize.y > b.position.y;
    }

    /**
     * activeInHierarchyがfalseの間はUpdateを呼ばない(Unityの非アクティブGameObject相当)
     */
    update(){
        if(!this.activeInHierarchy) return;
        for(const s of this.scripts) if(!this.destroyed) s.update();
    }

    /**
     * position/rotation/scale(いずれもワールド値)を反映してローカル座標系(0,0起点)で描画する。
     * scripts の draw() はこの変換済みコンテキスト内で呼ばれるので、position/size ではなく
     * (0,0)〜size を基準に描けばよい(SpriteRenderer参照)。
     * @param {*} ctx
     */
    draw(ctx){
        if(!this.activeInHierarchy) return; // 非アクティブなら自分も子も描画しない
        const t = this.transform;
        const pos = t.position, size = t.size, rotation = t.rotation, scale = t.scale;
        const cx = pos.x + size.x / 2, cy = pos.y + size.y / 2;

        ctx.save();
        ctx.translate(cx, cy);
        if(rotation) ctx.rotate(rotation);
        if(scale.x !== 1 || scale.y !== 1) ctx.scale(scale.x, scale.y);
        ctx.translate(-size.x / 2, -size.y / 2);

        if(this.color !== 'transparent'){
            ctx.fillStyle = this.color;
            ctx.fillRect(0, 0, size.x, size.y);
        }
        for(const s of this.scripts) s.draw(ctx);
        ctx.restore();

        const kids = this.children.filter(c => !c.destroyed);
        kids.sort(compareBySortOrder);
        for(const c of kids) c.draw(ctx);
    }
    
    /**
     * 当たり判定のサイズだけを変更する(見た目のサイズには影響しない)
     * @param {number} w
     * @param {number} h
     */
    setCollisionSize(w, h){
        this.collisionSize.x = w;
        this.collisionSize.y = h;
    }
}
/**
 * 
 * @param {*} owner 
 * @param {*} ComponentClass 
 * @param  {...any} args 
 * @returns 
 */
 function AddComponent(owner, ComponentClass, ...args){
    const go = owner instanceof GameObject ? owner : owner.gameObject;
    return go.addScript(new ComponentClass(...args));
}
