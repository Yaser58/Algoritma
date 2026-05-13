(function() {
    console.log("Haber & Takvim v16.0 (Zero-Error Mode) Başlatıldı");

    const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml';
    const NEWS_URL = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';

    function formatTR(date) {
        return new Intl.DateTimeFormat('tr-TR', { hour:'2-digit', minute:'2-digit', hour12:false, timeZone:'Europe/Istanbul' }).format(date);
    }

    function updateLiveClock() {
        const u = document.getElementById('ffLastUpdate');
        if (u) u.innerHTML = `<span style="color:var(--dim);font-size:0.6rem">İSTANBUL:</span> <span style="color:#00ff41;font-weight:bold">${new Intl.DateTimeFormat('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false, timeZone:'Europe/Istanbul' }).format(new Date())}</span>`;
    }
    setInterval(updateLiveClock, 1000);

    async function loadData() {
        const list = document.getElementById('ffNewsList');
        if (!list) return;

        list.innerHTML = `
            <div style="padding:40px 20px;text-align:center">
                <div style="color:#00ff41;font-size:0.6rem;margin-bottom:15px;opacity:0.8">GÜVENLİ VERİ HATTI OLUŞTURULUYOR...</div>
                <div id="statusLog" style="color:#444;font-size:0.5rem;text-align:left;max-width:150px;margin:0 auto"></div>
            </div>`;
        
        const log = document.getElementById('statusLog');
        const sLog = (m) => { if(log) log.innerHTML += `<div>> ${m}</div>`; };

        // 1. KANAL: TAKVİM (AllOrigins)
        sLog("Takvim kanalı taranıyor...");
        try {
            const res = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(CALENDAR_URL + '?t=' + Date.now()));
            const data = await res.json();
            if (data && data.contents && data.contents.includes('<event>')) {
                sLog("Takvim verisi alındı.");
                renderCalendar(data.contents, list);
                return;
            }
        } catch (e) { sLog("Takvim kanalı kapalı."); }

        // 2. KANAL: HABERLER (CryptoCompare)
        sLog("Haber kanalı taranıyor...");
        try {
            const res = await fetch(NEWS_URL);
            const data = await res.json();
            if (data && data.Data) {
                sLog("Haberler alındı.");
                renderNews(data.Data, list);
                return;
            }
        } catch (e) { sLog("Haber kanalı kapalı."); }

        // 3. KANAL: YEDEK HABERLER (RSS2JSON - No Callback)
        sLog("Yedek hat deneniyor...");
        try {
            const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.coindesk.com%2Farc%2Foutboundfeeds%2Frss%2F');
            const data = await res.json();
            if (data && data.items) {
                sLog("Yedek hat aktif.");
                renderRSS(data.items, list);
                return;
            }
        } catch (e) { sLog("Tüm kanallar bloklandı."); }

        renderFinalError(list);
    }

    function renderCalendar(xml, container) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        const evs = Array.from(doc.querySelectorAll('event')).slice(0, 30);
        container.innerHTML = '<div style="padding:10px;color:#00ff41;font-size:0.5rem;text-align:center;opacity:0.6">EKONOMİK TAKVİM (TR)</div>';
        evs.forEach(ev => {
            if (ev.querySelector('country')?.textContent !== 'USD') return;
            const actual = ev.querySelector('actual')?.textContent || '';
            const row = document.createElement('div');
            row.style.padding = '12px 10px'; row.style.borderBottom = '1px solid #111'; row.style.fontSize = '0.7rem';
            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="color:#555;font-size:0.55rem">${ev.querySelector('date')?.textContent} | ${ev.querySelector('time')?.textContent}</span>
                    <span style="color:#555;font-size:0.55rem">${ev.querySelector('impact')?.textContent.toUpperCase()} ETKİ</span>
                </div>
                <div style="color:#eee;font-weight:bold">${ev.querySelector('title')?.textContent}</div>
                <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:0.6rem">
                    <span style="color:#888">B: ${ev.querySelector('forecast')?.textContent || '--'} | A: <b style="color:#fff">${actual || '--'}</b></span>
                    <span style="color:${actual ? '#00ff41' : '#ffaa00'}">${actual ? 'AÇIKLANDI' : 'BEKLENİYOR'}</span>
                </div>
            `;
            container.appendChild(row);
        });
    }

    function renderNews(items, container) {
        container.innerHTML = '<div style="padding:10px;color:#00ff41;font-size:0.5rem;text-align:center;opacity:0.6">CANLI HABER AKIŞI AKTİF</div>';
        items.slice(0, 15).forEach(item => {
            const row = document.createElement('div');
            row.style.padding = '12px 10px'; row.style.borderBottom = '1px solid #111'; row.style.fontSize = '0.7rem';
            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="color:#eee;font-weight:bold;font-size:0.6rem">${formatTR(new Date(item.published_on * 1000))}</span>
                    <span style="color:#555;font-size:0.55rem">${item.source}</span>
                </div>
                <div style="color:#eee;font-weight:bold;line-height:1.3">${item.title}</div>
            `;
            container.appendChild(row);
        });
    }

    function renderRSS(items, container) {
        container.innerHTML = '<div style="padding:10px;color:#00ff41;font-size:0.5rem;text-align:center;opacity:0.6">COINDESK HABER AKIŞI AKTİF</div>';
        items.slice(0, 15).forEach(item => {
            const row = document.createElement('div');
            row.style.padding = '12px 10px'; row.style.borderBottom = '1px solid #111'; row.style.fontSize = '0.7rem';
            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="color:#eee;font-weight:bold;font-size:0.6rem">${formatTR(new Date(item.pubDate))}</span>
                    <span style="color:#555;font-size:0.55rem">COINDESK</span>
                </div>
                <div style="color:#eee;font-weight:bold;line-height:1.3">${item.title}</div>
            `;
            container.appendChild(row);
        });
    }

    function renderFinalError(container) {
        container.innerHTML = `
            <div style="padding:40px 10px;text-align:center">
                <div style="color:#ff4444;font-size:0.7rem;margin-bottom:15px">VERİ HATTI ENGELLENDİ</div>
                <div style="color:#666;font-size:0.55rem;line-height:1.4;margin-bottom:20px">Tarayıcıdaki reklam engelleyici veya VPN tüm kanalları kapatıyor. Lütfen bunları devre dışı bırakıp sayfayı yenileyin.</div>
                <button onclick="location.reload()" style="background:transparent;border:1px solid #333;color:var(--green);padding:8px 20px;cursor:pointer;font-size:0.65rem">SAYFAYI YENİLE</button>
            </div>`;
    }

    if (document.readyState === 'complete') loadData(); else window.addEventListener('load', loadData);
    setInterval(loadData, 5 * 60 * 1000);
})();
