(function() {
    console.log("Haber & Takvim v15.0 (Ultra Stability) Başlatıldı");

    const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml';
    const CRYPTOPANIC_RSS = 'https://cryptopanic.com/news/rss/';

    function formatTR(date) {
        return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Istanbul' }).format(date);
    }

    function updateLiveClock() {
        const updateText = document.getElementById('ffLastUpdate');
        if (updateText) {
            updateText.innerHTML = `<span style="color:var(--dim);font-size:0.6rem">İSTANBUL:</span> <span style="color:#00ff41;font-weight:bold">${new Intl.DateTimeFormat('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false, timeZone:'Europe/Istanbul' }).format(new Date())}</span>`;
        }
    }
    setInterval(updateLiveClock, 1000);

    async function loadData() {
        const list = document.getElementById('ffNewsList');
        if (!list) return;

        list.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#00ff41;font-size:0.6rem;opacity:0.7">VERİ KANALLARI SENKRONİZE EDİLİYOR...</div>';

        // Strateji 1: RSS2JSON üzerinden Canlı Haberler (En Stabil Kanal)
        try {
            const cb = 'cb_' + Math.floor(Math.random() * 1000000);
            const script = document.createElement('script');
            script.src = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(CRYPTOPANIC_RSS)}&callback=${cb}`;
            
            window[cb] = function(data) {
                if (data && data.items) {
                    renderRSS(data.items, list);
                    document.body.removeChild(script);
                    delete window[cb];
                } else {
                    tryCalendar(list);
                }
            };
            script.onerror = () => tryCalendar(list);
            document.body.appendChild(script);
            setTimeout(() => { if(window[cb]) tryCalendar(list); }, 8000);
        } catch (e) { tryCalendar(list); }
    }

    async function tryCalendar(container) {
        // Strateji 2: AllOrigins üzerinden Ekonomik Takvim
        try {
            const cb = 'cbc_' + Math.floor(Math.random() * 1000000);
            const script = document.createElement('script');
            script.src = `https://api.allorigins.win/get?url=${encodeURIComponent(CALENDAR_URL)}&callback=${cb}`;
            window[cb] = function(data) {
                if (data && data.contents) {
                    renderCalendar(data.contents, container);
                    document.body.removeChild(script);
                    delete window[cb];
                } else {
                    renderFinalError(container);
                }
            };
            script.onerror = () => renderFinalError(container);
            document.body.appendChild(script);
        } catch (e) { renderFinalError(container); }
    }

    function renderRSS(items, container) {
        container.innerHTML = '<div style="padding:10px;color:#00ff41;font-size:0.5rem;text-align:center;opacity:0.6">CANLI KRİPTO HABER AKIŞI AKTİF</div>';
        items.slice(0, 20).forEach(item => {
            const pubDate = new Date(item.pubDate);
            const row = document.createElement('div');
            row.style.padding = '12px 10px'; row.style.borderBottom = '1px solid #111'; row.style.fontSize = '0.7rem';
            row.style.cursor = 'pointer';
            row.onclick = () => window.open(item.link, '_blank');
            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                    <span style="color:#eee;font-weight:bold;font-size:0.6rem">${formatTR(pubDate)}</span>
                    <span style="color:#555;font-size:0.55rem">GÜNCEL HABER</span>
                </div>
                <div style="color:#eee;font-weight:bold;line-height:1.3">${item.title}</div>
                <div style="color:#444;font-size:0.55rem;margin-top:4px">KAYNAK: ${item.author || 'CryptoNews'}</div>
            `;
            container.appendChild(row);
        });
    }

    function renderCalendar(xmlText, container) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');
        const events = Array.from(xml.querySelectorAll('event')).slice(0, 30);
        container.innerHTML = '<div style="padding:10px;color:#00ff41;font-size:0.5rem;text-align:center;opacity:0.6">EKONOMİK TAKVİM AKTİF</div>';
        events.forEach(ev => {
            if ((ev.querySelector('country')?.textContent || '') !== 'USD') return;
            const actual = ev.querySelector('actual')?.textContent || '';
            const row = document.createElement('div');
            row.style.padding = '12px 10px'; row.style.borderBottom = '1px solid #111'; row.style.fontSize = '0.7rem';
            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="color:#eee;font-weight:bold;font-size:0.6rem">${ev.querySelector('time')?.textContent}</span>
                    <span style="color:#555;font-size:0.55rem">${ev.querySelector('impact')?.textContent.toUpperCase()} ETKİ</span>
                </div>
                <div style="color:#eee;font-weight:bold">${ev.querySelector('title')?.textContent}</div>
                <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:0.6rem">
                    <span style="color:#888">Beklenti: ${ev.querySelector('forecast')?.textContent || '--'}</span>
                    <span style="color:${actual ? '#00ff41' : '#ffaa00'}">${actual ? 'AÇIKLANDI' : 'BEKLENİYOR'}</span>
                </div>
            `;
            container.appendChild(row);
        });
    }

    function renderFinalError(container) {
        container.innerHTML = `
            <div style="padding:40px 10px;text-align:center">
                <div style="color:#ff4444;font-size:0.7rem;margin-bottom:15px">BAĞLANTI BLOKLANDI</div>
                <div style="color:#666;font-size:0.55rem;line-height:1.4;margin-bottom:20px">Tarayıcıdaki reklam engelleyici veya VPN tüm haber kanallarını kapatıyor olabilir.</div>
                <button onclick="location.reload()" style="background:transparent;border:1px solid #333;color:var(--green);padding:8px 20px;cursor:pointer;font-size:0.65rem">YENİDEN DENE</button>
            </div>`;
    }

    if (document.readyState === 'complete') loadData(); else window.addEventListener('load', loadData);
    setInterval(loadData, 5 * 60 * 1000);
})();
