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

        // ICT State Tracking
        let lastSwingHigh = 0;
        let lastSwingLow = 0;
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
            if (rawSig && rawSig !== lastSigType && (j - lastSigIndex) >= 12) {
                lastSigType = rawSig;
                lastSigIndex = j;
                const isBuy = rawSig === 'BUY';
                const color = isBuy ? '#00ff41' : '#ff0000';
                
                // SL %2, TP %4 (ICT 1:2 RR - Daha dengeli görünüm için)
                const sl = isBuy ? c.close * 0.98 : c.close * 1.02;
                const tp = isBuy ? c.close * 1.04 : c.close * 0.96;

                newMarkers.push({
                    time: c.time,
                    position: isBuy ? 'belowBar' : 'aboveBar',
                    color: color,
                    shape: isBuy ? 'arrowUp' : 'arrowDown',
                    text: isBuy ? 'LONG' : 'SHORT',
                    size: 2,
                    sl: sl,
                    tp: tp,
                    side: rawSig
                });
                
                if (j >= candles.length - 50) {
                    const timeStr = new Date(c.time * 1000).toLocaleTimeString('tr-TR');
                    newLogs.unshift(`<div class="log-row" style="color:${color}; border-left: 3px solid ${color}; padding-left:10px">
                        <span>[${timeStr}]</span>
                        <span style="font-weight:bold">${algName}</span>
                        <span>${isBuy ? 'LONG' : 'SHORT'}</span>
                        <span style="font-size:0.8em; opacity:0.8">TP: ${tp.toFixed(2)} | SL: ${sl.toFixed(2)}</span>
                        <span>$${c.close.toFixed(currentPrecision)}</span>
                    </div>`);
                }
            }
        }

        cS.setMarkers(newMarkers);
        
        // --- SL/TP KUTULARI ÇİZİMİ ---
        try {
            const topBoxData = [];
            const bottomBoxData = [];
            
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

                    // Kar Bölgesi (Yeşil)
                    profitBoxData.push({
                        time: t,
                        open: m.tp, close: entry,
                        high: Math.max(m.tp, entry), low: Math.min(m.tp, entry)
                    });
                    
                    // Zarar Bölgesi (Kırmızı)
                    lossBoxData.push({
                        time: t,
                        open: m.sl, close: entry,
                        high: Math.max(m.sl, entry), low: Math.min(m.sl, entry)
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
            
            // Hata tespiti için küçük bir log (sL kısmına)
            if (newMarkers.length > 0) {
                const debugEl = document.getElementById('sL');
                if (debugEl) {
                    const lastIdx = newMarkers.length - 1;
                    const m = newMarkers[lastIdx];
                    debugEl.innerHTML = `<div style="color:var(--green);font-size:0.6rem">KUTU AKTİF: ${newMarkers.length} Sinyal | Veri: ${topBoxData.length}</div>` + debugEl.innerHTML.substring(0, 500);
                }
            }
        } catch (err) {
            console.error("Box Draw Error:", err);
            sLog("KUTU ÇİZİM HATASI: " + err.message);
        }

        const logEl = document.getElementById('lL');
        if (logEl) logEl.innerHTML = newLogs.slice(0, 50).join('');

    } catch(e) { console.error("ICT Strategy Error:", e); }
}

