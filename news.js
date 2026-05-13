(function() {
    console.log("Haber & Takvim v31.0 (Advanced Interpretation) Başlatıldı");

    function updateClock() {
        const u = document.getElementById('ffLastUpdate');
        if (u) {
            const time = new Intl.DateTimeFormat('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false, timeZone:'Europe/Istanbul' }).format(new Date());
            u.innerHTML = `<span style="color:var(--dim);font-size:0.6rem">İSTANBUL:</span> <span style="color:#00ff41;font-weight:bold">${time}</span>`;
        }
    }
    setInterval(updateClock, 1000);

    function loadCalendar() {
        const container = document.getElementById('ffNewsList');
        if (!container) return;

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; height:100%;">
                <!-- Analiz Rehberi -->
                <div style="padding:10px; background:rgba(0,255,65,0.05); border-bottom:1px solid #111; font-size:0.55rem; color:#888;">
                    <div style="color:#00ff41; font-weight:bold; margin-bottom:4px; font-size:0.6rem">📊 HABER ANALİZ REHBERİ</div>
                    <div style="display:flex; gap:10px; margin-bottom:5px">
                        <span>🔴 <b style="color:#eee">Yüksek Etki:</b> Sert Hareket Beklenir</span>
                    </div>
                    <div style="line-height:1.3">
                        <b style="color:#eee">BEKLENTİ > GERÇEK:</b> Fiyat Genelde Düşer <br>
                        <b style="color:#eee">GERÇEK > BEKLENTİ:</b> Fiyat Genelde Yükselir
                    </div>
                </div>
                <!-- Takvim Widget -->
                <div id="tv-calendar-root" style="flex:1; width:100%;"></div>
            </div>
        `;
        
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
            "currencyFilter": "USD,EUR,TRY"
        };
        
        script.innerHTML = JSON.stringify(config);
        document.getElementById('tv-calendar-root').appendChild(script);
    }

    if (document.readyState === 'complete') loadCalendar(); else window.addEventListener('load', loadCalendar);
})();
