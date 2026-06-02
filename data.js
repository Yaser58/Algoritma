/* ============================================================
   data.js : BIST veri katmanı (Yahoo Finance + CORS proxy)
   - Proxy'ler PARALEL yarıştırılır (ilk geçerli yanıt kazanır) -> hızlı.
   - Her isteğe zaman aşımı (AbortController) -> asla takılmaz.
   - Yükleme başarısızsa otomatik yeniden dener (throttle geçince yüklenir).
   - Not: Yahoo BIST verisi genelde ~15 dk gecikmelidir.
   ============================================================ */

let dailyOpen = 0;
let liveTimer = null;

function yhSymbol(p) {
    return p + '.IS'; // endeksler ve hisseler BIST için ".IS"
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

// Zaman aşımlı fetch: süre dolarsa isteği iptal eder, null döner (hata fırlatmaz)
async function fetchWithTimeout(url, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
        const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
        clearTimeout(t);
        return res;
    } catch (e) {
        clearTimeout(t);
        return null;
    }
}

// Proxy yanıtından Yahoo chart sonucunu çıkarır (raw JSON veya allorigins {contents})
function extractChart(txt) {
    if (!txt || txt.indexOf('Too Many Requests') !== -1) return null;
    let j;
    try { j = JSON.parse(txt); } catch (e) { return null; }
    if (j && j.chart && j.chart.result) return j.chart.result[0] || null;
    if (j && typeof j.contents === 'string') {
        try { return JSON.parse(j.contents)?.chart?.result?.[0] || null; } catch (e) { return null; }
    }
    return null;
}

// Yahoo chart isteğini birden çok proxy ile PARALEL dener; ilk geçerli sonucu döner
async function fetchYahoo(symbol, interval, range) {
    const yq = `https://query1.finance.yahoo.com/v8/finance/chart/${yhSymbol(symbol)}?interval=${interval}&range=${range}&includePrePost=false`;
    const proxies = [
        'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(yq),
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(yq),
        'https://api.allorigins.win/get?url=' + encodeURIComponent(yq),
        'https://corsproxy.io/?url=' + encodeURIComponent(yq),
        'https://thingproxy.freeboard.io/fetch/' + yq
    ];
    const attempts = proxies.map(u => (async () => {
        const res = await fetchWithTimeout(u, 9000);
        if (!res || !res.ok) throw new Error('bad');
        const txt = await res.text();
        const r = extractChart(txt);
        if (!r || !r.timestamp) throw new Error('noData');
        return r;
    })());
    try {
        return await Promise.any(attempts); // ilk başarılı yanıt
    } catch (e) {
        return null; // hepsi başarısız (throttle / ağ)
    }
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
    isHistLoaded = false;
    const reqPair = pair;
    document.getElementById('sN').innerText = pair;
    cSt(false, 'YÜKLENİYOR...');

    const { interval, range } = tfToYahoo(tf);
    const r = await fetchYahoo(pair, interval, range);

    // Kullanıcı bu sırada başka hisseye geçtiyse bu yüklemeyi iptal et
    if (pair !== reqPair) return;

    if (!r) {
        cSt(false, 'VERİ ALINAMADI');
        document.getElementById('dataSource').innerText = 'KAYNAK: Yahoo proxy meşgul — 8 sn sonra otomatik denenecek';
        sLog('UYARI: ' + pair + ' verisi alınamadı (proxy/hız sınırı). Otomatik tekrar denenecek...');
        setTimeout(() => { if (pair === reqPair && !isHistLoaded) loadHist(); }, 8000);
        return;
    }

    const meta = r.meta || {};
    dailyOpen = meta.chartPreviousClose || meta.previousClose || 0;

    const parsed = parseYahoo(r);
    candles = [...new Map(parsed.map(c => [c.time, c])).values()].sort((a, b) => a.time - b.time);

    if (candles.length > 0) {
        cp = meta.regularMarketPrice || candles[candles.length - 1].close;
        updatePrecision(cp);
        updPrice({ close: cp });
    } else {
        sLog('UYARI: ' + pair + ' için mum verisi boş (borsa kapalı veya sembol geçersiz).');
    }

    cS.setData(candles);
    cSt(true, 'ONLINE');
    document.getElementById('dataSource').innerText = 'KAYNAK: YAHOO (BIST ~15dk gecikmeli)';
    isHistLoaded = true;
    calcInd();

    setTimeout(() => {
        const count = candles.length;
        if (count > 0) chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, count - 150), to: count });
    }, 200);

    startLive();
}

function startLive() {
    if (liveTimer) clearInterval(liveTimer);
    liveTimer = setInterval(pollLive, 6000);
}

async function pollLive() {
    if (!isHistLoaded || document.hidden) return;
    const { interval } = tfToYahoo(tf);
    const r = await fetchYahoo(pair, interval, '1d'); // son güne ait küçük veri
    if (!r) {
        document.getElementById('dataSource').innerText = 'KAYNAK: YAHOO (akış meşgul, yeniden denenecek)';
        return;
    }
    lastWsMsgTime = Date.now();
    const meta = r.meta || {};
    const recent = parseYahoo(r);

    if (meta.regularMarketPrice) {
        cp = +meta.regularMarketPrice;
        updPrice({ close: cp });
    }

    if (candles.length && recent.length) {
        let changed = false;
        recent.forEach(rc => {
            const last = candles[candles.length - 1];
            if (rc.time > last.time) { candles.push(rc); cS.update(rc); changed = true; }
            else if (rc.time === last.time) { Object.assign(last, rc); cS.update(last); changed = true; }
        });
        updPnl();
        if (changed) calcInd();
    }

    document.getElementById('dataSource').innerText = 'KAYNAK: YAHOO (BIST ~15dk gecikmeli)';
    const lt = document.getElementById('liveTick');
    if (lt) { lt.style.display = 'block'; lt.innerText = 'CANLI: ₺' + cp.toFixed(currentPrecision); }
}
