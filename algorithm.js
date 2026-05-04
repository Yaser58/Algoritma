let markers = [];
let lastSignalTime = 0;

/**
 * ELITE TRADING ENGINE - V4 (High Probability Edition)
 * Hedef: 10 işlemden 7+ kârlı sonuç (Backtest odaklı optimizasyon)
 */
function calcInd() {
    if (candles.length < 100) return; // Daha uzun geçmiş onayı
    try {
        const h = +document.getElementById('kH').value;
        const a = +document.getElementById('kA').value;
        const r1Len = +document.getElementById('rs1').value;
        const r2Len = +document.getElementById('rs2').value;

        const closes = candles.map(c => c.close);
        
        // --- İLERİ SEVİYE GÖSTERGE SETİ ---
        const kernel = kReg(closes, h, a);
        const rsiBlue = calcRSI(closes, r2Len);
        const rsiWhite = calcRSI(closes, r1Len);
        const atr = calcATR(candles, 14); 
        const ema50 = calcEMA(closes, 50);   // Orta vadeli trend
        const ema200 = calcEMA(closes, 200); // Ana rejim

        // Grafik Verilerini Güncelle
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

        for (let j = 50; j < candles.length; j++) {
            const c = candles[j];
            const p = candles[j-1];
            const kVal = kernel[j];
            
            let rawSig = null;
            let algName = "";

            // --- ALGORİTMA 2: QUANT-MASTER V4 (HIGH PROBABILITY) ---
            if (alg2Enabled) {
                // 1. TREND REJİMİ (50/200 Golden/Death Cross Onayı)
                const isGoldenZone = ema50[j] > ema200[j] && c.close > ema50[j];
                const isDeathZone = ema50[j] < ema200[j] && c.close < ema50[j];
                
                // 2. KERNEL EĞİM SÜREKLİLİĞİ (Son 3 mum aynı yöne bakmalı)
                const kUp = kernel[j] > kernel[j-1] && kernel[j-1] > kernel[j-2] && kernel[j-2] > kernel[j-3];
                const kDown = kernel[j] < kernel[j-1] && kernel[j-1] < kernel[j-2] && kernel[j-2] < kernel[j-3];
                
                // 3. MOMENTUM BARAJI (RSI 55/45 Sınırı)
                const rsiBull = rsiBlue[j] > 55 && rsiBlue[j] > rsiBlue[j-1];
                const rsiBear = rsiBlue[j] < 45 && rsiBlue[j] < rsiBlue[j-1];

                // 4. VOLATİLİTE ONAYI (Sıkışma olmamalı)
                const volOk = atr[j] > (atr[j-1] * 0.95);

                if (isGoldenZone && kUp && rsiBull && c.close > kVal && c.close > c.open && volOk) {
                    rawSig = 'BUY'; algName = 'QUANT-V4';
                } else if (isDeathZone && kDown && rsiBear && c.close < kVal && c.close < c.open && volOk) {
                    rawSig = 'SELL'; algName = 'QUANT-V4';
                }
            }

            // --- ALGORİTMA 1: PRO-V3 (Yedek Filtreli) ---
            if (alg1Enabled && !rawSig) {
                const ema100 = calcEMA(closes, 100)[j];
                if (ema100 && c.close > ema100 && kernel[j] > kernel[j-1] && rsiBlue[j] > rsiWhite[j] && c.close > c.open) {
                    rawSig = 'BUY'; algName = 'ALG-1';
                } else if (ema100 && c.close < ema100 && kernel[j] < kernel[j-1] && rsiBlue[j] < rsiWhite[j] && c.close < c.open) {
                    rawSig = 'SELL'; algName = 'ALG-1';
                }
            }

            // SİNYAL İNFAZ
            if (rawSig && rawSig !== lastSigType && (j - lastSigIndex) >= 15) {
                lastSigType = rawSig;
                lastSigIndex = j;
                const isBuy = rawSig === 'BUY';
                const color = isBuy ? '#00ff41' : '#ff0000';
                
                newMarkers.push({
                    time: c.time,
                    position: isBuy ? 'belowBar' : 'aboveBar',
                    color: color,
                    shape: isBuy ? 'arrowUp' : 'arrowDown',
                    text: isBuy ? 'LONG' : 'SHORT',
                    size: 2
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

    } catch(e) { console.error("High-Prob Strategy Error:", e); }
}
