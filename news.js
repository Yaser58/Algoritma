(function() {
    console.log("Haber & Takvim Sistemi v8.0 (Resilient) Başlatıldı");

    const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml';
    const NEWS_URL = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';

    function getSentiment(text) {
        const t = (text || '').toLowerCase();
        if (t.includes('surge') || t.includes('rise') || t.includes('bull') || t.includes('gain') || t.includes('jump')) 
            return { text: 'BULLISH (YÜKSELİŞ)', color: '#00ff41' };
        if (t.includes('drop') || t.includes('fall') || t.includes('bear') || t.includes('loss') || t.includes('crash')) 
            return { text: 'BEARISH (DÜŞÜŞ)', color: '#ff4444' };
        return { text: 'NÖTR', color: '#888' };
    }

    async function loadData() {
        const list = document.getElementById('ffNewsList');
        const updateText = document.getElementById('ffLastUpdate');
        if (!list) return;

        list.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#00ff41;font-size:0.6rem;opacity:0.7">VERİ AKIŞI BAŞLATILIYOR...</div>';

        // Strateji: Önce Takvimi (XML) dene, başarısız olursa Haberlere (JSON) dön.
        try {
            // 1. ADIM: TAKVİM DENEMESİ (ForexFactory Mirror via allorigins)
            const proxy = 'https://api.allorigins.win/get?url=';
            const res = await fetch(proxy + encodeURIComponent(CALENDAR_URL + '?t=' + Date.now()));
            const json = await res.json();
            const xmlText = json.contents;

            if (xmlText && xmlText.includes('<event>')) {
                renderCalendar(xmlText, list);
            } else {
                throw new Error("Takvim verisi alınamadı, haberlere geçiliyor...");
            }
        } catch (e) {
            console.warn(e.message);
            // 2. ADIM: HABER DENEMESİ (CryptoCompare - Direkt Bağlantı)
            try {
                const res = await fetch(NEWS_URL);
                if (!res.ok) throw new Error("Haber servisi de ulaşılamaz durumda");
                const newsData = await res.json();
                renderNews(newsData.Data || [], list);
            } catch (e2) {
                renderError(list);
            }
        }

        if (updateText) updateText.textContent = 'GÜNCEL: ' + new Date().toLocaleTimeString();
    }

    function renderCalendar(xmlText, container) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');
        const events = Array.from(xml.querySelectorAll('event')).slice(0, 30);
        container.innerHTML = '';

        events.forEach(ev => {
            const country = ev.querySelector('country')?.textContent || '';
            if (country !== 'USD') return;

            const title = ev.querySelector('title')?.textContent || '';
            const impact = ev.querySelector('impact')?.textContent || '';
            const forecast = ev.querySelector('forecast')?.textContent || '';
            const actual = ev.querySelector('actual')?.textContent || '';
            const time = ev.querySelector('time')?.textContent || '';
            const date = ev.querySelector('date')?.textContent || '';
            const isAnnounced = actual !== '';

            const row = document.createElement('div');
            row.style.padding = '12px 10px';
            row.style.borderBottom = '1px solid #111';
            row.style.fontSize = '0.7rem';
            row.style.background = isAnnounced ? 'rgba(0,255,65,0.02)' : 'transparent';

            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                    <span style="color:#555;font-size:0.6rem">${date} | ${time}</span>
                    <span style="color:${impact === 'High' ? '#f00' : '#fa0'};font-size:0.6rem;font-weight:bold">${impact.toUpperCase()} ETKİ</span>
                </div>
                <div style="color:#eee;font-weight:bold;margin-bottom:6px;line-height:1.3">${title}</div>
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="font-size:0.6rem;color:#888">B: ${forecast || '--'} | A: <b style="color:#fff">${actual || '--'}</b></span>
                    <span style="font-size:0.55rem;color:${isAnnounced ? '#00ff41' : '#ffaa00'};font-weight:bold;padding:1px 4px;border:1px solid;border-radius:2px">
                        ${isAnnounced ? 'AÇIKLANDI' : 'BEKLENİYOR'}
                    </span>
                </div>
                <div style="color:#333;font-size:0.5rem;margin-top:4px">KAYNAK: ForexFactory (FF)</div>
            `;
            container.appendChild(row);
        });
    }

    function renderNews(newsItems, container) {
        container.innerHTML = '<div style="padding:10px;color:#aaa;font-size:0.6rem;text-align:center">Takvim hatası nedeniyle CANLI HABER AKIŞI devreye girdi.</div>';
        newsItems.slice(0, 15).forEach(item => {
            const sentiment = getSentiment(item.title);
            const row = document.createElement('div');
            row.style.padding = '12px 10px';
            row.style.borderBottom = '1px solid #111';
            row.style.fontSize = '0.7rem';
            row.style.cursor = 'pointer';
            row.onclick = () => window.open(item.url, '_blank');

            const date = new Date(item.published_on * 1000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            
            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="color:#555;font-size:0.6rem">${date}</span>
                    <span style="color:#888;font-size:0.6rem">${item.source}</span>
                </div>
                <div style="color:#eee;font-weight:bold;margin-bottom:6px;line-height:1.4">${item.title}</div>
                <div style="color:${sentiment.color};font-weight:bold;font-size:0.6rem">ETKİ: ${sentiment.text} (AÇIKLANDI)</div>
            `;
            container.appendChild(row);
        });
    }

    function renderError(container) {
        container.innerHTML = `
            <div style="padding:40px 10px;text-align:center">
                <div style="color:#ff4444;font-size:0.7rem;margin-bottom:12px">BAĞLANTI SORUNU</div>
                <div style="color:#555;font-size:0.55rem;margin-bottom:15px">Veri kanalları şu an engellenmiş durumda.</div>
                <button id="retryNews" style="background:transparent;border:1px solid #333;color:var(--green);padding:6px 15px;cursor:pointer;font-size:0.65rem;font-family:inherit">YENİDEN DENE</button>
            </div>`;
        const btn = document.getElementById('retryNews');
        if (btn) btn.onclick = loadData;
    }

    if (document.readyState === 'complete') loadData(); else window.addEventListener('load', loadData);
    setInterval(loadData, 10 * 60 * 1000);

})();
