async function loadHist(){
    cSt(false,'YÜKLENİYOR...');
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
        
        if (candles.length > 0) updatePrecision(candles[0].close);
        
        cS.setData(candles);
        cSt(true, 'ONLINE');
        isHistLoaded = true;
        calcInd();
        setTimeout(() => chart.timeScale().fitContent(), 50);
    } catch(e) { sLog('HATA: ' + e.message); }
}

function startWS(){
    if(ws){ws.onclose=null;ws.close();}
    const wsUrl=`wss://fstream.binance.com/stream?streams=${pair.toLowerCase()}@kline_${tf}/${pair.toLowerCase()}@markPrice@1s`;
    ws=new WebSocket(wsUrl);
    ws.onmessage=handleWS;
}

function handleWS(e){
    lastWsMsgTime = Date.now();
    const msg = JSON.parse(e.data);
    const data = msg.data || msg;
    if (data.p || data.c || data.P) {
        cp = +(data.p || data.c || data.P);
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

    if (d.p || d.c || d.P) {
        const price = +(d.p || d.c || d.P);
        if (candles.length > 0) {
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
    if (d.e === 'kline' || d.k) {
        const k = d.k || d;
        const c = { 
            time: Math.floor(k.t/1000) + 10800, 
            open: +k.o, high: +k.h, low: +k.l, close: +k.c,
            volume: +k.v
        };
        if(candles.length > 0){
            let last = candles[candles.length-1];
            if(last.time === c.time) { candles[candles.length-1] = c; }
            else if (c.time > last.time) { candles.push(c); }
        } else { candles.push(c); }
        candleData = c;
    }
    if (candleData && cS) {
        cS.update(candleData);
        updPnl();
        calcInd();
    }
}

function fetchPriceFallback() {
    if (Date.now() - lastWsMsgTime < 2000) return;
    try {
        fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${pair}`).then(r=>r.json()).then(d=>{
            if (d.price) {
                handleData({ p: d.price });
            }
        });
    } catch(e) {}
}
