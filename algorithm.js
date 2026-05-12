let markers = [];
let lastSignalTime = 0;

/**
 * ICT INNER CIRCLE TRADING ENGINE - V5
 * Research Based: Liquidity Sweeps, Market Structure Shift (MSS), Fair Value Gaps (FVG)
 */

// --- ICT HELPER FUNCTIONS ---

function isSwingHigh(index, lookback = 2) {
    if (index < lookback || index > candles.length - lookback - 1) return false;
    const h = candles[index].high;
    for (let i = 1; i <= lookback; i++) {
        if (candles[index - i].high >= h || candles[index + i].high > h) return false;
    }
    return true;
}

function isSwingLow(index, lookback = 2) {
    if (index < lookback || index > candles.length - lookback - 1) return false;
    const l = candles[index].low;
    for (let i = 1; i <= lookback; i++) {
        if (candles[index - i].low <= l || candles[index + i].low < l) return false;
    }
    return true;
}

function detectSQP() {
    const sqpEnabled = document.getElementById('sqpE').checked;
    if (!sqpEnabled || candles.length < 50) {
        if (typeof fibSeries !== 'undefined') fibSeries.forEach(s => s.setData([]));
        return { markers: [], patterns: [] }; 
    }

    let sqpMarkers = [];
    let foundPatterns = [];
    let lastValidPattern = null;

    const levels = [2.618, 2.0, 1.618, 1.382, 1.272, 0.886, 0.786, 0.618, 0.5, 0.382];

    for (let i = 20; i < candles.length - 1; i++) {
        if (isSwingHigh(i, 3)) {
            let sIdx = i;
            let sPrice = candles[sIdx].high;
            
            let lowestInWindow = Infinity;
            for(let k=sIdx-1; k>Math.max(0, sIdx-15); k--) {
                if(candles[k].low < lowestInWindow) lowestInWindow = candles[k].low;
            }
            if (sPrice < lowestInWindow * 1.008) continue; 

            let bottomIdx = -1;
            let bottomPrice = Infinity;
            for (let j = sIdx + 1; j < Math.min(sIdx + 30, candles.length); j++) {
                if (candles[j].low < bottomPrice) {
                    bottomPrice = candles[j].low;
                    bottomIdx = j;
                }
            }
            if (bottomIdx === -1 || bottomPrice > sPrice * 0.992) continue;

            let range = sPrice - bottomPrice;
            let qZoneLow = bottomPrice + range * 0.618;
            let qZoneHigh = bottomPrice + range * 0.786;

            let qIdx = -1;
            for (let j = bottomIdx + 1; j < Math.min(bottomIdx + 40, candles.length); j++) {
                if (candles[j].high >= qZoneLow && candles[j].high <= qZoneHigh * 1.02) {
                    qIdx = j;
                    break;
                }
            }
            if (qIdx === -1) continue;

            let pIdx = -1;
            let postQLow = Infinity;
            for (let j = qIdx + 6; j < Math.min(qIdx + 50, candles.length); j++) {
                if (candles[j].low < postQLow) postQLow = candles[j].low;
                if (postQLow < bottomPrice * 0.999) break;

                if (candles[j].high >= qZoneLow && candles[j].high <= qZoneHigh * 1.05) {
                    pIdx = j;
                    break;
                }
            }

            if (pIdx !== -1) {
                // Etiketleri ekle (Sadece son 500 mum içindeyse)
                if (sIdx > candles.length - 500) {
                    sqpMarkers.push({ time: candles[sIdx].time, position: 'aboveBar', color: '#ffffff', shape: 'arrowDown', text: 'S', size: 2 });
                    sqpMarkers.push({ time: candles[qIdx].time, position: 'aboveBar', color: '#ffcc00', shape: 'arrowDown', text: 'Q', size: 2 });
                    sqpMarkers.push({ time: candles[pIdx].time, position: 'aboveBar', color: '#ffcc00', shape: 'arrowDown', text: 'P', size: 2 });
                }
                lastValidPattern = { sIdx, range, bottomPrice, pIdx };
            }
        }
    }
    
    // Sinyal ve Fibo Çizimi: Sadece en son geçerli desen için
    if (lastValidPattern) {
        // Fibo Çizimi (S'den P+50'ye kadar düz çizgiler)
        let endK = Math.min(lastValidPattern.pIdx + 50, candles.length);
        levels.forEach((lvl, idx) => {
            let pVal = lastValidPattern.bottomPrice + lastValidPattern.range * lvl;
            let lineData = [];
            for(let k = lastValidPattern.sIdx; k < endK; k++) {
                lineData.push({ time: candles[k].time, value: pVal });
            }
            if (fibSeries && fibSeries[idx]) fibSeries[idx].setData(lineData);
        });

        // Sinyal Üretimi
        const lastCandle = candles[candles.length - 1];
        const prevCandle = candles[candles.length - 2];
        const pLevel = candles[lastValidPattern.pIdx].high;
        if (lastCandle.close > pLevel && prevCandle.close <= pLevel) {
            foundPatterns.push({ index: candles.length - 1, type: 'BUY', sl: lastValidPattern.bottomPrice, tp: lastValidPattern.bottomPrice + lastValidPattern.range * 1.618 });
        }
    } else {
        if (typeof fibSeries !== 'undefined') fibSeries.forEach(s => s.setData([]));
    }

    return { markers: sqpMarkers, patterns: foundPatterns };
}

