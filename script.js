// ============ KONFIGURASI ============
const SUPABASE_URL = "https://twxsupmgnmkzsyiqebln.supabase.co";
const SUPABASE_ANON_KEY = "MASUKIN_ANON_KEY_DISINI";

// ============ TAB NAVIGATION ============
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
});

// ============ DATA WATCHLIST (SAHAM GLOBAL + CRYPTO + KOMODITI) ============
let watchlist = JSON.parse(localStorage.getItem('fitraWatchlist')) || [
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock' },
    { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
    { symbol: 'bitcoin', name: 'Bitcoin', type: 'crypto' },
    { symbol: 'ethereum', name: 'Ethereum', type: 'crypto' },
    { symbol: 'GC=F', name: 'Gold Futures', type: 'commodity' },
    { symbol: 'CL=F', name: 'Crude Oil', type: 'commodity' },
];

function saveWatchlist() {
    localStorage.setItem('fitraWatchlist', JSON.stringify(watchlist));
}

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
        if (!p) {
            return `
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
        }
        
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
            body: JSON.stringify({
                symbol: symbol,
                name: name,
                price: price,
                fundamental: fundamental
            })
        });
        
        if (!response.ok) throw new Error('HTTP ' + response.status);
        
        const data = await response.json();
        const analysis = data.analysis || 'Gagal memuat analisis.';
        
        document.getElementById('analysisBody').innerHTML = `
            <div class="analysis-result">${formatAnalysis(analysis)}</div>
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
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

function closeAnalysis() {
    const modal = document.getElementById('analysisModal');
    if (modal) modal.remove();
}

// ============ SCREENER ============
document.getElementById('runScreener').addEventListener('click', () => {
    const results = document.getElementById('screenerResults');
    results.innerHTML = '<div class="empty-state">Screener lagi diproses... (Fitur ini butuh data fundamental dari API)</div>';
});

// ============ INIT ============
renderWatchlist();
