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
