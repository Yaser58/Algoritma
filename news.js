(function() {
    console.log("Haber Modülü Başlatıldı");

    const FEED_URL = 'https://www.dailyfx.com/feeds/forex-market-news';
    const API_BASE = 'https://api.rss2json.com/v1/api.json?rss_url=';

    function getSentiment(text) {
        const t = text.toLowerCase();
        if (t.includes('strong') || t.includes('rise') || t.includes('higher') || t.includes('hawkish') || t.includes('beat')) 
            return { text: 'BEARISH (DÜŞÜŞ)', color: '#ff4444' };
        if (t.includes('weak') || t.includes('fall') || t.includes('lower') || t.includes('dovish') || t.includes('miss')) 
            return { text: 'BULLISH (YÜKSELİŞ)', color: '#00ff41' };
        return { text: 'NÖTR', color: '#888' };
    }

    async function loadNews() {
        const list = document.getElementById('ffNewsList');
        const updateText = document.getElementById('ffLastUpdate');
        if (!list) return;

        list.innerHTML = '<div style="padding:20px;text-align:center;color:#00ff41;font-size:0.6rem;opacity:0.7">VERİLER ÇEKİLİYOR...</div>';

        try {
            const response = await fetch(API_BASE + encodeURIComponent(FEED_URL));
            const data = await response.json();

            if (data.status !== 'ok') throw new Error("Kaynak meşgul");

            list.innerHTML = '';
            data.items.slice(0, 10).forEach(item => {
                const sentiment = getSentiment(item.title);
                const row = document.createElement('div');
                row.style.padding = '10px';
                row.style.borderBottom = '1px solid #111';
                row.style.fontSize = '0.7rem';
                
                row.innerHTML = `
                    <div style="color:#555;font-size:0.6rem;margin-bottom:3px">${item.pubDate.split(' ')[1] || ''}</div>
                    <div style="color:#eee;font-weight:bold;margin-bottom:5px;line-height:1.2">${item.title}</div>
                    <div style="color:${sentiment.color};font-weight:bold;font-size:0.6rem">ETKİ: ${sentiment.text}</div>
                `;
                list.appendChild(row);
            });

            if (updateText) updateText.textContent = 'GÜNCEL: ' + new Date().toLocaleTimeString();

        } catch (err) {
            console.error("Haber Hatası:", err);
            list.innerHTML = `<div style="padding:20px;text-align:center;color:#ff4444;font-size:0.6rem">BAĞLANTI HATASI<br><span style="color:#555;cursor:pointer" onclick="location.reload()">SAYFAYI YENİLE</span></div>`;
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
