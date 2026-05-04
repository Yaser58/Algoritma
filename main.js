const PAIRS=['BTCUSDT','ETHUSDT','FILUSDT','ENAUSDT','ADAUSDT','DOGEUSDT','XRPUSDT'];
let pair='BTCUSDT', tf='5m';
let chart, cS, kernelSeries, r1S, r2S;
let ws=null, candles=[];
let bal=100, pnlT=0, trd=0, pos=null, cp=0;
let isHistLoaded = false;
let hbCount = 0;
let lastWsMsgTime = 0;
let currentPrecision = 2;
let lastCalcTime = 0;

function sLog(m){
    const e=document.getElementById('sL');
    if(e) e.innerHTML = '<div style="border-bottom:1px solid #001a00;padding:2px 0">'+m+'</div>' + e.innerHTML.substring(0, 1000);
}

function cSt(ok,t){
    const d=document.getElementById('cD'), ct=document.getElementById('cT');
    if(d) d.className='dot '+(ok?'don':'doff');
    if(ct) ct.innerText=t||(ok?'ONLINE':'OFFLINE');
}

function buildP(){
    const g=document.getElementById('pG'); if(!g) return;
    g.innerHTML='';
    PAIRS.forEach(p=>{
        const b=document.createElement('button');
        b.className='pbtn'+(p===pair?' active':'');
        b.textContent=p.replace('USDT','');
        b.onclick=()=>swP(p);
        g.appendChild(b);
    });
}

window.addEventListener('load', ()=>{
    buildP(); 
    buildChart();
    
    document.getElementById('tfS').onchange = function(){
        tf = this.value; 
        candles = []; 
        cS.setData([]); 
        isHistLoaded = false;
        loadHist(); 
        startWS();
    };
    
    ['kH','kA','rs1','rs2', 'alg1E', 'alg2E'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('change', calcInd);
    });
    
    setInterval(fetchPriceFallback, 1000);
    setInterval(() => { 
        hbCount++; 
        if(document.getElementById('heartbeat')) 
            document.getElementById('heartbeat').innerText = '[' + hbCount + ']'; 
    }, 1000);

    loadHist(); 
    startWS();
});
