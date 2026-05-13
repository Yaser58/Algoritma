(function() {
    console.log("Haber & Takvim v33.0 (Google Tunnel Mode) Başlatıldı");

    const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml';

    function formatTR(date) {
        return new Intl.DateTimeFormat('tr-TR', { hour:'2-digit', minute:'2-digit', hour12:false, timeZone:'Europe/Istanbul' }).format(date);
    }

    function updateClock() {
        const u = document.getElementById('ffLastUpdate');
        if (u) {
            const time = new Intl.DateTimeFormat('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false, timeZone:'Europe/Istanbul' }).format(new Date());
            u.innerHTML = `<span style="color:var(--dim);font-size:0.6rem">İSTANBUL:</span> <span style="color:#00ff41;font-weight:bold">${time}</span>`;
        }
    }
    setInterval(updateClock, 1000);

    function convertFFToTR(dStr, tStr) {
        try {
            const d = new Date(dStr + " " + tStr + " GMT-0400");
            return isNaN(d.getTime()) ? null : d;
        } catch(e) { return null; }
    }

    async function loadData() {
        const list = document.getElementById('ffNewsList');
        if (!list) return;

        list.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#00ff41;font-size:0.6rem;opacity:0.7">GÜVENLİ VERİ HATTI KURULUYOR...</div>';

        // Strateji: Google'ın global proxy tünelini kullanarak blokları aşıyoruz.
        const googleTunnel = 'https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=600&url=';
        
        try {
            const res = await fetch(googleTunnel + encodeURIComponent(CALENDAR_URL + '?t=' + Date.now()));
            if (!res.ok) throw new Error("Tunnel Hatası");
            const xmlText = await res.text();
            renderCalendar(xmlText, list);
        } catch (e) {
            // İkinci Deneme: AllOrigins
            try {
                const res = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(CALENDAR_URL));
                const data = await res.json();
                renderCalendar(data.contents, list);
            } catch (e2) {
                list.innerHTML = '<div style="padding:20px;text-align:center;color:#ffaa00;font-size:0.6rem">VERİ HATTI MEŞGUL (Lütfen VPN kapatın veya yenileyin)</div>';
            }
        }
    }

    function renderCalendar(xmlText, container) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');
        const events = Array.from(xml.querySelectorAll('event'));
        container.innerHTML = '';
        const now = new Date();
        
        events.forEach(ev => {
            const country = ev.querySelector('country')?.textContent;
            const impact = ev.querySelector('impact')?.textContent;
            if (country !== 'USD' || impact === 'Low') return;

            const trDate = convertFFToTR(ev.querySelector('date')?.textContent, ev.querySelector('time')?.textContent);
            if (!trDate) return;

            const diff = (trDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            if (diff < -1 || diff > 2) return;

            const actual = ev.querySelector('actual')?.textContent || '';
            const forecast = ev.querySelector('forecast')?.textContent || '--';
            const impactColor = impact === 'High' ? '#ff0000' : '#ffaa00';

            const row = document.createElement('div');
            row.style.padding = '15px 12px'; row.style.borderBottom = '1px solid #111'; row.style.fontSize = '0.75rem';
            row.style.background = actual ? 'rgba(0,255,65,0.02)' : 'transparent';

            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;align-items:center">
                    <span style="color:#00ff41;font-weight:bold;font-size:0.7rem">${formatTR(trDate)} <span style="color:#555;font-weight:normal">| ${trDate.toLocaleDateString('tr-TR')}</span></span>
                    <span style="color:${impactColor};font-size:0.55rem;font-weight:bold;border:1px solid;padding:1px 5px;border-radius:10px">${impact.toUpperCase()} ETKİ</span>
                </div>
                <div style="color:#eee;font-weight:bold;margin-bottom:8px;line-height:1.3;font-size:0.8rem">${ev.querySelector('title')?.textContent}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.3);padding:8px;border-radius:4px">
                    <div style="color:#888;font-size:0.65rem">Beklenti: <b style="color:#aaa">${forecast}</b></div>
                    <div style="color:#888;font-size:0.65rem">Gerçek: <b style="color:#fff">${actual || 'Bekleniyor...'}</b></div>
                </div>
                <div style="margin-top:8px;font-size:0.55rem;color:#444;font-style:italic">
                    ${actual ? 'Piyasa Etkisi: Veri açıklandı, oynaklık artabilir.' : 'Analiz: Beklentiden büyük veri USD\'yi güçlendirir.'}
                </div>
            `;
            container.appendChild(row);
        });

        if (container.innerHTML === '') {
            container.innerHTML = '<div style="padding:40px;text-align:center;color:#444;font-size:0.6rem">Şu an kritik bir veri akışı bulunmuyor.</div>';
        }
    }

    if (document.readyState === 'complete') loadData(); else window.addEventListener('load', loadData);
    setInterval(loadData, 10 * 60 * 1000);
})();
