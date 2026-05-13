(function() {
    console.log("Haber Sistemi v7.0 Başlatıldı");

    const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml';
    const PROXY_LIST = [
        'https://api.allorigins.win/get?url=',
        'https://api.codetabs.com/v1/proxy?quest=',
        'https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=600&url='
    ];

    function getImpactSentiment(item) {
        const event = (item.event || '').toUpperCase();
        const actual = parseFloat(item.actual);
        const forecast = parseFloat(item.forecast);
        if (isNaN(actual) || isNaN(forecast)) return { text: 'BEKLENİYOR', color: '#888' };
        const isHigherBetter = !event.includes('UNEMPLOYMENT') && !event.includes('CLAIMS') && !event.includes('CPI') && !event.includes('PPI');
        const usdBullish = isHigherBetter ? (actual > forecast) : (actual < forecast);
        if (actual === forecast) return { text: 'NÖTR', color: '#aaa' };
        return usdBullish ? { text: 'BEARISH (DÜŞÜŞ)', color: '#ff4444' } : { text: 'BULLISH (YÜKSELİŞ)', color: '#00ff41' };
    }

    async function loadData() {
        const list = document.getElementById('ffNewsList');
        const updateText = document.getElementById('ffLastUpdate');
        if (!list) return;

        list.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#00ff41;font-size:0.6rem;opacity:0.7">VERİ KANALLARI TARANIYOR...</div>';

        let xmlText = null;
        let successProxy = null;

        for (let proxy of PROXY_LIST) {
            try {
                const target = CALENDAR_URL + '?t=' + Date.now();
                const res = await fetch(proxy + encodeURIComponent(target));
                if (!res.ok) continue;
                
                const data = await res.json();
                const text = data.contents || data; // allorigins wrapped, others direct
                
                if (text && text.includes('<event>')) {
                    xmlText = text;
                    successProxy = proxy;
                    break;
                }
            } catch (e) {
                console.warn("Proxy başarısız:", proxy);
            }
        }

        try {
            if (!xmlText) throw new Error("Tüm veri kanalları engellendi");

            const parser = new DOMParser();
            const xml = parser.parseFromString(xmlText, 'text/xml');
            const events = Array.from(xml.querySelectorAll('event')).slice(0, 50);

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
                if (data.country !== 'USD') return;

                const sentiment = getImpactSentiment(data);
                const isAnnounced = data.actual !== '';
                const impactColor = data.impact === 'High' ? '#ff0000' : (data.impact === 'Medium' ? '#ffaa00' : '#00ff41');

                const row = document.createElement('div');
                row.className = 'news-item';
                row.style.padding = '12px 10px';
                row.style.borderBottom = '1px solid #111';
                row.style.fontSize = '0.7rem';
                row.style.background = isAnnounced ? 'rgba(0,255,65,0.02)' : 'transparent';

                row.innerHTML = `
                    <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                        <span style="color:#555;font-size:0.6rem">${data.date} | ${data.time}</span>
                        <span style="color:${impactColor};font-size:0.6rem;font-weight:bold">${data.impact.toUpperCase()} ETKİ</span>
                    </div>
                    <div style="color:#eee;font-weight:bold;margin-bottom:6px;line-height:1.3">${data.title}</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                        <div style="font-size:0.65rem;color:#888">B: <span style="color:#ccc">${data.forecast || '--'}</span></div>
                        <div style="font-size:0.65rem;color:#888">A: <span style="color:#fff">${data.actual || '--'}</span></div>
                        <div style="font-size:0.55rem;color:${isAnnounced ? '#00ff41' : '#ffaa00'};font-weight:bold;padding:1px 4px;border:1px solid;border-radius:2px">
                            ${isAnnounced ? 'AÇIKLANDI' : 'BEKLENİYOR'}
                        </div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding-top:4px;border-top:1px solid #1a1a1a">
                        <div style="color:${sentiment.color};font-weight:bold;font-size:0.6rem">COİN: ${sentiment.text}</div>
                        <div style="color:#333;font-size:0.5rem">KAYNAK: FF</div>
                    </div>
                `;
                list.appendChild(row);
            });

            if (updateText) updateText.textContent = 'GÜNCEL: ' + new Date().toLocaleTimeString();

        } catch (err) {
            list.innerHTML = `
                <div style="padding:40px 10px;text-align:center">
                    <div style="color:#ff4444;font-size:0.7rem;margin-bottom:12px">BAĞLANTI SORUNU</div>
                    <div style="color:#555;font-size:0.55rem;margin-bottom:15px">Tüm veri kanalları şu an meşgul veya engellenmiş durumda.</div>
                    <button id="retryNews" style="background:transparent;border:1px solid #333;color:var(--green);padding:6px 15px;cursor:pointer;font-size:0.65rem;font-family:inherit">YENİDEN DENE</button>
                </div>`;
            document.getElementById('retryNews').onclick = loadData;
        }
    }

    if (document.readyState === 'complete') loadData(); else window.addEventListener('load', loadData);
    setInterval(loadData, 15 * 60 * 1000);

    document.addEventListener('click', function(e) {
        if (e.target.id === 'closeRight' || e.target.id === 'openRight') {
            // Layout değişiminde haberleri yenilemeye gerek yok ama scroll sıfırlanabilir
        }
    });

})();
