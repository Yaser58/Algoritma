(function() {
    console.log("Haber & Takvim v25.0 (Dual-Engine Mode) Başlatıldı");

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
        currentMode = (currentMode === 'tradingview') ? 'cryptocompare' : 'tradingview';
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
            // CryptoCompare Widget (Bloklanmaz Altyapı)
            const ccContainer = document.createElement('div');
            ccContainer.innerHTML = `
                <div style="height:100%; background:transparent;">
                    <div style="padding:10px; color:#00ff41; font-size:0.6rem; text-align:center; opacity:0.6">CRYPTOCOMPARE GLOBAL HABERLER</div>
                    <script type="text/javascript">
                        baseUrl = "https://widgets.cryptocompare.com/";
                        var scripts = document.getElementsByTagName("script");
                        var embedder = scripts[scripts.length - 1];
                        (function (){
                        var appName = encodeURIComponent(window.location.hostname);
                        if(appName==""){appName="local";}
                        var s = document.createElement("script");
                        s.type = "text/javascript";
                        s.async = true;
                        var theUrl = baseUrl+'serve/v1/coin/feed?fsym=BTC&tsym=USD&feedType=cryptopanic';
                        s.src = theUrl + ( theUrl.indexOf("?") >= 0 ? "&" : "?" ) + "app=" + appName;
                        embedder.parentNode.appendChild(s);
                        })();
                    </script>
                </div>
            `;
            container.appendChild(ccContainer);
        }
    }

    window.addEventListener('load', () => {
        initLayout();
        loadNews();
    });
})();
