/* ============================================================
   data.js : BIST veri katmanı
   - VARSAYILAN: Yahoo Finance + CORS proxy (anahtar gerekmez)
   - OPSİYONEL: Twelve Data (ücretsiz API anahtarı) -> proxy YOK, güvenilir
   ------------------------------------------------------------
   ÖNEMLİ: İstek hacmi bilinçli olarak düşük tutulur. Eski sürüm her 6 sn'de
   5 proxy'yi paralel çağırıyordu (~50 istek/dk) ve Yahoo bunu hız sınırına
   takıyordu. Artık: canlı akış 18 sn'de bir + tek proxy; ilk yüklemede 2 proxy.
   ============================================================ */

let dailyOpen = 0;
let liveTimer = null;

/* ---------- Ortak yardımcılar ---------- */

async function fetchWithTimeout(url, ms, opts) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
        const res = await fetch(url, Object.assign({ cache: 'no-store', signal: ctrl.signal }, opts || {}));
        clearTimeout(t);
        return res;
    } catch (e) {
        clearTimeout(t);
        return null;
    }
}

// Günlük değişim referansı: bir önceki günün son kapanışı
function computeDailyOpen(cs) {
    if (!cs.length) return 0;
    const lastDay = new Date(cs[cs.length - 1].time * 1000).getUTCDate();
    for (let i = cs.length - 1; i >= 0; i--) {
        if (new Date(cs[i].time * 1000).getUTCDate() !== lastDay) return cs[i].close;
    }
    return cs[0].open;
}

/* ---------- Twelve Data (opsiyonel, anahtar ile) ---------- */

function getTDKey() {
    try { return (localStorage.getItem('td_apikey') || '').trim(); } catch (e) { return ''; }
}

function tdInterval(t) {
    return ({ '1m': '1min', '5m': '5min', '15m': '15min', '1h': '1h' })[t] || '5min';
}

// "YYYY-MM-DD HH:MM:SS" -> epoch (İstanbul duvar saati UTC gibi ele alınır = +3 ofset gömülü)
function tdEpoch(dt) {
    const m = String(dt).match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (!m) return null;
    return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) / 1000);
}

