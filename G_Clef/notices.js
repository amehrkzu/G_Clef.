(function () {
    const _0xid  = '1vzJ5TIUj-9xJuRN3CAprPBQIZPL5rQcKGpCXBWDkK8g';
    const _0xgid = '1153220863';

    function _0xload() {
        return new Promise((resolve) => {
            const cbName = `jsonp_notice_${Math.floor(Math.random() * 100000)}`;
            window[cbName] = function (d) {
                const r = [];
                try {
                    const rows = d.table.rows;
                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        if (!row || !row.c) continue;
                        const title = row.c[1] ? String(row.c[1].v || '') : '';
                        const body  = row.c[2] ? String(row.c[2].v || '') : '';
                        if (title.trim() !== '') {
                            r.push({ title, body });
                        }
                    }
                } catch (e) {
                    // エラーを隠蔽
                }
                document.body.removeChild(scr);
                delete window[cbName];
                resolve(r);
            };
            const scr = document.createElement('script');
            scr.src = `https://docs.google.com/spreadsheets/d/${_0xid}/gviz/tq?tqx=responseHandler:${cbName}&gid=${_0xgid}`;
            document.body.appendChild(scr);
        });
    }

    function _0xbuildBanner(notice) {
        const wrap = document.createElement('div');
        wrap.className = 'notice-banner';

        const head = document.createElement('div');
        head.className = 'notice-banner-head';
        const h3 = document.createElement('h3');
        h3.textContent = notice.title;
        head.appendChild(h3);

        const body = document.createElement('div');
        body.className = 'notice-banner-body';
        const p = document.createElement('p');
        notice.body.split('\n').forEach((line, i) => {
            if (i > 0) p.appendChild(document.createElement('br'));
            p.appendChild(document.createTextNode(line));
        });
        body.appendChild(p);

        wrap.appendChild(head);
        wrap.appendChild(body);
        return wrap;
    }

    function _0xbuildDots(count) {
        const dotsWrap = document.getElementById('noticeDots');
        dotsWrap.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const dot = document.createElement('button');
            dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
            dot.dataset.idx = i;
            dotsWrap.appendChild(dot);
        }
    }

    function _0xinitCarousel(count) {
        const track = document.getElementById('noticeTrack');
        let cur = 0;
        function goTo(idx) {
            cur = (idx + count) % count;
            track.style.transform = `translateX(-${cur * 100}%)`;
            document.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === cur));
        }
        document.getElementById('noticePrev').addEventListener('click', () => goTo(cur - 1));
        document.getElementById('noticeNext').addEventListener('click', () => goTo(cur + 1));
        document.querySelectorAll('.carousel-dot').forEach(d => d.addEventListener('click', () => goTo(+d.dataset.idx)));
    }

    async function _0xinit() {
        const track = document.getElementById('noticeTrack');
        const notices = await _0xload();

        track.innerHTML = '';

        if (notices.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'notice-banner';
            const body = document.createElement('div');
            body.className = 'notice-banner-body notice-empty';
            body.textContent = '現在お知らせはありません。';
            empty.appendChild(body);
            track.appendChild(empty);
            document.getElementById('noticeDots').style.display = 'none';
            document.querySelectorAll('#noticeCarousel .carousel-btn').forEach(b => b.style.display = 'none');
            return;
        }

        notices.forEach(n => track.appendChild(_0xbuildBanner(n)));
        _0xbuildDots(notices.length);
        _0xinitCarousel(notices.length);
    }

    window.addEventListener('DOMContentLoaded', _0xinit);
})();
