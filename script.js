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
    });
});

// ============ DATA WATCHLIST ============
let watchlist = JSON.parse(localStorage.getItem('fitraWatchlist')) || [
    { symbol: 'BBCA.JK', name: 'Bank Central Asia', type: 'stock' },
    { symbol: 'BBRI.JK', name: 'Bank Rakyat Indonesia', type: 'stock' },
    { symbol: 'bitcoin', name: 'Bitcoin', type: 'crypto' },
    { symbol: 'XAUUSD', name: 'Gold Spot', type: 'commodity' },
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
        
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        
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
            <div class="asset-card" onclick="analyzeAsset('${asset.symbol}', '${p.name || asset.name}', ${p.price})">
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
async function analyzeAsset(symbol, name, price) {
    alert(`Menganalisis ${symbol}...\n\nFitur analisis AI bakal muncul di sini.\n\n(Kita bakal sambungin ke Edge Function analyze-stock)`);
}

// ============ SCREENER ============
document.getElementById('runScreener').addEventListener('click', () => {
    const results = document.getElementById('screenerResults');
    results.innerHTML = '<div class="empty-state">Screener lagi diproses... (Fitur ini butuh data fundamental dari API)</div>';
});

// ============ INIT ============
renderWatchlist();
