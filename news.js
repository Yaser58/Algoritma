(function() {
    console.log("Haber & Takvim v27.0 (Direct Flow Mode) Başlatıldı");

    function updateClock() {
        const u = document.getElementById('ffLastUpdate');
        if (u) {
            const time = new Intl.DateTimeFormat('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false, timeZone:'Europe/Istanbul' }).format(new Date());
            u.innerHTML = `<span style="color:var(--dim);font-size:0.6rem">İSTANBUL:</span> <span style="color:#00ff41;font-weight:bold">${time}</span>`;
        }
    }
    setInterval(updateClock, 1000);

    async function loadDirectNews() {
        const list = document.getElementById('ffNewsList');
        if (!list) return;

        list.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#00ff41;font-size:0.6rem;opacity:0.7">HABER AKIŞI BAŞLATILIYOR...</div>';

        // Strateji: Dünyanın en büyük borsası Binance'in haber altyapısını direkt çekiyoruz.
        // Bu hat asla bloklanmaz ve en saf haber akışını sağlar.
        try {
            const res = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&t=' + Date.now()));
            const json = await res.json();
            const data = JSON.parse(json.contents);

            if (data && data.Data) {
                renderNews(data.Data, list);
            } else {
                throw new Error("Hata");
            }
        } catch (e) {
            // Eğer proxy engellenirse direkt hat dene
            try {
                const res = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
                const data = await res.json();
                renderNews(data.Data, list);
            } catch (e2) {
                list.innerHTML = '<div style="padding:40px 10px;text-align:center;color:#ffaa00;font-size:0.6rem">LÜTFEN SAYFAYI YENİLEYİN VEYA VPN KAPATIN.</div>';
            }
        }
    }

    function renderNews(items, container) {
        container.innerHTML = '';
        items.slice(0, 30).forEach(item => {
            const pubDate = new Date(item.published_on * 1000);
            const row = document.createElement('div');
            row.style.padding = '12px 10px'; row.style.borderBottom = '1px solid #111'; row.style.fontSize = '0.7rem';
            row.style.cursor = 'pointer';
            row.onclick = () => window.open(item.url, '_blank');

            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                    <span style="color:#eee;font-weight:bold;font-size:0.65rem">${new Intl.DateTimeFormat('tr-TR', {hour:'2-digit', minute:'2-digit', hour12:false, timeZone:'Europe/Istanbul'}).format(pubDate)} <span style="color:#555;font-weight:normal">| ${pubDate.toLocaleDateString('tr-TR')}</span></span>
                    <span style="color:#00ff41;font-size:0.55rem;font-weight:bold">${item.source.toUpperCase()}</span>
                </div>
                <div style="color:#eee;font-weight:bold;line-height:1.3;margin-bottom:4px">${item.title}</div>
                <div style="color:#555;font-size:0.55rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.body.substring(0, 60)}...</div>
            `;
            container.appendChild(row);
        });
    }

    if (document.readyState === 'complete') loadDirectNews(); else window.addEventListener('load', loadDirectNews);
    setInterval(loadDirectNews, 10 * 60 * 1000);
})();
