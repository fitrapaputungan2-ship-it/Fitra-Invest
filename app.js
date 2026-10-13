// ============ KONFIGURASI ============
const SUPABASE_URL = "https://twxsupmgnmkzsyiqebln.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_9KSdez89Nm7-zE2I2-yzMA_9NPYAMRC";

let indicatorInterval = null;
let alertCheckInterval = null;
let currentChart = null;
let candleSeries = null;
let volumeSeries = null;
let currentTimeframe = 'Y';
let currentBrowseCategory = 'all';
let currentAlertDirection = 'above';
let currentAlertSymbol = null;
let currentAlertName = null;
let currentAlertType = null;
let currentAlertPrice = 0;

// ============ STOCK UNIVERSE (130+ ASET) ============
const STOCK_UNIVERSE = [
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', category: 'us-tech' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock', category: 'us-tech' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', category: 'us-tech' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', category: 'us-tech' },
    { symbol: 'META', name: 'Meta Platforms Inc.', type: 'stock', category: 'us-tech' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock', category: 'us-tech' },
    { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', category: 'us-tech' },
    { symbol: 'AMD', name: 'Advanced Micro Devices', type: 'stock', category: 'us-tech' },
    { symbol: 'INTC', name: 'Intel Corp.', type: 'stock', category: 'us-tech' },
    { symbol: 'ORCL', name: 'Oracle Corp.', type: 'stock', category: 'us-tech' },
    { symbol: 'CRM', name: 'Salesforce Inc.', type: 'stock', category: 'us-tech' },
    { symbol: 'ADBE', name: 'Adobe Inc.', type: 'stock', category: 'us-tech' },
    { symbol: 'NFLX', name: 'Netflix Inc.', type: 'stock', category: 'us-tech' },
    { symbol: 'AVGO', name: 'Broadcom Inc.', type: 'stock', category: 'us-tech' },
    { symbol: 'QCOM', name: 'Qualcomm Inc.', type: 'stock', category: 'us-tech' },
    { symbol: 'TXN', name: 'Texas Instruments', type: 'stock', category: 'us-tech' },
    { symbol: 'CSCO', name: 'Cisco Systems', type: 'stock', category: 'us-tech' },
    { symbol: 'IBM', name: 'IBM Corp.', type: 'stock', category: 'us-tech' },
    { symbol: 'NOW', name: 'ServiceNow Inc.', type: 'stock', category: 'us-tech' },
    { symbol: 'UBER', name: 'Uber Technologies', type: 'stock', category: 'us-tech' },
    { symbol: 'SHOP', name: 'Shopify Inc.', type: 'stock', category: 'us-tech' },
    { symbol: 'SNOW', name: 'Snowflake Inc.', type: 'stock', category: 'us-tech' },
    { symbol: 'PLTR', name: 'Palantir Technologies', type: 'stock', category: 'us-tech' },
    { symbol: 'SQ', name: 'Block Inc.', type: 'stock', category: 'us-tech' },
    { symbol: 'PYPL', name: 'PayPal Holdings', type: 'stock', category: 'us-tech' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', type: 'stock', category: 'us-finance' },
    { symbol: 'BAC', name: 'Bank of America', type: 'stock', category: 'us-finance' },
    { symbol: 'WFC', name: 'Wells Fargo & Co.', type: 'stock', category: 'us-finance' },
    { symbol: 'GS', name: 'Goldman Sachs', type: 'stock', category: 'us-finance' },
    { symbol: 'MS', name: 'Morgan Stanley', type: 'stock', category: 'us-finance' },
    { symbol: 'V', name: 'Visa Inc.', type: 'stock', category: 'us-finance' },
    { symbol: 'MA', name: 'Mastercard Inc.', type: 'stock', category: 'us-finance' },
    { symbol: 'AXP', name: 'American Express', type: 'stock', category: 'us-finance' },
    { symbol: 'BLK', name: 'BlackRock Inc.', type: 'stock', category: 'us-finance' },
    { symbol: 'C', name: 'Citigroup Inc.', type: 'stock', category: 'us-finance' },
    { symbol: 'SCHW', name: 'Charles Schwab', type: 'stock', category: 'us-finance' },
    { symbol: 'BRK-B', name: 'Berkshire Hathaway B', type: 'stock', category: 'us-finance' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', type: 'stock', category: 'us-healthcare' },
    { symbol: 'PFE', name: 'Pfizer Inc.', type: 'stock', category: 'us-healthcare' },
    { symbol: 'UNH', name: 'UnitedHealth Group', type: 'stock', category: 'us-healthcare' },
    { symbol: 'ABBV', name: 'AbbVie Inc.', type: 'stock', category: 'us-healthcare' },
    { symbol: 'LLY', name: 'Eli Lilly and Co.', type: 'stock', category: 'us-healthcare' },
    { symbol: 'MRK', name: 'Merck & Co.', type: 'stock', category: 'us-healthcare' },
    { symbol: 'TMO', name: 'Thermo Fisher Scientific', type: 'stock', category: 'us-healthcare' },
    { symbol: 'ABT', name: 'Abbott Laboratories', type: 'stock', category: 'us-healthcare' },
    { symbol: 'DHR', name: 'Danaher Corp.', type: 'stock', category: 'us-healthcare' },
    { symbol: 'BMY', name: 'Bristol-Myers Squibb', type: 'stock', category: 'us-healthcare' },
    { symbol: 'AMGN', name: 'Amgen Inc.', type: 'stock', category: 'us-healthcare' },
    { symbol: 'GILD', name: 'Gilead Sciences', type: 'stock', category: 'us-healthcare' },
    { symbol: 'WMT', name: 'Walmart Inc.', type: 'stock', category: 'us-consumer' },
    { symbol: 'COST', name: 'Costco Wholesale', type: 'stock', category: 'us-consumer' },
    { symbol: 'HD', name: 'Home Depot Inc.', type: 'stock', category: 'us-consumer' },
    { symbol: 'MCD', name: 'McDonald\'s Corp.', type: 'stock', category: 'us-consumer' },
    { symbol: 'NKE', name: 'Nike Inc.', type: 'stock', category: 'us-consumer' },
    { symbol: 'SBUX', name: 'Starbucks Corp.', type: 'stock', category: 'us-consumer' },
    { symbol: 'KO', name: 'Coca-Cola Co.', type: 'stock', category: 'us-consumer' },
    { symbol: 'PEP', name: 'PepsiCo Inc.', type: 'stock', category: 'us-consumer' },
    { symbol: 'PG', name: 'Procter & Gamble', type: 'stock', category: 'us-consumer' },
    { symbol: 'DIS', name: 'Walt Disney Co.', type: 'stock', category: 'us-consumer' },
    { symbol: 'TGT', name: 'Target Corp.', type: 'stock', category: 'us-consumer' },
    { symbol: 'LOW', name: 'Lowe\'s Companies', type: 'stock', category: 'us-consumer' },
    { symbol: 'BKNG', name: 'Booking Holdings', type: 'stock', category: 'us-consumer' },
    { symbol: 'LULU', name: 'Lululemon Athletica', type: 'stock', category: 'us-consumer' },
    { symbol: 'BA', name: 'Boeing Co.', type: 'stock', category: 'us-industrial' },
    { symbol: 'CAT', name: 'Caterpillar Inc.', type: 'stock', category: 'us-industrial' },
    { symbol: 'GE', name: 'General Electric', type: 'stock', category: 'us-industrial' },
    { symbol: 'MMM', name: '3M Company', type: 'stock', category: 'us-industrial' },
    { symbol: 'HON', name: 'Honeywell International', type: 'stock', category: 'us-industrial' },
    { symbol: 'UPS', name: 'United Parcel Service', type: 'stock', category: 'us-industrial' },
    { symbol: 'LMT', name: 'Lockheed Martin', type: 'stock', category: 'us-industrial' },
    { symbol: 'RTX', name: 'Raytheon Technologies', type: 'stock', category: 'us-industrial' },
    { symbol: 'DE', name: 'Deere & Company', type: 'stock', category: 'us-industrial' },
    { symbol: 'F', name: 'Ford Motor Co.', type: 'stock', category: 'us-industrial' },
    { symbol: 'GM', name: 'General Motors', type: 'stock', category: 'us-industrial' },
    { symbol: 'XOM', name: 'Exxon Mobil Corp.', type: 'stock', category: 'us-energy' },
    { symbol: 'CVX', name: 'Chevron Corp.', type: 'stock', category: 'us-energy' },
    { symbol: 'COP', name: 'ConocoPhillips', type: 'stock', category: 'us-energy' },
    { symbol: 'SLB', name: 'Schlumberger Ltd.', type: 'stock', category: 'us-energy' },
    { symbol: 'NEE', name: 'NextEra Energy', type: 'stock', category: 'us-energy' },
    { symbol: 'OXY', name: 'Occidental Petroleum', type: 'stock', category: 'us-energy' },
    { symbol: 'TSM', name: 'Taiwan Semiconductor', type: 'stock', category: 'international' },
    { symbol: 'ASML', name: 'ASML Holding N.V.', type: 'stock', category: 'international' },
    { symbol: 'BABA', name: 'Alibaba Group', type: 'stock', category: 'international' },
    { symbol: 'TM', name: 'Toyota Motor Corp.', type: 'stock', category: 'international' },
    { symbol: 'SONY', name: 'Sony Group Corp.', type: 'stock', category: 'international' },
    { symbol: 'SAP', name: 'SAP SE', type: 'stock', category: 'international' },
    { symbol: 'NESN.SW', name: 'Nestlé S.A.', type: 'stock', category: 'international' },
    { symbol: 'LVMH.PA', name: 'LVMH Moët Hennessy', type: 'stock', category: 'international' },
    { symbol: 'SHEL', name: 'Shell plc', type: 'stock', category: 'international' },
    { symbol: 'AZN', name: 'AstraZeneca PLC', type: 'stock', category: 'international' },
    { symbol: 'NVO', name: 'Novo Nordisk A/S', type: 'stock', category: 'international' },
    { symbol: 'HSBC', name: 'HSBC Holdings', type: 'stock', category: 'international' },
    { symbol: 'TCEHY', name: 'Tencent Holdings', type: 'stock', category: 'international' },
    { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', category: 'crypto' },
    { symbol: 'ETH', name: 'Ethereum', type: 'crypto', category: 'crypto' },
    { symbol: 'SOL', name: 'Solana', type: 'crypto', category: 'crypto' },
    { symbol: 'BNB', name: 'Binance Coin', type: 'crypto', category: 'crypto' },
    { symbol: 'XRP', name: 'Ripple', type: 'crypto', category: 'crypto' },
    { symbol: 'ADA', name: 'Cardano', type: 'crypto', category: 'crypto' },
    { symbol: 'DOGE', name: 'Dogecoin', type: 'crypto', category: 'crypto' },
    { symbol: 'AVAX', name: 'Avalanche', type: 'crypto', category: 'crypto' },
    { symbol: 'DOT', name: 'Polkadot', type: 'crypto', category: 'crypto' },
    { symbol: 'MATIC', name: 'Polygon', type: 'crypto', category: 'crypto' },
    { symbol: 'LINK', name: 'Chainlink', type: 'crypto', category: 'crypto' },
    { symbol: 'LTC', name: 'Litecoin', type: 'crypto', category: 'crypto' },
    { symbol: 'ATOM', name: 'Cosmos', type: 'crypto', category: 'crypto' },
    { symbol: 'TRX', name: 'TRON', type: 'crypto', category: 'crypto' },
    { symbol: 'GC=F', name: 'Gold Futures', type: 'commodity', category: 'commodity' },
    { symbol: 'SI=F', name: 'Silver Futures', type: 'commodity', category: 'commodity' },
    { symbol: 'CL=F', name: 'Crude Oil WTI', type: 'commodity', category: 'commodity' },
    { symbol: 'NG=F', name: 'Natural Gas', type: 'commodity', category: 'commodity' },
    { symbol: 'HG=F', name: 'Copper Futures', type: 'commodity', category: 'commodity' },
    { symbol: 'PL=F', name: 'Platinum Futures', type: 'commodity', category: 'commodity' },
    { symbol: 'ZC=F', name: 'Corn Futures', type: 'commodity', category: 'commodity' },
    { symbol: 'ZW=F', name: 'Wheat Futures', type: 'commodity', category: 'commodity' },
    { symbol: '^GSPC', name: 'S&P 500', type: 'stock', category: 'index' },
    { symbol: '^DJI', name: 'Dow Jones Industrial', type: 'stock', category: 'index' },
    { symbol: '^IXIC', name: 'NASDAQ Composite', type: 'stock', category: 'index' },
    { symbol: '^RUT', name: 'Russell 2000', type: 'stock', category: 'index' },
    { symbol: '^N225', name: 'Nikkei 225', type: 'stock', category: 'index' },
    { symbol: '^HSI', name: 'Hang Seng Index', type: 'stock', category: 'index' },
    { symbol: '^FTSE', name: 'FTSE 100', type: 'stock', category: 'index' },
    { symbol: '^GDAXI', name: 'DAX Index', type: 'stock', category: 'index' },
];

// ============ MARKET MOVERS UNIVERSE ============
const MOVERS_UNIVERSE = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'AMD', 'INTC', 'NFLX', 'AVGO', 'ADBE',
    'JPM', 'BAC', 'V', 'MA', 'GS', 'WFC',
    'WMT', 'DIS', 'MCD', 'NKE', 'SBUX', 'KO', 'PEP',
    'JNJ', 'PFE', 'UNH', 'LLY',
    'BTC', 'ETH', 'SOL', 'BNB', 'XRP'
];

let marketMoversData = { gainers: [], losers: [] };

// ============ TAB NAV ============
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
function saveWatchlist() { localStorage.setItem('fitraWatchlist', JSON.stringify(watchlist)); }

// ============ DATA FAVORITES ⭐ ============
let favorites = JSON.parse(localStorage.getItem('fitraFavorites')) || [];
function saveFavorites() { localStorage.setItem('fitraFavorites', JSON.stringify(favorites)); }
function isFavorite(symbol) { return favorites.includes(symbol); }
function toggleFavorite(symbol, event) {
    if (event) event.stopPropagation();
    const idx = favorites.indexOf(symbol);
    if (idx >= 0) {
        favorites.splice(idx, 1);
    } else {
        favorites.push(symbol);
    }
    saveFavorites();
    renderWatchlist();
}

// ============ DATA ALERTS 🔔 ============
let alerts = JSON.parse(localStorage.getItem('fitraAlerts')) || [];
function saveAlerts() { localStorage.setItem('fitraAlerts', JSON.stringify(alerts)); }
function hasAlert(symbol) { return alerts.some(a => a.symbol === symbol); }

function openAlertModal(symbol, name, price, type) {
    currentAlertSymbol = symbol;
    currentAlertName = name;
    currentAlertType = type;
    currentAlertPrice = price;
    currentAlertDirection = 'above';
    
    document.getElementById('alertSymbol').textContent = symbol;
    document.getElementById('alertName').textContent = name;
    document.getElementById('alertCurrentPrice').textContent = 'Harga Sekarang: $' + price.toLocaleString('en-US', { maximumFractionDigits: 2 });
    document.getElementById('alertTargetPrice').value = '';
    document.getElementById('alertNote').value = '';
    
    // Reset direction buttons
    document.querySelectorAll('.direction-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.direction-btn[data-dir="above"]').classList.add('active');
    
    updateAlertPreview();
    
    document.getElementById('alertModal').classList.add('active');
    
    // Auto-focus ke input target
    setTimeout(() => document.getElementById('alertTargetPrice').focus(), 300);
}

function closeAlertModal() {
    document.getElementById('alertModal').classList.remove('active');
}

function updateAlertPreview() {
    const targetInput = document.getElementById('alertTargetPrice').value;
    const preview = document.getElementById('alertPreview');
    
    if (!targetInput || isNaN(parseFloat(targetInput))) {
        preview.innerHTML = '<span class="alert-preview-icon">🔔</span><span class="alert-preview-text">Alert bakal aktif kalau harga nyentuh target</span>';
        return;
    }
    
    const target = parseFloat(targetInput);
    const dirText = currentAlertDirection === 'above' ? 'naik ke atas' : 'turun ke bawah';
    const targetStr = '$' + target.toLocaleString('en-US', { maximumFractionDigits: 2 });
    
    preview.innerHTML = `<span class="alert-preview-icon">🔔</span><span class="alert-preview-text">Notif kalau <strong>${currentAlertSymbol}</strong> ${dirText} <strong>${targetStr}</strong></span>`;
}

function saveAlert() {
    const targetInput = document.getElementById('alertTargetPrice').value;
    const note = document.getElementById('alertNote').value.trim();
    
    if (!targetInput || isNaN(parseFloat(targetInput))) {
        alert('Isi target harga dulu, kontol!');
        return;
    }
    
    const target = parseFloat(targetInput);
    
    // Validasi: kalau "above", target harus > current price. Kalau "below", target harus < current price
    if (currentAlertDirection === 'above' && target <= currentAlertPrice) {
        alert('⚠️ Buat alert "Di Atas", target harus LEBIH TINGGI dari harga sekarang!');
        return;
    }
    if (currentAlertDirection === 'below' && target >= currentAlertPrice) {
        alert('⚠️ Buat alert "Di Bawah", target harus LEBIH RENDAH dari harga sekarang!');
        return;
    }
    
    // Check duplikat (same symbol + direction)
    const existing = alerts.find(a => a.symbol === currentAlertSymbol && a.direction === currentAlertDirection && !a.triggered);
    if (existing) {
        if (!confirm(`Udah ada alert ${currentAlertDirection === 'above' ? '↑ Above' : '↓ Below'} buat ${currentAlertSymbol}. Ganti aja?`)) {
            return;
        }
        alerts = alerts.filter(a => a.id !== existing.id);
    }
    
    const newAlert = {
        id: 'alert-' + Date.now(),
        symbol: currentAlertSymbol,
        name: currentAlertName,
        type: currentAlertType,
        targetPrice: target,
        direction: currentAlertDirection,
        note: note,
        createdAt: Date.now(),
        triggered: false
    };
    
    alerts.push(newAlert);
    saveAlerts();
    closeAlertModal();
    renderPriceAlerts();
    renderWatchlist(); // Refresh biar badge 🔔 muncul
    
    // Show success toast
    showAlertToast({
        symbol: currentAlertSymbol,
        name: currentAlertName,
        targetPrice: target,
        direction: currentAlertDirection,
        note: note
    }, null, true);
}

function deleteAlert(id, event) {
    if (event) event.stopPropagation();
    if (!confirm('Hapus alert ini?')) return;
    alerts = alerts.filter(a => a.id !== id);
    saveAlerts();
    renderPriceAlerts();
    renderWatchlist();
}

async function checkAlerts() {
    if (alerts.length === 0) return;
    
    const activeAlerts = alerts.filter(a => !a.triggered);
    if (activeAlerts.length === 0) return;
    
    // Fetch harga parallel
    const results = await Promise.all(activeAlerts.map(async (alert) => {
        const price = await fetchPrice(alert.symbol, alert.type);
        return { alert, currentPrice: price ? price.price : null };
    }));
    
    let hasNewTrigger = false;
    
    results.forEach(({ alert, currentPrice }) => {
        if (currentPrice == null) return;
        
        let triggered = false;
        if (alert.direction === 'above' && currentPrice >= alert.targetPrice) triggered = true;
        if (alert.direction === 'below' && currentPrice <= alert.targetPrice) triggered = true;
        
        if (triggered) {
            alert.triggered = true;
            alert.triggeredAt = Date.now();
            alert.triggeredPrice = currentPrice;
            hasNewTrigger = true;
            showAlertToast(alert, currentPrice);
        }
    });
    
    if (hasNewTrigger) {
        saveAlerts();
        renderPriceAlerts();
        renderWatchlist();
    }
}

function showAlertToast(alert, currentPrice, isNewSet = false) {
    const toast = document.getElementById('alertToast');
    const title = document.getElementById('alertToastTitle');
    const message = document.getElementById('alertToastMessage');
    
    if (isNewSet) {
        title.textContent = '🔔 Alert Aktif!';
        const dir = alert.direction === 'above' ? '↑ naik ke' : '↓ turun ke';
        message.textContent = `${alert.symbol} bakal notif kalau ${dir} $${alert.targetPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    } else {
        title.textContent = '🔔 PRICE ALERT TRIGGERED!';
        const dir = alert.direction === 'above' ? '↑ naik ke atas' : '↓ turun ke bawah';
        const cpStr = '$' + currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 });
        message.textContent = `${alert.symbol} udah ${dir} $${alert.targetPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}! Harga sekarang: ${cpStr}${alert.note ? ' — ' + alert.note : ''}`;
    }
    
    toast.classList.add('active');
    
    // Auto-hide after 10s
    setTimeout(() => {
        toast.classList.remove('active');
    }, 10000);
}

function closeAlertToast() {
    document.getElementById('alertToast').classList.remove('active');
}

function renderPriceAlerts() {
    const section = document.getElementById('priceAlertsSection');
    const list = document.getElementById('priceAlertsList');
    const count = document.getElementById('alertsCount');
    
    if (!section || !list || !count) return;
    
    const activeAlerts = alerts.filter(a => !a.triggered);
    
    if (activeAlerts.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    count.textContent = activeAlerts.length;
    
    list.innerHTML = activeAlerts.map(a => {
        const dirIcon = a.direction === 'above' ? '↑' : '↓';
        const dirClass = a.direction === 'above' ? 'above' : 'below';
        const dirLabel = a.direction === 'above' ? 'Di Atas' : 'Di Bawah';
        const targetStr = '$' + a.targetPrice.toLocaleString('en-US', { maximumFractionDigits: 2 });
        
        return `
            <div class="price-alert-item ${dirClass}" onclick="openAssetDetail('${a.symbol}', '${a.name.replace(/'/g, "\\'")}', 0, 0, '${a.type}')">
                <div class="price-alert-icon ${dirClass}">${dirIcon}</div>
                <div class="price-alert-info">
                    <div class="price-alert-symbol">${a.symbol} <span class="price-alert-dir">${dirLabel}</span></div>
                    <div class="price-alert-target">Target: ${targetStr}${a.note ? ' • ' + a.note : ''}</div>
                </div>
                <button class="price-alert-delete" onclick="deleteAlert('${a.id}', event)">×</button>
            </div>
        `;
    }).join('');
}

// ============ DATA PORTFOLIO ============
let portfolio = JSON.parse(localStorage.getItem('fitraPortfolio')) || [];
function savePortfolio() { localStorage.setItem('fitraPortfolio', JSON.stringify(portfolio)); }

// ============ BROWSE STOCK ============
function openBrowseModal() {
    document.getElementById('browseModal').classList.add('active');
    renderBrowseStocks();
}
function closeBrowseModal() {
    document.getElementById('browseModal').classList.remove('active');
}
function renderBrowseStocks() {
    const body = document.getElementById('browseBody');
    const search = (document.getElementById('browseSearch').value || '').toLowerCase().trim();
    const cat = currentBrowseCategory;
    
    let filtered = STOCK_UNIVERSE;
    if (cat !== 'all') filtered = filtered.filter(s => s.category === cat);
    if (search) {
        filtered = filtered.filter(s => 
            s.symbol.toLowerCase().includes(search) || 
            s.name.toLowerCase().includes(search)
        );
    }
    
    if (filtered.length === 0) {
        body.innerHTML = '<div class="empty-state">Gak ada saham yang match.</div>';
        return;
    }
    
    body.innerHTML = filtered.map(stock => {
        const inWatchlist = watchlist.some(w => w.symbol === stock.symbol);
        return `
            <div class="browse-item ${inWatchlist ? 'in-watchlist' : ''}" onclick="toggleFromBrowse('${stock.symbol}', '${stock.name.replace(/'/g, "\\'")}', '${stock.type}')">
                <div class="browse-item-info">
                    <span class="browse-symbol">${stock.symbol}</span>
                    <span class="browse-name">${stock.name}</span>
                </div>
                <div class="browse-item-action">
                    ${inWatchlist ? '<span class="browse-badge added">✓ Added</span>' : '<span class="browse-badge add">+ Add</span>'}
                </div>
            </div>
        `;
    }).join('');
}
function toggleFromBrowse(symbol, name, type) {
    const idx = watchlist.findIndex(w => w.symbol === symbol);
    if (idx >= 0) watchlist.splice(idx, 1);
    else watchlist.push({ symbol, name, type });
    saveWatchlist();
    renderBrowseStocks();
    renderWatchlist();
}

document.getElementById('browseStockBtn').addEventListener('click', openBrowseModal);
document.getElementById('closeBrowseModal').addEventListener('click', closeBrowseModal);
document.getElementById('browseSearch').addEventListener('input', renderBrowseStocks);
document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentBrowseCategory = btn.dataset.cat;
        renderBrowseStocks();
    });
});

// ============ FETCH PRICE ============
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
            return { price: meta.regularMarketPrice, currency: meta.currency, change: meta.regularMarketChangePercent || 0, name: meta.longName || meta.shortName };
        }
        return null;
    } catch (error) {
        console.error('Error fetchPrice:', error);
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
        console.error('Error fetchFundamental:', error);
        return {};
    }
}

// ============ FETCH CHART DATA ============
async function fetchChartData(symbol, type, interval = '1mo', range = 'max') {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-chart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ symbol, type, interval, range })
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        
        if (data.data && Array.isArray(data.data)) {
            return data.data.map(c => ({
                time: c.time, open: parseFloat(c.open), high: parseFloat(c.high),
                low: parseFloat(c.low), close: parseFloat(c.close), volume: parseFloat(c.volume || 0)
            })).filter(c => !isNaN(c.open) && !isNaN(c.close));
        }
        if (data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const timestamps = result.timestamp || [];
            const quote = (result.indicators && result.indicators.quote && result.indicators.quote[0]) || {};
            const opens = quote.open || [], highs = quote.high || [], lows = quote.low || [], closes = quote.close || [], volumes = quote.volume || [];
            const candles = [];
            for (let i = 0; i < timestamps.length; i++) {
                if (opens[i] == null || closes[i] == null) continue;
                candles.push({ time: timestamps[i], open: opens[i], high: highs[i], low: lows[i], close: closes[i], volume: volumes[i] || 0 });
            }
            return candles;
        }
        return [];
    } catch (error) {
        console.error('Error fetchChartData:', error);
        return [];
    }
}

// ============ MARKET MOVERS ============
async function fetchMarketMovers() {
    const container = document.getElementById('marketMovers');
    if (!container) return;
    container.innerHTML = '<div class="movers-loading"><div class="loading-spinner"></div><p class="loading-text">Memuat pergerakan pasar...</p></div>';
    
    const results = [];
    const batchSize = 10;
    for (let i = 0; i < MOVERS_UNIVERSE.length; i += batchSize) {
        const batch = MOVERS_UNIVERSE.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(async (symbol) => {
            const stockInfo = STOCK_UNIVERSE.find(s => s.symbol === symbol) || { symbol, name: symbol, type: 'stock' };
            const priceData = await fetchPrice(symbol, stockInfo.type);
            if (!priceData) return null;
            return { symbol, name: priceData.name || stockInfo.name, type: stockInfo.type, price: priceData.price, change: priceData.change };
        }));
        results.push(...batchResults.filter(Boolean));
    }
    
    if (results.length === 0) { container.innerHTML = '<div class="empty-state">Gagal memuat data pasar</div>'; return; }
    
    const sorted = results.sort((a, b) => b.change - a.change);
    const gainers = sorted.filter(r => r.change > 0).slice(0, 5);
    const losers = sorted.filter(r => r.change < 0).slice(-5).reverse();
    marketMoversData = { gainers, losers };
    renderMarketMovers();
}

function renderMarketMovers() {
    const container = document.getElementById('marketMovers');
    if (!container) return;
    const { gainers, losers } = marketMoversData;
    if (gainers.length === 0 && losers.length === 0) { container.innerHTML = '<div class="empty-state">Belum ada data pergerakan pasar</div>'; return; }
    
    let html = '';
    if (gainers.length > 0) {
        html += `
            <div class="movers-section">
                <div class="movers-header">
                    <span class="movers-title gainers-title">📈 Top Gainers</span>
                    <span class="movers-count">${gainers.length}</span>
                </div>
                <div class="movers-list">
                    ${gainers.map(g => `
                        <div class="mover-item gainer" onclick="openAssetDetail('${g.symbol}', '${g.name.replace(/'/g, "\\'")}', ${g.price}, ${g.change}, '${g.type}')">
                            <div class="mover-info">
                                <span class="mover-symbol">${g.symbol}</span>
                                <span class="mover-name">${g.name}</span>
                            </div>
                            <div class="mover-price-wrap">
                                <span class="mover-price">$${g.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                                <span class="mover-change gainer">+${g.change.toFixed(2)}%</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    if (losers.length > 0) {
        html += `
            <div class="movers-section">
                <div class="movers-header">
                    <span class="movers-title losers-title">📉 Top Losers</span>
                    <span class="movers-count">${losers.length}</span>
                </div>
                <div class="movers-list">
                    ${losers.map(l => `
                        <div class="mover-item loser" onclick="openAssetDetail('${l.symbol}', '${l.name.replace(/'/g, "\\'")}', ${l.price}, ${l.change}, '${l.type}')">
                            <div class="mover-info">
                                <span class="mover-symbol">${l.symbol}</span>
                                <span class="mover-name">${l.name}</span>
                            </div>
                            <div class="mover-price-wrap">
                                <span class="mover-price">$${l.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                                <span class="mover-change loser">${l.change.toFixed(2)}%</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

// ============ RENDER CARD ============
function renderAssetCard(asset, priceData, index) {
    const p = priceData;
    const isFav = isFavorite(asset.symbol);
    const hasAl = hasAlert(asset.symbol);
    
    if (!p) {
        return `
            <div class="watchlist-card-wrapper">
                <button class="star-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${asset.symbol}', event)">${isFav ? '★' : '☆'}</button>
                <div class="asset-card">
                    <div class="asset-info"><span class="asset-symbol">${asset.symbol}</span><span class="asset-name">${asset.name}</span></div>
                    <div class="asset-price"><div class="price">-</div><div class="change">Gagal memuat</div></div>
                </div>
                <button class="watchlist-delete" onclick="deleteFromWatchlist(${index}, event)">×</button>
            </div>
        `;
    }
    
    const trend = p.change >= 0 ? 'up' : 'down';
    const changeStr = (p.change >= 0 ? '+' : '') + p.change.toFixed(2) + '%';
    const priceStr = '$' + p.price.toLocaleString('en-US', { maximumFractionDigits: 2 });
    
    return `
        <div class="watchlist-card-wrapper">
            <button class="star-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${asset.symbol}', event)">${isFav ? '★' : '☆'}</button>
            <div class="asset-card" onclick="openAssetDetail('${asset.symbol}', '${p.name || asset.name}', ${p.price}, ${p.change}, '${asset.type}')">
                <div class="asset-info">
                    <span class="asset-symbol">${asset.symbol}${hasAl ? ' <span class="alert-badge">🔔</span>' : ''}</span>
                    <span class="asset-name">${asset.name}</span>
                </div>
                <div class="asset-price"><div class="price">${priceStr}</div><div class="change ${trend}">${changeStr}</div></div>
            </div>
            <button class="watchlist-delete" onclick="deleteFromWatchlist(${index}, event)">×</button>
        </div>
    `;
}

// ============ RENDER WATCHLIST ============
async function renderWatchlist() {
    const container = document.getElementById('watchlist');
    container.innerHTML = '<div class="empty-state">Memuat data...</div>';
    if (watchlist.length === 0) { container.innerHTML = '<div class="empty-state">Watchlist kosong.</div>'; return; }
    
    const results = await Promise.all(watchlist.map(async (asset) => {
        const priceData = await fetchPrice(asset.symbol, asset.type);
        return { ...asset, priceData };
    }));
    
    const favAssets = results.filter(a => isFavorite(a.symbol));
    const otherAssets = results.filter(a => !isFavorite(a.symbol));
    
    let html = '';
    if (favAssets.length > 0) {
        html += `
            <div class="watchlist-section">
                <div class="watchlist-section-header">
                    <span class="watchlist-section-title">⭐ Favorites</span>
                    <span class="watchlist-section-count">${favAssets.length}</span>
                </div>
                ${favAssets.map(a => {
                    const idx = watchlist.findIndex(w => w.symbol === a.symbol);
                    return renderAssetCard(a, a.priceData, idx);
                }).join('')}
            </div>
        `;
    }
    html += `
        <div class="watchlist-section">
            <div class="watchlist-section-header">
                <span class="watchlist-section-title">📊 ${favAssets.length > 0 ? 'Semua Aset' : 'Watchlist'}</span>
                <span class="watchlist-section-count">${otherAssets.length}</span>
            </div>
            ${otherAssets.length > 0 ? otherAssets.map(a => {
                const idx = watchlist.findIndex(w => w.symbol === a.symbol);
                return renderAssetCard(a, a.priceData, idx);
            }).join('') : '<div class="empty-state" style="padding:20px;font-size:12px;">Semua saham udah jadi favorite ⭐</div>'}
        </div>
    `;
    container.innerHTML = html;
}

function deleteFromWatchlist(index, event) {
    if (event) event.stopPropagation();
    const asset = watchlist[index];
    if (!confirm(`Hapus ${asset.symbol} dari watchlist?`)) return;
    const favIdx = favorites.indexOf(asset.symbol);
    if (favIdx >= 0) { favorites.splice(favIdx, 1); saveFavorites(); }
    // Hapus alert juga
    alerts = alerts.filter(a => a.symbol !== asset.symbol);
    saveAlerts();
    renderPriceAlerts();
    watchlist.splice(index, 1);
    saveWatchlist();
    renderWatchlist();
}

// ============ MODAL ASSET ============
const assetModal = document.getElementById('assetModal');
document.getElementById('addAssetBtn').addEventListener('click', () => assetModal.classList.add('active'));
document.getElementById('closeAssetModal').addEventListener('click', () => assetModal.classList.remove('active'));
document.getElementById('cancelAsset').addEventListener('click', () => assetModal.classList.remove('active'));
document.getElementById('saveAsset').addEventListener('click', () => {
    const symbol = document.getElementById('assetSymbol').value.trim().toUpperCase();
    const name = document.getElementById('assetName').value.trim();
    const type = document.getElementById('assetType').value;
    if (!symbol || !name) { alert('Isi semua field!'); return; }
    if (watchlist.some(a => a.symbol === symbol)) { alert(`${symbol} udah ada!`); return; }
    watchlist.push({ symbol, name, type });
    saveWatchlist();
    assetModal.classList.remove('active');
    document.getElementById('assetSymbol').value = '';
    document.getElementById('assetName').value = '';
    renderWatchlist();
});

// ============ ALERT MODAL HANDLERS ============
document.getElementById('setAlertBtn').addEventListener('click', () => {
    openAlertModal(currentSymbol, currentName, currentPrice, currentType);
});
document.getElementById('closeAlertModal').addEventListener('click', closeAlertModal);
document.getElementById('cancelAlert').addEventListener('click', closeAlertModal);
document.getElementById('saveAlert').addEventListener('click', saveAlert);
document.getElementById('alertTargetPrice').addEventListener('input', updateAlertPreview);

document.querySelectorAll('.direction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.direction-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentAlertDirection = btn.dataset.dir;
        updateAlertPreview();
    });
});

document.getElementById('alertToastClose').addEventListener('click', closeAlertToast);

// ============ INDIKATOR ============
function calcEMA(closes, period) {
    if (closes.length < period) return closes[closes.length - 1] || 0;
    const k = 2 / (period + 1);
    let ema = closes[0];
    for (let i = 1; i < closes.length; i++) ema = closes[i] * k + ema * (1 - k);
    return ema;
}
function calcRSI(closes, period = 14) {
    if (closes.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) { const diff = closes[i] - closes[i - 1]; if (diff >= 0) gains += diff; else losses -= diff; }
    let avgGain = gains / period, avgLoss = losses / period;
    for (let i = period + 1; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
        avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    }
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
}
function calcSentiment(candles) {
    const recent = candles.slice(-20);
    let buyVol = 0, sellVol = 0;
    recent.forEach(c => { if (c.close >= c.open) buyVol += c.volume || 0; else sellVol += c.volume || 0; });
    const total = buyVol + sellVol;
    if (total === 0) return { buyPct: 50, sellPct: 50 };
    const buyPct = (buyVol / total) * 100;
    return { buyPct, sellPct: 100 - buyPct };
}
async function updateIndicators(symbol, type) {
    const candles = await fetchChartData(symbol, type, '1d', '3mo');
    if (candles.length < 20) return;
    const closes = candles.map(c => c.close).filter(c => c);
    const currentPrice = closes[closes.length - 1];
    const ema20 = calcEMA(closes, 20), ema5 = calcEMA(closes, 5), rsi = calcRSI(closes, 14);
    const htf = currentPrice > ema20 ? 'BULLISH' : 'BEARISH';
    const ltf = ema5 > ema20 ? 'BULLISH' : 'BEARISH';
    const htfEl = document.getElementById('htfValue');
    const ltfEl = document.getElementById('ltfValue');
    const emaEl = document.getElementById('ema20Value');
    const rsiEl = document.getElementById('rsiValue');
    const bidEl = document.getElementById('bidValue');
    const askEl = document.getElementById('askValue');
    htfEl.textContent = htf;
    htfEl.className = 'ind-value ' + (htf === 'BULLISH' ? 'bullish' : 'bearish');
    ltfEl.textContent = ltf;
    ltfEl.className = 'ind-value ' + (ltf === 'BULLISH' ? 'bullish' : 'bearish');
    emaEl.textContent = ema20.toFixed(2);
    emaEl.className = 'ind-value neutral';
    rsiEl.textContent = rsi.toFixed(0);
    if (rsi >= 70) rsiEl.className = 'ind-value bearish';
    else if (rsi <= 30) rsiEl.className = 'ind-value bullish';
    else rsiEl.className = 'ind-value neutral';
    const bid = currentPrice - (currentPrice * 0.0001);
    const ask = currentPrice + (currentPrice * 0.0001);
    bidEl.textContent = '$' + bid.toFixed(2);
    askEl.textContent = '$' + ask.toFixed(2);
    const sentiment = calcSentiment(candles);
    document.getElementById('buyerPct').textContent = sentiment.buyPct.toFixed(0);
    document.getElementById('sellerPct').textContent = sentiment.sellPct.toFixed(0);
    document.getElementById('buyerBar').style.width = sentiment.buyPct + '%';
    document.getElementById('sellerBar').style.width = sentiment.sellPct + '%';
}

// ============ ASSET DETAIL ============
let currentSymbol = null, currentType = null, currentName = null, currentPrice = 0, currentChange = 0;
async function openAssetDetail(symbol, name, price, change, type) {
    currentSymbol = symbol;
    currentType = type;
    currentName = name;
    currentPrice = price;
    currentChange = change;
    document.getElementById('chartModal').classList.add('active');
    document.getElementById('chartTitle').textContent = symbol + ' — ' + name;
    updateChartPrice();
    document.getElementById('analysisBody').innerHTML = `<div class="loading-spinner"></div><p class="loading-text">Mengambil data fundamental...</p>`;
    document.getElementById('htfValue').textContent = '-';
    document.getElementById('ltfValue').textContent = '-';
    document.getElementById('ema20Value').textContent = '-';
    document.getElementById('rsiValue').textContent = '-';
    document.getElementById('bidValue').textContent = '-';
    document.getElementById('askValue').textContent = '-';
    document.getElementById('buyerPct').textContent = '-';
    document.getElementById('sellerPct').textContent = '-';
    loadChart(symbol, type);
    updateIndicators(symbol, type);
    loadAnalysis(symbol, name, price, type);
    if (indicatorInterval) clearInterval(indicatorInterval);
    indicatorInterval = setInterval(() => { if (currentSymbol) updateIndicators(currentSymbol, currentType); }, 15000);
}
function updateChartPrice() {
    const changeStr = (currentChange >= 0 ? '+' : '') + currentChange.toFixed(2) + '%';
    const priceStr = '$' + currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 });
    const priceEl = document.getElementById('chartPrice');
    priceEl.textContent = priceStr + '  ' + changeStr;
    priceEl.style.color = currentChange >= 0 ? '#10b981' : '#ef4444';
}

// ============ LIGHTWEIGHT CHARTS ============
function loadChart(symbol, type) {
    const container = document.getElementById('tradingviewContainer');
    container.innerHTML = '';
    if (currentChart) { currentChart.remove(); currentChart = null; }
    const isMobile = window.innerWidth < 400;
    const chartHeight = isMobile ? 450 : 520;
    
    if (typeof LightweightCharts === 'undefined') {
        container.innerHTML = '<div style="color:#f00;padding:20px;">❌ Library LightweightCharts gagal dimuat.</div>';
        return;
    }
    
    currentChart = LightweightCharts.createChart(container, {
        width: container.clientWidth, height: chartHeight,
        layout: { background: { color: 'transparent' }, textColor: 'rgba(255, 255, 255, 0.6)', fontFamily: 'Inter, sans-serif' },
        grid: { vertLines: { color: 'rgba(255, 255, 255, 0.04)' }, horzLines: { color: 'rgba(255, 255, 255, 0.04)' } },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal, vertLine: { color: 'rgba(251, 191, 36, 0.5)', labelBackgroundColor: '#fbbf24' }, horzLine: { color: 'rgba(251, 191, 36, 0.5)', labelBackgroundColor: '#fbbf24' } },
        rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.08)', scaleMargins: { top: 0.1, bottom: 0.25 } },
        timeScale: { borderColor: 'rgba(255, 255, 255, 0.08)', timeVisible: true, secondsVisible: false, rightOffset: 10, barSpacing: 12, fixLeftEdge: false, fixRightEdge: false, lockVisibleTimeRangeOnResize: false },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
        handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true }
    });
    
    candleSeries = currentChart.addCandlestickSeries({ upColor: '#ffffff', downColor: '#a855f7', borderUpColor: '#ffffff', borderDownColor: '#a855f7', wickUpColor: '#ffffff', wickDownColor: '#a855f7' });
    volumeSeries = currentChart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '' });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.75, bottom: 0 } });
    
    // 🔔 Tampilkan garis alert di chart (kalau ada)
    const activeAlert = alerts.find(a => a.symbol === symbol && !a.triggered);
    if (activeAlert && candleSeries) {
        candleSeries.createPriceLine({
            price: activeAlert.targetPrice,
            color: activeAlert.direction === 'above' ? '#10b981' : '#ef4444',
            lineWidth: 2,
            lineStyle: 2, // dashed
            axisLabelVisible: true,
            title: '🔔 Alert'
        });
    }
    
    loadChartData(symbol, type, currentTimeframe);
    setupTimeframeButtons();
    window.addEventListener('resize', resizeChart);
}

async function loadChartData(symbol, type, timeframe) {
    const intervalMap = { '5M': '5m', '30M': '30m', '1H': '1h', 'D': '1d', 'W': '1wk', 'M': '1mo', 'Y': '1mo' };
    const rangeMap = { '5M': '5d', '30M': '1mo', '1H': '3mo', 'D': '1y', 'W': '5y', 'M': '20y', 'Y': 'max' };
    const interval = intervalMap[timeframe] || '1mo';
    const range = rangeMap[timeframe] || 'max';
    let candles = await fetchChartData(symbol, type, interval, range);
    if (!candles || candles.length === 0 || !candleSeries) return;
    if (timeframe === 'Y') candles = aggregateToYearly(candles);
    const formattedData = candles.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }))
        .filter(d => d.time != null && !isNaN(d.open) && !isNaN(d.high) && !isNaN(d.low) && !isNaN(d.close));
    const volumeData = candles.map(c => ({ time: c.time, value: c.volume || 0, color: c.close >= c.open ? 'rgba(255, 255, 255, 0.4)' : 'rgba(168, 85, 247, 0.4)' })).filter(d => d.time != null && !isNaN(d.value));
    candleSeries.setData(formattedData);
    volumeSeries.setData(volumeData);
    const totalCandles = formattedData.length;
    if (totalCandles > 100) {
        currentChart.timeScale().setVisibleLogicalRange({ from: totalCandles - 100, to: totalCandles + 5 });
    } else {
        currentChart.timeScale().fitContent();
    }
}

function aggregateToYearly(monthlyCandles) {
    const yearlyMap = {};
    monthlyCandles.forEach(c => {
        const date = new Date(c.time * 1000);
        const year = date.getFullYear();
        if (!yearlyMap[year]) {
            yearlyMap[year] = { year, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume || 0, firstTime: c.time, lastTime: c.time };
        } else {
            const y = yearlyMap[year];
            if (c.time < y.firstTime) { y.open = c.open; y.firstTime = c.time; }
            if (c.time > y.lastTime) { y.close = c.close; y.lastTime = c.time; }
            if (c.high > y.high) y.high = c.high;
            if (c.low < y.low) y.low = c.low;
            y.volume += c.volume || 0;
        }
    });
    return Object.values(yearlyMap).sort((a, b) => a.year - b.year)
        .map(y => ({ time: y.firstTime, open: y.open, high: y.high, low: y.low, close: y.close, volume: y.volume }));
}

function setupTimeframeButtons() {
    document.querySelectorAll('.tf-btn').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', () => {
            document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
            newBtn.classList.add('active');
            currentTimeframe = newBtn.dataset.tf;
            if (currentSymbol && currentType) loadChartData(currentSymbol, currentType, currentTimeframe);
        });
    });
}

function resizeChart() {
    if (currentChart) {
        const container = document.getElementById('tradingviewContainer');
        currentChart.applyOptions({ width: container.clientWidth });
    }
}

async function loadAnalysis(symbol, name, price, type) {
    const container = document.getElementById('analysisBody');
    try {
        const fundamental = await fetchFundamental(symbol, type);
        const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY },
            body: JSON.stringify({ symbol, name, price, fundamental })
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        container.innerHTML = formatAnalysis(data.analysis || 'Gagal memuat analisis.');
    } catch (error) {
        container.innerHTML = `<div class="analysis-error"><p>❌ Gagal memuat analisis</p><p class="error-detail">${error.message}</p></div>`;
    }
}
function formatAnalysis(text) { return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'); }

function closeAssetDetail() {
    document.getElementById('chartModal').classList.remove('active');
    document.getElementById('tradingviewContainer').innerHTML = '';
    if (currentChart) { currentChart.remove(); currentChart = null; candleSeries = null; volumeSeries = null; }
    if (indicatorInterval) { clearInterval(indicatorInterval); indicatorInterval = null; }
    window.removeEventListener('resize', resizeChart);
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
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY },
            body: JSON.stringify({ peMax, pbMax, roeMin, derMax, divMin })
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        if (!data.results || data.results.length === 0) { results.innerHTML = '<div class="empty-state">Gak ada saham yang lolos filter.</div>'; return; }
        results.innerHTML = `<p class="description">${data.count} saham lolos filter:</p>` + data.results.map(stock => `
            <div class="asset-card"><div class="asset-info">
                <span class="asset-symbol">${stock.symbol}</span>
                <span class="asset-name">${stock.company_name}</span>
                <span class="asset-metrics">P/E ${stock.pe_ratio?.toFixed(2)} · P/B ${stock.pb_ratio?.toFixed(2)} · ROE ${((stock.roe || 0) * 100).toFixed(1)}% · Div ${((stock.dividend_yield || 0) * 100).toFixed(1)}%</span>
            </div></div>
        `).join('');
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
    const holdingsWithPrice = await Promise.all(portfolio.map(async (h) => {
        const priceData = await fetchPrice(h.symbol, h.type);
        return { ...h, currentPrice: priceData?.price || 0 };
    }));
    let totalValue = 0, totalCost = 0;
    container.innerHTML = holdingsWithPrice.map(h => {
        const currentValue = h.currentPrice * h.shares;
        const costBasis = h.avgPrice * h.shares;
        const pl = currentValue - costBasis;
        const plPercent = costBasis > 0 ? (pl / costBasis) * 100 : 0;
        totalValue += currentValue; totalCost += costBasis;
        const plClass = pl >= 0 ? 'up' : 'down';
        const plSign = pl >= 0 ? '+' : '';
        return `<div class="holding-card">
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
        </div>`;
    }).join('');
    const totalPL = totalValue - totalCost;
    const totalPLSign = totalPL >= 0 ? '+' : '';
    totalValueEl.textContent = '$ ' + totalValue.toFixed(2);
    unrealizedPLEl.textContent = `${totalPLSign}$${totalPL.toFixed(2)}`;
    unrealizedPLEl.style.color = totalPL >= 0 ? '#10b981' : '#ef4444';
    totalCostEl.textContent = '$ ' + totalCost.toFixed(2);
    totalHoldingsEl.textContent = portfolio.length;
}
function deleteHolding(id) {
    if (!confirm('Hapus holding ini?')) return;
    portfolio = portfolio.filter(h => h.id !== id);
    savePortfolio();
    renderPortfolio();
}
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
    portfolio.push({ id: 'holding-' + Date.now(), symbol, name, type, shares, avgPrice, addedAt: Date.now() });
    savePortfolio();
    holdingModal.classList.remove('active');
    document.getElementById('holdingSymbol').value = '';
    document.getElementById('holdingName').value = '';
    document.getElementById('holdingShares').value = '';
    document.getElementById('holdingAvgPrice').value = '';
    renderPortfolio();
});

// ============ NEWS ============
async function renderNews() {
    const container = document.getElementById('newsList');
    container.innerHTML = '<div class="empty-state">Memuat berita...</div>';
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-news`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY },
            body: JSON.stringify({ category: 'all' })
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        const news = data.news || [];
        if (news.length === 0) { container.innerHTML = '<div class="empty-state">Belum ada berita</div>'; return; }
        container.innerHTML = news.map(item => {
            const time = formatTime(item.timePublished);
            return `<div class="news-card" onclick="window.open('${item.url}', '_blank')">
                <div class="news-title">${item.title}</div>
                <div class="news-summary">${item.summary ? item.summary.substring(0, 150) + '...' : ''}</div>
                <div class="news-meta">
                    <span class="sentiment-tag neutral">${(item.category || 'NEWS').toUpperCase()}</span>
                    <span>${item.source || 'Unknown'}</span>
                    <span>${time}</span>
                </div>
            </div>`;
        }).join('');
    } catch (error) {
        container.innerHTML = `<div class="empty-state">❌ ${error.message}</div>`;
    }
}
function formatTime(timeStr) {
    if (!timeStr) return '';
    const date = new Date(timeStr * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hour}:${minute}`;
}

// ============ INIT ============
renderWatchlist();
renderPriceAlerts();
fetchMarketMovers();

// Check alerts every 60 detik
setTimeout(() => checkAlerts(), 5000); // Check pertama setelah 5 detik
alertCheckInterval = setInterval(checkAlerts, 60000); // Terus tiap 1 menit
