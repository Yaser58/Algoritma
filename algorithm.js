let markers = [];
let lastSignalTime = 0;

/**
 * ELITE-V7 SNIPER ALGORITHM
 * Maksimum Hassasiyet ve Minimum Gecikme Odaklı Motor
 */
function calcInd() {
    if (candles.length < 50) return; 
    try {
        const h = +document.getElementById('kH').value;
        const a = +document.getElementById('kA').value;
        const r1Len = +document.getElementById('rs1').value;
        const r2Len = +document.getElementById('rs2').value;

        const closes = candles.map(c => c.close);
        
        // --- GÖSTERGELER ---
        const kernel = kReg(closes, h, a);
        const rsiMain = calcRSI(closes, 14); // Standart Güçlü RSI
        const emaFast = calcEMA(closes, 50);  // Hızlı Trend
        const emaSlow = calcEMA(closes, 200); // Ana Trend

        // Grafik Verilerini Hazırla
        const kPoints = [], r1Points = [], r2Points = [];
        for (let i = 0; i < candles.length; i++) {
            const t = candles[i].time;
            if (kernel[i]) {
                const color = (i > 0 && kernel[i] > kernel[i-1]) ? '#00ff41' : '#ff3131';
                kPoints.push({ time: t, value: kernel[i], color });
            }
            if (rsiMain[i] !== null) r1Points.push({ time: t, value: rsiMain[i] });
        }
        kernelSeries.setData(kPoints);
        r1S.setData(r1Points);
        r2S.setData([]); // İkinci RSI hattını temizle (Sadelik)

        let newMarkers = [];
        let newLogs = [];
        let lastSigType = null; 
        let lastSigIndex = -10; 

        const alg1 = document.getElementById('alg1E').checked;

        if (alg1) {
            for (let j = 10; j < candles.length; j++) {
                const c = candles[j];
                const p = candles[j-1];
                
                // 1. TREND ONAYI (Fiyat 50 EMA üstündeyse AL, altındaysa SAT)
                const isBull = c.close > emaFast[j];
                const isBear = c.close < emaFast[j];

                // 2. KERNEL DÖNÜŞÜ (Eğim Değişimi)
                const kUp = kernel[j] > kernel[j-1];
                const kDown = kernel[j] < kernel[j-1];

                // 3. SNIPER MOMENTUM (RSI 50 Seviyesi Kırılımı)
                // Kararsız bölgeden (50) uzaklaşan güçlü momentumu yakalar
                const rsiUp = rsiMain[j] > 50 && rsiMain[j-1] <= 50;
                const rsiDown = rsiMain[j] < 50 && rsiMain[j-1] >= 50;

                let rawSig = null;

                // ALIM KOŞULU: Trend Pozitif + Kernel Yukarı + RSI 50 Kırılımı (Veya Güçlü RSI)
                if (isBull && kUp && (rsiUp || (rsiMain[j] > 55 && rsiMain[j-1] < 55))) {
                    if (c.close > p.close) rawSig = 'BUY'; 
                }
                // SATIŞ KOŞULU: Trend Negatif + Kernel Aşağı + RSI 50 Kırılımı
                else if (isBear && kDown && (rsiDown || (rsiMain[j] < 45 && rsiMain[j-1] > 45))) {
                    if (c.close < p.close) rawSig = 'SELL';
                }

                // SİNYAL FİLTRELEME
                if (rawSig && rawSig !== lastSigType && (j - lastSigIndex) >= 8) {
                    lastSigType = rawSig;
                    lastSigIndex = j;
                    
                    const color = rawSig === 'BUY' ? '#00ff41' : '#ff3131';
                    newMarkers.push({
                        time: c.time,
                        position: rawSig === 'BUY' ? 'belowBar' : 'aboveBar',
                        color: color,
                        shape: rawSig === 'BUY' ? 'arrowUp' : 'arrowDown',
                        text: rawSig === 'BUY' ? 'L' : 'S',
                        size: 2
                    });
                    
                    if (j >= candles.length - 50) {
                        const timeStr = new Date(c.time * 1000).toLocaleTimeString('tr-TR');
                        newLogs.unshift(`<div class="log-row" style="color:${color}">
                            <span>[${timeStr}]</span>
                            <span style="font-weight:bold">SNIPER</span>
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

    } catch(e) { console.error("Sniper V7 Error:", e); }
}
