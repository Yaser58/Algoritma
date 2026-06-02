/* ============================================================
   algorithm.js : QP TRADING strateji motoru
   ------------------------------------------------------------
   Desen (yukarıdan aşağıya zaman sırası):
     A  = Dik düşüşün tepesi (swing high)
     B  = Dik düşüşün dibi   (swing low)  -> A→B "dik düşüş"
     Fibo, A (tepe) ile B (dip) arasına çekilir.
     Q  = İlk yükselişin tepesi; fibonun 0.618–0.786 bölgesine TEMAS eder, A'yı geçmez.
     W1 = Q sonrası geri çekiliş dibi; B'nin ALTINA inmez (daha yüksek dip).
     P  = İkinci yükselişin tepesi; Q'yu GEÇMEZ (P < Q).
     W2 = P sonrası geri çekiliş dibi; W1'in ALTINA inmez (W2 > W1).
     SİNYAL = Fiyat P seviyesini yukarı kırınca (close > P) -> AL.
   ------------------------------------------------------------
   Çekirdek tespit `findQP(arr,...)` saf fonksiyondur (DOM/grafik yok),
   böylece hem aktif grafikte hem de tüm BIST taramasında kullanılır.
   ============================================================ */

// Fibonacci seviyeleri (chart.js'teki fibSeries sırası ile birebir aynı olmalı)
const QP_FIB_LEVELS = [1.0, 0.786, 0.618, 0.5, 0.382, 0];

// --- Salınım (swing) yardımcıları (verilen mum dizisi üzerinde çalışır) ---
function _isSwingHigh(arr, index, lookback) {
    if (index < lookback || index > arr.length - lookback - 1) return false;
    const h = arr[index].high;
    for (let i = 1; i <= lookback; i++) {
        if (arr[index - i].high >= h || arr[index + i].high > h) return false;
    }
    return true;
}

function _isSwingLow(arr, index, lookback) {
    if (index < lookback || index > arr.length - lookback - 1) return false;
    const l = arr[index].low;
    for (let i = 1; i <= lookback; i++) {
        if (arr[index - i].low <= l || arr[index + i].low < l) return false;
    }
    return true;
}

// Mum dizisinden alternatif (H/L/H/L...) zigzag tepe-dip dizisi üretir
function _getZigzag(arr, lookback) {
    const piv = [];
    for (let i = lookback; i < arr.length - lookback; i++) {
        if (_isSwingHigh(arr, i, lookback)) piv.push({ i, type: 'H', price: arr[i].high, time: arr[i].time });
        else if (_isSwingLow(arr, i, lookback)) piv.push({ i, type: 'L', price: arr[i].low, time: arr[i].time });
    }
    // Aynı tipte arka arkaya gelenlerde en uç (en yüksek H / en düşük L) noktayı tut
    const zz = [];
    for (const p of piv) {
        if (!zz.length) { zz.push(p); continue; }
        const last = zz[zz.length - 1];
        if (p.type === last.type) {
            if ((p.type === 'H' && p.price >= last.price) || (p.type === 'L' && p.price <= last.price)) zz[zz.length - 1] = p;
        } else {
            zz.push(p);
        }
    }
    return zz;
}

/**
 * SAF QP TESPİTİ — herhangi bir mum dizisinde deseni arar (yan etki yok).
 * @returns {{ latest: object|null, signals: Array }}
 *   latest: en güncel geçerli iskelet { A,B,Q,W1,P,W2, pLevel, sigIdx, sl, tp }
 *   signals: kırılımı gerçekleşmiş desenler [{ index, type, sl, tp }]
 */
