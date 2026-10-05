// ============ KONFIGURASI ============
const SUPABASE_URL = "https://twxsupmgnmkzsyiqebln.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_9KSdez89Nm7-zE2I2-yzMA_9NPYAMRC";

// ============ TAB NAVIGATION ============
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
        
        if (tab.dataset.tab === 'news') renderNews();
    });
});

// ============ DATA WATCHLIST ============
let watchlist = JSON.parse(localStorage.getItem('fitraWatchlist')) || [
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock' },
    { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
    { symbol: 'bitcoin', name: 'Bitcoin', type: 'crypto' },
    { symbol: 'ethereum', name: 'Ethereum', type: 'crypto' },
    { symbol: 'GC=F', name: 'Gold Futures', type: 'commodity' },
];

// ============ FETCH HARGA ============
async function fetchPrice(symbol, type) {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-price`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ symbol, type })
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        
        if (type !== 'crypto' && data.chart && data.chart.result) {
            const meta = data.chart.result[0].meta;
            return {
                price: meta.regularMarketPrice,
                currency: meta.currency,
                change: meta.regularMarketChangePercent || 0,
                name: meta.longName || meta.shortName
            };
        }
        if (type === 'crypto' && data[symbol]) {
            return {
                price: data[symbol].usd,
                currency: 'USD',
                change: data[symbol].usd_24h_change || 0,
                name: symbol
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching price:', error);
        return null;
    }
}

// ============ FETCH FUNDAMENTAL ============
async function fetchFundamental(symbol, type) {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-fundamental`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ symbol, type })
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        return data.fundamental || {};
    } catch (error) {
        console.error('Error fetching fundamental:', error);
        return {};
    }
}

// ============ RENDER WATCHLIST ============
async function renderWatchlist() {
    const container = document.getElementById('watchlist');
    container.innerHTML = '<div class="empty-state">Memuat data...</div>';
    
    const results = await Promise.all(
        watchlist.map(async (asset) => {
            const priceData = await fetchPrice(asset.symbol, asset.type);
            return { ...asset, priceData };
        })
    );
    
    container.innerHTML = results.map(asset => {
        const p = asset.priceData;
        if (!p) return `
            <div class="asset-card">
                <div class="asset-info">
                    <span class="asset-symbol">${asset.symbol}</span>
                    <span class="asset-name">${asset.name}</span>
                </div>
                <div class="asset-price">
                    <div class="price">-</div>
                    <div class="change">Gagal memuat</div>
                </div>
            </div>
        `;
        
        const trend = p.change >= 0 ? 'up' : 'down';
        const changeStr = (p.change >= 0 ? '+' : '') + p.change.toFixed(2) + '%';
        const priceStr = p.currency === 'IDR' 
            ? 'Rp ' + p.price.toLocaleString('id-ID')
            : '$' + p.price.toLocaleString('en-US', { maximumFractionDigits: 2 });
        
        return `
            <div class="asset-card" onclick="analyzeAsset('${asset.symbol}', '${p.name || asset.name}', ${p.price}, '${asset.type}')">
                <div class="asset-info">
                    <span class="asset-symbol">${asset.symbol}</span>
                    <span class="asset-name">${asset.name}</span>
                </div>
                <div class="asset-price">
                    <div class="price">${priceStr}</div>
                    <div class="change ${trend}">${changeStr}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ============ ANALISIS AI ============
async function analyzeAsset(symbol, name, price, type) {
    const modal = document.createElement('div');
    modal.className = 'analysis-modal';
    modal.id = 'analysisModal';
    modal.innerHTML = `
        <div class="analysis-content">
            <div class="analysis-header">
                <h3>Analisis AI: ${symbol}</h3>
                <button class="analysis-close" onclick="closeAnalysis()">×</button>
            </div>
            <div class="analysis-body" id="analysisBody">
                <div class="loading-spinner"></div>
                <p class="loading-text" id="loadingText">Mengambil data fundamental...</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    try {
        const fundamental = await fetchFundamental(symbol, type);
        document.getElementById('loadingText').textContent = 'Fitra AI sedang menganalisis...';
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-stock`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ symbol, name, price, fundamental })
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        
        document.getElementById('analysisBody').innerHTML = `
            <div class="analysis-result">${formatAnalysis(data.analysis || 'Gagal memuat analisis.')}</div>
        `;
    } catch (error) {
        document.getElementById('analysisBody').innerHTML = `
            <div class="analysis-error">
                <p>❌ Gagal memuat analisis</p>
                <p class="error-detail">${error.message}</p>
            </div>
        `;
    }
}

function formatAnalysis(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

function closeAnalysis() {
    const modal = document.getElementById('analysisModal');
    if (modal) modal.remove();
}

// ============ SCREENER ============
async function runScreener() {
    const results = document.getElementById('screenerResults');
    results.innerHTML = '<div class="empty-state">Screener lagi diproses...</div>';
    
    const peMax = parseFloat(document.getElementById('peMax').value) || 15;
    const pbMax = parseFloat(document.getElementById('pbMax').value) || 1.5;
    const roeMin = (parseFloat(document.getElementById('roeMin').value) || 15) / 100;
    const derMax = parseFloat(document.getElementById('derMax').value) || 1;
    const divMin = (parseFloat(document.getElementById('divMin').value) || 3) / 100;
    
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/run-screener`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ peMax, pbMax, roeMin, derMax, divMin })
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            results.innerHTML = '<div class="empty-state">Gak ada saham yang lolos filter. Coba longgarin kriteria.</div>';
            return;
        }
        
        results.innerHTML = `
            <p class="description">${data.count} saham lolos filter:</p>
            ${data.results.map(stock => `
                <div class="asset-card">
                    <div class="asset-info">
                        <span class="asset-symbol">${stock.symbol}</span>
                        <span class="asset-name">${stock.company_name}</span>
                        <span class="asset-metrics">
                            P/E ${stock.pe_ratio?.toFixed(2)} · 
                            P/B ${stock.pb_ratio?.toFixed(2)} · 
                            ROE ${((stock.roe || 0) * 100).toFixed(1)}% · 
                            Div ${((stock.dividend_yield || 0) * 100).toFixed(1)}%
                        </span>
                    </div>
                </div>
            `).join('')}
        `;
    } catch (error) {
        results.innerHTML = `<div class="empty-state">❌ Gagal: ${error.message}</div>`;
    }
}

