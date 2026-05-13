(function() {
    console.log("Haber & Takvim v13.0 (Bulletproof) Başlatıldı");

    const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml';
    const FALLBACK_NEWS_URL = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';

    function formatTRTime(dateObj) {
        return new Intl.DateTimeFormat('tr-TR', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false, timeZone: 'Europe/Istanbul'
        }).format(dateObj);
    }

    function updateLiveClock() {
        const updateText = document.getElementById('ffLastUpdate');
        if (updateText) {
            updateText.innerHTML = `<span style="color:var(--dim);font-size:0.6rem">İSTANBUL:</span> <span style="color:#00ff41;font-weight:bold">${formatTRTime(new Date())}</span>`;
        }
    }
    setInterval(updateLiveClock, 1000);

    async function loadData() {
        const list = document.getElementById('ffNewsList');
        if (!list) return;

        list.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#00ff41;font-size:0.6rem;opacity:0.7">GÜVENLİ KANALLAR TARANIYOR...</div>';

        // JSONP Denemesi
        const callbackName = 'cb_' + Math.floor(Math.random() * 1000000);
        const script = document.createElement('script');
        let isDone = false;

        function cleanup() {
            if (isDone) return;
            isDone = true;
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
            if (data && data.Data && data.Data.length > 0) {
                renderNews(data.Data, container);
            } else {
                renderEmergencyNews(container);
            }
        } catch (e) {
            renderEmergencyNews(container);
        }
    }

    function renderCalendar(xmlText, container) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');
        const events = Array.from(xml.querySelectorAll('event')).slice(0, 30);
        if (events.length === 0) { fetchNewsFallback(container); return; }
        
        container.innerHTML = '';
        events.forEach(ev => {
            if ((ev.querySelector('country')?.textContent || '') !== 'USD') return;
            const actual = ev.querySelector('actual')?.textContent || '';
            const row = document.createElement('div');
            row.style.padding = '12px 10px'; row.style.borderBottom = '1px solid #111'; row.style.fontSize = '0.7rem';
            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="color:#555;font-size:0.55rem">${ev.querySelector('date')?.textContent} | ${ev.querySelector('time')?.textContent}</span>
                    <span style="color:#555;font-size:0.55rem">USD | FF</span>
                </div>
                <div style="color:#eee;font-weight:bold;margin-bottom:5px">${ev.querySelector('title')?.textContent}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.6rem">
                    <span style="color:#888">B: ${ev.querySelector('forecast')?.textContent || '--'} | A: <b style="color:#fff">${actual || '--'}</b></span>
                    <span style="color:${actual ? '#00ff41' : '#ffaa00'};font-weight:bold">${actual ? 'AÇIKLANDI' : 'BEKLENİYOR'}</span>
                </div>
            `;
            container.appendChild(row);
        });
    }

    function renderNews(newsItems, container) {
        container.innerHTML = '<div style="padding:10px;color:#00ff41;font-size:0.5rem;text-align:center;opacity:0.6">TAKVİM MEŞGUL, HABER AKIŞI AKTİF</div>';
        newsItems.slice(0, 15).forEach(item => {
            const row = document.createElement('div');
            row.style.padding = '12px 10px'; row.style.borderBottom = '1px solid #111'; row.style.fontSize = '0.7rem';
            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="color:#555;font-size:0.55rem">${formatTRTime(new Date(item.published_on * 1000))}</span>
                    <span style="color:#555;font-size:0.55rem">${item.source}</span>
                </div>
                <div style="color:#eee;font-weight:bold;line-height:1.3">${item.title}</div>
            `;
            container.appendChild(row);
        });
    }

    function renderEmergencyNews(container) {
        container.innerHTML = '<div style="padding:10px;color:#ffaa00;font-size:0.55rem;text-align:center">BAĞLANTI KISITLI - YEDEK VERİLER</div>';
        const mock = [
            { t: 'BTC Consolidation continues above 79k', s: 'Market' },
            { t: 'USD Strength index remains stable', s: 'Finance' },
            { t: 'Crypto market awaits US inflation data', s: 'News' }
        ];
        mock.forEach(m => {
            const row = document.createElement('div');
            row.style.padding = '12px 10px'; row.style.borderBottom = '1px solid #111'; row.style.fontSize = '0.7rem';
            row.innerHTML = `<div style="color:#555;font-size:0.55rem">SİSTEM MESAJI | ${m.s}</div><div style="color:#eee;font-weight:bold">${m.t}</div>`;
            container.appendChild(row);
        });
        const btn = document.createElement('button');
        btn.innerText = 'YENİDEN DENE';
        btn.style = 'width:100%;background:transparent;border:none;color:var(--green);padding:10px;cursor:pointer;font-size:0.65rem';
        btn.onclick = loadData;
        container.appendChild(btn);
    }

    if (document.readyState === 'complete') loadData(); else window.addEventListener('load', loadData);
    setInterval(loadData, 5 * 60 * 1000);
})();
