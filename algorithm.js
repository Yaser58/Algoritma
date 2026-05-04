let markers = [];
let lastSignalTime = 0;

/**
 * ELITE-V6 HYBRID ALGORITHM
 * Araştırma Sonuçlarına Dayalı İleri Seviye Sinyal Motoru
 */
function calcInd() {
    if (candles.length < 100) return; 
    try {
        const h = +document.getElementById('kH').value;
        const a = +document.getElementById('kA').value;
        const r1Len = +document.getElementById('rs1').value;
        const r2Len = +document.getElementById('rs2').value;

        const closes = candles.map(c => c.close);
        
        // --- KATMAN 1: HESAPLAMALAR ---
        const kernel = kReg(closes, h, a);
        const rsiWhite = calcRSI(closes, r1Len);
        const rsiBlue = calcRSI(closes, r2Len);
        const atr = calcATR(candles, 14); 
        const emaLong = calcEMA(closes, 100); 

        // Grafiği Güncelle
        const kPoints = [], r1Points = [], r2Points = [];
        for (let i = 0; i < candles.length; i++) {
            const t = candles[i].time;
            if (kernel[i]) {
                const color = (i > 0 && kernel[i] > kernel[i-1]) ? '#00ffcc' : '#ff0055';
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
        const alg2 = document.getElementById('alg2E').checked;

        if (alg1 || alg2) {
            for (let j = 20; j < candles.length; j++) {
                const candle = candles[j];
                const cRsiB = rsiBlue[j], cRsiW = rsiWhite[j];
                const pRsiB = rsiBlue[j-1], pRsiW = rsiWhite[j-1];
                
                // --- KATMAN 2: ELITE-V6 SİNYAL MANTIĞI ---
                const isBullRegime = candle.close > (emaLong[j] || 0);
                const isBearRegime = candle.close < (emaLong[j] || 999999);
                
                const kDiff = kernel[j] - kernel[j-1];
                const pkDiff = kernel[j-1] - kernel[j-2];
                const isKUp = kDiff > 0 && pkDiff > 0;
                const isKDown = kDiff < 0 && pkDiff < 0;
                
                const volThreshold = (atr[j] || 0) * 0.8;
                const isVolOkBuy = candle.close > (kernel[j] + volThreshold);
                const isVolOkSell = candle.close < (kernel[j] - volThreshold);
                
                const isRsiBuy = cRsiB > cRsiW && pRsiB <= pRsiW && cRsiB > 45;
                const isRsiSell = cRsiB < cRsiW && pRsiB >= pRsiW && cRsiB < 55;

                let rawSig = null;
                let algName = "";
                
                if (alg1) {
                    if (isBullRegime && isKUp && isRsiBuy && isVolOkBuy && candle.close > candle.open) {
                        rawSig = 'BUY'; algName = 'ELITE-V6';
                    }
                    else if (isBearRegime && isKDown && isRsiSell && isVolOkSell && candle.close < candle.open) {
                        rawSig = 'SELL'; algName = 'ELITE-V6';
                    }
                }
                
                if (!rawSig && alg2) {
                    if (isBullRegime && isKUp && candle.close < kernel[j] && cRsiB > 40 && pRsiB <= 40) {
                        rawSig = 'BUY'; algName = 'REVERSION-V6';
                    }
                    else if (isBearRegime && isKDown && candle.close > kernel[j] && cRsiB < 60 && pRsiB >= 60) {
                        rawSig = 'SELL'; algName = 'REVERSION-V6';
                    }
                }

                if (rawSig && rawSig !== lastSigType && (j - lastSigIndex) >= 12) {
                    lastSigType = rawSig;
                    lastSigIndex = j;
                    
                    const color = rawSig === 'BUY' ? '#00ffcc' : '#ff0055';
                    newMarkers.push({
                        time: candle.time,
                        position: rawSig === 'BUY' ? 'belowBar' : 'aboveBar',
                        color: color,
                        shape: rawSig === 'BUY' ? 'arrowUp' : 'arrowDown',
                        text: `[ ${rawSig} ]`,
                        size: 2
                    });
                    
                    if (j >= candles.length - 50) {
                        const timeStr = new Date(candle.time * 1000).toLocaleTimeString('tr-TR');
                        newLogs.unshift(`<div class="log-row" style="color:${color}; border-left: 3px solid ${color}; padding-left: 10px;">
                            <span style="opacity:0.6">[${timeStr}]</span>
                            <span style="font-weight:700">${algName}</span>
                            <span style="color:#fff">${rawSig === 'BUY' ? 'LONG' : 'SHORT'}</span>
                            <span style="font-family:monospace">$${candle.close.toFixed(currentPrecision)}</span>
                        </div>`);
                    }
                }
            }
        }

        cS.setMarkers(newMarkers);
        const logEl = document.getElementById('lL');
        if (logEl) logEl.innerHTML = newLogs.slice(0, 50).join('');

    } catch(e) { console.error("Elite-V6 Error:", e); }
}
