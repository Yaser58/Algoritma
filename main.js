const PAIRS=['BTCUSDT','ETHUSDT','FILUSDT','ENAUSDT','ADAUSDT','DOGEUSDT','XRPUSDT'];
let pair='BTCUSDT', tf='5m';
// Global değişkenler indicators.js içerisinde tanımlanmıştır.

function playAlert() {
    const s = document.getElementById('alertSound');
    if (s) {
        s.currentTime = 0;
        s.play().catch(e => console.log("Ses çalma izni bekleniyor..."));
    }
}

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
    
    // Sidebar Toggle Mantığı
    const sL = document.getElementById('sidebar');
    const sR = document.getElementById('rightSidebar');
    const bCL = document.getElementById('closeLeft');
    const bCR = document.getElementById('closeRight');
    const bOL = document.getElementById('openLeft');
    const bOR = document.getElementById('openRight');

    bCL.onclick = () => { sL.classList.add('collapsed'); bOL.style.display = 'block'; };
    bOL.onclick = () => { sL.classList.remove('collapsed'); bOL.style.display = 'none'; };
    
    bCR.onclick = () => { sR.classList.add('collapsed'); bOR.style.display = 'block'; };
    bOR.onclick = () => { sR.classList.remove('collapsed'); bOR.style.display = 'none'; };

    document.getElementById('tfS').onchange = function(){
        tf = this.value; 
        candles = []; 
        cS.setData([]); 
        isHistLoaded = false;
        loadHist(); 
        startWS();
    };
    
    ['kH','kA','rs1','rs2', 'alg1E', 'alg2E', 'sqpE'].forEach(id => {
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
