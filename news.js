(function() {
    console.log("Haber & Takvim Sistemi v10.0 (24 Saat / Ultra Stabil) Başlatıldı");

    const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml';
    const NEWS_URL = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';

    function formatTRTime(dateObj) {
        // 24 saatlik İstanbul saati (ÖÖ/ÖS yok, sadece 01:00 - 24:00 arası)
        return new Intl.DateTimeFormat('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'Europe/Istanbul'
        }).format(dateObj);
    }

    // Canlı Saat
    function updateLiveClock() {
        const updateText = document.getElementById('ffLastUpdate');
        if (updateText) {
            updateText.innerHTML = `<span style="color:var(--dim);font-size:0.6rem">İSTANBUL:</span> <span style="color:#00ff41;font-weight:bold">${formatTRTime(new Date())}</span>`;
        }
    }
    setInterval(updateLiveClock, 1000);

    function getSentiment(text) {
        const t = (text || '').toLowerCase();
        if (t.includes('surge') || t.includes('rise') || t.includes('bull') || t.includes('gain') || t.includes('jump')) return { text: 'BULLISH', color: '#00ff41' };
        if (t.includes('drop') || t.includes('fall') || t.includes('bear') || t.includes('loss') || t.includes('crash')) return { text: 'BEARISH', color: '#ff4444' };
        return { text: 'NÖTR', color: '#888' };
    }

    async function loadData() {
        const list = document.getElementById('ffNewsList');
        if (!list) return;

        list.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#00ff41;font-size:0.6rem;opacity:0.7">GÜVENLİ KANALLAR BAĞLANIYOR...</div>';

        // Daha fazla ve daha stabil proxy listesi
        const proxies = [
            'https://api.allorigins.win/raw?url=',
            'https://api.codetabs.com/v1/proxy?quest=',
            'https://corsproxy.io/?',
            'https://thingproxy.freeboard.io/fetch/'
        ];

        let xmlText = null;
        for (let p of proxies) {
            try {
                const res = await fetch(p + encodeURIComponent(CALENDAR_URL + '?v=' + Date.now()), { 
                    method: 'GET',
                    headers: { 'Accept': 'application/xml' }
                });
                if (!res.ok) continue;
                const text = await res.text();
                // allorigins JSON dönebilir, kontrol edelim
                let cleanText = text;
                try { 
                    const j = JSON.parse(text); 
                    if (j.contents) cleanText = j.contents;
                } catch(e) {}

                if (cleanText && cleanText.includes('<event>')) {
                    xmlText = cleanText;
                    break;
                }
            } catch (e) {}
        }

        if (xmlText) {
            renderCalendar(xmlText, list);
        } else {
            // Takvim başarısızsa doğrudan habere geç (Haber servisi en stabili)
            try {
                const res = await fetch(NEWS_URL);
                const newsData = await res.json();
                renderNews(newsData.Data || [], list);
            } catch (e) {
                renderError(list);
            }
        }
    }

    function renderCalendar(xmlText, container) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');
        const events = Array.from(xml.querySelectorAll('event')).slice(0, 30);
        container.innerHTML = '';

        events.forEach(ev => {
            if ((ev.querySelector('country')?.textContent || '') !== 'USD') return;
            const actual = ev.querySelector('actual')?.textContent || '';
            const isAnnounced = actual !== '';
            const timestamp = new Date(ev.querySelector('date')?.textContent + ' ' + ev.querySelector('time')?.textContent);
            
            const row = document.createElement('div');
            row.style.padding = '12px 10px';
            row.style.borderBottom = '1px solid #111';
            row.style.fontSize = '0.7rem';

            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                    <span style="color:#555;font-size:0.55rem">${formatTRTime(timestamp)}</span>
                    <span style="color:#555;font-size:0.55rem">USD | FF</span>
                </div>
                <div style="color:#eee;font-weight:bold;margin-bottom:6px;line-height:1.3">${ev.querySelector('title')?.textContent}</div>
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="font-size:0.6rem;color:#888">B: ${ev.querySelector('forecast')?.textContent || '--'} | A: <b style="color:#fff">${actual || '--'}</b></span>
                    <span style="font-size:0.55rem;color:${isAnnounced ? '#00ff41' : '#ffaa00'};font-weight:bold;padding:1px 4px;border:1px solid;border-radius:2px">
                        ${isAnnounced ? 'AÇIKLANDI' : 'BEKLENİYOR'}
                    </span>
                </div>
            `;
            container.appendChild(row);
        });
    }

    function renderNews(newsItems, container) {
        container.innerHTML = '<div style="padding:10px;color:#00ff41;font-size:0.5rem;text-align:center;opacity:0.6">TAKViM MEŞGUL, CANLI AKIŞ AKTİF</div>';
        newsItems.slice(0, 15).forEach(item => {
            const sentiment = getSentiment(item.title);
            const pubDate = new Date(item.published_on * 1000);
            const row = document.createElement('div');
            row.style.padding = '12px 10px';
            row.style.borderBottom = '1px solid #111';
            row.style.fontSize = '0.7rem';
            row.style.cursor = 'pointer';
            row.onclick = () => window.open(item.url, '_blank');

            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="color:#555;font-size:0.55rem">${formatTRTime(pubDate)}</span>
                    <span style="color:#555;font-size:0.55rem">${item.source}</span>
                </div>
                <div style="color:#eee;font-weight:bold;margin-bottom:6px;line-height:1.4">${item.title}</div>
                <div style="color:${sentiment.color};font-weight:bold;font-size:0.6rem">DURUM: AÇIKLANDI (ETKİ: ${sentiment.text})</div>
            `;
            container.appendChild(row);
        });
    }

    function renderError(container) {
        container.innerHTML = `
            <div style="padding:40px 10px;text-align:center">
                <div style="color:#ff4444;font-size:0.7rem;margin-bottom:12px">BAĞLANTI SORUNU</div>
                <button id="retryNews" style="background:transparent;border:1px solid #333;color:#00ff41;padding:6px 15px;cursor:pointer;font-size:0.65rem">YENİDEN DENE</button>
            </div>`;
        const r = document.getElementById('retryNews');
        if(r) r.onclick = loadData;
    }

    if (document.readyState === 'complete') loadData(); else window.addEventListener('load', loadData);
    setInterval(loadData, 5 * 60 * 1000);

})();