function findQP(arr, minDrop, tol, lb) {
    const out = { latest: null, signals: [] };
    const n = arr ? arr.length : 0;
    if (n < 50) return out;

    const W = 80;                       // her bacak için arama penceresi (bar)
    const il = Math.max(2, lb - 1);     // iç pivotlar (Q,W1,P,W2) için biraz daha hassas
    const mk = (i, isHigh) => ({ i, price: isHigh ? arr[i].high : arr[i].low, time: arr[i].time });
    const seen = new Set();
    let bestRef = -1;

    // Her belirgin tepe A için pencereli arama (ardışık pivot zorunluluğu yok -> gürültüye dayanıklı)
    for (let a = lb; a < n - 5; a++) {
        if (!_isSwingHigh(arr, a, lb)) continue;
        const Ap = arr[a].high;

        // B = A sonrası penceredeki en düşük dip (A tekrar aşılırsa düşüş iptal -> dur)
        let bI = -1, bLow = Infinity;
        for (let j = a + 1; j < Math.min(a + W, n); j++) {
            if (arr[j].high > Ap) break;
            if (arr[j].low < bLow) { bLow = arr[j].low; bI = j; }
        }
        if (bI === -1) continue;

        // 1) DİK DÜŞÜŞ: A→B yeterince sert mi?
        const range = Ap - bLow;
        if (range <= 0 || (range / Ap) < minDrop) continue;

        const f618 = bLow + range * 0.618, f786 = bLow + range * 0.786, band = range * tol;

        // 2) Q = B sonrası 0.618–0.786 bölgesine TEMAS eden ilk tepe (A altında), yeni dip olmadan
        let qI = -1;
        for (let j = bI + 1; j < Math.min(bI + W, n); j++) {
            if (arr[j].low < bLow) break; // yeni dip -> bu A için geçersiz
            if (arr[j].high >= f618 - band && arr[j].high <= f786 + band && arr[j].high < Ap && _isSwingHigh(arr, j, il)) { qI = j; break; }
        }
        if (qI === -1) continue;
        const Qp = arr[qI].high;

        // 3) W1 = Q sonrası ilk dip; B'nin ALTINA inmemeli (daha yüksek dip)
        let w1I = -1, w1Low = Infinity;
        for (let j = qI + 1; j < Math.min(qI + W, n); j++) {
            if (arr[j].high >= Qp) break; // Q aşıldı -> farklı yapı
            if (arr[j].low < w1Low) { w1Low = arr[j].low; w1I = j; }
            if (_isSwingLow(arr, j, il) && arr[j].low > bLow) { w1I = j; w1Low = arr[j].low; break; }
        }
        if (w1I === -1 || w1Low <= bLow) continue;

        // 4) P = W1 sonrası tepe; Q'yu GEÇMEZ (P<Q) ve W1'in üzerinde
        let pI = -1;
        for (let j = w1I + 1; j < Math.min(w1I + W, n); j++) {
            if (arr[j].low < w1Low) break;   // W1 kırıldı
            if (arr[j].high >= Qp) break;    // Q'yu geçti -> P değil
            if (_isSwingHigh(arr, j, il) && arr[j].high < Qp && arr[j].high > w1Low) { pI = j; break; }
        }
        if (pI === -1) continue;
        const Pp = arr[pI].high;

        // 5) W2 = P sonrası dip; W1'in ALTINA inmemeli (W2 > W1)
        let w2I = -1, w2Low = Infinity, broke = false;
        for (let j = pI + 1; j < Math.min(pI + W, n); j++) {
            if (arr[j].close > Pp) break; // W2 oluşmadan kırılım
            if (arr[j].low < w2Low) { w2Low = arr[j].low; w2I = j; }
            if (_isSwingLow(arr, j, il)) { if (arr[j].low <= w1Low) broke = true; w2I = j; w2Low = arr[j].low; break; }
        }
        if (w2I === -1 || broke || w2Low <= w1Low) continue;

        // 6) SİNYAL: W2 sonrası fiyat P'yi yukarı kırınca (close > P, W1 kırılmadan)
        let sigIdx = -1;
        for (let j = w2I + 1; j < n; j++) {
            if (arr[j].low < w1Low) break;
            if (arr[j].close > Pp) { sigIdx = j; break; }
        }

        const pat = {
            A: mk(a, true), B: mk(bI, false), Q: mk(qI, true),
            W1: mk(w1I, false), P: mk(pI, true), W2: mk(w2I, false),
            pLevel: Pp, sigIdx, sl: w1Low, tp: Ap
        };
        const ref = sigIdx !== -1 ? sigIdx : w2I;
        if (ref > bestRef) { bestRef = ref; out.latest = pat; } // en güncel desen
        if (sigIdx !== -1 && !seen.has(sigIdx)) {
            seen.add(sigIdx);
            out.signals.push({ index: sigIdx, type: 'BUY', sl: pat.sl, tp: pat.tp });
        }
    }
    return out;
}

