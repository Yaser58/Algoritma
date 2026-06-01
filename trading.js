function updPnl(){
    if(!pos)return;
    const pnl=pos.t==='BUY'?(cp-pos.e)*pos.a:(pos.e-cp)*pos.a;
    const el=document.getElementById('pV');
    if(el) {
        el.innerText=(pnl>=0?'+':'')+'₺'+pnl.toFixed(2);
        el.style.color=pnl>=0?'#00ff41':'#ff0000';
    }

    // SL/TP otomatik kapanış kontrolü
    const px = cp.toFixed(currentPrecision);
    if (pos.t === 'BUY') {
        if (cp <= pos.sl) { sLog('STOP LOSS ÇALIŞTI (SAT @ ₺' + px + ')'); closeP(); }
        else if (cp >= pos.tp) { sLog('KAR AL ÇALIŞTI (SAT @ ₺' + px + ')'); closeP(); }
    } else {
        if (cp >= pos.sl) { sLog('STOP LOSS ÇALIŞTI (AL @ ₺' + px + ')'); closeP(); }
        else if (cp <= pos.tp) { sLog('KAR AL ÇALIŞTI (AL @ ₺' + px + ')'); closeP(); }
    }
}

function openP(t){
    if(pos||cp===0)return;
    // Manuel pozisyon: %1 risk, 1:2 risk/ödül
    const sl = t==='BUY' ? cp * 0.99 : cp * 1.01;
    const risk = Math.abs(cp - sl);
    const tp = t==='BUY' ? cp + risk * 2 : cp - risk * 2;

    pos={t, e:cp, a:bal/cp, sl, tp}; trd++;
    document.getElementById('tC').innerText=trd;
    document.getElementById('clB').style.display='block';
    document.getElementById('clB').innerText=t+' KAPAT';
    const pr = currentPrecision;
    sLog(`POZ AÇILDI: ${t} @ ₺${cp.toFixed(pr)} | TP: ₺${tp.toFixed(pr)} SL: ₺${sl.toFixed(pr)}`);
}

function closeP(){
    if(!pos)return;
    const pnl=pos.t==='BUY'?(cp-pos.e)*pos.a:(pos.e-cp)*pos.a;
    bal+=pnl; pnlT+=pnl;
    document.getElementById('bV').innerText='₺'+bal.toFixed(2);
    const ps=document.getElementById('pS');
    if(ps) {
        ps.innerText=(pnlT>=0?'+':'')+'₺'+pnlT.toFixed(2);
        ps.style.color=pnlT>=0?'#00ff41':'#ff0000';
    }
    document.getElementById('pV').innerText='₺0.00';
    document.getElementById('pV').style.color='#fff';

    pos=null; document.getElementById('clB').style.display='none';
    sLog('POZ KAPANDI. PNL: ₺'+pnl.toFixed(2));
}

function swP(p){
    pair=p;
    document.getElementById('sN').innerText=p;
    buildP();
    candles=[];
    cS.setData([]);
    kernelSeries.setData([]);
    r1S.setData([]);
    r2S.setData([]);
    if (typeof fibSeries !== 'undefined') fibSeries.forEach(s => s.setData([]));
    loadHist(); // loadHist içinde canlı akış da yeniden başlar

    // Grafiğin olduğu yere odaklan
    const main = document.getElementById('main');
    if(main) main.scrollIntoView({ behavior: 'smooth' });
}

/**
 * BACKTEST MOTORU
 * Grafikteki sinyaller üzerinden simülasyon yapar.
 */
function runBacktest() {
    // Yalnızca gerçek AL/SAT sinyalleri (side taşıyanlar) — A,B,Q,W1,P,W2 etiketleri hariç
    const markers = (cS.markers() || []).filter(m => m.side);
    if (markers.length < 1) {
        alert("Backtest için sinyal yok! QP Trading açık olmalı ve grafikte en az bir 'QP AL' sinyali oluşmalı.");
        return;
    }

    let balance = 100; 
    let trades = 0;
    let currentPos = null; // { type, entry, sl, tp }

    // Sinyalleri zamana göre haritala
    const sigMap = {};
    markers.forEach(m => { sigMap[m.time] = m; });

    for (let i = 0; i < candles.length; i++) {
        const c = candles[i];

        // 1. SL/TP Kontrolü
        if (currentPos) {
            let hit = false;
            let pnl = 0;

            if (currentPos.type === 'BUY') {
                if (c.low <= currentPos.sl) {
                    pnl = (currentPos.sl - currentPos.entry) / currentPos.entry;
                    hit = true;
                } else if (c.high >= currentPos.tp) {
                    pnl = (currentPos.tp - currentPos.entry) / currentPos.entry;
                    hit = true;
                }
            } else {
                if (c.high >= currentPos.sl) {
                    pnl = (currentPos.entry - currentPos.sl) / currentPos.entry;
                    hit = true;
                } else if (c.low <= currentPos.tp) {
                    pnl = (currentPos.entry - currentPos.tp) / currentPos.entry;
                    hit = true;
                }
            }

            if (hit) {
                balance += (balance * pnl);
                trades++;
                currentPos = null;
            }
        }

        // 2. Yeni Sinyal Kontrolü
        const sig = sigMap[c.time];
        if (sig) {
            // Eğer açık pozisyon varsa yeni sinyal gelince kapat (Trend değişimi)
            if (currentPos) {
                const pnl = currentPos.type === 'BUY' 
                    ? (c.close - currentPos.entry) / currentPos.entry 
                    : (currentPos.entry - c.close) / currentPos.entry;
                balance += (balance * pnl);
                trades++;
            }

            currentPos = {
                type: sig.side || (sig.text.includes('LONG') ? 'BUY' : 'SELL'),
                entry: c.close,
                sl: sig.sl,
                tp: sig.tp
            };
        }
    }

    const netProfit = balance - 100;
    const profitPercent = ((balance - 100) / 100 * 100).toFixed(2);
    const color = netProfit >= 0 ? 'var(--green)' : 'var(--red)';

    const resEl = document.getElementById('btRes');
    const statsEl = document.getElementById('btStats');
    
    if (resEl && statsEl) {
        resEl.style.display = 'block';
        statsEl.innerHTML = `
            <div style="font-weight:bold;margin-bottom:8px;border-bottom:1px solid #333;color:var(--green)">
                📊 QP TRADING BACKTEST RAPORU
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span>Başlangıç:</span> <span>₺100.00</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span>İşlem Sayısı:</span> <span>${trades}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;color:${color}">
                <span>Net Kâr/Zarar:</span> <span>₺${netProfit.toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-weight:bold;color:${color}">
                <span>Yüzde Getiri:</span> <span>%${profitPercent}</span>
            </div>
            <div style="font-size:0.6rem;opacity:0.5;margin-top:8px;font-style:italic">
                * Stop Loss: W1 dibi | Take Profit: A tepesi (yapısal seviyeler)
            </div>
        `;
    }
}
