(function() {
    const _0xid = '1vzJ5TIUj-9xJuRN3CAprPBQIZPL5rQcKGpCXBWDkK8g';
    const _0xcfg = [
        { gid: '0', name: 'ID:ドロップ' },
        { gid: '280076559', name: 'ID:制作' },
        { gid: '2088543273', name: '討伐討滅:ドロップ' },
        { gid: '927050495', name: '討伐討滅:制作' },
        { gid: '1476306407', name: 'アライアンス:ドロップ' },
        { gid: '1004826655', name: 'アライアンス:制作' },
        { gid: '481213368', name: 'レイド' },
        { gid: '1084391822', name: 'その他:ドロップ' },
        { gid: '2142137428', name: 'その他:制作' },
        { gid: '377897272', name: 'その他:交換' },
        { gid: '883228920', name: '店売り譜面' }
    ];

    let _0xdata = [];

    function _0xload(c) {
        return new Promise((resolve) => {
            const cbName = `jsonp_cb_${c.gid}_${Math.floor(Math.random() * 100000)}`;
            window[cbName] = function(d) {
                const r = [];
                try {
                    const rows = d.table.rows;
                    for (let i = 4; i < rows.length; i++) {
                        const row = rows[i];
                        if (!row || !row.c) continue;
                        const b = row.c[1] ? String(row.c[1].v || '') : '';
                        if (b.trim() !== "") {
                            r.push({
                                sName: c.name,
                                cells: [
                                    b,
                                    row.c[2] ? String(row.c[2].v || '') : '',
                                    row.c[3] ? String(row.c[3].v || '') : '',
                                    row.c[4] ? String(row.c[4].v || '') : ''
                                ]
                            });
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
                document.body.removeChild(scr);
                delete window[cbName];
                resolve(r);
            };
            const scr = document.createElement('script');
            scr.src = `https://docs.google.com/spreadsheets/d/${_0xid}/gviz/tq?tqx=responseHandler:${cbName}&gid=${c.gid}`;
            document.body.appendChild(scr);
        });
    }

    async function _0xinit() {
        const p = _0xcfg.map(c => _0xload(c));
        const res = await Promise.all(p);
        _0xdata = res.flat();
        
        document.getElementById('loadingView').style.display = 'none';
        document.getElementById('resultTable').style.display = 'table';
        
        const inp = document.getElementById('searchInput');
        const btn = document.getElementById('clearBtn');
        
        inp.removeAttribute('disabled');
        btn.removeAttribute('disabled');
        inp.focus();
        
        document.getElementById('loadStatus').textContent = `✅ 全 ${_0xdata.length} 件の譜面データをロードしました。`;
        _0xrender(_0xdata);

        inp.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase().trim();
            if (val === "") {
                _0xrender(_0xdata);
                return;
            }
            const filtered = _0xdata.filter(item => {
                return item.cells.some(c => c && c.toLowerCase().includes(val)) || 
                       item.sName.toLowerCase().includes(val);
            });
            _0xrender(filtered);
        });

        btn.addEventListener('click', () => {
            inp.value = ''; 
            _0xrender(_0xdata); 
            inp.focus(); 
        });
    }

    function _0xrender(d) {
        const body = document.getElementById('tableBody');
        body.innerHTML = '';
        if (d.length === 0) {
            body.innerHTML = '<tr><td colspan="5" class="no-result">キーワードに一致する譜面がありません</td></tr>';
            return;
        }
        d.forEach(item => {
            const tr = document.createElement('tr');
            const tdS = document.createElement('td');
            const span = document.createElement('span');
            span.className = 'badge-sheet';
            span.textContent = item.sName;
            tdS.appendChild(span);
            tr.appendChild(tdS);
            
            for (let i = 0; i < 4; i++) {
                const td = document.createElement('td');
                td.textContent = item.cells[i] || '';
                tr.appendChild(td);
            }
            body.appendChild(tr);
        });
    }

    window.addEventListener('DOMContentLoaded', _0xinit);
})();