function clearFib() {
    if (typeof fibSeries !== 'undefined') fibSeries.forEach(s => s.setData([]));
}

// Geçerli desenin A-B aralığı için fibonacci seviyelerini çizer (aktif grafik)
function drawFib(p) {
    const range = p.A.price - p.B.price;
    const startI = p.A.i;
    const refI = (p.sigIdx !== -1 ? p.sigIdx : p.W2.i);
    const endI = Math.min(refI + 30, candles.length);
    QP_FIB_LEVELS.forEach((lvl, idx) => {
        if (!fibSeries[idx]) return;
        const val = p.B.price + range * lvl;
        const data = [];
        for (let k = startI; k < endI; k++) data.push({ time: candles[k].time, value: val });
        fibSeries[idx].setData(data);
    });
    for (let idx = QP_FIB_LEVELS.length; idx < fibSeries.length; idx++) fibSeries[idx].setData([]);
}

// Desenin tepe/dip noktalarını grafikte etiketler
function labelPattern(markers, p) {
    const add = (piv, text, color, pos) => markers.push({
        time: piv.time, position: pos, color, shape: 'circle', text, size: 1
    });
    add(p.A, 'A', '#ff5252', 'aboveBar');
    add(p.B, 'B', '#9e9e9e', 'belowBar');
    add(p.Q, 'Q', '#ffca28', 'aboveBar');
    add(p.W1, 'W1', '#29b6f6', 'belowBar');
    add(p.P, 'P', '#ffca28', 'aboveBar');
    add(p.W2, 'W2', '#29b6f6', 'belowBar');
}

// Aktif grafik için QP tespiti: ayarları DOM'dan okur, fibo+etiket çizer
function detectQP() {
    const enabled = document.getElementById('qpE')?.checked;
    if (!enabled || candles.length < 60) { clearFib(); return { markers: [], signals: [] }; }

    const minDrop = (+document.getElementById('qpDrop').value || 2) / 100;
    const tol = (+document.getElementById('qpTol').value || 3) / 100;
    const lb = Math.min(8, Math.max(2, +document.getElementById('qpSwing').value || 3));

    const res = findQP(candles, minDrop, tol, lb);

    const markers = [];
    if (res.latest) {
        drawFib(res.latest);
        labelPattern(markers, res.latest);
    } else {
        clearFib();
    }
    return { markers, signals: res.signals };
}

