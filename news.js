// ─── ForexFactory Haber Widget ───────────────────────────────────────────────

const FF_RSS  = 'https://forexfactory.com/rss';
const PROXY   = 'https://corsproxy.io/?';
const NEWS_INTERVAL = 5 * 60 * 1000; // 5 dakikada bir yenile

function impactColor(title) {
    const t = (title || '').toLowerCase();
    if (t.includes('high')   || t.includes('yüksek')) return '#ff0000';
    if (t.includes('medium') || t.includes('orta'))   return '#ffaa00';
    if (t.includes('low')    || t.includes('düşük'))  return '#00ff41';
    return '#555';
}

function formatTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return '—';
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

async function fetchWithFallback(targetUrl) {
    // rss2json servisi daha stabil ve CONNECTION_RESET hatalarına karşı daha dirençli
    const rss2json = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(targetUrl)}`;
    
    try {
        const res = await fetch(rss2json);
        if (res.ok) {
            const data = await res.json();
            if (data.status === 'ok') return data.items;
        }
    } catch (e) {
        console.warn("rss2json failed, trying direct proxy...");
    }

    // Yedek: Klasik proxy yöntemleri
    const proxies = [
        'https://api.codetabs.com/v1/proxy?quest=',
        'https://corsproxy.io/?'
    ];

    for (const proxy of proxies) {
        try {
            const res = await fetch(proxy + encodeURIComponent(targetUrl));
            if (res.ok) {
                const text = await res.text();
                const parser = new DOMParser();
                const xml = parser.parseFromString(text, 'text/xml');
                return Array.from(xml.querySelectorAll('item')).map(item => ({
                    title: item.querySelector('title')?.textContent || '',
                    pubDate: item.querySelector('pubDate')?.textContent || '',
                    description: item.querySelector('description')?.textContent || ''
                }));
            }
        } catch (e) { continue; }
    }
    throw new Error('Haber servisine ulaşılamıyor.');
}

async function fetchFFNews() {
    const list = document.getElementById('ffNewsList');
    if (!list) return;

    list.innerHTML = '<div class="ff-loading">VERİLER ALINIYOR...</div>';

    try {
        const items = await fetchWithFallback(FF_RSS);
        
        if (!items || !items.length) throw new Error('Haber bulunamadı');

        list.innerHTML = '';
        items.slice(0, 12).forEach(item => {
            const title = item.title || '';
            const pubDate = item.pubDate || '';
            const desc = item.description || '';

            let impact = '#555';
            if (/high/i.test(title + desc)) impact = '#ff0000';
            else if (/medium/i.test(title + desc)) impact = '#ffaa00';
            else if (/low/i.test(title + desc)) impact = '#00ff41';

            const row = document.createElement('div');
            row.className = 'ff-row';
            row.innerHTML = `
                <span class="ff-dot" style="background:${impact};box-shadow:0 0 4px ${impact}"></span>
                <span class="ff-time">${formatTime(pubDate)}</span>
                <span class="ff-title" title="${title}">${title.replace(/\[.*?\]/g, '').trim()}</span>
            `;
            list.appendChild(row);
        });

        document.getElementById('ffLastUpdate').textContent =
            'SON: ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    } catch (err) {
        list.innerHTML = `
            <div class="ff-loading" style="color:#ff4444;cursor:pointer;font-size:0.65rem" onclick="fetchFFNews()">
                BAĞLANTI HATASI<br>
                <span style="font-size:0.6rem;text-decoration:underline;color:var(--dim)">TEKRAR DENE</span>
            </div>`;
    }
}

function initNewsWidget() {
    fetchFFNews();
    setInterval(fetchFFNews, NEWS_INTERVAL);

    // Kapat/aç toggle
    const toggleBtn = document.getElementById('ffToggle');
    const newsBody  = document.getElementById('ffNewsList');
    if (toggleBtn && newsBody) {
        toggleBtn.addEventListener('click', () => {
            const collapsed = newsBody.style.display === 'none';
            newsBody.style.display = collapsed ? 'block' : 'none';
            toggleBtn.textContent  = collapsed ? '▲' : '▼';
        });
    }
}

// DOM hazır olduğunda başlat
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNewsWidget);
} else {
    initNewsWidget();
}
