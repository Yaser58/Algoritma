(function() {
    console.log("Haber & Takvim v23.0 (CryptoCompare Primary) Başlatıldı");

    const CRYPTOCOMPARE_API = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';
    const PROXIES = [
        'https://corsproxy.io/?',
        'https://api.allorigins.win/get?url=',
        'https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=600&url='
    ];

    function formatTR(date) {
        return new Intl.DateTimeFormat('tr-TR', { 
            hour: '2-digit', minute: '2-digit', 
            hour12: false, timeZone: 'Europe/Istanbul' 
        }).format(date);
    }

    function updateClock() {
        const u = document.getElementById('ffLastUpdate');
        if (u) {
            const time = new Intl.DateTimeFormat('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false, timeZone:'Europe/Istanbul' }).format(new Date());
            u.innerHTML = `<span style="color:var(--dim);font-size:0.6rem">İSTANBUL:</span> <span style="color:#00ff41;font-weight:bold">${time}</span>`;
        }
    }
    setInterval(updateClock, 1000);

    async function loadData() {
        const list = document.getElementById('ffNewsList');
        if (!list) return;

        list.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#00ff41;font-size:0.6rem;opacity:0.7">CRYPTOCOMPARE VERİLERİ ÇEKİLİYOR...</div>';

        let dataFound = false;
        
        // Sırasıyla tüm proxy kanallarını CryptoCompare için dene
        for (let p of PROXIES) {
            try {
                const target = CRYPTOCOMPARE_API + '&t=' + Date.now();
                const res = await fetch(p + encodeURIComponent(target));
                let json;
                
                if (p.includes('allorigins')) {
                    const temp = await res.json();
                    json = JSON.parse(temp.contents);
                } else {
                    json = await res.json();
                }

                if (json && json.Data && json.Data.length > 0) {
                    renderNews(json.Data, list);
                    dataFound = true;
                    break;
                }
            } catch (e) { console.warn("Proxy Denemesi Başarısız:", p); }
        }

        if (!dataFound) {
            renderError(list);
        }
    }

    function renderNews(items, container) {
        container.innerHTML = '<div style="padding:10px;color:#00ff41;font-size:0.55rem;text-align:center;opacity:0.6">CRYPTOCOMPARE HABER AKIŞI AKTİF</div>';
        items.slice(0, 25).forEach(item => {
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

    function renderError(container) {
        container.innerHTML = `
            <div style="padding:30px 10px;text-align:center">
                <div style="color:#f00;font-size:0.7rem;margin-bottom:10px">BAĞLANTI HATASI</div>
                <div style="color:#666;font-size:0.55rem;line-height:1.4">CryptoCompare sunucularına erişilemiyor. Lütfen VPN veya Reklam Engelleyiciyi kapatın.</div>
                <button onclick="location.reload()" style="margin-top:15px;background:transparent;border:1px solid #333;color:#00ff41;padding:8px 15px;cursor:pointer;font-size:0.6rem">YENİDEN DENE</button>
            </div>`;
    }

    if (document.readyState === 'complete') loadData(); else window.addEventListener('load', loadData);
    setInterval(loadData, 5 * 60 * 1000);
})();
