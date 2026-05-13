(function() {
    console.log("Haber & Takvim v18.0 (Max Accessibility) Başlatıldı");

    const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml';
    const PROXY_LIST = [
        'https://api.allorigins.win/get?url=',
        'https://api.codetabs.com/v1/proxy?quest=',
        'https://corsproxy.io/?'
    ];

    function formatTRTime(date) {
        return new Intl.DateTimeFormat('tr-TR', { hour:'2-digit', minute:'2-digit', hour12:false, timeZone:'Europe/Istanbul' }).format(date);
    }

    function updateLiveClock() {
        const u = document.getElementById('ffLastUpdate');
        if (u) {
            const now = new Date();
            const time = new Intl.DateTimeFormat('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false, timeZone:'Europe/Istanbul' }).format(now);
            u.innerHTML = `<span style="color:var(--dim);font-size:0.6rem">İSTANBUL:</span> <span style="color:#00ff41;font-weight:bold">${time}</span>`;
        }
    }
    setInterval(updateLiveClock, 1000);

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

        if (filter && !filter.value) filter.value = new Date().toISOString().split('T')[0];

        list.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#00ff41;font-size:0.6rem;opacity:0.7">VERİ KANALLARI TARANIYOR...</div>';

        let xmlText = null;
        // Kanal Tarama
        for (let proxy of PROXY_LIST) {
            try {
                const target = CALENDAR_URL + '?t=' + Date.now();
                const res = await fetch(proxy + encodeURIComponent(target), { signal: AbortSignal.timeout(6000) });
                const json = await res.json();
                const content = json.contents || json;
                if (content && content.includes('<event>')) {
                    xmlText = content;
                    break;
                }
            } catch (e) { console.warn("Kanal meşgul:", proxy); }
        }

        if (xmlText) {
            renderCalendar(xmlText, list, filter.value);
        } else {
            // Hiçbiri çalışmazsa acil durum haber akışı
            fetchFallbackNews(list);
        }
    }

    async function fetchFallbackNews(container) {
        try {
            const res = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
            const data = await res.json();
            renderNews(data.Data || [], container);
        } catch (e) {
            container.innerHTML = `
                <div style="padding:40px 10px;text-align:center">
                    <div style="color:#f00;font-size:0.7rem;margin-bottom:15px">BAĞLANTI BLOKLANDI</div>
                    <button onclick="location.reload()" style="background:transparent;border:1px solid #333;color:var(--green);padding:8px 20px;cursor:pointer;font-size:0.65rem">TEKRAR DENE</button>
                </div>`;
        }
    }

    function renderCalendar(xml, container, filterDate) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        const evs = Array.from(doc.querySelectorAll('event'));
        container.innerHTML = '';

        let foundCount = 0;
        evs.forEach(ev => {
            if (ev.querySelector('country')?.textContent !== 'USD') return;

            const dStr = ev.querySelector('date')?.textContent;
            const tStr = ev.querySelector('time')?.textContent;
            const trDate = convertFFToTR(dStr, tStr);
            if (!trDate) return;

            // Tarih filtresi (Geçmiş ve gelecek dahil)
            if (filterDate) {
                const sel = new Date(filterDate);
                if (trDate.getFullYear() !== sel.getFullYear() || 
                    trDate.getMonth() !== sel.getMonth() || 
                    trDate.getDate() !== sel.getDate()) return;
            }

            const impact = ev.querySelector('impact')?.textContent || 'Low';
            const impactColor = impact === 'High' ? '#f00' : (impact === 'Medium' ? '#fa0' : '#00ff41');
            const actual = ev.querySelector('actual')?.textContent || '';
            foundCount++;

            const row = document.createElement('div');
            row.style.padding = '12px 10px'; row.style.borderBottom = '1px solid #111'; row.style.fontSize = '0.7rem';
            row.style.background = actual ? 'rgba(0,255,65,0.02)' : 'transparent';

            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                    <span style="color:#eee;font-weight:bold;font-size:0.65rem">${formatTRTime(trDate)} <span style="color:#555;font-weight:normal">| ${trDate.toLocaleDateString('tr-TR')}</span></span>
                    <span style="color:${impactColor};font-size:0.6rem;font-weight:bold">${impact.toUpperCase()} ETKİ</span>
                </div>
                <div style="color:#eee;font-weight:bold;margin-bottom:6px;line-height:1.3">${ev.querySelector('title')?.textContent}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.65rem">
                    <span style="color:#888">B: ${ev.querySelector('forecast')?.textContent || '--'} | A: <b style="color:#fff">${actual || '--'}</b></span>
                    <span style="color:${actual ? '#00ff41' : '#ffaa00'};font-weight:bold;font-size:0.55rem;border:1px solid;padding:1px 4px;border-radius:2px">
                        ${actual ? 'AÇIKLANDI' : 'BEKLENİYOR'}
                    </span>
                </div>
            `;
            container.appendChild(row);
        });

        if (foundCount === 0) {
            container.innerHTML = `<div style="padding:40px 10px;text-align:center;color:#444;font-size:0.6rem">Seçilen tarihte USD haberi bulunamadı.</div>`;
        }
    }

    function renderNews(items, container) {
        container.innerHTML = '<div style="padding:10px;color:#fa0;font-size:0.55rem;text-align:center;opacity:0.6">TAKVİM MEŞGUL: CANLI AKIŞ AKTİF</div>';
        items.slice(0, 15).forEach(item => {
            const row = document.createElement('div');
            row.style.padding = '12px 10px'; row.style.borderBottom = '1px solid #111';
            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="color:#eee;font-weight:bold;font-size:0.6rem">${formatTRTime(new Date(item.published_on * 1000))}</span>
                    <span style="color:#555;font-size:0.55rem">${item.source}</span>
                </div>
                <div style="color:#eee;font-weight:bold;font-size:0.7rem;line-height:1.3">${item.title}</div>
            `;
            container.appendChild(row);
        });
    }

    window.addEventListener('load', () => {
        loadData();
        const f = document.getElementById('ffDateFilter');
        if(f) f.onchange = loadData;
        const r = document.getElementById('ffRefresh');
        if(r) r.onclick = loadData;
    });

    setInterval(loadData, 5 * 60 * 1000);
})();
