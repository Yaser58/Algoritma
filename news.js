(function() {
    console.log("Haber & Takvim v20.0 (CORS Bypass Ultimate) Başlatıldı");

    const CRYPTOPANIC_RSS = 'https://cryptopanic.com/news/rss/';
    
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

    // JSONP Loader - CORS Engellerini %100 Aşar
    function loadJSONP(url, callback) {
        const callbackName = 'jsonp_' + Math.floor(Math.random() * 1000000);
        window[callbackName] = function(data) {
            callback(data);
            document.body.removeChild(script);
            delete window[callbackName];
        };

        const script = document.createElement('script');
        script.src = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&callback=${callbackName}`;
        script.onerror = () => {
            console.error("JSONP Hatası");
            document.body.removeChild(script);
            delete window[callbackName];
        };
        document.body.appendChild(script);
    }

    function loadData() {
        const list = document.getElementById('ffNewsList');
        if (!list) return;

        list.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#00ff41;font-size:0.6rem;opacity:0.7">GÜVENLİ KANAL BAĞLANTISI KURULUYOR...</div>';

        loadJSONP(CRYPTOPANIC_RSS + '?t=' + Date.now(), function(data) {
            if (data && data.contents) {
                renderRSS(data.contents, list);
            } else {
                list.innerHTML = '<div style="padding:40px 10px;text-align:center;color:#f00;font-size:0.6rem">VERİ KANALI ŞU AN KAPALI.</div>';
            }
        });
    }

    function renderRSS(xmlText, container) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');
        const items = Array.from(xml.querySelectorAll('item')).slice(0, 30);
        
        container.innerHTML = '<div style="padding:10px;color:#00ff41;font-size:0.55rem;text-align:center;opacity:0.6">CRYPTOPANIC CANLI AKIŞI</div>';
        
        items.forEach(item => {
            const title = item.querySelector('title')?.textContent || '';
            const link = item.querySelector('link')?.textContent || '#';
            const pubDate = new Date(item.querySelector('pubDate')?.textContent || '');

            const row = document.createElement('div');
            row.style.padding = '12px 10px'; row.style.borderBottom = '1px solid #111'; row.style.fontSize = '0.7rem';
            row.style.cursor = 'pointer';
            row.onclick = () => window.open(link, '_blank');

            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                    <span style="color:#eee;font-weight:bold;font-size:0.65rem">${formatTR(pubDate)} <span style="color:#555;font-weight:normal">| ${pubDate.toLocaleDateString('tr-TR')}</span></span>
                    <span style="color:#00ff41;font-size:0.55rem;font-weight:bold">HABER</span>
                </div>
                <div style="color:#eee;font-weight:bold;line-height:1.3;margin-bottom:4px">${title}</div>
                <div style="color:#444;font-size:0.55rem">KAYNAK: CryptoPanic</div>
            `;
            container.appendChild(row);
        });
    }

    if (document.readyState === 'complete') loadData(); else window.addEventListener('load', loadData);
    setInterval(loadData, 5 * 60 * 1000);
})();