function getFVG(index) {
    if (index < 2) return null;
    const c1 = candles[index - 2];
    const c2 = candles[index - 1];
    const c3 = candles[index];

    // Bullish FVG (Gap between C1 High and C3 Low)
    if (c3.low > c1.high) {
        return { type: 'BULLISH', top: c3.low, bottom: c1.high };
    }
    // Bearish FVG (Gap between C1 Low and C3 High)
    if (c3.high < c1.low) {
        return { type: 'BEARISH', top: c1.low, bottom: c3.high };
    }
    return null;
}

function calcInd() {
    if (candles.length < 100) return;
    try {
        const h = +document.getElementById('kH').value;
        const a = +document.getElementById('kA').value;
        const r1Len = +document.getElementById('rs1').value;
        const r2Len = +document.getElementById('rs2').value;

        const closes = candles.map(c => c.close);
        
        // Mantained Indicators for Visuals
        const kernel = kReg(closes, h, a);
        const rsiBlue = calcRSI(closes, r2Len);
        const rsiWhite = calcRSI(closes, r1Len);
        const ema200 = calcEMA(closes, 200);
        
        // --- SIDEWAYS FILTERS (Internal) ---
        const chop = calcChopIndex(candles, 14);
        const adx = calcADX(candles, 14);
        const atr = calcATR(candles, 20);
        const atrSMA = calcEMA(atr.map(v => v === null ? 0 : v), 50);

        // Update Chart Data (Visuals must stay same)
        const kPoints = [], r1Points = [], r2Points = [];
        for (let i = 0; i < candles.length; i++) {
            const t = candles[i].time;
            if (kernel[i]) {
                const color = (i > 0 && kernel[i] > kernel[i-1]) ? '#ffffff' : '#3153ff';
                kPoints.push({ time: t, value: kernel[i], color });
            }
            if (rsiWhite[i] !== null) r1Points.push({ time: t, value: rsiWhite[i] });
            if (rsiBlue[i] !== null) r2Points.push({ time: t, value: rsiBlue[i] });
        }
        kernelSeries.setData(kPoints);
        r1S.setData(r1Points);
        r2S.setData(r2Points);

        let newMarkers = [];
        let newLogs = [];
        let lastSigType = null; 
        let lastSigIndex = -10; 

        const alg1Enabled = document.getElementById('alg1E').checked;
        const alg2Enabled = document.getElementById('alg2E').checked;
        const sqpData = detectSQP();

        // ICT State Tracking (Global değişkenler kullanılmaktadır)
        let sweepLowIndex = -1;
        let sweepHighIndex = -1;

        for (let j = 50; j < candles.length; j++) {
            const c = candles[j];
            
            // --- RANGE / SIDEWAYS DETECTION ---
            const isChoppy = chop[j] > 60; // 61.8 is standard, 60 is more conservative
            const isWeakTrend = adx[j] < 20; 
            const isLowVol = atr[j] < (atrSMA[j] * 0.8); // ATR must be at least 80% of its average
            
            const isSideways = isChoppy || isWeakTrend || isLowVol;

            // Track Swing Points for Liquidity Levels (lookback 3 for stability)
            if (isSwingHigh(j - 3, 3)) lastSwingHigh = candles[j - 3].high;
            if (isSwingLow(j - 3, 3)) lastSwingLow = candles[j - 3].low;

            let rawSig = null;
            let algName = "";

            // --- ICT ALGORITHM: BREAD & BUTTER (MSS + FVG) ---
            if (alg2Enabled && !isSideways) {
                // 1. Check for Liquidity Sweeps (Price takes recent swing)
                if (lastSwingLow !== 0 && c.low < lastSwingLow) sweepLowIndex = j;
                if (lastSwingHigh !== 0 && c.high > lastSwingHigh) sweepHighIndex = j;

                // 2. Look for Market Structure Shift (MSS) after Sweep
                // Sweep must have happened within the last 20 candles
                const validSweepLow = sweepLowIndex !== -1 && (j - sweepLowIndex) < 20;
                const validSweepHigh = sweepHighIndex !== -1 && (j - sweepHighIndex) < 20;

                // Bullish MSS: Price breaks previous swing high after taking low liquidity
                const bullishMSS = validSweepLow && c.close > lastSwingHigh && lastSwingHigh !== 0;
                // Bearish MSS: Price breaks previous swing low after taking high liquidity
                const bearishMSS = validSweepHigh && c.close < lastSwingLow && lastSwingLow !== 0;

                // 3. FVG Confirmation (Displacement)
                const fvg = getFVG(j);

                if (bullishMSS && fvg && fvg.type === 'BULLISH') {
                    rawSig = 'BUY'; algName = 'ICT-2022';
                    sweepLowIndex = -1; // Reset
                } else if (bearishMSS && fvg && fvg.type === 'BEARISH') {
                    rawSig = 'SELL'; algName = 'ICT-2022';
                    sweepHighIndex = -1; // Reset
                }
            }

            // --- ICT SCALP: FVG + TREND ALIGNMENT ---
            if (alg1Enabled && !rawSig && !isSideways) {
                const fvg = getFVG(j);
                const trendUp = ema200[j] && c.close > ema200[j];
                const trendDown = ema200[j] && c.close < ema200[j];

                // FVG must be fresh (created in last 3 candles)
                if (fvg && fvg.type === 'BULLISH' && trendUp && kernel[j] > kernel[j-1]) {
                    rawSig = 'BUY'; algName = 'ICT-SCALP';
                } else if (fvg && fvg.type === 'BEARISH' && trendDown && kernel[j] < kernel[j-1]) {
                    rawSig = 'SELL'; algName = 'ICT-SCALP';
                }
            }

            // SIGNAL EXECUTION
            if (rawSig && rawSig !== lastSigType && (j - lastSigIndex) >= 20) {
                lastSigType = rawSig;
                lastSigIndex = j;
                const isBuy = rawSig === 'BUY';
                const color = isBuy ? '#00ff41' : '#ff0000';
                
                // ICT DINAMIK SL/TP: Son Swing noktası baz alınır
                let sl = isBuy ? lastSwingLow : lastSwingHigh;
                // Eğer swing noktası çok uzaksa veya yoksa %0.5 fallback kullan
                if (!sl || Math.abs(c.close - sl) / c.close > 0.015) {
                    sl = isBuy ? c.close * 0.995 : c.close * 1.005;
                }
                const risk = Math.abs(c.close - sl);
                const tp = isBuy ? c.close + risk * 2 : c.close - risk * 2;

                const isLive = (j === candles.length - 1);
                const markerText = (isBuy ? 'LONG' : 'SHORT') + (isLive ? '?' : '');
                const markerColor = isLive ? (isBuy ? 'rgba(0, 255, 65, 0.5)' : 'rgba(255, 0, 0, 0.5)') : color;

                newMarkers.push({
                    time: c.time,
                    position: isBuy ? 'belowBar' : 'aboveBar',
                    color: markerColor,
                    shape: isBuy ? 'arrowUp' : 'arrowDown',
                    text: markerText,
                    size: 2,
                    sl: sl,
                    tp: tp,
                    side: rawSig
                });
                
                if (j >= candles.length - 50) {
                    const timeStr = new Date(c.time * 1000).toLocaleTimeString('tr-TR');
                    const logLabel = isLive ? 'YENİ SİNYAL (BEKLENİYOR)' : algName;
                    newLogs.unshift(`<div class="log-row" style="color:${color}; border-left: 3px solid ${color}; padding-left:10px; ${isLive ? 'opacity:0.6; font-style:italic' : ''}">
                        <span>[${timeStr}]</span>
                        <span style="font-weight:bold">${logLabel}</span>
                        <span>${isBuy ? 'LONG' : 'SHORT'}</span>
                        <span style="font-size:0.8em; opacity:0.8">TP: ${tp.toFixed(2)} | SL: ${sl.toFixed(2)}</span>
                        <span>$${c.close.toFixed(currentPrecision)}</span>
                    </div>`);
                }
            }
        }

        // Add SQP Markers and Signals
        newMarkers = [...newMarkers, ...sqpData.markers];
        
        sqpData.patterns.forEach(p => {
            const c = candles[p.index];
            const isLive = (p.index === candles.length - 1);
            newMarkers.push({
                time: c.time,
                position: 'belowBar',
                color: '#00ff41',
                shape: 'arrowUp',
                text: 'SQP LONG' + (isLive ? '?' : ''),
                size: 2,
                sl: p.sl,
                tp: p.tp,
                side: 'BUY'
            });
            
            const timeStr = new Date(c.time * 1000).toLocaleTimeString('tr-TR');
            newLogs.unshift(`<div class="log-row" style="color:#00ff41; border-left: 3px solid #00ff41; padding-left:10px;">
                <span>[${timeStr}]</span>
                <span style="font-weight:bold">S-Q-P STRATEJİSİ</span>
                <span>LONG</span>
                <span style="font-size:0.8em; opacity:0.8">TP: ${p.tp.toFixed(2)} | SL: ${p.sl.toFixed(2)}</span>
                <span>$${c.close.toFixed(currentPrecision)}</span>
            </div>`);
        });

        cS.setMarkers(newMarkers);
        
        // --- SL/TP KUTULARI ÇİZİMİ ---
        try {
            const profitBoxData = [];
            const lossBoxData = [];
            
            newMarkers.forEach((m, idx) => {
                const startIdx = candles.findIndex(c => c.time === m.time);
                if (startIdx === -1) return;
                
                const entry = candles[startIdx].close;
                let endIdx = candles.length - 1;
                
                const nextMarker = newMarkers[idx + 1];
                let limitIdx = candles.length - 1;
                if (nextMarker) {
                    const nIdx = candles.findIndex(c => c.time === nextMarker.time);
                    if (nIdx !== -1) limitIdx = nIdx - 1;
                }
                
                for (let k = startIdx + 1; k <= limitIdx; k++) {
                    const ck = candles[k];
                    if (m.side === 'BUY') {
                        if (ck.low <= m.sl || ck.high >= m.tp) { endIdx = k; break; }
                    } else {
                        if (ck.high >= m.sl || ck.low <= m.tp) { endIdx = k; break; }
                    }
                    endIdx = k;
                }
                
                if (endIdx > limitIdx) endIdx = limitIdx;

                for (let k = startIdx; k <= endIdx; k++) {
                    const t = candles[k].time;
                    const tpPrice = m.tp;
                    const slPrice = m.sl;
                    const entryPrice = entry;
                    if (isNaN(t) || isNaN(tpPrice) || isNaN(slPrice) || isNaN(entryPrice)) continue;

                    profitBoxData.push({
                        time: t, open: tpPrice, close: entryPrice,
                        high: Math.max(tpPrice, entryPrice), low: Math.min(tpPrice, entryPrice)
                    });
                    lossBoxData.push({
                        time: t, open: slPrice, close: entryPrice,
                        high: Math.max(slPrice, entryPrice), low: Math.min(slPrice, entryPrice)
                    });
                }
            });

            const filterData = (data) => {
                const seen = new Set();
                return data.filter(d => {
                    if (seen.has(d.time)) return false;
                    seen.add(d.time);
                    return true;
                }).sort((a,b) => a.time - b.time);
            };
            
            if (profitBoxSeries) profitBoxSeries.setData(filterData(profitBoxData));
            if (lossBoxSeries) lossBoxSeries.setData(filterData(lossBoxData));
            
        } catch (err) {
            console.error("Box Draw Error:", err);
        }

        const logEl = document.getElementById('lL');
        if (logEl) logEl.innerHTML = newLogs.slice(0, 50).join('');

    } catch(e) { console.error("ICT Strategy Error:", e); }
}

