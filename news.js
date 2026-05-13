(function() {
    console.log("Haber & Takvim v14.0 (Tam Yerelleştirme) Başlatıldı");

    const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml';
    const FALLBACK_NEWS_URL = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';

    // İstanbul Saati Formatlayıcı (24 Saat)
    function formatToTR24(dateObj) {
        return new Intl.DateTimeFormat('tr-TR', {
            hour: '2-digit', minute: '2-digit',
            hour12: false, timeZone: 'Europe/Istanbul'
        }).format(dateObj);
    }

    // FF Saatini (Genelde EST/EDT) İstanbul Saatine Çevir
    function convertFFToTR(dateStr, timeStr) {
        // dateStr: 05-13-2026, timeStr: 1:45pm
        try {
            // Önce geçerli bir tarih objesi oluştur (EST varsayarak)
            const fullStr = `${dateStr} ${timeStr}`;
            const date = new Date(fullStr + " GMT-0400"); // ForexFactory genelde EDT (-4) kullanır
            if (isNaN(date.getTime())) return null;
            return date;
        } catch (e) { return null; }
    }

    function updateLiveClock() {
        const updateText = document.getElementById('ffLastUpdate');
        if (updateText) {
            const now = new Date();
            const time = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Europe/Istanbul' }).format(now);
            updateText.innerHTML = `<span style="color:var(--dim);font-size:0.6rem">İSTANBUL:</span> <span style="color:#00ff41;font-weight:bold">${time}</span>`;
        }
    }
    setInterval(updateLiveClock, 1000);

    async function loadData() {
        const list = document.getElementById('ffNewsList');
        if (!list) return;

        list.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#00ff41;font-size:0.6rem;opacity:0.7">VERİLER TÜRKİYE SAATİNE GÖRE AYARLANIYOR...</div>';

        const callbackName = 'cb_' + Math.floor(Math.random() * 1000000);
        const script = document.createElement('script');
        let isDone = false;

        function cleanup() {
            if (isDone) return; isDone = true;
            if (script.parentNode) script.parentNode.removeChild(script);
            delete window[callbackName];
        }

        window[callbackName] = function(data) {
            if (data && data.contents) {
                renderCalendar(data.contents, list);
                cleanup();
            } else {
                fetchNewsFallback(list);
                cleanup();
            }
        };

        script.src = `https://api.allorigins.win/get?url=${encodeURIComponent(CALENDAR_URL)}&callback=${callbackName}`;
        script.onerror = () => { fetchNewsFallback(list); cleanup(); };
        document.body.appendChild(script);
        setTimeout(() => { if (!isDone) { fetchNewsFallback(list); cleanup(); } }, 10000);
    }

    async function fetchNewsFallback(container) {
        try {
            const res = await fetch(FALLBACK_NEWS_URL);
            const data = await res.json();
            if (data && data.Data) renderNews(data.Data, container);
            else renderEmergencyNews(container);
        } catch (e) { renderEmergencyNews(container); }
    }

    function renderCalendar(xmlText, container) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');
        const events = Array.from(xml.querySelectorAll('event'));
        if (events.length === 0) { fetchNewsFallback(container); return; }
        
        container.innerHTML = '';
        const today = new Date();
        const todayStr = (today.getMonth()+1).toString().padStart(2,0) + '-' + today.getDate().toString().padStart(2,0);

        events.forEach(ev => {
            const country = ev.querySelector('country')?.textContent || '';
            if (country !== 'USD') return;

            const dateStr = ev.querySelector('date')?.textContent || '';
            const timeStr = ev.querySelector('time')?.textContent || '';
            const trDate = convertFFToTR(dateStr, timeStr);
            if (!trDate) return;

            // Sadece bugünün ve yarının haberlerini göster (Kalabalığı önle)
            const diffDays = Math.abs(trDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays > 2) return;

            const actual = ev.querySelector('actual')?.textContent || '';
            const impact = ev.querySelector('impact')?.textContent || 'Low';
            const impactColor = impact === 'High' ? '#ff0000' : (impact === 'Medium' ? '#ffaa00' : '#00ff41');

            const row = document.createElement('div');
            row.style.padding = '12px 10px'; row.style.borderBottom = '1px solid #111'; row.style.fontSize = '0.7rem';
            row.style.background = actual ? 'rgba(0,255,65,0.02)' : 'transparent';

            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                    <span style="color:#eee;font-size:0.6rem;font-weight:bold">${formatToTR24(trDate)} <span style="color:#555;font-weight:normal">| TR SAATİ</span></span>
                    <span style="color:${impactColor};font-size:0.6rem;font-weight:bold">${impact.toUpperCase()} ETKİ</span>
                </div>
                <div style="color:#eee;font-weight:bold;margin-bottom:6px;line-height:1.3">${ev.querySelector('title')?.textContent}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.65rem">
                    <span style="color:#888">B: ${ev.querySelector('forecast')?.textContent || '--'} | A: <b style="color:#fff">${actual || '--'}</b></span>
                    <span style="color:${actual ? '#00ff41' : '#ffaa00'};font-weight:bold;font-size:0.55rem;border:1px solid;padding:1px 4px;border-radius:2px">
                        ${actual ? 'AÇIKLANDI' : 'BEKLENİYOR'}
                    </span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:0.55rem;color:#444">
                    <span>${trDate.toLocaleDateString('tr-TR')}</span>
                    <span>KAYNAK: ForexFactory</span>
                </div>
            `;
            container.appendChild(row);
        });
    }

    function renderNews(newsItems, container) {
        container.innerHTML = '<div style="padding:10px;color:#00ff41;font-size:0.55rem;text-align:center;opacity:0.6">HABER AKIŞI AKTİF (TR SAATİ)</div>';
        newsItems.slice(0, 15).forEach(item => {
            const pubDate = new Date(item.published_on * 1000);
            const row = document.createElement('div');
            row.style.padding = '12px 10px'; row.style.borderBottom = '1px solid #111'; row.style.fontSize = '0.7rem';
            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="color:#eee;font-weight:bold;font-size:0.6rem">${formatToTR24(pubDate)}</span>
                    <span style="color:#555;font-size:0.6rem">${item.source}</span>
                </div>
                <div style="color:#eee;font-weight:bold;line-height:1.3">${item.title}</div>
            `;
            container.appendChild(row);
        });
    }

    function renderEmergencyNews(container) {
        container.innerHTML = '<div style="padding:10px;color:#ffaa00;font-size:0.55rem;text-align:center">YEDEK VERİ HATTI</div>';
        const mock = [{ t: 'BTC 79k üzerinde kalıcılık sağlıyor', s: 'Market' }, { t: 'USD endeksi 104 seviyesinde', s: 'Finans' }];
        mock.forEach(m => {
            const row = document.createElement('div');
            row.style.padding = '10px'; row.style.borderBottom = '1px solid #111'; row.style.fontSize = '0.7rem';
            row.innerHTML = `<div style="color:#555;font-size:0.55rem">${m.s}</div><div style="color:#eee;font-weight:bold">${m.t}</div>`;
            container.appendChild(row);
        });
        const btn = document.createElement('button');
        btn.innerText = 'YENİDEN DENE';
        btn.style = 'width:100%;background:transparent;border:none;color:var(--green);padding:10px;cursor:pointer;font-size:0.65rem';
        btn.onclick = loadData;
        container.appendChild(btn);
    }

    if (document.readyState === 'complete') loadData(); else window.addEventListener('load', loadData);
    setInterval(loadData, 10 * 60 * 1000);
})();
