let markers = [];
let lastSignalTime = 0;

/**
 * FLASH-V2 AGGRESSIVE STRATEGY
 * Hız ve Erken Giriş Odaklı "Zero-Lag" Stratejisi
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
        const rsiMain = calcRSI(closes, 14); 
        const emaFast = calcEMA(closes, 50); // Daha çevik trend filtresi

        // Grafik Renklerini Orijinal Tut
        const kPoints = [], r1Points = [];
        for (let i = 0; i < candles.length; i++) {
            const t = candles[i].time;
            if (kernel[i]) {
                const color = (i > 0 && kernel[i] > kernel[i-1]) ? '#ffffff' : '#3153ff';
                kPoints.push({ time: t, value: kernel[i], color });
            }
            if (rsiMain[i] !== null) r1Points.push({ time: t, value: rsiMain[i] });
        }
        kernelSeries.setData(kPoints);
        r1S.setData(r1Points);
        r2S.setData([]); // Sadelik için tek RSI

        let newMarkers = [];
        let newLogs = [];
        let lastSigType = null; 
        let lastSigIndex = -10; 

        const alg1 = document.getElementById('alg1E').checked;

        if (alg1) {
            for (let j = 5; j < candles.length; j++) {
                const c = candles[j];
                const p = candles[j-1];
                const kVal = kernel[j];
                const pkVal = kernel[j-1];
                
                // 1. ÇEVİK TREND (EMA 50)
                const isBull = c.close > emaFast[j];
                const isBear = c.close < emaFast[j];

                // 2. KERNEL CROSS (Hızlı Kırılım)
                // Fiyatın Kernel hattını o yöndeki eğimle beraber kırması
                const crossUp = c.close > kVal && p.close <= pkVal && kVal > pkVal;
                const crossDown = c.close < kVal && p.close >= pkVal && kVal < pkVal;

                // 3. MOMENTUM (Hız Filtresi)
                const momUp = rsiMain[j] > 50 && rsiMain[j] > rsiMain[j-1];
                const momDown = rsiMain[j] < 50 && rsiMain[j] < rsiMain[j-1];

                let rawSig = null;

                // ALIM: Trend Okey + Kernel Kırılımı + Momentum Yukarı
                if (isBull && crossUp && momUp) {
                    rawSig = 'BUY';
                }
                // SATIM: Trend Okey + Kernel Kırılımı + Momentum Aşağı
                else if (isBear && crossDown && momDown) {
                    rawSig = 'SELL';
                }

                // HIZLI SİNYAL ONAYI (5 mumluk kısa mesafe)
                if (rawSig && rawSig !== lastSigType && (j - lastSigIndex) >= 5) {
                    lastSigType = rawSig;
                    lastSigIndex = j;
                    
                    const color = rawSig === 'BUY' ? '#00ff41' : '#ff3131';
                    newMarkers.push({
                        time: c.time,
                        position: rawSig === 'BUY' ? 'belowBar' : 'aboveBar',
                        color: color,
                        shape: rawSig === 'BUY' ? 'arrowUp' : 'arrowDown',
                        text: rawSig === 'BUY' ? 'L' : 'S',
                        size: 3 
                    });
                    
                    if (j >= candles.length - 50) {
                        const timeStr = new Date(c.time * 1000).toLocaleTimeString('tr-TR');
                        newLogs.unshift(`<div class="log-row" style="color:${color}">
                            <span>[${timeStr}]</span>
                            <span style="font-weight:bold">FLASH-V2</span>
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

    } catch(e) { console.error("Flash V2 Error:", e); }
}
