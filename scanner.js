/* ============================================================
   scanner.js : BIST'te QP deseni tarayıcı
   - Kapsam: likit ~50 hisse (hızlı) veya tüm BIST (~500, yavaş).
   - Her hisse için Yahoo'dan veri çeker, findQP() ile değerlendirir.
   - Eşleşenleri sağ paneldeki listeye ekler (tıklayınca o hisseye geçer).
   - Düşük eşzamanlılık + istek zaman aşımı + hız-sınırı (Too Many Requests)
     algılama: ücretsiz proxy'lerin paylaşımlı IP sınırına saygı duyar.
   ============================================================ */

let qpScanning = false;
let qpThrottled = 0;

// Likit/yüksek hacimli BIST hisseleri — hızlı ve güvenilir tarama için varsayılan kapsam
const BIST_LIQUID = [
    'AKBNK','GARAN','ISCTR','YKBNK','VAKBN','HALKB','SAHOL','KCHOL','THYAO','PGSUS',
    'TUPRS','EREGL','KRDMD','SISE','ASELS','SASA','BIMAS','MGROS','SOKM','FROTO',
    'TOASO','ARCLK','VESTL','TCELL','TTKOM','PETKM','KOZAL','KOZAA','TKFEN','ENKAI',
    'EKGYO','OYAKC','GUBRF','HEKTS','ALARK','ASTOR','TAVHL','ENJSA','AEFES','CCOLA',
    'ULKER','DOAS','BRSAN','TTRAK','ODAS','ISDMR','EUPWR','SMRTG','GWIND','KONTR'
];

// Tarama için hafif veri aralığı (grafik yüklemesinden daha küçük tutulur)
function scanParams() {
    switch (tf) {
        case '1m':  return { interval: '1m',  range: '1d' };
        case '5m':  return { interval: '5m',  range: '5d' };
        case '15m': return { interval: '15m', range: '5d' };
        case '1h':  return { interval: '60m', range: '1mo' };
        default:    return { interval: '5m',  range: '5d' };
    }
}

// Tarama fetch'i: önce hızlı proxy (codetabs), sonra allorigins.
// İstek başına 11 sn zaman aşımı; hız sınırı algılanırsa sayar ve atlar.
async function scanFetch(sym, interval, range) {
    const yq = 'https://query1.finance.yahoo.com/v8/finance/chart/' + sym +
        '.IS?interval=' + interval + '&range=' + range + '&includePrePost=false';
    const tries = [
        'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(yq),
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(yq)
    ];
    for (const u of tries) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 11000);
        try {
            const res = await fetch(u, { cache: 'no-store', signal: ctrl.signal });
            clearTimeout(timer);
            if (!res.ok) continue;
            const txt = await res.text();
            if (txt.indexOf('Too Many Requests') !== -1 || txt.indexOf('Edge:') === 0) { qpThrottled++; continue; }
            const j = JSON.parse(txt);
            const r = j && j.chart && j.chart.result && j.chart.result[0];
            if (r && r.timestamp) return r;
        } catch (e) {
            clearTimeout(timer); /* sıradaki proxy / zaman aşımı */
        }
    }
    return null;
}

// Tarama için mum verisi: TD anahtarı varsa Twelve Data, yoksa Yahoo proxy
async function scanGetCandles(sym, interval, range) {
    if (getTDKey()) {
        const td = await fetchTD(sym, tf, 800);
        return (td && td.candles && td.candles.length) ? td.candles : null;
    }
    const r = await scanFetch(sym, interval, range);
    return r ? parseYahoo(r) : null;
}

// Bir mum dizisinde QP durumunu sınıflandırır: 'AL' | 'YAKLASIYOR' | null
function classifyQP(arr) {
    const minDrop = (+document.getElementById('qpDrop').value || 2) / 100;
    const tol = (+document.getElementById('qpTol').value || 3) / 100;
    const lb = Math.min(8, Math.max(2, +document.getElementById('qpSwing').value || 3));

    const res = findQP(arr, minDrop, tol, lb);
    const pat = res.latest;
    if (!pat) return null;

    const n = arr.length, last = arr[n - 1];
    const refIdx = pat.sigIdx !== -1 ? pat.sigIdx : pat.W2.i;
    const ageBars = n - 1 - refIdx;

    // Kırılım gerçekleşmiş ve taze (son ~6 mum) -> AL
    if (pat.sigIdx !== -1) {
        if (ageBars <= 6) return { type: 'AL', level: pat.pLevel };
        return null; // kırılım çok eski, kaçırılmış
    }

    // Henüz kırılmamış: yapı bozulmamış, fiyat P'nin biraz altında -> YAKLAŞIYOR
    let intact = true;
    for (let j = pat.W2.i + 1; j < n; j++) {
        if (arr[j].low < pat.W1.price) { intact = false; break; }
        if (arr[j].close > pat.pLevel) { intact = false; break; }
    }
    const distPct = (pat.pLevel - last.close) / last.close * 100;
    if (intact && ageBars <= 40 && distPct >= -0.5 && distPct <= 5) {
        return { type: 'YAKLASIYOR', level: pat.pLevel, dist: distPct };
    }
    return null;
}

