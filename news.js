// ─── Finansal Haber Widget ───────────────────────────────────────────────

const SOURCES = [
    { name: 'ForexFactory', url: 'https://www.forexfactory.com/rss.php' },
    { name: 'DailyFX', url: 'https://www.dailyfx.com/feeds/forex-market-news' }
];

const PROXY_LIST = [
    'https://api.rss2json.com/v1/api.json?rss_url=',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://corsproxy.io/?'
];

function impactColor(title, desc) {
    const text = (title + ' ' + desc).toLowerCase();
    if (text.includes('high') || text.includes('yüksek') || text.includes('critical')) return '#ff0000';
    if (text.includes('medium') || text.includes('orta') || text.includes('important')) return '#ffaa00';
    if (text.includes('low') || text.includes('düşük')) return '#00ff41';
    return '#555';
}

function formatTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return '—';
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

async function fetchNewsFromSource(source) {
    for (const proxyBase of PROXY_LIST) {
        try {
            const url = proxyBase + encodeURIComponent(source.url);
            const res = await fetch(url);
            if (!res.ok) continue;

            if (proxyBase.includes('rss2json')) {
                const data = await res.json();
                if (data.status === 'ok') {
                    return data.items.map(item => ({
                        title: item.title,
                        pubDate: item.pubDate,
                        description: item.description,
                        source: source.name
                    }));
                }
            } else {
                const text = await res.text();
                const parser = new DOMParser();
                const xml = parser.parseFromString(text, 'text/xml');
                if (xml.getElementsByTagName("parsererror").length > 0) continue;
                
                return Array.from(xml.querySelectorAll('item')).map(item => ({
                    title: item.querySelector('title')?.textContent || '',
                    pubDate: item.querySelector('pubDate')?.textContent || '',
                    description: item.querySelector('description')?.textContent || '',
                    source: source.name
                }));
            }
        } catch (e) {
            console.warn(`${source.name} via ${proxyBase} failed`);
        }
    }
    return null;
}

async function fetchFFNews() {
    const list = document.getElementById('ffNewsList');
    if (!list) return;

    list.innerHTML = '<div class="ff-loading">HABERLER TARANIYOR...</div>';

    let allNews = [];
    
    // Her iki kaynağı da dene
    for (const source of SOURCES) {
        const news = await fetchNewsFromSource(source);
        if (news && news.length) {
            allNews = allNews.concat(news);
            break; // Birinden veri aldıysak yeterli
        }
    }

    if (!allNews.length) {
        list.innerHTML = `
            <div class="ff-loading" style="color:#ff4444;cursor:pointer;font-size:0.6rem" onclick="fetchFFNews()">
                BAĞLANTI SORUNU<br>
                (Proxy veya Kaynak Engeli)<br>
                <span style="text-decoration:underline">TEKRAR DENE</span>
            </div>`;
        return;
    }

    // Tarihe göre sırala (en yeni üstte)
    allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    list.innerHTML = '';
    allNews.slice(0, 15).forEach(item => {
        const impact = impactColor(item.title, item.description);
        const row = document.createElement('div');
        row.className = 'ff-row';
        row.innerHTML = `
            <span class="ff-dot" style="background:${impact};box-shadow:0 0 4px ${impact}"></span>
            <span class="ff-time">${formatTime(item.pubDate)}</span>
            <span class="ff-title" title="${item.title}">${item.title.replace(/\[.*?\]/g, '').trim()}</span>
        `;
        list.appendChild(row);
    });

    document.getElementById('ffLastUpdate').textContent =
        'SON: ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function initNewsWidget() {
    fetchFFNews();
    setInterval(fetchFFNews, 5 * 60 * 1000);

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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNewsWidget);
} else {
    initNewsWidget();
}
