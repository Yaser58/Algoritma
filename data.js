/* ============================================================
   data.js : BIST veri katmanı (Yahoo Finance + CORS proxy)
   - Geçmiş mumlar: v8/finance/chart
   - Canlı akış: websocket yok -> periyodik polling (~6 sn)
   - Not: Yahoo BIST verisi genelde ~15 dk gecikmelidir.
   ============================================================ */

let dailyOpen = 0;
let liveTimer = null;

const YH_HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];

// Yahoo CORS engelini aşmak için proxy zinciri (sırayla denenir)
function proxify(url) {
    return [
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
        'https://corsproxy.io/?url=' + encodeURIComponent(url),
        'https://thingproxy.freeboard.io/fetch/' + url
    ];
}

function yhSymbol(p) {
    // Endeksler ve hisselerin tamamı BIST için ".IS" uzantısı alır
    return p + '.IS';
}

function tfToYahoo(t) {
    switch (t) {
        case '1m':  return { interval: '1m',  range: '5d' };
        case '5m':  return { interval: '5m',  range: '1mo' };
        case '15m': return { interval: '15m', range: '1mo' };
        case '1h':  return { interval: '60m', range: '3mo' };
        default:    return { interval: '5m',  range: '1mo' };
    }
}

// Tek bir chart isteğini tüm host/proxy kombinasyonlarıyla dener
async function fetchYahoo(symbol, interval, range) {
    const path = `/v8/finance/chart/${yhSymbol(symbol)}?interval=${interval}&range=${range}&includePrePost=false`;
    for (const host of YH_HOSTS) {
        for (const url of proxify(host + path)) {
            try {
                const res = await fetch(url, { cache: 'no-store' });
                if (!res.ok) continue;
                const j = await res.json();
                const r = j?.chart?.result?.[0];
                if (r && r.timestamp) return r;
                if (j?.chart?.error) continue;
            } catch (e) { /* sıradaki proxy'yi dene */ }
        }
    }
    throw new Error('Yahoo verisi alınamadı (proxy/CORS engeli olabilir).');
}

// Yahoo cevabını mum dizisine çevirir (BIST saati = UTC+3 -> +10800)
function parseYahoo(r) {
    const ts = r.timestamp || [];
    const q = (r.indicators && r.indicators.quote && r.indicators.quote[0]) || {};
    const out = [];
    for (let i = 0; i < ts.length; i++) {
        const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
        if (o == null || h == null || l == null || c == null) continue;
        out.push({ time: ts[i] + 10800, open: +o, high: +h, low: +l, close: +c, volume: q.volume?.[i] || 0 });
    }
    return out;
}

async function loadHist() {
    if (liveTimer) { clearInterval(liveTimer); liveTimer = null; }
    cSt(false, 'YÜKLENİYOR...');
    document.getElementById('sN').innerText = pair;
    try {
        const { interval, range } = tfToYahoo(tf);
        const r = await fetchYahoo(pair, interval, range);
        const meta = r.meta || {};
        dailyOpen = meta.chartPreviousClose || meta.previousClose || 0;

        // Mumları temizle, tekille ve sırala
        const parsed = parseYahoo(r);
        candles = [...new Map(parsed.map(c => [c.time, c])).values()].sort((a, b) => a.time - b.time);

        if (candles.length > 0) {
            cp = meta.regularMarketPrice || candles[candles.length - 1].close;
            updatePrecision(cp);
            updPrice({ close: cp });
        } else {
            sLog('UYARI: ' + pair + ' için veri bulunamadı (borsa kapalı veya sembol geçersiz).');
        }

        cS.setData(candles);
        cSt(true, 'ONLINE');
        document.getElementById('dataSource').innerText = 'KAYNAK: YAHOO (BIST ~15dk gecikmeli)';
        isHistLoaded = true;
        calcInd();

        // Güncel fiyata ve son mumlara odaklan
        setTimeout(() => {
            const count = candles.length;
            if (count > 0) {
                chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, count - 150), to: count });
            }
        }, 200);

        startLive();
    } catch (e) {
        cSt(false, 'HATA');
        sLog('HATA: ' + e.message);
    }
}

function startLive() {
    if (liveTimer) clearInterval(liveTimer);
    liveTimer = setInterval(pollLive, 6000);
}

async function pollLive() {
    if (!isHistLoaded || document.hidden) return;
    try {
        const { interval } = tfToYahoo(tf);
        const r = await fetchYahoo(pair, interval, '1d'); // sadece son güne ait küçük veri
        const meta = r.meta || {};
        lastWsMsgTime = Date.now();

        const recent = parseYahoo(r);
        if (meta.regularMarketPrice) {
            cp = +meta.regularMarketPrice;
            updPrice({ close: cp });
        }

        if (candles.length && recent.length) {
            let changed = false;
            recent.forEach(rc => {
                const last = candles[candles.length - 1];
                if (rc.time > last.time) {
                    candles.push(rc);
                    cS.update(rc);
                    changed = true;
                } else if (rc.time === last.time) {
                    Object.assign(last, rc);
                    cS.update(last);
                    changed = true;
                }
            });
            updPnl();
            if (changed) calcInd();
        }

        const lt = document.getElementById('liveTick');
        if (lt) { lt.style.display = 'block'; lt.innerText = 'CANLI: ₺' + cp.toFixed(currentPrecision); }
    } catch (e) {
        document.getElementById('dataSource').innerText = 'KAYNAK: YAHOO (akış meşgul, yeniden denenecek)';
    }
}
