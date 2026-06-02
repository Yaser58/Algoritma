/* ============================================================
   YASER ER ALGORİTMA — QP TRADING (BIST)
   main.js : Hisse listesi, arama, başlangıç akışı
   ============================================================ */

// BIST hisseleri (Yahoo Finance sembolleri = <KOD>.IS).
// Üstte endeksler, ardından alfabetik hisse evreni. Arama kutusuyla filtrelenir.
const BIST_SYMBOLS = [
    // --- Endeksler ---
    'XU100','XU030','XU050','XBANK',
    // --- A ---
    'ACSEL','ADEL','ADESE','AEFES','AFYON','AGHOL','AGROT','AHGAZ','AKBNK','AKCNS','AKENR','AKFGY','AKFYE','AKGRT','AKMGY','AKSA','AKSEN','AKSGY','AKSUE','ALARK','ALBRK','ALCAR','ALCTL','ALFAS','ALGYO','ALKA','ALKIM','ALMAD','ANELE','ANGEN','ANHYT','ANSGR','ARASE','ARCLK','ARDYZ','ARENA','ARSAN','ASELS','ASTOR','ASUZU','ATAGY','ATAKP','ATATP','ATEKS','AVGYO','AVPGY','AYDEM','AYEN','AYGAZ','AZTEK',
    // --- B ---
    'BAGFS','BAHKM','BAKAB','BALAT','BANVT','BARMA','BASGZ','BAYRK','BERA','BEYAZ','BFREN','BIENY','BIGCH','BIMAS','BINHO','BIOEN','BIZIM','BJKAS','BLCYT','BMSCH','BMSTL','BNTAS','BOBET','BORLS','BORSK','BOSSA','BRISA','BRKSN','BRKVY','BRLSM','BRMEN','BRSAN','BRYAT','BSOKE','BTCIM','BUCIM','BURCE','BURVA','BVSAN',
    // --- C / Ç ---
    'CANTE','CASA','CCOLA','CELHA','CEMAS','CEMTS','CEOEM','CIMSA','CLEBI','CMBTN','CMENT','CONSE','COSMO','CRDFA','CRFSA','CUSAN','CVKMD','CWENE',
    // --- D ---
    'DAGI','DAPGM','DARDL','DENGE','DERHL','DERIM','DESA','DESPC','DEVA','DGATE','DGNMO','DIRIT','DITAS','DMSAS','DOAS','DOBUR','DOCO','DOFER','DOGUB','DOHOL','DOKTA','DURDO','DYOBY','DZGYO',
    // --- E ---
    'EBEBK','ECILC','ECZYT','EDATA','EDIP','EGEEN','EGEPO','EGGUB','EGPRO','EGSER','EKGYO','EKIZ','EKSUN','ELITE','EMKEL','ENERY','ENJSA','ENKAI','ENSRI','EPLAS','ERBOS','EREGL','ERSU','ESCAR','ESCOM','ESEN','ETILR','ETYAT','EUPWR','EUREN','EUYO',
    // --- F ---
    'FADE','FENER','FLAP','FMIZP','FONET','FORMT','FORTE','FRIGO','FROTO','FZLGY',
    // --- G ---
    'GARAN','GARFA','GEDIK','GEDZA','GENIL','GENTS','GEREL','GESAN','GIPTA','GLBMD','GLCVY','GLRYH','GLYHO','GMTAS','GOLTS','GOODY','GOZDE','GRSEL','GRTRK','GSDDE','GSDHO','GSRAY','GUBRF','GWIND','GZNMI',
    // --- H ---
    'HALKB','HATEK','HATSN','HDFGS','HEDEF','HEKTS','HKTM','HLGYO','HRKET','HTTBT','HUBVC','HUNER','HURGZ',
    // --- I / İ ---
    'ICBCT','IDGYO','IEYHO','IHAAS','IHEVA','IHGZT','IHLAS','IHLGM','IHYAY','IMASM','INDES','INFO','INGRM','INTEM','INVEO','INVES','IPEKE','ISATR','ISBIR','ISBTR','ISCTR','ISDMR','ISFIN','ISGSY','ISGYO','ISKPL','ISMEN','ISSEN','ISYAT','IZENR','IZFAS','IZINV','IZMDC',
    // --- J ---
    'JANTS',
    // --- K ---
    'KAPLM','KAREL','KARSN','KARTN','KARYE','KATMR','KAYSE','KBORU','KCAER','KCHOL','KENT','KERVN','KERVT','KFEIN','KGYO','KIMMR','KLGYO','KLKIM','KLMSN','KLNMA','KLRHO','KLSER','KLSYN','KMPUR','KNFRT','KOCMT','KONKA','KONTR','KONYA','KORDS','KOZAA','KOZAL','KRDMA','KRDMB','KRDMD','KRGYO','KRONT','KRPLS','KRSTL','KRTEK','KRVGD','KSTUR','KTLEV','KTSKR','KUTPO','KUVVA','KUYAS','KZBGY','KZGYO',
    // --- L ---
    'LIDER','LIDFA','LILAK','LINK','LKMNH','LMKDC','LOGO','LRSHO','LUKSK',
    // --- M ---
    'MAALT','MACKO','MAGEN','MAKIM','MAKTK','MANAS','MARBL','MARKA','MARTI','MAVI','MEDTR','MEGAP','MEGMT','MEKAG','MEPET','MERCN','MERIT','MERKO','METRO','METUR','MGROS','MHRGY','MIATK','MNDRS','MNDTR','MOBTL','MOGAN','MPARK','MRGYO','MRSHL','MSGYO','MTRKS','MTRYO','MZHLD',
    // --- N ---
    'NATEN','NETAS','NIBAS','NTGAZ','NTHOL','NUGYO','NUHCM',
    // --- O / Ö ---
    'OBASE','ODAS','OFSYM','ONCSM','ORCAY','ORGE','ORMA','OSMEN','OSTIM','OTKAR','OYAKC','OYAYO','OYLUM','OYYAT','OZGYO','OZKGY','OZRDN','OZSUB','OZYSR',
    // --- P ---
    'PAGYO','PAMEL','PAPIL','PARSN','PASEU','PATEK','PCILT','PEKGY','PENGD','PENTA','PETKM','PETUN','PGSUS','PINSU','PKART','PKENT','PLTUR','PNLSN','PNSUT','POLHO','POLTK','PRDGS','PRKAB','PRKME','PRZMA','PSGYO',
    // --- Q ---
    'QUAGR',
    // --- R ---
    'RALYH','RAYSG','REEDR','RGYAS','RNPOL','RODRG','ROYAL','RTALB','RUBNS','RYGYO','RYSAS',
    // --- S / Ş ---
    'SAFKR','SAHOL','SANEL','SANFM','SANKO','SARKY','SASA','SAYAS','SDTTR','SEGYO','SEKFK','SEKUR','SELEC','SELGD','SELVA','SEYKM','SILVR','SISE','SKBNK','SKTAS','SMART','SMRTG','SNGYO','SNICA','SNPAM','SODSN','SOKE','SOKM','SONME','SRVGY','SUMAS','SUNTK','SURGY','SUWEN',
    // --- T ---
    'TABGD','TARKM','TATEN','TATGD','TAVHL','TBORG','TCELL','TDGYO','TEKTU','TERA','TEZOL','TGSAS','THYAO','TKFEN','TKNSA','TLMAN','TMPOL','TMSN','TNZTP','TOASO','TRCAS','TRGYO','TRILC','TSGYO','TSKB','TSPOR','TTKOM','TTRAK','TUCLK','TUKAS','TUPRS','TURGG','TURSG',
    // --- U / Ü ---
    'ULAS','ULKER','ULUFA','ULUSE','ULUUN','UNLU','USAK','UZERB',
    // --- V ---
    'VAKBN','VAKFN','VAKKO','VANGD','VBTYZ','VERUS','VESBE','VESTL','VKGYO','VKING',
    // --- Y ---
    'YAPRK','YATAS','YAYLA','YBTAS','YEOTK','YESIL','YGGYO','YGYO','YKBNK','YKSLN','YONGA','YUNSA','YYLGD',
    // --- Z ---
    'ZEDUR','ZOREN','ZRGYO'
];

