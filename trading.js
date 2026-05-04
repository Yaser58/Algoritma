function updPnl(){
    if(!pos)return;
    const pnl=pos.t==='BUY'?(cp-pos.e)*pos.a:(pos.e-cp)*pos.a;
    const el=document.getElementById('pV');
    if(el) {
        el.innerText=(pnl>=0?'+':'')+'$'+pnl.toFixed(2);
        el.style.color=pnl>=0?'#00ff41':'#ff0000';
    }
}

function openP(t){
    if(pos||cp===0)return;
    pos={t,e:cp,a:bal/cp}; trd++;
    document.getElementById('tC').innerText=trd;
    document.getElementById('clB').style.display='block';
    document.getElementById('clB').innerText=t+' KAPAT';
    sLog('POZ AÇILDI: '+t+' @ '+cp);
}

function closeP(){
    if(!pos)return;
    const pnl=pos.t==='BUY'?(cp-pos.e)*pos.a:(pos.e-cp)*pos.a;
    bal+=pnl; pnlT+=pnl;
    document.getElementById('bV').innerText='$'+bal.toFixed(2);
    const ps=document.getElementById('pS');
    if(ps) {
        ps.innerText=(pnlT>=0?'+':'')+'$'+pnlT.toFixed(2);
        ps.style.color=pnlT>=0?'#00ff41':'#ff0000';
    }
    document.getElementById('pV').innerText='$0.00';
    document.getElementById('pV').style.color='#fff';
    pos=null; document.getElementById('clB').style.display='none';
    sLog('POZ KAPANDI. PNL: '+pnl.toFixed(2));
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
    loadHist(); 
    startWS();
    
    // Grafiğin olduğu yere odaklan
    const main = document.getElementById('main');
    if(main) main.scrollIntoView({ behavior: 'smooth' });
}

/**
 * BACKTEST MOTORU
 * Grafikteki sinyaller üzerinden simülasyon yapar.
 */
function runBacktest() {
    const markers = cS.markers(); // Candlestick series üzerinden sinyalleri al
    if (!markers || markers.length < 2) {
        alert("Backtest için yeterli sinyal yok! Lütfen algoritmaların açık olduğundan emin olun.");
        return;
    }

    let balance = 100; // Başlangıç bütçesi $100
    let trades = 0;
    let currentPos = null; 
    let entryPrice = 0;

    // Sinyalleri zamana göre sırala
    const sortedMarkers = [...markers].sort((a,b) => a.time - b.time);

    sortedMarkers.forEach(m => {
        const candle = candles.find(c => c.time === m.time);
        if (!candle) return;

        const price = candle.close;

        if (m.text === 'LONG') {
            // Eğer Short'taysak kapat ve kârı ekle
            if (currentPos === 'SHORT') {
                const pnl = (entryPrice - price) / entryPrice;
                balance += (balance * pnl);
                trades++;
            }
            currentPos = 'LONG';
            entryPrice = price;
        } else if (m.text === 'SHORT') {
            // Eğer Long'taysak kapat ve kârı ekle
            if (currentPos === 'LONG') {
                const pnl = (price - entryPrice) / entryPrice;
                balance += (balance * pnl);
                trades++;
            }
            currentPos = 'SHORT';
            entryPrice = price;
        }
    });

    const netProfit = balance - 100;
    const profitPercent = ((balance - 100) / 100 * 100).toFixed(2);
    const color = netProfit >= 0 ? 'var(--green)' : 'var(--red)';

    const resEl = document.getElementById('btRes');
    const statsEl = document.getElementById('btStats');
    
    if (resEl && statsEl) {
        resEl.style.display = 'block';
        statsEl.innerHTML = `
            <div style="font-weight:bold;margin-bottom:8px;border-bottom:1px solid #333;color:var(--green)">
                📊 BACKTEST RAPORU
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span>Başlangıç:</span> <span>$100.00</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span>İşlem Sayısı:</span> <span>${trades}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;color:${color}">
                <span>Net Kâr/Zarar:</span> <span>$${netProfit.toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-weight:bold;color:${color}">
                <span>Yüzde Getiri:</span> <span>%${profitPercent}</span>
            </div>
            <div style="font-size:0.6rem;opacity:0.5;margin-top:8px;font-style:italic">
                * Grafikteki güncel sinyaller baz alınmıştır.
            </div>
        `;
    }
}
