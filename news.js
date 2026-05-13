(function() {
    console.log("Haber & Takvim v29.0 (Investing.com Calendar Engine) Başlatıldı");

    function updateClock() {
        const u = document.getElementById('ffLastUpdate');
        if (u) {
            const time = new Intl.DateTimeFormat('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false, timeZone:'Europe/Istanbul' }).format(new Date());
            u.innerHTML = `<span style="color:var(--dim);font-size:0.6rem">İSTANBUL:</span> <span style="color:#00ff41;font-weight:bold">${time}</span>`;
        }
    }
    setInterval(updateClock, 1000);

    function loadCalendar() {
        const list = document.getElementById('ffNewsList');
        if (!list) return;

        // Investing.com Ekonomik Takvim Widget'ı (Piyasaya Etki, Beklenti ve Gerçekleşen Verileri İçerir)
        // Bu widget engellenemez bir altyapıya sahiptir ve tüm detayları (Yıldız/Boğa simgeleri ile etki) gösterir.
        list.innerHTML = `
            <div style="height:100%; width:100%; background:#000;">
                <iframe src="https://sslecal2.investing.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&category=_unspecified,_currencies,_indices,_bonds,_commodities,_centralBanks&importance=1,2,3&features=datepicker,timezone&countries=5&calType=day&timeZone=52&lang=10" 
                        width="100%" height="100%" frameborder="0" allowtransparency="true" marginwidth="0" marginheight="0">
                </iframe>
            </div>
            <style>
                iframe { filter: invert(1) hue-rotate(180deg) brightness(0.8); } /* Karanlık Mod Uyumu */
            </style>
        `;
    }

    if (document.readyState === 'complete') loadCalendar(); else window.addEventListener('load', loadCalendar);
})();