let pair = 'THYAO', tf = '5m';
// Global değişkenler indicators.js içerisinde tanımlanmıştır.

function playAlert() {
    const s = document.getElementById('alertSound');
    if (s) {
        s.currentTime = 0;
        s.play().catch(e => console.log("Ses çalma izni bekleniyor..."));
    }
}

function sLog(m) {
    const e = document.getElementById('sL');
    if (e) e.innerHTML = '<div style="border-bottom:1px solid #001a00;padding:2px 0">' + m + '</div>' + e.innerHTML.substring(0, 1000);
}

function cSt(ok, t) {
    const d = document.getElementById('cD'), ct = document.getElementById('cT');
    if (d) d.className = 'dot ' + (ok ? 'don' : 'doff');
    if (ct) ct.innerText = t || (ok ? 'ONLINE' : 'OFFLINE');
}

// Aranabilir hisse listesini kur
function buildP() {
    const g = document.getElementById('pG');
    if (!g) return;
    const q = (document.getElementById('pSearch')?.value || '').trim().toUpperCase();
    g.innerHTML = '';
    const list = q ? BIST_SYMBOLS.filter(s => s.includes(q)) : BIST_SYMBOLS;
    if (list.length === 0) {
        g.innerHTML = '<div style="grid-column:1/-1;color:var(--dim);font-size:0.7rem;padding:8px;text-align:center">Sonuç yok</div>';
        return;
    }
    const frag = document.createDocumentFragment();
    list.forEach(p => {
        const b = document.createElement('button');
        b.className = 'pbtn' + (p === pair ? ' active' : '');
        b.textContent = p;
        b.onclick = () => swP(p);
        frag.appendChild(b);
    });
    g.appendChild(frag);
}

