let markers = [];
let lastSignalTime = 0;

/**
 * QUANT-V1 STRATEGY
 * Araştırma sonuçlarına dayalı; Volatilite Zarfı ve Trend Rejimi odaklı strateji.
 */
function calcInd() {
    if (candles.length < 50) return;
    try {
        const h = +document.getElementById('kH').value;
        const a = +document.getElementById('kA').value;
        const r1Len = +document.getElementById('rs1').value;
        const r2Len = +document.getElementById('rs2').value;

        const closes = candles.map(c => c.close);
        const kernel = kReg(closes, h, a);
        const rsiWhite = calcRSI(closes, r1Len);
        const rsiBlue = calcRSI(closes, r2Len);
        const atr = calcATR(candles, 20); 
        const emaRegime = calcEMA(closes, 200); // 200 EMA Ana Trend Rejimi

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

        const alg1 = document.getElementById('alg1E').checked;

        if (alg1) {
            for (let j = 20; j < candles.length; j++) {
                const c = candles[j];
                const p = candles[j-1];
                const kVal = kernel[j];
                const currentAtr = atr[j] || 0;
                const currentEma = emaRegime[j];
                
                // 1. REJİM FİLTRESİ (Trend Yönü)
                const isBull = currentEma && c.close > currentEma;
                const isBear = currentEma && c.close < currentEma;

                // 2. VOLATİLİTE ZARFI (Z-Score Mantığı)
                // Fiyatın Kernel'den ne kadar saptığını ölçer (1.5 ATR katsayısı)
                const upperEnv = kVal + (currentAtr * 1.5);
                const lowerEnv = kVal - (currentAtr * 1.5);

                // 3. MOMENTUM ONAYI
                const rsiOkBuy = rsiBlue[j] > rsiWhite[j] && rsiBlue[j] > 50;
                const rsiOkSell = rsiBlue[j] < rsiWhite[j] && rsiBlue[j] < 50;

                let rawSig = null;

                // ALIM: Trend Boğa + Fiyat Zarfın Üstünde + RSI Güçlü
                if (isBull && c.close > upperEnv && p.close <= (kernel[j-1] + atr[j-1]*1.5) && rsiOkBuy) {
                    rawSig = 'BUY';
                }
                // SATIM: Trend Ayı + Fiyat Zarfın Altında + RSI Zayıf
                else if (isBear && c.close < lowerEnv && p.close >= (kernel[j-1] - atr[j-1]*1.5) && rsiOkSell) {
                    rawSig = 'SELL';
                }

                if (rawSig && rawSig !== lastSigType && (j - lastSigIndex) >= 10) {
                    lastSigType = rawSig;
                    lastSigIndex = j;
                    
                    const color = rawSig === 'BUY' ? '#00ff41' : '#ff3131';
                    newMarkers.push({
                        time: c.time,
                        position: rawSig === 'BUY' ? 'belowBar' : 'aboveBar',
                        color: color,
                        shape: rawSig === 'BUY' ? 'arrowUp' : 'arrowDown',
                        text: rawSig === 'BUY' ? 'AL' : 'SAT',
                        size: 3 
                    });
                    
                    if (j >= candles.length - 50) {
                        const timeStr = new Date(c.time * 1000).toLocaleTimeString('tr-TR');
                        newLogs.unshift(`<div class="log-row" style="color:${color}">
                            <span>[${timeStr}]</span>
                            <span style="font-weight:bold">QUANT-V1</span>
                            <span>${rawSig === 'BUY' ? 'LONG' : 'SHORT'}</span>
                            <span>$${c.close.toFixed(currentPrecision)}</span>
                        </div>`);
                    }
                }
            }
        }

        cS.setMarkers(newMarkers);
        const logEl = document.getElementById('lL');
        if (logEl) logEl.innerHTML = newLogs.slice(0, 50).join('');

    } catch(e) { console.error("Quant Algorithm Error:", e); }
}
