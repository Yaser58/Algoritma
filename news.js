(function() {
    console.log("Haber & Takvim v19.0 (CryptoPanic Dedicated) Başlatıldı");

    const CRYPTOPANIC_RSS = 'https://cryptopanic.com/news/rss/';
    const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml';

    function formatTR(date) {
        return new Intl.DateTimeFormat('tr-TR', { 
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false, timeZone: 'Europe/Istanbul' 
        }).format(date);
    }

    function updateClock() {
        const u = document.getElementById('ffLastUpdate');
        if (u) u.innerHTML = `<span style="color:var(--dim);font-size:0.6rem">İSTANBUL:</span> <span style="color:#00ff41;font-weight:bold">${formatTR(new Date())}</span>`;
    }
    setInterval(updateClock, 1000);

    async function loadData() {
        const list = document.getElementById('ffNewsList');
        if (!list) return;

        list.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#00ff41;font-size:0.6rem;opacity:0.7">CRYPTOPANIC VERİLERİ ÇEKİLİYOR...</div>';

        // CryptoPanic RSS -> AllOrigins üzerinden (CORS Engellerini Aşar)
        try {
            const res = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(CRYPTOPANIC_RSS + '?t=' + Date.now()));
            const data = await res.json();
            const xmlText = data.contents;

            if (xmlText && xmlText.includes('<item>')) {
                renderRSS(xmlText, list);
            } else {
                throw new Error("RSS Boş");
            }
        } catch (e) {
            console.warn("CryptoPanic Hatası, Takvim deneniyor...");
            tryCalendar(list);
        }
    }

    async function tryCalendar(container) {
        try {
            const res = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(CALENDAR_URL));
            const data = await res.json();
            if (data && data.contents) renderCalendar(data.contents, container);
            else throw new Error("Takvim hatası");
        } catch (e) {
            container.innerHTML = '<div style="padding:40px 10px;text-align:center;color:#444;font-size:0.6rem">VERİ KANALLARI ŞU AN MEŞGUL.</div>';
        }
    }

    function renderRSS(xmlText, container) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');
        const items = Array.from(xml.querySelectorAll('item')).slice(0, 25);
        
        container.innerHTML = '<div style="padding:10px;color:#00ff41;font-size:0.5rem;text-align:center;opacity:0.6">CRYPTOPANIC CANLI AKIŞI AKTİF</div>';
        
        items.forEach(item => {
            const title = item.querySelector('title')?.textContent || '';
            const link = item.querySelector('link')?.textContent || '#';
            const pubDate = new Date(item.querySelector('pubDate')?.textContent || '');
            const source = item.querySelector('source')?.textContent || 'CryptoPanic';

            const row = document.createElement('div');
            row.style.padding = '12px 10px'; row.style.borderBottom = '1px solid #111'; row.style.fontSize = '0.7rem';
            row.style.cursor = 'pointer';
            row.onclick = () => window.open(link, '_blank');

            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                    <span style="color:#eee;font-weight:bold;font-size:0.65rem">${formatTR(pubDate)} <span style="color:#555;font-weight:normal">| ${pubDate.toLocaleDateString('tr-TR')}</span></span>
                    <span style="color:#00ff41;font-size:0.55rem;font-weight:bold">YENİ HABER</span>
                </div>
                <div style="color:#eee;font-weight:bold;line-height:1.3;margin-bottom:4px">${title}</div>
                <div style="color:#444;font-size:0.55rem">KAYNAK: ${source}</div>
            `;
            container.appendChild(row);
        });
    }

    function renderCalendar(xml, container) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        const evs = Array.from(doc.querySelectorAll('event')).slice(0, 15);
        container.innerHTML = '<div style="padding:10px;color:#00ff41;font-size:0.5rem;text-align:center;opacity:0.6">EKONOMİK TAKVİM AKTİF</div>';
        evs.forEach(ev => {
            if (ev.querySelector('country')?.textContent !== 'USD') return;
            const row = document.createElement('div');
            row.style.padding = '10px'; row.style.borderBottom = '1px solid #111'; row.style.fontSize = '0.7rem';
            row.innerHTML = `
                <div style="color:#555;font-size:0.55rem">${ev.querySelector('time')?.textContent} | ${ev.querySelector('date')?.textContent}</div>
                <div style="color:#eee;font-weight:bold">${ev.querySelector('title')?.textContent}</div>
            `;
            container.appendChild(row);
        });
    }

    if (document.readyState === 'complete') loadData(); else window.addEventListener('load', loadData);
    setInterval(loadData, 5 * 60 * 1000);
})();
