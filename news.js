(function() {
    console.log("Haber & Takvim v22.0 (CORSProxy.io Mode) Başlatıldı");

    const NEWS_URL = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';
    const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml';

    function formatTR(date) {
        return new Intl.DateTimeFormat('tr-TR', { hour:'2-digit', minute:'2-digit', hour12:false, timeZone:'Europe/Istanbul' }).format(date);
    }

    function updateClock() {
        const u = document.getElementById('ffLastUpdate');
        if (u) u.innerHTML = `<span style="color:var(--dim);font-size:0.6rem">İSTANBUL:</span> <span style="color:#00ff41;font-weight:bold">${new Intl.DateTimeFormat('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false, timeZone:'Europe/Istanbul' }).format(new Date())}</span>`;
    }
    setInterval(updateClock, 1000);

    async function loadData() {
        const list = document.getElementById('ffNewsList');
        if (!list) return;

        list.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#00ff41;font-size:0.6rem;opacity:0.7">VERİ HATTI BAĞLANIYOR (V22)...</div>';

        // Strateji: CORSProxy.io (En yeni ve en az engellenen proxy)
        const proxies = [
            'https://corsproxy.io/?',
            'https://api.allorigins.win/get?url=',
            'https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=600&url='
        ];

        let dataFound = false;
        for (let p of proxies) {
            try {
                const res = await fetch(p + encodeURIComponent(NEWS_URL + '?t=' + Date.now()));
                let json;
                if (p.includes('allorigins')) {
                    const temp = await res.json();
                    json = JSON.parse(temp.contents);
                } else {
                    json = await res.json();
                }

                if (json && json.Data) {
                    renderNews(json.Data, list);
                    dataFound = true;
                    break;
                }
            } catch (e) { console.warn("Proxy başarısız:", p); }
        }

        if (!dataFound) {
            // Eğer her şey başarısız olursa "Çevrimdışı Görünüm"
            renderOffline(list);
        }
    }

    function renderNews(items, container) {
        container.innerHTML = '<div style="padding:10px;color:#00ff41;font-size:0.5rem;text-align:center;opacity:0.6">CANLI HABER AKIŞI AKTİF</div>';
        items.slice(0, 20).forEach(item => {
            const pubDate = new Date(item.published_on * 1000);
            const row = document.createElement('div');
            row.style.padding = '12px 10px'; row.style.borderBottom = '1px solid #111'; row.style.fontSize = '0.7rem';
            row.style.cursor = 'pointer';
            row.onclick = () => window.open(item.url, '_blank');
            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                    <span style="color:#eee;font-weight:bold;font-size:0.65rem">${formatTR(pubDate)} <span style="color:#555;font-weight:normal">| ${pubDate.toLocaleDateString('tr-TR')}</span></span>
                    <span style="color:#00ff41;font-size:0.55rem;font-weight:bold">${item.source.toUpperCase()}</span>
                </div>
                <div style="color:#eee;font-weight:bold;line-height:1.3;margin-bottom:4px">${item.title}</div>
            `;
            container.appendChild(row);
        });
    }

    function renderOffline(container) {
        container.innerHTML = `
            <div style="padding:20px;text-align:center">
                <div style="color:#ffaa00;font-size:0.65rem;margin-bottom:15px;font-weight:bold">!!! BAĞLANTI KISITLI !!!</div>
                <div style="text-align:left;background:rgba(255,170,0,0.05);padding:10px;border:1px solid #332200;font-size:0.55rem;color:#888;line-height:1.4">
                    Tarayıcınız veya VPN'iniz haber sunucularını engelliyor. Lütfen reklam engelleyicileri (AdBlock vb.) kapatıp deneyin.
                </div>
                <button onclick="location.reload()" style="margin-top:20px;background:transparent;border:1px solid #00ff41;color:#00ff41;padding:8px 20px;cursor:pointer;font-size:0.6rem">YENİDEN DENE</button>
            </div>`;
    }

    if (document.readyState === 'complete') loadData(); else window.addEventListener('load', loadData);
    setInterval(loadData, 10 * 60 * 1000);
})();
