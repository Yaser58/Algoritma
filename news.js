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

async function fetchFFNews() {
    const box   = document.getElementById('ffNewsBox');
    const list  = document.getElementById('ffNewsList');
    if (!list) return;

    list.innerHTML = '<div class="ff-loading">YÜKLENİYOR...</div>';

    try {
        const url = PROXY + encodeURIComponent(FF_RSS);
        const res = await fetch(url);
        
        if (!res.ok) throw new Error(`HTTP Hata! Statü: ${res.status}`);
        
        const text = await res.text();

        const parser = new DOMParser();
        const xml    = parser.parseFromString(text, 'text/xml');
        const items  = Array.from(xml.querySelectorAll('item')).slice(0, 12);

        if (!items.length) throw new Error('Haber bulunamadı');

        list.innerHTML = '';
        items.forEach(item => {
            const title   = item.querySelector('title')?.textContent   || '';
            const pubDate = item.querySelector('pubDate')?.textContent || '';
            const desc    = item.querySelector('description')?.textContent || '';

            // Basit impact tahmini: başlık/açıklama içeriğinden
            let impact = '#555';
            if (/high/i.test(title + desc))   impact = '#ff0000';
            else if (/medium/i.test(title + desc)) impact = '#ffaa00';
            else if (/low/i.test(title + desc))    impact = '#00ff41';

            const row = document.createElement('div');
            row.className = 'ff-row';
            row.innerHTML = `
                <span class="ff-dot" style="background:${impact};box-shadow:0 0 4px ${impact}"></span>
                <span class="ff-time">${formatTime(pubDate)}</span>
                <span class="ff-title">${title.replace(/\[.*?\]/g, '').trim()}</span>
            `;
            list.appendChild(row);
        });

        // Son güncelleme zamanı
        document.getElementById('ffLastUpdate').textContent =
            'SON: ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    } catch (err) {
        list.innerHTML = `<div class="ff-loading" style="color:#ff4444">HATA: ${err.message}</div>`;
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
