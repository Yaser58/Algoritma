(function() {
    console.log("Haber & Takvim v21.0 (Google Proxy Mode) Başlatıldı");

    const CRYPTOPANIC_RSS = 'https://cryptopanic.com/news/rss/';
    const CRYPTOCOMPARE_API = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';

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

        list.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#00ff41;font-size:0.6rem;opacity:0.7">GOOGLE GÜVENLİ HATTI DENENİYOR...</div>';

        // Strateji 1: Google Gadget Proxy (Bloklanması neredeyse imkansızdır)
        const googleProxy = 'https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=600&url=';
        
        try {
            const res = await fetch(googleProxy + encodeURIComponent(CRYPTOCOMPARE_API));
            if (!res.ok) throw new Error("Google Proxy Hatası");
            const data = await res.json();
            if (data && data.Data) {
                renderNews(data.Data, list);
                return;
            }
        } catch (e) {
            console.warn("Google Proxy başarısız, direkt deneme yapılıyor...");
        }

        // Strateji 2: Direkt Fetch (Eğer proxy engellendiyse ama API açıksa)
        try {
            const res = await fetch(CRYPTOCOMPARE_API);
            const data = await res.json();
            if (data && data.Data) {
                renderNews(data.Data, list);
                return;
            }
        } catch (e) {
            list.innerHTML = '<div style="padding:40px 10px;text-align:center;color:#f00;font-size:0.6rem">TÜM KANALLAR ENGELLENDİ. (VPN/ADBLOCK KONTROL EDİN)</div>';
        }
    }

    function renderNews(items, container) {
        container.innerHTML = '<div style="padding:10px;color:#00ff41;font-size:0.55rem;text-align:center;opacity:0.6">CANLI AKIŞ AKTİF</div>';
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

    if (document.readyState === 'complete') loadData(); else window.addEventListener('load', loadData);
    setInterval(loadData, 5 * 60 * 1000);
})();
