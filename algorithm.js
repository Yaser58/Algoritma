let markers = [];
let lastSignalTime = 0;

/**
 * ELITE TRADING ENGINE - V3 (Premium Edition)
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
        const atr = calcATR(candles, 14); 
        const emaRegime = calcEMA(closes, 200); 

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

        for (let j = 20; j < candles.length; j++) {
            const c = candles[j];
            const p = candles[j-1];
            const kVal = kernel[j];
            const currentEma = emaRegime[j];
            
            let rawSig = null;
            let algName = "";

            // --- ALGORİTMA 1: PRO-V3 ---
            if (alg1Enabled && !rawSig) {
                const ema100 = calcEMA(closes, 100)[j];
                const kDiff = kernel[j] - kernel[j-1];
                if (ema100 && c.close > ema100 && kDiff > 0 && rsiBlue[j] > rsiWhite[j] && c.close > c.open) {
                    rawSig = 'BUY'; algName = 'ALG-1';
                } else if (ema100 && c.close < ema100 && kDiff < 0 && rsiBlue[j] < rsiWhite[j] && c.close < c.open) {
                    rawSig = 'SELL'; algName = 'ALG-1';
                }
            }

            // --- ALGORİTMA 2: QUANT-MASTER V3 ---
            if (alg2Enabled && !rawSig) {
                const isBull = currentEma && c.close > currentEma;
                const isBear = currentEma && c.close < currentEma;
                const kUp = kernel[j] > kernel[j-1] && kernel[j-1] > kernel[j-2];
                const kDown = kernel[j] < kernel[j-1] && kernel[j-1] < kernel[j-2];
                const isGreen = c.close > c.open;
                const isRed = c.close < c.open;
                const rsiOk = rsiBlue[j] > 52 || rsiBlue[j] < 48;

                if (isBull && kUp && isGreen && c.close > kVal && rsiOk) {
                    rawSig = 'BUY'; algName = 'QUANT-V3';
                } else if (isBear && kDown && isRed && c.close < kVal && rsiOk) {
                    rawSig = 'SELL'; algName = 'QUANT-V3';
                }
            }

            // --- PREMIUM GÖRSEL İNFAZ ---
            if (rawSig && rawSig !== lastSigType && (j - lastSigIndex) >= 10) {
                lastSigType = rawSig;
                lastSigIndex = j;
                
                const isBuy = rawSig === 'BUY';
                const color = isBuy ? '#00ff41' : '#ff0000';
                
                newMarkers.push({
                    time: c.time,
                    position: isBuy ? 'belowBar' : 'aboveBar',
                    color: color,
                    shape: isBuy ? 'arrowUp' : 'arrowDown',
                    text: isBuy ? 'LONG' : 'SHORT', // Daha profesyonel isimler
                    size: 2 // İdeal "Elite" boyutu
                });
                
                if (j >= candles.length - 50) {
                    const timeStr = new Date(c.time * 1000).toLocaleTimeString('tr-TR');
                    newLogs.unshift(`<div class="log-row" style="color:${color}; border-left: 3px solid ${color}; padding-left:10px">
                        <span>[${timeStr}]</span>
                        <span style="font-weight:bold">${algName}</span>
                        <span>${isBuy ? 'LONG' : 'SHORT'}</span>
                        <span>$${c.close.toFixed(currentPrecision)}</span>
                    </div>`);
                }
            }
        }

        cS.setMarkers(newMarkers);
        const logEl = document.getElementById('lL');
        if (logEl) logEl.innerHTML = newLogs.slice(0, 50).join('');

    } catch(e) { console.error("Elite Engine Error:", e); }
}
