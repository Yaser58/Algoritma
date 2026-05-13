(function() {
    console.log("Haber & Takvim v24.0 (TradingView Engine) Başlatıldı");

    function updateClock() {
        const u = document.getElementById('ffLastUpdate');
        if (u) {
            const time = new Intl.DateTimeFormat('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false, timeZone:'Europe/Istanbul' }).format(new Date());
            u.innerHTML = `<span style="color:var(--dim);font-size:0.6rem">İSTANBUL:</span> <span style="color:#00ff41;font-weight:bold">${time}</span>`;
        }
    }
    setInterval(updateClock, 1000);

    function loadTradingViewNews() {
        const container = document.getElementById('ffNewsList');
        if (!container) return;

        container.innerHTML = '<div id="tv-news-widget-container"></div>';
        
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js';
        script.async = true;
        
        // TradingView Widget Ayarları (Karanlık Tema ve Full Entegrasyon)
        const config = {
            "feedMode": "all_symbols",
            "colorTheme": "dark",
            "isTransparent": true,
            "displayMode": "regular",
            "width": "100%",
            "height": "100%",
            "locale": "tr",
            "symbol": "BINANCE:BTCUSDT"
        };
        
        script.innerHTML = JSON.stringify(config);
        document.getElementById('tv-news-widget-container').appendChild(script);
        
        // CSS Düzenlemesi (Kutuyu tam kaplaması için)
        const style = document.createElement('style');
        style.innerHTML = `
            #tv-news-widget-container { height: 100%; width: 100%; overflow: hidden; }
            .tradingview-widget-container { height: 100% !important; }
        `;
        document.head.appendChild(style);
    }

    if (document.readyState === 'complete') loadTradingViewNews(); else window.addEventListener('load', loadTradingViewNews);
})();
