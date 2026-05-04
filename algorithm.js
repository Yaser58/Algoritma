let markers = [];
let lastSignalTime = 0;

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
        const atr = calcATR(candles, 60);
        const ema100 = calcEMA(closes, 100); // Ana Trend Filtresi

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
        const alg2 = document.getElementById('alg2E').checked;

        if (alg1 || alg2) {
            for (let j = 3; j < candles.length; j++) {
                const candle = candles[j];
                const pRsiB = rsiBlue[j-1], pRsiW = rsiWhite[j-1];
                const cRsiB = rsiBlue[j], cRsiW = rsiWhite[j];
                const kVal = kernel[j];
                
                const kDiff = kernel[j] - kernel[j-1];
                const pkDiff = kernel[j-1] - kernel[j-2];
                const ppkDiff = kernel[j-2] - kernel[j-3];
                
                const rsiWSlope = rsiWhite[j] - rsiWhite[j-1];
                const volFilter = atr[j] ? atr[j] * 1.0 : 0; 
                const currentEma = ema100[j];
                
                let rawSig = null;
                let algName = "";
                
                // ALGORİTMA 1 PRO V3 (SİSTEMATİK)
                if (alg1) {
                    if (currentEma && candle.close > currentEma && kDiff > 0 && pkDiff > 0 && ppkDiff > 0 && cRsiB > cRsiW && pRsiB <= pRsiW && rsiWSlope >= 0 && candle.close > (kVal + volFilter) && candle.close > candle.open) { 
                        rawSig = 'BUY'; algName = 'ALG-1'; 
                    }
                    else if (currentEma && candle.close < currentEma && kDiff < 0 && pkDiff < 0 && ppkDiff < 0 && cRsiB < cRsiW && pRsiB >= pRsiW && rsiWSlope <= 0 && candle.close < (kVal - volFilter) && candle.close < candle.open) { 
                        rawSig = 'SELL'; algName = 'ALG-1'; 
                    }
                }
                
                // ALGORİTMA 2 PRO V3 (SİSTEMATİK)
                if (!rawSig && alg2) {
                    if (kDiff > 0 && pkDiff > 0 && candle.close < kVal && cRsiB > 40 && pRsiB <= 40 && candle.close > candle.open && rsiWSlope >= 0) { 
                        rawSig = 'BUY'; algName = 'ALG-2'; 
                    }
                    else if (kDiff < 0 && pkDiff < 0 && candle.close > kVal && cRsiB < 60 && pRsiB >= 60 && candle.close < candle.open && rsiWSlope <= 0) { 
                        rawSig = 'SELL'; algName = 'ALG-2'; 
                    }
                }
                
                if (rawSig && rawSig !== lastSigType && (j - lastSigIndex) >= 10) {
                    lastSigType = rawSig;
                    lastSigIndex = j;
                    
                    const color = rawSig === 'BUY' ? '#00ff41' : '#ff3131';
                    newMarkers.push({
                        time: candle.time,
                        position: rawSig === 'BUY' ? 'belowBar' : 'aboveBar',
                        color: color,
                        shape: rawSig === 'BUY' ? 'arrowUp' : 'arrowDown',
                        text: rawSig === 'BUY' ? 'AL' : 'SAT',
                        size: 3 
                    });
                    
                    if (j >= candles.length - 50) {
                        const timeStr = new Date(candle.time * 1000).toLocaleTimeString('tr-TR');
                        newLogs.unshift(`<div class="log-row" style="color:${color}">
                            <span>[${timeStr}]</span>
                            <span style="font-weight:bold">${algName}</span>
                            <span>${rawSig === 'BUY' ? 'ALIM' : 'SATIŞ'}</span>
                            <span>$${candle.close.toFixed(currentPrecision)}</span>
                        </div>`);
                    }
                }
            }
        }

        cS.setMarkers(newMarkers);
        const logEl = document.getElementById('lL');
        if (logEl) logEl.innerHTML = newLogs.slice(0, 50).join('');

    } catch(e) { console.error(e); }
}
