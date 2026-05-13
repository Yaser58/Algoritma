(function() {
    console.log("Haber & Takvim v17.0 (Date-Filter Mode) Başlatıldı");

    const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml';
    const FALLBACK_NEWS = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';

    function formatTR(date) {
        return new Intl.DateTimeFormat('tr-TR', { hour:'2-digit', minute:'2-digit', hour12:false, timeZone:'Europe/Istanbul' }).format(date);
    }

    function updateLiveClock() {
        const u = document.getElementById('ffLastUpdate');
        if (u) u.innerHTML = `<span style="color:var(--dim);font-size:0.6rem">İSTANBUL:</span> <span style="color:#00ff41;font-weight:bold">${new Intl.DateTimeFormat('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false, timeZone:'Europe/Istanbul' }).format(new Date())}</span>`;
    }
    setInterval(updateLiveClock, 1000);

    // FF (EDT) -> TR Çevirici
    function convertFFToTR(dStr, tStr) {
        try {
            const d = new Date(dStr + " " + tStr + " GMT-0400");
            return isNaN(d.getTime()) ? null : d;
        } catch(e) { return null; }
    }

    async function loadData() {
        const list = document.getElementById('ffNewsList');
        const filter = document.getElementById('ffDateFilter');
        if (!list) return;

        // Varsayılan tarih bugün olsun
        if (filter && !filter.value) {
            filter.value = new Date().toISOString().split('T')[0];
        }

        list.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#00ff41;font-size:0.6rem;opacity:0.7">VERİLER FİLTRELENİYOR...</div>';

        try {
            const res = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(CALENDAR_URL + '?t=' + Date.now()));
            const data = await res.json();
            if (data && data.contents && data.contents.includes('<event>')) {
                renderCalendar(data.contents, list, filter.value);
            } else {
                throw new Error("Takvim hatası");
            }
        } catch (e) {
            // Takvim başarısızsa haberlere geç
            try {
                const res = await fetch(FALLBACK_NEWS);
                const nData = await res.json();
                renderNews(nData.Data || [], list);
            } catch (e2) {
                list.innerHTML = '<div style="padding:20px;text-align:center;color:#f00;font-size:0.6rem">VERİ HATTI ENGELLENDİ</div>';
            }
        }
    }

    function renderCalendar(xml, container, filterDate) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        const evs = Array.from(doc.querySelectorAll('event'));
        container.innerHTML = '';

        let found = 0;
        evs.forEach(ev => {
            if (ev.querySelector('country')?.textContent !== 'USD') return;

            const dStr = ev.querySelector('date')?.textContent;
            const tStr = ev.querySelector('time')?.textContent;
            const trDate = convertFFToTR(dStr, tStr);
            if (!trDate) return;

            // Tarih filtresi
            if (filterDate) {
                const selDate = new Date(filterDate).toDateString();
                if (trDate.toDateString() !== selDate) return;
            }

            const impact = ev.querySelector('impact')?.textContent || 'Low';
            const impactColor = impact === 'High' ? '#f00' : (impact === 'Medium' ? '#fa0' : '#00ff41');
            const actual = ev.querySelector('actual')?.textContent || '';
            found++;

            const row = document.createElement('div');
            row.style.padding = '12px 10px'; row.style.borderBottom = '1px solid #111'; row.style.fontSize = '0.7rem';
            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                    <span style="color:#eee;font-weight:bold;font-size:0.65rem">${formatTR(trDate)} <span style="color:#555;font-weight:normal">| ${trDate.toLocaleDateString('tr-TR')}</span></span>
                    <span style="color:${impactColor};font-size:0.6rem;font-weight:bold">${impact.toUpperCase()} ETKİ</span>
                </div>
                <div style="color:#eee;font-weight:bold;margin-bottom:6px;line-height:1.3">${ev.querySelector('title')?.textContent}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.6rem">
                    <span style="color:#888">Beklenti: ${ev.querySelector('forecast')?.textContent || '--'} | Açıklanan: <b style="color:#fff">${actual || '--'}</b></span>
                    <span style="color:${actual ? '#00ff41' : '#ffaa00'};font-weight:bold;padding:1px 4px;border:1px solid;border-radius:2px">${actual ? 'AÇIKLANDI' : 'BEKLENİYOR'}</span>
                </div>
            `;
            container.appendChild(row);
        });

        if (found === 0) {
            container.innerHTML = `<div style="padding:40px 10px;text-align:center;color:#555;font-size:0.6rem">Seçilen tarihte (${filterDate}) USD haberi bulunamadı.</div>`;
        }
    }

    function renderNews(items, container) {
        container.innerHTML = '<div style="padding:10px;color:#fa0;font-size:0.5rem;text-align:center;opacity:0.6">TAKVİM HATASI: CANLI HABER AKIŞI AKTİF</div>';
        items.slice(0, 15).forEach(item => {
            const row = document.createElement('div');
            row.style.padding = '12px 10px'; row.style.borderBottom = '1px solid #111';
            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="color:#eee;font-weight:bold;font-size:0.6rem">${formatTR(new Date(item.published_on * 1000))}</span>
                    <span style="color:#555;font-size:0.55rem">${item.source}</span>
                </div>
                <div style="color:#eee;font-weight:bold;font-size:0.7rem;line-height:1.3">${item.title}</div>
            `;
            container.appendChild(row);
        });
    }

    window.addEventListener('load', () => {
        loadData();
        document.getElementById('ffDateFilter').onchange = loadData;
        document.getElementById('ffRefresh').onclick = loadData;
    });
    setInterval(loadData, 10 * 60 * 1000);
})();
