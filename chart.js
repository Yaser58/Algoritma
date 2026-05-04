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
    if(!c) return;
    const el = document.getElementById('sP');
    if(el) el.innerText = '$' + c.close.toFixed(currentPrecision);
    
    const lt = document.getElementById('liveTick');
    if(lt) { lt.style.display = 'block'; lt.innerText = 'CANLI: $' + c.close.toFixed(currentPrecision); }
}