document.getElementById('runScreener').addEventListener('click', runScreener);

// ============ NEWS FEED ============
async function renderNews() {
    const container = document.getElementById('newsList');
    container.innerHTML = '<div class="empty-state">Memuat berita...</div>';
    
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-news`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ tickers: 'AAPL,MSFT,NVDA,TSLA,GOOGL' })
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        const news = data.news || [];
        
        if (news.length === 0) {
            container.innerHTML = '<div class="empty-state">Belum ada berita</div>';
            return;
        }
        
        container.innerHTML = news.map(item => {
            const sentimentClass = getSentimentClass(item.overallSentimentLabel);
            const time = formatTime(item.timePublished);
            return `
                <div class="news-card" onclick="window.open('${item.url}', '_blank')">
                    <div class="news-title">${item.title}</div>
                    <div class="news-summary">${item.summary ? item.summary.substring(0, 150) + '...' : ''}</div>
                    <div class="news-meta">
                        <span class="sentiment-tag ${sentimentClass}">${item.overallSentimentLabel || 'Neutral'}</span>
                        <span>${item.source || 'Unknown'}</span>
                        <span>${time}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = `<div class="empty-state">❌ ${error.message}</div>`;
    }
}

function getSentimentClass(label) {
    if (!label) return 'neutral';
    if (label.includes('Bullish')) return 'positive';
    if (label.includes('Bearish')) return 'negative';
    return 'neutral';
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    const year = timeStr.substring(0, 4);
    const month = timeStr.substring(4, 6);
    const day = timeStr.substring(6, 8);
    const hour = timeStr.substring(9, 11);
    const minute = timeStr.substring(11, 13);
    return `${day}/${month}/${year} ${hour}:${minute}`;
}

// ============ INIT ============
renderWatchlist();
