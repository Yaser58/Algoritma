(function() {
    console.log("Haber & Takvim v30.0 (TradingView Calendar Engine) Başlatıldı");

    function updateClock() {
        const u = document.getElementById('ffLastUpdate');
        if (u) {
            const time = new Intl.DateTimeFormat('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false, timeZone:'Europe/Istanbul' }).format(new Date());
            u.innerHTML = `<span style="color:var(--dim);font-size:0.6rem">İSTANBUL:</span> <span style="color:#00ff41;font-weight:bold">${time}</span>`;
        }
    }
    setInterval(updateClock, 1000);

    function loadTradingViewCalendar() {
        const container = document.getElementById('ffNewsList');
        if (!container) return;

        // TradingView Ekonomik Takvim Widget'ı
        // En yüksek stabiliteye sahiptir, bloklanmaz ve tüm profesyonel verileri (Etki, Gerçek, Beklenti) içerir.
        container.innerHTML = '<div id="tv-calendar-container" style="height:100%; width:100%;"></div>';
        
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
        script.async = true;
        
        const config = {
            "colorTheme": "dark",
            "isTransparent": true,
            "width": "100%",
            "height": "100%",
            "locale": "tr",
            "importanceFilter": "-1,0,1",
            "currencyFilter": "USD"
        };
        
        script.innerHTML = JSON.stringify(config);
        document.getElementById('tv-calendar-container').appendChild(script);
    }

    if (document.readyState === 'complete') loadTradingViewCalendar(); else window.addEventListener('load', loadTradingViewCalendar);
})();
