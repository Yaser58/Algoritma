let markers = [];
let lastSignalTime = 0;

/**
 * ELITE TRADING ENGINE
 * Algoritma 1: Klasik PRO-V3 (Stabil)
 * Algoritma 2: Yeni Nesil QUANT-MASTER V2 (İleri Seviye Araştırma Tabanlı)
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
        const emaRegime = calcEMA(closes, 200); // 200 EMA Ana Trend Rejimi

        // Grafik Renklerini ve İndikatörlerini Güncelle
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
            const currentAtr = atr[j] || 0;
            const currentEma = emaRegime[j];
            
            let rawSig = null;
            let algName = "";

            // --- ALGORİTMA 1: KLASİK PRO-V3 ---
            if (alg1Enabled && !rawSig) {
                const ema100 = calcEMA(closes, 100)[j];
                const kDiff = kernel[j] - kernel[j-1];
                const pkDiff = kernel[j-1] - kernel[j-2];
                const ppkDiff = kernel[j-2] - kernel[j-3];
                const rsiWSlope = rsiWhite[j] - rsiWhite[j-1];
                const volF = currentAtr * 1.0;

                if (ema100 && c.close > ema100 && kDiff > 0 && pkDiff > 0 && ppkDiff > 0 && rsiBlue[j] > rsiWhite[j] && rsiWSlope >= 0 && c.close > (kVal + volF) && c.close > c.open) {
                    rawSig = 'BUY'; algName = 'ALG-1';
                } else if (ema100 && c.close < ema100 && kDiff < 0 && pkDiff < 0 && ppkDiff < 0 && rsiBlue[j] < rsiWhite[j] && rsiWSlope <= 0 && c.close < (kVal - volF) && c.close < c.open) {
                    rawSig = 'SELL'; algName = 'ALG-1';
                }
            }

            // --- ALGORİTMA 2: QUANT-MASTER V2 (YENİ) ---
            if (alg2Enabled && !rawSig) {
                const isBull = currentEma && c.close > currentEma;
                const isBear = currentEma && c.close < currentEma;
                
                // Volatilite Kanalları (İstatistiki Sapma)
                const upperBand = kVal + (currentAtr * 2.0);
                const lowerBand = kVal - (currentAtr * 2.0);
                
                // Momentum ve Eğim Onayı
                const kUp = kernel[j] > kernel[j-1] && kernel[j-1] > kernel[j-2];
                const kDown = kernel[j] < kernel[j-1] && kernel[j-1] < kernel[j-2];
                const rsiStrong = rsiBlue[j] > 55 && rsiBlue[j] > rsiBlue[j-1];
                const rsiWeak = rsiBlue[j] < 45 && rsiBlue[j] < rsiBlue[j-1];

                // BUY: Boğa Rejimi + Kernel Yukarı + Güçlü RSI + Fiyatın Üst Bandı Zorlaması
                if (isBull && kUp && rsiStrong && c.close > (kVal + currentAtr * 1.2)) {
                    rawSig = 'BUY'; algName = 'QUANT-V2';
                }
                // SELL: Ayı Rejimi + Kernel Aşağı + Zayıf RSI + Fiyatın Alt Bandı Zorlaması
                else if (isBear && kDown && rsiWeak && c.close < (kVal - currentAtr * 1.2)) {
                    rawSig = 'SELL'; algName = 'QUANT-V2';
                }
            }

            // SİNYAL ONAYI VE FİLTRELEME
            if (rawSig && rawSig !== lastSigType && (j - lastSigIndex) >= 12) {
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
                    newLogs.unshift(`<div class="log-row" style="color:${color}; border-left: 3px solid ${color}; padding-left:10px">
                        <span>[${timeStr}]</span>
                        <span style="font-weight:bold">${algName}</span>
                        <span>${rawSig === 'BUY' ? 'LONG' : 'SHORT'}</span>
                        <span>$${c.close.toFixed(currentPrecision)}</span>
                    </div>`);
                }
            }
        }

        cS.setMarkers(newMarkers);
        const logEl = document.getElementById('lL');
        if (logEl) logEl.innerHTML = newLogs.slice(0, 50).join('');

    } catch(e) { console.error("Strategy Engine Error:", e); }
}