function calcInd() {
    if (candles.length < 60) return;
    try {
        const h = +document.getElementById('kH').value;
        const a = +document.getElementById('kA').value;
        const r1Len = +document.getElementById('rs1').value;
        const r2Len = +document.getElementById('rs2').value;

        const closes = candles.map(c => c.close);

        // Destekleyici görseller: Kernel regresyon eğrisi + iki RSI
        const kernel = kReg(closes, h, a);
        const rsiBlue = calcRSI(closes, r2Len);
        const rsiWhite = calcRSI(closes, r1Len);

        const kPoints = [], r1Points = [], r2Points = [];
        for (let i = 0; i < candles.length; i++) {
            const t = candles[i].time;
            if (kernel[i]) {
                const color = (i > 0 && kernel[i] > kernel[i - 1]) ? '#ffffff' : '#3153ff';
                kPoints.push({ time: t, value: kernel[i], color });
            }
            if (rsiWhite[i] !== null) r1Points.push({ time: t, value: rsiWhite[i] });
            if (rsiBlue[i] !== null) r2Points.push({ time: t, value: rsiBlue[i] });
        }
        kernelSeries.setData(kPoints);
        r1S.setData(r1Points);
        r2S.setData(r2Points);

        // --- QP TRADING SİNYALLERİ ---
        const qp = detectQP();
        const pivotMarkers = qp.markers;     // A,B,Q,W1,P,W2 etiketleri
        const sigMarkers = [];               // AL sinyalleri (sl/tp taşır)
        const newLogs = [];

        qp.signals.forEach(s => {
            const c = candles[s.index];
            const isLive = (s.index === candles.length - 1);
            sigMarkers.push({
                time: c.time,
                position: 'belowBar',
                color: isLive ? 'rgba(0,255,65,0.55)' : '#00ff41',
                shape: 'arrowUp',
                text: 'QP AL' + (isLive ? '?' : ''),
                size: 2,
                sl: s.sl,
                tp: s.tp,
                side: 'BUY'
            });

            if (s.index >= candles.length - 120) {
                const timeStr = new Date(c.time * 1000).toLocaleTimeString('tr-TR');
                const label = isLive ? 'QP TRADING (KIRILIM BEKLENİYOR)' : 'QP TRADING';
                newLogs.unshift(`<div class="log-row" style="color:#00ff41;border-left:3px solid #00ff41;padding-left:10px;${isLive ? 'opacity:0.7;font-style:italic' : ''}">
                    <span>[${timeStr}]</span>
                    <span style="font-weight:bold">${label}</span>
                    <span>AL</span>
                    <span style="font-size:0.8em;opacity:0.8">TP: ₺${s.tp.toFixed(currentPrecision)} | SL: ₺${s.sl.toFixed(currentPrecision)}</span>
                    <span>₺${c.close.toFixed(currentPrecision)}</span>
                </div>`);

                // Canlı sinyalde sadece bir kez sesli uyarı ver
                if (isLive && window.__lastQPSig !== c.time) {
                    window.__lastQPSig = c.time;
                    playAlert();
                    sLog('🔔 QP AL SİNYALİ: ' + pair + ' @ ₺' + c.close.toFixed(currentPrecision));
                }
            }
        });

        // Etiket + sinyal işaretlerini zamana göre sırala
        const allMarkers = [...pivotMarkers, ...sigMarkers].sort((x, y) => x.time - y.time);
        cS.setMarkers(allMarkers);

        // --- SL/TP KUTULARI (yalnızca AL sinyalleri için) ---
        try {
            const profitBoxData = [];
            const lossBoxData = [];

            sigMarkers.forEach((m, idx) => {
                const startIdx = candles.findIndex(c => c.time === m.time);
                if (startIdx === -1) return;

                const entry = candles[startIdx].close;
                let limitIdx = candles.length - 1;
                const next = sigMarkers[idx + 1];
                if (next) {
                    const nIdx = candles.findIndex(c => c.time === next.time);
                    if (nIdx !== -1) limitIdx = nIdx - 1;
                }

                let endIdx = startIdx;
                for (let k = startIdx + 1; k <= limitIdx; k++) {
                    const ck = candles[k];
                    endIdx = k;
                    if (ck.low <= m.sl || ck.high >= m.tp) break; // SL veya TP'ye değdi
                }

                for (let k = startIdx; k <= endIdx; k++) {
                    const t = candles[k].time;
                    if (isNaN(t) || isNaN(m.tp) || isNaN(m.sl) || isNaN(entry)) continue;
                    profitBoxData.push({ time: t, open: m.tp, close: entry, high: Math.max(m.tp, entry), low: Math.min(m.tp, entry) });
                    lossBoxData.push({ time: t, open: m.sl, close: entry, high: Math.max(m.sl, entry), low: Math.min(m.sl, entry) });
                }
            });

            const dedupe = (data) => {
                const seen = new Set();
                return data.filter(d => (seen.has(d.time) ? false : (seen.add(d.time), true))).sort((a, b) => a.time - b.time);
            };
            if (profitBoxSeries) profitBoxSeries.setData(dedupe(profitBoxData));
            if (lossBoxSeries) lossBoxSeries.setData(dedupe(lossBoxData));
        } catch (err) {
            console.error("Kutu çizim hatası:", err);
        }

        const logEl = document.getElementById('lL');
        if (logEl) logEl.innerHTML = newLogs.slice(0, 50).join('');

    } catch (e) {
        console.error("QP Trading hatası:", e);
    }
}
