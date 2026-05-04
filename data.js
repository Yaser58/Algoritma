let dailyOpen = 0;

async function fetchTicker() {
    try {
        const res = await fetch(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${pair}`);
        const d = await res.json();
        dailyOpen = +d.lastPrice / (1 + (+d.priceChangePercent / 100));
        const sc = document.getElementById('sC');
        if (sc) {
            const change = +d.priceChangePercent;
            sc.innerText = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
            sc.style.color = change >= 0 ? 'var(--green)' : 'var(--red)';
        }
    } catch (e) { console.error("Ticker Error:", e); }
}

async function loadHist(){
    cSt(false,'YÜKLENİYOR...');
    fetchTicker(); // 24s verisini çek
    try {
        let allCandles = [];
        let endTime = Date.now();
        for (let i = 0; i < 3; i++) {
            const res = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${pair}&interval=${tf}&limit=1000&endTime=${endTime}`);
            const raw = await res.json();
            const batch = raw.map(d => ({time: Math.floor(d[0]/1000) + 10800, open: +d[1], high: +d[2], low: +d[3], close: +d[4]}));
            allCandles = batch.concat(allCandles);
            endTime = raw[0][0] - 1;
        }
        candles = [...new Map(allCandles.map(item => [item.time, item])).values()].sort((a,b)=>a.time-b.time);
        
        if (candles.length > 0) {
            cp = candles[candles.length-1].close;
            updatePrecision(cp);
            updPrice({close: cp});
        }
        
        cS.setData(candles);
        cSt(true, 'ONLINE');
        isHistLoaded = true;
        calcInd();
        
        // Güncel fiyata ve son mumlara odaklan
        setTimeout(() => {
            const count = candles.length;
            if (count > 0) {
                chart.timeScale().setVisibleLogicalRange({
                    from: count - 150,
                    to: count
                });
            }
        }, 200);
    } catch(e) { sLog('HATA: ' + e.message); }
}

function startWS(){
    if(ws){ws.onclose=null;ws.close();}
    const wsUrl=`wss://fstream.binance.com/stream?streams=${pair.toLowerCase()}@kline_${tf}/${pair.toLowerCase()}@markPrice@1s`;
    ws=new WebSocket(wsUrl);
    ws.onmessage=handleWS;
    ws.onopen=()=>{ cSt(true, "LIVE ONLINE"); };
}

function handleWS(e){
    lastWsMsgTime = Date.now();
    const msg = JSON.parse(e.data);
    const data = msg.data || msg;
    
    let price = 0;
    if (data.p || data.c || data.P) price = +(data.p || data.c || data.P);
    else if (data.k) price = +data.k.c;

    if (price > 0) {
        cp = price;
        updPrice({close: cp});
    }

    if(isHistLoaded) handleData(data);
}

function handleData(d) {
    let candleData = null;
    const now = Math.floor(Date.now() / 1000) + 10800;
    const tf_val = parseInt(tf);
    const tf_sec = (tf.includes('h') ? tf_val * 3600 : tf_val * 60);
    const current_candle_time = Math.floor(now / tf_sec) * tf_sec;

    if (d.p || d.c || d.P || d.k) {
        const price = +(d.p || d.c || d.P || (d.k ? d.k.c : 0));
        if (price > 0 && candles.length > 0) {
            let last = candles[candles.length - 1];
            if (current_candle_time > last.time) {
                const newC = { time: current_candle_time, open: price, high: price, low: price, close: price };
                candles.push(newC);
                candleData = newC;
            } else {
                if (price > last.high) last.high = price;
                if (price < last.low) last.low = price;
                last.close = price;
                candleData = last;
            }
        }
    } 
    
    if (candleData && cS) {
        cS.update(candleData);
        updPnl();
        calcInd();
    }
}

function fetchPriceFallback() {
    if (Date.now() - lastWsMsgTime < 2000) {
        document.getElementById('dataSource').innerText = 'KAYNAK: WEBSOCKET';
        return;
    }
    try {
        fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${pair}`).then(r=>r.json()).then(d=>{
            if (d.price) {
                document.getElementById('dataSource').innerText = 'KAYNAK: YEDEK (REST)';
                cp = +d.price;
                updPrice({close: cp});
                handleData({ p: d.price });
            }
        });
    } catch(e) {}
}
