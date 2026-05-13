// ─── Ekonomik Takvim & Coin Etki Analizi ─────────────────────────────────────

const CALENDAR_URL = 'https://www.forexfactory.com/ff_calendar_thisweek.xml';

function analyzeImpact(item) {
    const event = (item.event || '').toUpperCase();
    const actual = parseFloat(item.actual);
    const forecast = parseFloat(item.forecast);
    
    if (isNaN(actual) || isNaN(forecast)) return { text: 'BELİRSİZ', color: '#555', sentiment: 'neutral' };

    // USD Güçlenirse -> Kripto Genelde Düşer (Ters Korelasyon)
    // USD Zayıflarsa -> Kripto Genelde Yükselir
    
    let usdBullish = false;
    const isHigherBetter = !event.includes('UNEMPLOYMENT') && !event.includes('CLAIMS') && !event.includes('CPI') && !event.includes('PPI');

    if (isHigherBetter) {
        usdBullish = actual > forecast;
    } else {
        // Enflasyon ve İşsizlikte düşük veri USD için genelde negatiftir (faiz indirimi beklentisi)
        usdBullish = actual < forecast;
    }
// ─── Finansal Haber & Coin Etki Analizi (v3.0) ───────────────────────────────

const NEWS_SOURCE = 'https://www.dailyfx.com/feeds/forex-market-news';
const PROXY = 'https://api.allorigins.win/get?url=';

function analyzeSentiment(title) {
    const t = title.toLowerCase();
    // USD güçlenirse Kripto genelde düşer
    const usdBullish = t.includes('strong') || t.includes('rise') || t.includes('higher') || t.includes('gain') || t.includes('hawkish') || t.includes('beat');
    const usdBearish = t.includes('weak') || t.includes('fall') || t.includes('lower') || t.includes('loss') || t.includes('dovish') || t.includes('miss');

    if (usdBullish) return { text: 'BEARISH (DÜŞÜŞ)', color: '#ff4444' };
    if (usdBearish) return { text: 'BULLISH (YÜKSELİŞ)', color: '#00ff41' };
    return { text: 'NÖTR / BELİRSİZ', color: '#888' };
}

async function fetchFFNews() {
    console.log("Haberler çekiliyor...");
    const list = document.getElementById('ffNewsList');
    if (!list) return;

    list.innerHTML = '<div class="ff-loading">HABERLER GÜNCELLENİYOR...</div>';

    try {
        const res = await fetch(PROXY + encodeURIComponent(NEWS_SOURCE));
        if (!res.ok) throw new Error('Proxy hatası');
        
        const data = await res.json();
        const parser = new DOMParser();
        const xml = parser.parseFromString(data.contents, 'text/xml');
        
        const items = Array.from(xml.querySelectorAll('item')).slice(0, 15);
        if (!items.length) throw new Error('Haber bulunamadı');

        list.innerHTML = '';
        items.forEach(item => {
            const title = item.querySelector('title')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || '';
            const analysis = analyzeSentiment(title);

            const row = document.createElement('div');
            row.className = 'ff-row';
            row.style.flexDirection = 'column';
            row.style.alignItems = 'flex-start';
            row.style.padding = '8px 10px';
            row.style.borderBottom = '1px solid #111';

            row.innerHTML = `
                <div style="font-size:0.6rem;color:var(--dim);margin-bottom:2px">${new Date(pubDate).toLocaleTimeString('tr-TR')}</div>
                <div style="font-weight:bold;color:#eee;font-size:0.72rem;line-height:1.3;margin-bottom:4px">${title}</div>
                <div style="font-size:0.65rem;font-weight:bold;color:${analysis.color}">ETKİ: ${analysis.text}</div>
            `;
            list.appendChild(row);
        });

        document.getElementById('ffLastUpdate').textContent = 'GÜNCEL: ' + new Date().toLocaleTimeString('tr-TR');

    } catch (err) {
        list.innerHTML = `
            <div class="ff-loading" style="color:#ff4444;cursor:pointer;font-size:0.65rem" onclick="fetchFFNews()">
                BAĞLANTI HATASI<br>
                <span style="font-size:0.55rem;color:#888">(${err.message})</span><br>
                <span style="text-decoration:underline">YENİDEN DENE</span>
            </div>`;
    }
}

function initNewsWidget() {
    fetchFFNews();
    setInterval(fetchFFNews, 5 * 60 * 1000);

    const toggleBtn = document.getElementById('ffToggle');
    const newsBody  = document.getElementById('ffNewsList');
    if (toggleBtn && newsBody) {
        toggleBtn.addEventListener('click', () => {
            const collapsed = newsBody.style.display === 'none';
            newsBody.style.display = collapsed ? 'block' : 'none';
            toggleBtn.textContent  = collapsed ? '▲' : '▼';
        });
    }
}

initNewsWidget();
