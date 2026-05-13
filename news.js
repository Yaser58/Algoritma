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

    if (actual === forecast) return { text: 'NÖTR', color: '#888', sentiment: 'neutral' };

    // Kripto Etkisi: USD Bullish ise Kripto Bearish, USD Bearish ise Kripto Bullish
    if (usdBullish) {
        return { text: 'BEARISH (DÜŞÜŞ)', color: '#ff4444', sentiment: 'bearish' };
    } else {
        return { text: 'BULLISH (YÜKSELİŞ)', color: '#00ff41', sentiment: 'bullish' };
    }
}

async function fetchFFNews() {
    console.log("Sistem: JSONP Bağlantısı Aktif (v2.0)");
    const list = document.getElementById('ffNewsList');
    if (!list) return;

    list.innerHTML = '<div class="ff-loading">GÜVENLİ KANAL ÜZERİNDEN BAĞLANILIYOR...</div>';

    // JSONP Yöntemi (CORS Engelini Tamamen Bypass Eder)
    const fetchJSONP = (url) => {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
            window[callbackName] = (data) => {
                delete window[callbackName];
                document.body.removeChild(script);
                resolve(data.contents);
            };

            const script = document.createElement('script');
            script.src = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&callback=${callbackName}`;
            script.onerror = () => reject(new Error('JSONP yükleme hatası'));
            document.body.appendChild(script);
        });
    };

    let xmlText = null;
    let errorDetail = '';

    try {
        // Önce JSONP dene (En garanti yöntem)
        xmlText = await fetchJSONP(CALENDAR_URL);
        
        if (!xmlText || !xmlText.includes('<event>')) {
            throw new Error('Veri boş veya geçersiz');
        }

        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');
        
        const events = Array.from(xml.querySelectorAll('event')).slice(0, 30);
        if (!events.length) throw new Error('Veri formatı geçersiz');

        list.innerHTML = '';
        
        events.forEach(ev => {
            const data = {
                title: ev.querySelector('title')?.textContent || '',
                event: ev.querySelector('event')?.textContent || '',
                country: ev.querySelector('country')?.textContent || '',
                date: ev.querySelector('date')?.textContent || '',
                time: ev.querySelector('time')?.textContent || '',
                impact: ev.querySelector('impact')?.textContent || '',
                forecast: ev.querySelector('forecast')?.textContent || '',
                actual: ev.querySelector('actual')?.textContent || ''
            };

            if (data.country !== 'USD') return; // Sadece USD etkileyenleri göster (Kripto için en kritik olan)

            const analysis = analyzeImpact(data);
            const impactColorMap = { 'High': '#ff0000', 'Medium': '#ffaa00', 'Low': '#00ff41' };
            const dotColor = impactColorMap[data.impact] || '#555';

            const row = document.createElement('div');
            row.className = 'ff-row';
            row.style.flexDirection = 'column';
            row.style.alignItems = 'flex-start';
            row.style.gap = '2px';
            row.style.padding = '8px 10px';

            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;width:100%;font-size:0.6rem;color:var(--dim)">
                    <span>${data.date} ${data.time}</span>
                    <span style="color:${dotColor};font-weight:bold">${data.impact.toUpperCase()}</span>
                </div>
                <div style="font-weight:bold;color:#eee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%">
                    ${data.title}
                </div>
                <div style="display:flex;gap:10px;font-size:0.65rem;margin-top:2px">
                    <span style="color:#888">Beklenti: ${data.forecast || '-'}</span>
                    <span style="color:#fff">Açıklanan: ${data.actual || '-'}</span>
                </div>
                <div style="margin-top:4px;font-size:0.7rem;font-weight:bold;color:${analysis.color}">
                    COIN ETKİSİ: ${analysis.text}
                </div>
            `;
            list.appendChild(row);
        });

        if (list.innerHTML === '') {
            list.innerHTML = '<div class="ff-loading">Yakın zamanda USD haberi yok.</div>';
        }

        document.getElementById('ffLastUpdate').textContent =
            'ANALİZ: ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    } catch (err) {
        list.innerHTML = `
            <div class="ff-loading" style="color:#ff4444;cursor:pointer;font-size:0.6rem;padding:15px" onclick="fetchFFNews()">
                ANALİZ HATASI<br>
                <span style="color:#888;font-size:0.55rem">(${err.message})</span><br><br>
                <span style="text-decoration:underline;color:var(--green)">YENİDEN DENE</span>
            </div>`;
    }
}

function initNewsWidget() {
    fetchFFNews();
    setInterval(fetchFFNews, 10 * 60 * 1000); // 10 dakikada bir

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