function setScanStatus(txt) {
    const e = document.getElementById('qpScanStatus');
    if (e) e.textContent = txt;
}

function setScanBtn() {
    const b = document.getElementById('qpScanBtn');
    if (!b) return;
    if (qpScanning) { b.textContent = '■ TARAMAYI DURDUR'; b.classList.add('scanning'); }
    else { b.textContent = '▶ QP TARAMASI BAŞLAT'; b.classList.remove('scanning'); }
}

function addScanResult(sym, info) {
    const box = document.getElementById('qpScanResults');
    if (!box) return;
    const isAl = info.type === 'AL';
    const row = document.createElement('div');
    row.className = 'scan-row' + (isAl ? '' : ' yak');
    const tag = isAl ? '<span class="scan-tag al">AL</span>' : '<span class="scan-tag yak">YAKLAŞIYOR</span>';
    const inf = isAl ? `Kırılım: ₺${info.level.toFixed(2)}` : `P'ye %${info.dist.toFixed(1)}`;
    row.innerHTML = `<span class="scan-sym">${sym}</span>${tag}<span class="scan-info">${inf}</span>`;
    row.title = sym + ' grafiğini aç';
    row.onclick = () => swP(sym);
    // AL sinyallerini listenin başına al
    if (isAl && box.firstChild) box.insertBefore(row, box.firstChild);
    else box.appendChild(row);
}

async function startScan() {
    if (typeof findQP !== 'function') return;
    qpScanning = true;
    qpThrottled = 0;
    setScanBtn();
    document.getElementById('qpScanResults').innerHTML = '';

    const scope = document.getElementById('qpScanScope')?.value || 'liquid';
    let syms;
    if (scope === 'all') {
        const skip = ['XU100', 'XU030', 'XU050', 'XBANK']; // endeksleri atla
        syms = BIST_SYMBOLS.filter(s => !skip.includes(s));
    } else {
        syms = BIST_LIQUID.slice();
    }

    const { interval, range } = scanParams();
    const useTD = !!getTDKey();
    const total = syms.length;
    let i = 0, done = 0, matches = 0;

    async function worker() {
        while (qpScanning && i < syms.length) {
            const sym = syms[i++];
            try {
                const cndls = await scanGetCandles(sym, interval, range);
                if (cndls && cndls.length >= 60) {
                    const m = classifyQP(cndls);
                    if (m) { matches++; addScanResult(sym, m); }
                }
            } catch (e) { /* sembol atlandı */ }
            done++;
            setScanStatus(`Taranıyor: ${done}/${total}  —  ${matches} eşleşme` + (qpThrottled ? `  (${qpThrottled} atlandı)` : ''));
            if (useTD) await new Promise(r => setTimeout(r, 8000)); // TD ücretsiz limit ~8 istek/dk
        }
    }

    // Düşük eşzamanlılık: hız sınırını zorlamamak için (TD'de tek sıra + bekleme)
    const CONC = useTD ? 1 : 2;
    const pool = [];
    for (let w = 0; w < CONC; w++) pool.push(worker());
    await Promise.all(pool);

    const stopped = !qpScanning;
    qpScanning = false;
    setScanBtn();

    if (stopped) {
        setScanStatus(`Durduruldu: ${done} tarandı, ${matches} QP bulundu.`);
    } else if (matches === 0 && qpThrottled > total * 0.5) {
        setScanStatus(`Hız sınırına takıldı (${qpThrottled} atlandı). Biraz bekleyip tekrar deneyin veya likit kapsamı seçin.`);
    } else if (matches === 0) {
        setScanStatus(`Tamamlandı: ${done} tarandı, QP deseni yok. (Ayarları gevşetip deneyin.)`);
    } else {
        setScanStatus(`Tamamlandı: ${done} tarandı, ${matches} QP bulundu` + (qpThrottled ? `, ${qpThrottled} atlandı.` : '.'));
    }
}

function toggleScan() {
    if (qpScanning) {
        qpScanning = false;
        setScanStatus('Durduruluyor...');
    } else {
        startScan();
    }
}
