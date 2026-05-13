(function() {
    console.log("Haber Modülü (CryptoCompare) Başlatıldı");

    // CryptoCompare News API - CORS dostudur ve proxy gerektirmez.
    const API_URL = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';

    function getSentiment(text) {
        const t = text.toLowerCase();
        // USD ve piyasa odaklı duygu analizi
        if (t.includes('surge') || t.includes('rise') || t.includes('bull') || t.includes('gain') || t.includes('jump')) 
            return { text: 'BULLISH (YÜKSELİŞ)', color: '#00ff41' };
        if (t.includes('drop') || t.includes('fall') || t.includes('bear') || t.includes('loss') || t.includes('crash')) 
            return { text: 'BEARISH (DÜŞÜŞ)', color: '#ff4444' };
        return { text: 'NÖTR', color: '#888' };
    }

    async function loadNews() {
        const list = document.getElementById('ffNewsList');
        const updateText = document.getElementById('ffLastUpdate');
        if (!list) return;

        list.innerHTML = '<div style="padding:20px;text-align:center;color:#00ff41;font-size:0.6rem;opacity:0.7">CANLI HABER AKIŞI BAĞLANIYOR...</div>';

        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error("API hatası");
            
            const json = await response.json();
            const newsItems = json.Data || [];

            if (newsItems.length === 0) throw new Error("Haber bulunamadı");

            list.innerHTML = '';
            newsItems.slice(0, 15).forEach(item => {
                const sentiment = getSentiment(item.title);
                const row = document.createElement('div');
                row.style.padding = '12px 10px';
                row.style.borderBottom = '1px solid #111';
                row.style.fontSize = '0.7rem';
                row.style.transition = 'background 0.2s';
                row.style.cursor = 'pointer';
                
                row.onmouseover = () => row.style.background = 'rgba(0,255,65,0.05)';
                row.onmouseout = () => row.style.background = 'transparent';
                row.onclick = () => window.open(item.url, '_blank');

                const date = new Date(item.published_on * 1000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                
                row.innerHTML = `
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                        <span style="color:#555;font-size:0.6rem">${date}</span>
                        <span style="color:#888;font-size:0.6rem;text-transform:uppercase">${item.source}</span>
                    </div>
                    <div style="color:#eee;font-weight:bold;margin-bottom:6px;line-height:1.4">${item.title}</div>
                    <div style="display:flex;align-items:center;gap:6px">
                        <div style="width:6px;height:6px;border-radius:50%;background:${sentiment.color}"></div>
                        <div style="color:${sentiment.color};font-weight:bold;font-size:0.65rem">ETKİ: ${sentiment.text}</div>
                    </div>
                `;
                list.appendChild(row);
            });

            if (updateText) updateText.textContent = 'GÜNCEL: ' + new Date().toLocaleTimeString();

        } catch (err) {
            console.error("Haber Hatası:", err);
            list.innerHTML = `
                <div style="padding:30px 10px;text-align:center">
                    <div style="color:#ff4444;font-size:0.7rem;margin-bottom:10px">VERİ BAĞLANTISI KESİLDİ</div>
                    <button onclick="location.reload()" style="background:transparent;border:1px solid #333;color:#888;padding:5px 15px;cursor:pointer;font-size:0.6rem">SİSTEMİ YENİLE</button>
                </div>`;
        }
    }

    // Başlat
    if (document.readyState === 'complete') {
        loadNews();
    } else {
        window.addEventListener('load', loadNews);
    }
    
    // 5 dakikada bir yenile
    setInterval(loadNews, 5 * 60 * 1000);

    // Toggle mantığı
    document.addEventListener('click', function(e) {
        if (e.target.id === 'ffToggle') {
            const body = document.getElementById('ffNewsList');
            if (body) {
                const isHidden = body.style.display === 'none';
                body.style.display = isHidden ? 'block' : 'none';
                e.target.textContent = isHidden ? '▲' : '▼';
            }
        }
    });

})();
