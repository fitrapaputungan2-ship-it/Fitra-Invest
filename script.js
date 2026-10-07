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
        if (tab.dataset.tab === 'portfolio') renderPortfolio();
    });
});

// ============ DATA WATCHLIST ============
let watchlist = JSON.parse(localStorage.getItem('fitraWatchlist')) || [
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock' },
    { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
    { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
    { symbol: 'ETH', name: 'Ethereum', type: 'crypto' },
    { symbol: 'GC=F', name: 'Gold Futures', type: 'commodity' },
];

// ============ DATA PORTFOLIO ============
let portfolio = JSON.parse(localStorage.getItem('fitraPortfolio')) || [];

function savePortfolio() {
    localStorage.setItem('fitraPortfolio', JSON.stringify(portfolio));
}

// ============ TRADINGVIEW SYMBOL MAPPING ============
function getTradingViewSymbol(symbol, type) {
    const upperSymbol = symbol.toUpperCase();
    
    if (type === 'crypto') {
        const cryptoSymbols = {
            'BTC': 'BINANCE:BTCUSDT', 'ETH': 'BINANCE:ETHUSDT',
            'SOL': 'BINANCE:SOLUSDT', 'BNB': 'BINANCE:BNBUSDT',
            'XRP': 'BINANCE:XRPUSDT', 'ADA': 'BINANCE:ADAUSDT',
            'DOGE': 'BINANCE:DOGEUSDT', 'MATIC': 'BINANCE:MATICUSDT',
        };
        return cryptoSymbols[upperSymbol] || 'BINANCE:' + upperSymbol + 'USDT';
    }
    
    if (type === 'commodity') {
        const commoditySymbols = {
            'GC=F': 'TVC:GOLD', 'SI=F': 'TVC:SILVER',
            'CL=F': 'TVC:USOIL', 'NG=F': 'TVC:NATURALGAS',
        };
        return commoditySymbols[upperSymbol] || 'TVC:GOLD';
    }
    
    const nyseStocks = ['JPM', 'V', 'WMT', 'DIS', 'KO', 'MCD', 'NKE', 'GS', 'AXP', 'BA', 'CAT', 'CVX', 'IBM', 'JNJ', 'MMM', 'PG', 'TRV', 'UNH', 'VZ', 'HD', 'HON', 'CRM'];
    if (nyseStocks.includes(upperSymbol)) return 'NYSE:' + upperSymbol;
    return 'NASDAQ:' + upperSymbol;
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
        
        if (type === 'crypto' && data.price) {
            return { price: data.price, currency: 'USD', change: data.change || 0, name: data.name || symbol };
        }
        
        if (type !== 'crypto' && data.chart && data.chart.result) {
            const meta = data.chart.result[0].meta;
            return {
                price: meta.regularMarketPrice,
                currency: meta.currency,
                change: meta.regularMarketChangePercent || 0,
                name: meta.longName || meta.shortName
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
                    <div class="change">Gagal</div>
                </div>
            </div>
        `;
        
        const trend = p.change >= 0 ? 'up' : 'down';
        const changeStr = (p.change >= 0 ? '+' : '') + p.change.toFixed(2) + '%';
        const priceStr = '$' + p.price.toLocaleString('en-US', { maximumFractionDigits: 2 });
        
        return `
            <div class="asset-card" onclick="openAssetDetail('${asset.symbol}', '${p.name || asset.name}', ${p.price}, ${p.change}, '${asset.type}')">
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

// ============ ASSET DETAIL (FUTURISTIC CHART + AI) ============
let currentSymbol = null;
let currentType = null;
let currentPrice = 0;
let currentChange = 0;

async function openAssetDetail(symbol, name, price, change, type) {
    currentSymbol = symbol;
    currentType = type;
    currentPrice = price;
    currentChange = change;
    
    const modal = document.getElementById('chartModal');
    modal.classList.add('active');
    
    document.getElementById('chartTitle').textContent = symbol + ' — ' + name;
    
    // Update price display
    document.getElementById('chartPrice').textContent = '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 });
    const changeEl = document.getElementById('chartChange');
    changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
    changeEl.style.color = change >= 0 ? '#00ff88' : '#ff2e63';
    changeEl.style.textShadow = change >= 0 ? '0 0 10px rgba(0,255,136,0.4)' : '0 0 10px rgba(255,46,99,0.4)';
    
    // Update BID/ASK
    const bid = price * 0.9999;
    const ask = price * 1.0001;
    document.getElementById('bidValue').textContent = '$' + bid.toFixed(2);
    document.getElementById('askValue').textContent = '$' + ask.toFixed(2);
    
    // Update HTF/LTF based on change
    const htfBadge = document.getElementById('htfBadge');
    const ltfBadge = document.getElementById('ltfBadge');
    const direction = change >= 0 ? 'BULLISH' : 'BEARISH';
    htfBadge.textContent = 'HTF: ' + direction;
    ltfBadge.textContent = 'LTF: ' + direction;
    htfBadge.style.color = change >= 0 ? '#00ff88' : '#ff2e63';
    htfBadge.style.borderColor = change >= 0 ? 'rgba(0,255,136,0.3)' : 'rgba(255,46,99,0.3)';
    ltfBadge.style.color = change >= 0 ? '#00ff88' : '#ff2e63';
    ltfBadge.style.borderColor = change >= 0 ? 'rgba(0,255,136,0.3)' : 'rgba(255,46,99,0.3)';
    
    // Simulate EMA20 and RSI
    document.getElementById('emaValue').textContent = (price * 0.98).toFixed(2);
    const rsi = Math.max(20, Math.min(80, 50 + change * 2));
    document.getElementById('rsiValue').textContent = rsi.toFixed(0);
    
    // Reset analysis
    document.getElementById('analysisBody').innerHTML = `
        <div class="loading-spinner"></div>
        <p class="loading-text">Mengambil data fundamental...</p>
    `;
    document.getElementById('analysisStatus').textContent = 'ANALYZING...';
    
    loadTradingViewChart(symbol, type);
    loadAnalysis(symbol, name, price, type);
}

function loadTradingViewChart(symbol, type) {
    const container = document.getElementById('tradingviewContainer');
    container.innerHTML = '';
    
    const tvSymbol = getTradingViewSymbol(symbol, type);
    const widgetId = 'tv_widget_' + Date.now();
    
    const widgetDiv = document.createElement('div');
    widgetDiv.id = widgetId;
    widgetDiv.style.width = '100%';
    widgetDiv.style.height = '100%';
    container.appendChild(widgetDiv);
    
    if (typeof TradingView !== 'undefined') {
        new TradingView.widget({
            "autosize": true,
            "symbol": tvSymbol,
            "interval": "D",
            "timezone": "Asia/Jakarta",
            "theme": "dark",
            "style": "1",
            "locale": "id",
            "enable_publishing": false,
            "allow_symbol_change": false,
            "save_image": false,
            "container_id": widgetId,
            "hide_side_toolbar": false,
            "hide_top_toolbar": false,
            "withdateranges": true,
            "studies": ["STD;RSI", "STD;MACD", "STD;EMA"],
            "show_popup_button": false,
        });
    } else {
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.4);font-size:12px;">TradingView gagal dimuat</div>';
    }
}

async function loadAnalysis(symbol, name, price, type) {
    const container = document.getElementById('analysisBody');
    const statusEl = document.getElementById('analysisStatus');
    
    try {
        const fundamental = await fetchFundamental(symbol, type);
        
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
        
        container.innerHTML = formatAnalysis(data.analysis || 'Gagal memuat analisis.');
        statusEl.textContent = 'ANALYSIS COMPLETE';
        statusEl.style.color = '#00ff88';
    } catch (error) {
        container.innerHTML = `
            <div class="analysis-error">
                <p>❌ Gagal memuat analisis</p>
                <p class="error-detail">${error.message}</p>
            </div>
        `;
        statusEl.textContent = 'ERROR';
        statusEl.style.color = '#ff2e63';
    }
}

function formatAnalysis(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

function closeAssetDetail() {
    document.getElementById('chartModal').classList.remove('active');
    document.getElementById('tradingviewContainer').innerHTML = '';
}

document.getElementById('closeChartModal').addEventListener('click', closeAssetDetail);

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
            results.innerHTML = '<div class="empty-state">Gak ada saham yang lolos filter.</div>';
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
                            P/E ${stock.pe_ratio?.toFixed(2)} · P/B ${stock.pb_ratio?.toFixed(2)} · 
                            ROE ${((stock.roe || 0) * 100).toFixed(1)}% · Div ${((stock.dividend_yield || 0) * 100).toFixed(1)}%
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

// ============ PORTFOLIO ============
async function renderPortfolio() {
    const container = document.getElementById('holdings');
    const totalValueEl = document.getElementById('totalValue');
    const unrealizedPLEl = document.getElementById('unrealizedPL');
    const totalCostEl = document.getElementById('totalCost');
    const totalHoldingsEl = document.getElementById('totalHoldings');
    
    if (portfolio.length === 0) {
        container.innerHTML = '<div class="empty-state">Belum ada holding.</div>';
        totalValueEl.textContent = '$ 0'; unrealizedPLEl.textContent = '$ 0';
        totalCostEl.textContent = '$ 0'; totalHoldingsEl.textContent = '0';
        return;
    }
    
    container.innerHTML = '<div class="empty-state">Memuat harga...</div>';
    
    const holdingsWithPrice = await Promise.all(
        portfolio.map(async (h) => {
            const priceData = await fetchPrice(h.symbol, h.type);
            return { ...h, currentPrice: priceData?.price || 0 };
        })
    );
    
    let totalValue = 0, totalCost = 0;
    
    container.innerHTML = holdingsWithPrice.map(h => {
        const currentValue = h.currentPrice * h.shares;
        const costBasis = h.avgPrice * h.shares;
        const pl = currentValue - costBasis;
        const plPercent = costBasis > 0 ? (pl / costBasis) * 100 : 0;
        
        totalValue += currentValue;
        totalCost += costBasis;
        
        const plClass = pl >= 0 ? 'up' : 'down';
        const plSign = pl >= 0 ? '+' : '';
        
        return `
            <div class="holding-card">
                <div class="holding-info">
                    <span class="holding-symbol">${h.symbol}</span>
                    <span class="holding-detail">${h.shares} × $${h.avgPrice.toFixed(2)} = $${costBasis.toFixed(2)}</span>
                    <span class="holding-detail">Current: $${h.currentPrice.toFixed(2)}</span>
                </div>
                <div class="holding-pl">
                    <span class="holding-value">$${currentValue.toFixed(2)}</span>
                    <span class="holding-pl-amount ${plClass}">${plSign}$${pl.toFixed(2)} (${plSign}${plPercent.toFixed(2)}%)</span>
                </div>
                <button class="holding-delete" onclick="deleteHolding('${h.id}')">×</button>
            </div>
        `;
    }).join('');
    
    const totalPL = totalValue - totalCost;
    const totalPLSign = totalPL >= 0 ? '+' : '';
    
    totalValueEl.textContent = '$ ' + totalValue.toFixed(2);
    unrealizedPLEl.textContent = `${totalPLSign}$${totalPL.toFixed(2)}`;
    unrealizedPLEl.style.color = totalPL >= 0 ? '#00ff88' : '#ff2e63';
    totalCostEl.textContent = '$ ' + totalCost.toFixed(2);
    totalHoldingsEl.textContent = portfolio.length;
}

function deleteHolding(id) {
    if (!confirm('Hapus holding ini?')) return;
    portfolio = portfolio.filter(h => h.id !== id);
    savePortfolio();
    renderPortfolio();
}

// ============ MODAL TAMBAH HOLDING ============
const holdingModal = document.getElementById('holdingModal');

document.getElementById('addHolding').addEventListener('click', () => holdingModal.classList.add('active'));
document.getElementById('closeHoldingModal').addEventListener('click', () => holdingModal.classList.remove('active'));
document.getElementById('cancelHolding').addEventListener('click', () => holdingModal.classList.remove('active'));

document.getElementById('saveHolding').addEventListener('click', () => {
    const symbol = document.getElementById('holdingSymbol').value.trim().toUpperCase();
    const name = document.getElementById('holdingName').value.trim();
    const type = document.getElementById('holdingType').value;
    const shares = parseFloat(document.getElementById('holdingShares').value);
    const avgPrice = parseFloat(document.getElementById('holdingAvgPrice').value);
    
    if (!symbol || !name || !shares || !avgPrice) { alert('Isi semua field!'); return; }
    
    portfolio.push({
        id: 'holding-' + Date.now(),
        symbol, name, type, shares, avgPrice,
        addedAt: Date.now()
    });
    
    savePortfolio();
    holdingModal.classList.remove('active');
    document.getElementById('holdingSymbol').value = '';
    document.getElementById('holdingName').value = '';
    document.getElementById('holdingShares').value = '';
    document.getElementById('holdingAvgPrice').value = '';
    
    renderPortfolio();
});

// ============ NEWS FEED ============
async function renderNews() {
    const container = document.getElementById('newsList');
    container.innerHTML = '<div class="empty-state">Memuat berita...</div>';
    
    try {
        // Update market pulse based on watchlist (simulated from BTC change)
        const btcPrice = await fetchPrice('BTC', 'crypto');
        if (btcPrice) {
            const buyers = Math.max(20, Math.min(80, 50 + btcPrice.change * 3));
            const sellers = 100 - buyers;
            document.getElementById('pulseBuyers').style.width = buyers + '%';
            document.getElementById('pulseBuyers').textContent = `BUYERS ${buyers.toFixed(0)}%`;
            document.getElementById('pulseSellers').style.width = sellers + '%';
            document.getElementById('pulseSellers').textContent = `SELLERS ${sellers.toFixed(0)}%`;
        }
        
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
