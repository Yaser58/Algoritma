(function() {
    console.log("Haber & Takvim v26.0 (Global Authority Mode) Başlatıldı");

    let currentMode = 'tradingview';

    function updateClock() {
        const u = document.getElementById('ffLastUpdate');
        if (u) {
            const time = new Intl.DateTimeFormat('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false, timeZone:'Europe/Istanbul' }).format(new Date());
            u.innerHTML = `<span style="color:var(--dim);font-size:0.6rem">İSTANBUL:</span> <span style="color:#00ff41;font-weight:bold">${time}</span>`;
        }
    }
    setInterval(updateClock, 1000);

    function initLayout() {
        const header = document.querySelector('.ff-header');
        if (header && !document.getElementById('modeSwitcher')) {
            const btn = document.createElement('button');
            btn.id = 'modeSwitcher';
            btn.innerText = 'HABER KAYNAĞINI DEĞİŞTİR';
            btn.style = 'width:100%;background:#003b00;border:1px solid #00ff41;color:#00ff41;padding:5px;cursor:pointer;font-size:0.6rem;margin-top:5px;font-weight:bold';
            btn.onclick = toggleMode;
            header.querySelector('div').appendChild(btn);
        }
    }

    function toggleMode() {
        currentMode = (currentMode === 'tradingview') ? 'investing' : 'tradingview';
        loadNews();
    }

    function loadNews() {
        const container = document.getElementById('ffNewsList');
        if (!container) return;

        container.innerHTML = '';
        
        if (currentMode === 'tradingview') {
            const tvContainer = document.createElement('div');
            tvContainer.id = 'tv-news-root';
            tvContainer.style.height = '100%';
            container.appendChild(tvContainer);

            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js';
            script.async = true;
            script.innerHTML = JSON.stringify({
                "feedMode": "all_symbols",
                "colorTheme": "dark",
                "isTransparent": true,
                "displayMode": "regular",
                "width": "100%",
                "height": "100%",
                "locale": "tr"
            });
            tvContainer.appendChild(script);
        } else {
            // Investing.com Global News Widget (TR)
            // Bu altyapı Türkiye'de en çok kullanılan ve engellenmeyen profesyonel haber hattıdır.
            const invContainer = document.createElement('div');
            invContainer.style.height = '100%';
            invContainer.innerHTML = `
                <iframe src="https://tr.investing.com/widgets/news?container_width=100%&height=100%&show_news_headers=0&show_news_tabs=0&show_news_providers=1&show_news_date=1&show_news_summary=1&show_news_image=0&news_providers=1,2,3,4,5&news_tabs=1,2,3&language=10" 
                        width="100%" height="100%" frameborder="0" allowtransparency="true" marginwidth="0" marginheight="0">
                </iframe>
            `;
            container.appendChild(invContainer);
        }
    }

    window.addEventListener('load', () => {
        initLayout();
        loadNews();
    });
})();
