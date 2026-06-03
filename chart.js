function buildChart(){
    const box=document.getElementById('chartBox');
    chart=LightweightCharts.createChart(box,{
        width:box.clientWidth,height:box.clientHeight,
        layout:{background:{type:'solid',color:'#000'},textColor:'#00ff41'},
        grid:{vertLines:{color:'#001a00'},horzLines:{color:'#001a00'}},
        crosshair:{mode:LightweightCharts.CrosshairMode.Normal},
        rightPriceScale:{borderColor:'#003b00'},
        timeScale:{borderColor:'#003b00',timeVisible:true},
    });
    cS=chart.addCandlestickSeries({upColor:'#00ff41',downColor:'#ff0000',wickUpColor:'#00ff41',wickDownColor:'#ff0000',borderVisible:false});
    kernelSeries=chart.addLineSeries({lineWidth:2,lastValueVisible:false,priceLineVisible:false});
    r1S=chart.addLineSeries({color:'#ffffff',lineWidth:2,priceScaleId:'rsi',lastValueVisible:false,priceLineVisible:false});
    r2S=chart.addLineSeries({color:'#4444ff',lineWidth:1,priceScaleId:'rsi',lastValueVisible:false,priceLineVisible:false});
    
    // Fibonacci Çizgileri (sıra: algorithm.js -> QP_FIB_LEVELS ile birebir aynı)
    // [1.0(A), 0.786, 0.618, 0.5, 0.382, 0(B)] -> 0.618 ve 0.786 (giriş bölgesi) vurgulu
    fibSeries = [];
    const fibDefs = [
        { color: '#ff5252', title: '1.0 (A)', w: 1 },
        { color: '#ffd54f', title: '0.786',   w: 2 },
        { color: '#ffb300', title: '0.618',   w: 2 },
        { color: '#555555', title: '0.5',     w: 1 },
        { color: '#555555', title: '0.382',   w: 1 },
        { color: '#9e9e9e', title: '0 (B)',   w: 1 }
    ];
    fibDefs.forEach(d => {
        fibSeries.push(chart.addLineSeries({
            color: d.color,
            lineWidth: d.w,
            lineStyle: 2, // Kesikli çizgi
            title: d.title,
            lastValueVisible: true,
            priceLineVisible: false
        }));
    });
    
    // QP desen çizgisi: A→B→Q→W1→P→W2 noktalarını birleştirir (deseni gözle gösterir)
    patternSeries = chart.addLineSeries({
        color: '#e040fb',
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false
    });

    // SL/TP Kutuları için özel seriler
    profitBoxSeries = chart.addCandlestickSeries({
        upColor: 'rgba(0, 255, 65, 0.2)', 
        downColor: 'rgba(0, 255, 65, 0.2)',
        borderVisible: false,
        wickVisible: false,
        lastValueVisible: false,
        priceLineVisible: false
    });
    lossBoxSeries = chart.addCandlestickSeries({
        upColor: 'rgba(255, 0, 0, 0.2)',
        downColor: 'rgba(255, 0, 0, 0.2)',
        borderVisible: false,
        wickVisible: false,
        lastValueVisible: false,
        priceLineVisible: false
    });
    chart.priceScale('rsi').applyOptions({autoScale:true,scaleMargins:{top:0.78,bottom:0}});
    new ResizeObserver(()=>chart.resize(box.clientWidth,box.clientHeight)).observe(box);
}

function updatePrecision(price) {
    if (!price) return;
    let p = 2, m = 0.01;
    if (price < 0.00001) { p = 8; m = 0.00000001; }
    else if (price < 0.001) { p = 6; m = 0.000001; }
    else if (price < 0.1) { p = 5; m = 0.00001; }
    else if (price < 1) { p = 4; m = 0.0001; }
    else if (price < 10) { p = 3; m = 0.001; }
    else if (price < 1000) { p = 2; m = 0.01; }
    else { p = 2; m = 0.01; }
    
    currentPrecision = p;
    
    cS.applyOptions({
        priceFormat: { type: 'price', precision: p, minMove: m }
    });
    kernelSeries.applyOptions({
        priceFormat: { type: 'price', precision: p, minMove: m }
    });
}

function updPrice(c){
    if(!c || !c.close) return;
    
    // Sol üstteki fiyat (sP)
    const el = document.getElementById('sP');
    if(el) {
        el.innerText = '₺' + c.close.toFixed(currentPrecision);
    }
    
    // Sol üstteki yüzde değişimi (sC)
    if(typeof dailyOpen !== 'undefined' && dailyOpen > 0) {
        const sc = document.getElementById('sC');
        if(sc) {
            const change = ((c.close - dailyOpen) / dailyOpen) * 100;
            sc.innerText = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
            sc.style.color = change >= 0 ? 'var(--green)' : 'var(--red)';
        }
    }
    
    // Sağ üstteki canlı tik
    const lt = document.getElementById('liveTick');
    if(lt) {
        lt.style.display = 'block';
        lt.innerText = 'CANLI: ₺' + c.close.toFixed(currentPrecision);
    }
}