async function fetchTD(symbol, t, outputsize) {
    const key = getTDKey();
    if (!key) return null;
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}` +
        `&country=Turkey&interval=${tdInterval(t)}&outputsize=${outputsize}` +
        `&timezone=Europe/Istanbul&apikey=${encodeURIComponent(key)}`;
    const res = await fetchWithTimeout(url, 10000);
    if (!res) return { error: 'Twelve Data yanıt vermedi' };
    let j;
    try { j = await res.json(); } catch (e) { return { error: 'Twelve Data geçersiz yanıt' }; }
    if (!j || j.status !== 'ok' || !Array.isArray(j.values)) {
        return { error: (j && j.message) ? j.message : 'Twelve Data veri yok' };
    }
    const out = [];
    for (let i = j.values.length - 1; i >= 0; i--) { // eskiden yeniye
        const v = j.values[i];
        const tm = tdEpoch(v.datetime);
        if (tm == null) continue;
        out.push({ time: tm, open: +v.open, high: +v.high, low: +v.low, close: +v.close, volume: +(v.volume || 0) });
    }
    return { candles: out };
}

/* ---------- Yahoo Finance (proxy) ---------- */

function yhUrl(symbol, interval, range) {
    return `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.IS?interval=${interval}&range=${range}&includePrePost=false`;
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

async function tryProxy(proxyUrl) {
    const res = await fetchWithTimeout(proxyUrl, 8000);
    if (!res || !res.ok) return null;
    let txt;
    try { txt = await res.text(); } catch (e) { return null; }
    const r = extractChart(txt);
    return (r && r.timestamp) ? r : null;
}

// İlk yükleme: SADECE 2 proxy yarıştırılır (hacmi düşük tutmak için)
async function fetchYahoo(symbol, interval, range) {
    const yq = yhUrl(symbol, interval, range);
    const proxies = [
        'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(yq),
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(yq)
    ];
    try {
        return await Promise.any(proxies.map(u => tryProxy(u).then(r => r || Promise.reject())));
    } catch (e) {
        return null;
    }
}

// Canlı akış: TEK proxy, sırayla (en düşük istek hacmi)
async function fetchYahooLight(symbol, interval, range) {
    const yq = yhUrl(symbol, interval, range);
    let r = await tryProxy('https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(yq));
    if (r) return r;
    r = await tryProxy('https://api.allorigins.win/raw?url=' + encodeURIComponent(yq));
    return r;
}

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

/* ---------- Yükleme + canlı akış ---------- */

async function loadHist() {
    if (liveTimer) { clearInterval(liveTimer); liveTimer = null; }
    isHistLoaded = false;
    const reqPair = pair;
    document.getElementById('sN').innerText = pair;

    const hasTD = !!getTDKey();
    let data = null, src = '', tdErr = '';

    for (let attempt = 1; attempt <= 3 && !data; attempt++) {
        cSt(false, attempt === 1 ? 'YÜKLENİYOR...' : 'TEKRAR DENENİYOR (' + attempt + '/3)...');

        // 1) Anahtar varsa önce Twelve Data (güvenilir, proxy yok)
        if (hasTD) {
            const td = await fetchTD(pair, tf, 1500);
            if (td && td.candles && td.candles.length) { data = td.candles; src = 'TD'; }
            else if (td && td.error) tdErr = td.error;
        }
        // 2) TD yoksa veya başarısızsa Yahoo'ya düş (yedek)
        if (!data) {
            const { interval, range } = tfToYahoo(tf);
            const r = await fetchYahoo(pair, interval, range);
            if (r) { data = parseYahoo(r); src = 'YAHOO'; }
        }

        if (pair !== reqPair) return; // kullanıcı başka hisseye geçti
        if (!data && attempt < 3) await new Promise(res => setTimeout(res, 2500));
    }

    if (pair !== reqPair) return;

    if (!data || data.length === 0) {
        cSt(false, 'VERİ ALINAMADI');
        document.getElementById('dataSource').innerText = 'KAYNAK: veri alınamadı';
        sLog('UYARI: ' + pair + ' yüklenemedi. ' + (tdErr ? ('Twelve Data: ' + tdErr + '. ') : '') +
            'Ücretsiz proxy meşgul olabilir — 12 sn sonra otomatik denenecek. Güvenilir veri için sol menüden ücretsiz Twelve Data anahtarı gir.');
        setTimeout(() => { if (pair === reqPair && !isHistLoaded) loadHist(); }, 12000);
        return;
    }

    candles = [...new Map(data.map(c => [c.time, c])).values()].sort((a, b) => a.time - b.time);
    dailyOpen = computeDailyOpen(candles);
    cp = candles[candles.length - 1].close;
    updatePrecision(cp);
    updPrice({ close: cp });

    cS.setData(candles);
    cSt(true, 'ONLINE');
    document.getElementById('dataSource').innerText = (src === 'TD')
        ? 'KAYNAK: TWELVE DATA (canlı)'
        : 'KAYNAK: YAHOO (BIST ~15dk gecikmeli)';
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
    liveTimer = setInterval(pollLive, 18000); // düşük hacim: 18 sn
}

async function pollLive() {
    if (!isHistLoaded || document.hidden) return;
    const reqPair = pair;
    let recent = null;

    if (getTDKey()) {
        const td = await fetchTD(pair, tf, 3);
        if (td && td.candles && td.candles.length) recent = td.candles;
    }
    if (!recent) { // TD yoksa/başarısızsa Yahoo (tek proxy)
        const { interval } = tfToYahoo(tf);
        const r = await fetchYahooLight(pair, interval, '1d');
        if (r) recent = parseYahoo(r);
    }

    if (pair !== reqPair || !recent || !recent.length || !candles.length) return;
    lastWsMsgTime = Date.now();

    let changed = false;
    recent.forEach(rc => {
        const last = candles[candles.length - 1];
        if (rc.time > last.time) { candles.push(rc); cS.update(rc); changed = true; }
        else if (rc.time === last.time) { Object.assign(last, rc); cS.update(last); changed = true; }
    });
    if (changed) {
        cp = candles[candles.length - 1].close;
        updPrice({ close: cp });
        updPnl();
        calcInd();
    }

    const lt = document.getElementById('liveTick');
    if (lt) { lt.style.display = 'block'; lt.innerText = 'CANLI: ₺' + cp.toFixed(currentPrecision); }
}
