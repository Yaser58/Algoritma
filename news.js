(function() {
    console.log("Haber & Takvim v12.0 (JSONP Ultimate) Başlatıldı");

    const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml';
    const NEWS_JSON_URL = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';

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

        list.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#00ff41;font-size:0.6rem;opacity:0.7">GÜVENLİ HAT KURULUYOR...</div>';

        // Strateji 1: JSONP ile AllOrigins (CORS Engellerini %100 Aşar)
        try {
            const callbackName = 'cb_' + Date.now();
            const script = document.createElement('script');
            script.src = `https://api.allorigins.win/get?url=${encodeURIComponent(CALENDAR_URL)}&callback=${callbackName}`;
            
            window[callbackName] = function(data) {
                if (data && data.contents) {
                    renderCalendar(data.contents, list);
                    cleanup();
                } else {
                    tryNewsFallback(list);
                    cleanup();
                }
            };

            function cleanup() {
                document.body.removeChild(script);
                delete window[callbackName];
            }

            script.onerror = () => { tryNewsFallback(list); cleanup(); };
            document.body.appendChild(script);

            // 8 saniye timeout
            setTimeout(() => {
                if (window[callbackName]) {
                    tryNewsFallback(list);
                    cleanup();
                }
            }, 8000);

        } catch (e) {
            tryNewsFallback(list);
        }
    }

    async function tryNewsFallback(container) {
        // Strateji 2: Direkt Fetch (Eğer script engellenmediyse)
        try {
            const res = await fetch(NEWS_JSON_URL);
            const data = await res.json();
            if (data && data.Data) {
                renderNews(data.Data, container);
            } else {
                renderOfflineMode(container);
            }
        } catch (e) {
            renderOfflineMode(container);
        }
    }

    function renderCalendar(xmlText, container) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');
        const events = Array.from(xml.querySelectorAll('event')).slice(0, 30);
        if (events.length === 0) { tryNewsFallback(container); return; }
        
        container.innerHTML = '';
        events.forEach(ev => {
            if ((ev.querySelector('country')?.textContent || '') !== 'USD') return;
            const actual = ev.querySelector('actual')?.textContent || '';
            const row = document.createElement('div');
            row.style.padding = '12px 10px';
            row.style.borderBottom = '1px solid #111';
            row.style.fontSize = '0.7rem';
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
            row.style.padding = '12px 10px';
            row.style.borderBottom = '1px solid #111';
            row.style.fontSize = '0.7rem';
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

    function renderOfflineMode(container) {
        container.innerHTML = `
            <div style="padding:40px 10px;text-align:center">
                <div style="color:#ff4444;font-size:0.7rem;margin-bottom:15px">BAĞLANTI SORUNU</div>
                <div style="background:rgba(0,255,65,0.05);padding:15px;border:1px solid #111;text-align:left;margin-bottom:20px">
                    <div style="color:var(--green);font-size:0.6rem;margin-bottom:5px;font-weight:bold">NOT:</div>
                    <div style="color:#888;font-size:0.55rem;line-height:1.4">Veri kanalları şu an ulaşılamaz durumda. Lütfen VeePN eklentisini veya tarayıcı reklam engelleyicilerini kapatıp tekrar deneyin.</div>
                </div>
                <button id="retryNews" style="background:transparent;border:1px solid #333;color:var(--green);padding:8px 20px;cursor:pointer;font-size:0.65rem">YENİDEN DENE</button>
            </div>`;
        const r = document.getElementById('retryNews');
        if(r) r.onclick = loadData;
    }

    if (document.readyState === 'complete') loadData(); else window.addEventListener('load', loadData);
    setInterval(loadData, 10 * 60 * 1000);

})();
