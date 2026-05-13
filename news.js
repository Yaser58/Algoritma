(function() {
    console.log("Ekonomik Takvim & Haber Modülü v6.0 Başlatıldı");

    const CALENDAR_XML = 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml';
    const PROXY = 'https://api.allorigins.win/get?url=';

    function getImpactSentiment(item) {
        const event = (item.event || '').toUpperCase();
        const actual = parseFloat(item.actual);
        const forecast = parseFloat(item.forecast);
        
        if (isNaN(actual) || isNaN(forecast)) return { text: 'BEKLENİYOR', color: '#888' };

        let usdBullish = false;
        const isHigherBetter = !event.includes('UNEMPLOYMENT') && !event.includes('CLAIMS') && !event.includes('CPI') && !event.includes('PPI');

        if (isHigherBetter) {
            usdBullish = actual > forecast;
        } else {
            usdBullish = actual < forecast;
        }

        if (actual === forecast) return { text: 'NÖTR', color: '#aaa' };
        return usdBullish ? { text: 'BEARISH (DÜŞÜŞ)', color: '#ff4444' } : { text: 'BULLISH (YÜKSELİŞ)', color: '#00ff41' };
    }

    async function loadData() {
        const list = document.getElementById('ffNewsList');
        const updateText = document.getElementById('ffLastUpdate');
        if (!list) return;

        list.innerHTML = '<div style="padding:20px;text-align:center;color:#00ff41;font-size:0.6rem;opacity:0.7">VERİLER ANALİZ EDİLİYOR...</div>';

        try {
            // Veriyi çek
            const response = await fetch(PROXY + encodeURIComponent(CALENDAR_XML + '?t=' + Date.now()));
            const json = await response.json();
            const xmlText = json.contents;

            if (!xmlText) throw new Error("Veri okunamadı");

            const parser = new DOMParser();
            const xml = parser.parseFromString(xmlText, 'text/xml');
            const events = Array.from(xml.querySelectorAll('event')).slice(0, 40);

            list.innerHTML = '';
            
            // Sadece USD olanları ve önemli olanları filtrele
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

                if (data.country !== 'USD') return;

                const sentiment = getImpactSentiment(data);
                const isAnnounced = data.actual !== '';
                const impactColor = data.impact === 'High' ? '#ff0000' : (data.impact === 'Medium' ? '#ffaa00' : '#00ff41');

                const row = document.createElement('div');
                row.style.padding = '12px 10px';
                row.style.borderBottom = '1px solid #111';
                row.style.fontSize = '0.7rem';
                row.style.background = isAnnounced ? 'rgba(255,255,255,0.02)' : 'transparent';

                row.innerHTML = `
                    <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                        <span style="color:#555;font-size:0.6rem">${data.date} | ${data.time}</span>
                        <span style="color:${impactColor};font-size:0.6rem;font-weight:bold">${data.impact.toUpperCase()} ETKİ</span>
                    </div>
                    <div style="color:#eee;font-weight:bold;margin-bottom:6px;line-height:1.4">${data.title}</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                        <div style="font-size:0.65rem;color:#888">Beklenti: <span style="color:#ccc">${data.forecast || '--'}</span></div>
                        <div style="font-size:0.65rem;color:#888">Açıklanan: <span style="color:#fff">${data.actual || '--'}</span></div>
                        <div style="font-size:0.6rem;color:${isAnnounced ? '#00ff41' : '#ffaa00'};font-weight:bold;padding:1px 4px;border:1px solid;border-radius:2px">
                            ${isAnnounced ? 'AÇIKLANDI' : 'BEKLENİYOR'}
                        </div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding-top:4px;border-top:1px solid #1a1a1a">
                        <div style="color:${sentiment.color};font-weight:bold;font-size:0.65rem">COIN ETKİSİ: ${sentiment.text}</div>
                        <div style="color:#444;font-size:0.55rem">KAYNAK: ForexFactory</div>
                    </div>
                `;
                list.appendChild(row);
            });

            if (updateText) updateText.textContent = 'GÜNCEL: ' + new Date().toLocaleTimeString();

        } catch (err) {
            console.error("Takvim Hatası:", err);
            list.innerHTML = `
                <div style="padding:20px;text-align:center">
                    <div style="color:#ff4444;font-size:0.65rem;margin-bottom:10px">VERİ ÇEKİLEMEDİ</div>
                    <button onclick="location.reload()" style="background:transparent;border:1px solid #333;color:#888;padding:5px 12px;cursor:pointer;font-size:0.6rem">YENİDEN DENE</button>
                </div>`;
        }
    }

    if (document.readyState === 'complete') {
        loadData();
    } else {
        window.addEventListener('load', loadData);
    }
    
    setInterval(loadData, 10 * 60 * 1000);

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