window.addEventListener('load', () => {
    buildP();
    buildChart();

    // Sidebar aç/kapa mantığı
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

    // Hisse arama
    const search = document.getElementById('pSearch');
    if (search) search.addEventListener('input', buildP);

    // Twelve Data API anahtarı (opsiyonel, localStorage'da saklanır)
    const tdK = document.getElementById('tdKey');
    if (tdK) {
        try { tdK.value = localStorage.getItem('td_apikey') || ''; } catch (e) {}
        tdK.addEventListener('change', () => {
            const v = tdK.value.trim();
            try { localStorage.setItem('td_apikey', v); } catch (e) {}
            sLog(v ? 'Twelve Data anahtarı kaydedildi — yeniden yükleniyor...' : 'Anahtar temizlendi — Yahoo proxy kullanılacak.');
            candles = []; cS.setData([]); isHistLoaded = false;
            loadHist();
        });
    }

    // Zaman dilimi değişimi
    document.getElementById('tfS').onchange = function () {
        tf = this.value;
        candles = [];
        cS.setData([]);
        isHistLoaded = false;
        loadHist(); // loadHist içinde canlı akış da yeniden başlar
    };

    // Ayar değişiminde yeniden hesapla (görseller + QP sinyali)
    ['kH', 'kA', 'rs1', 'rs2', 'qpE', 'qpDrop', 'qpTol', 'qpSwing'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', calcInd);
    });

    // Kalp atışı sayacı (bağlantı canlılık göstergesi)
    setInterval(() => {
        hbCount++;
        const hb = document.getElementById('heartbeat');
        if (hb) hb.innerText = '[' + hbCount + ']';
    }, 1000);

    loadHist();
});
