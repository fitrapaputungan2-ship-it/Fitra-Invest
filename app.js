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
let currentAlertType = 'price';
let currentAlertDirection = 'above';
let currentAlertSymbol = null;
let currentAlertName = null;
let currentAlertAssetType = null;
let currentAlertPrice = 0;
let currentNewsItem = null;
let newsCache = [];
let heatmapData = [];

// ============ 🌐 TRANSLATION CACHE ============
let translationCache = JSON.parse(localStorage.getItem('fitraTranslationCache') || '{}');
function saveTranslationCache() { try { localStorage.setItem('fitraTranslationCache', JSON.stringify(translationCache)); } catch (e) { translationCache = {}; } }
async function translateText(text) {
    if (!text || text.trim() === '') return text;
    if (translationCache[text]) return translationCache[text];
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=id&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        const translated = data[0].map(item => item[0]).filter(Boolean).join('');
        translationCache[text] = translated; saveTranslationCache(); return translated;
    } catch (error) { return text; }
}

// ============ 💱 CURRENCY CONVERTER ============
let currencyRates = JSON.parse(localStorage.getItem('fitraCurrencyRates') || 'null');
let currencyLastFetch = parseInt(localStorage.getItem('fitraCurrencyLastFetch') || '0');
const CURRENCY_CACHE_TTL = 60 * 60 * 1000;
const QUICK_TARGETS = ['IDR', 'EUR', 'JPY', 'GBP', 'SGD', 'MYR', 'CNY', 'AUD', 'KRW', 'THB'];
const ALL_CURRENCIES = [
    { code: 'USD', flag: '🇺🇸', name: 'USD' }, { code: 'IDR', flag: '🇮🇩', name: 'IDR' },
    { code: 'EUR', flag: '🇪🇺', name: 'EUR' }, { code: 'JPY', flag: '🇯🇵', name: 'JPY' },
    { code: 'GBP', flag: '🇬🇧', name: 'GBP' }, { code: 'SGD', flag: '🇸🇬', name: 'SGD' },
    { code: 'MYR', flag: '🇲🇾', name: 'MYR' }, { code: 'CNY', flag: '🇨🇳', name: 'CNY' },
    { code: 'AUD', flag: '🇦🇺', name: 'AUD' }, { code: 'KRW', flag: '🇰🇷', name: 'KRW' },
    { code: 'THB', flag: '🇹🇭', name: 'THB' }, { code: 'INR', flag: '🇮🇳', name: 'INR' },
    { code: 'SAR', flag: '🇸🇦', name: 'SAR' }, { code: 'AED', flag: '🇦🇪', name: 'AED' }
];

async function fetchCurrencyRates(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && currencyRates && (now - currencyLastFetch) < CURRENCY_CACHE_TTL) return currencyRates;
    try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        if (data.result !== 'success' || !data.rates) throw new Error('Invalid response');
        currencyRates = data.rates; currencyLastFetch = now;
        try { localStorage.setItem('fitraCurrencyRates', JSON.stringify(currencyRates)); localStorage.setItem('fitraCurrencyLastFetch', currencyLastFetch.toString()); } catch (e) {}
        return currencyRates;
    } catch (error) { if (currencyRates) return currencyRates; return null; }
}
function formatCurrencyAmount(amount, currency) {
    const decimals = ['JPY', 'KRW', 'IDR'].includes(currency) ? 0 : 2;
    const symbols = { 'USD': '$', 'IDR': 'Rp ', 'EUR': '€', 'JPY': '¥', 'GBP': '£', 'SGD': 'S$', 'MYR': 'RM ', 'CNY': '¥', 'AUD': 'A$', 'KRW': '₩', 'THB': '฿', 'INR': '₹', 'SAR': 'SR ', 'AED': 'AED ' };
    const symbol = symbols[currency] || currency + ' ';
    return symbol + amount.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function populateCurrencyDropdowns() {
    const fromSel = document.getElementById('currencyFromSelect');
    const toSel = document.getElementById('currencyToSelect');
    if (!fromSel || !toSel) return;
    const options = ALL_CURRENCIES.map(c => `<option value="${c.code}">${c.flag} ${c.name}</option>`).join('');
    fromSel.innerHTML = options;
    toSel.innerHTML = options;
    fromSel.value = 'USD';
    toSel.value = 'IDR';
}
async function convertCurrency() {
    const fromAmount = parseFloat(document.getElementById('currencyFromAmount').value) || 0;
    const fromCur = document.getElementById('currencyFromSelect').value;
    const toCur = document.getElementById('currencyToSelect').value;
    const resultEl = document.getElementById('currencyToResult');
    const rateLine = document.getElementById('currencyRateLine');
    if (!currencyRates) {
        resultEl.textContent = 'Memuat...'; rateLine.innerHTML = '<span class="rate-loading-spinner"></span> Mengambil rate...';
        const rates = await fetchCurrencyRates();
        if (!rates) { resultEl.textContent = '❌ Gagal memuat'; rateLine.textContent = 'Error: rate gak tersedia'; return; }
    }
    const fromRate = currencyRates[fromCur] || 1; const toRate = currencyRates[toCur] || 1;
    const result = (fromAmount / fromRate) * toRate;
    resultEl.textContent = formatCurrencyAmount(result, toCur);
    const rate1 = (1 / fromRate) * toRate;
    const rateDecimals = ['JPY', 'KRW', 'IDR'].includes(toCur) ? 2 : 4;
    rateLine.innerHTML = `💱 <strong>1 ${fromCur}</strong> = <strong>${rate1.toLocaleString('en-US', { minimumFractionDigits: rateDecimals, maximumFractionDigits: rateDecimals })} ${toCur}</strong>`;
    if (currencyLastFetch) {
        const date = new Date(currencyLastFetch);
        const hh = String(date.getHours()).padStart(2, '0'); const mm = String(date.getMinutes()).padStart(2, '0');
        document.getElementById('currencyRateUpdate').textContent = `Terakhir diupdate: ${hh}:${mm}`;
    }
}
function swapCurrencies() {
    const fromSel = document.getElementById('currencyFromSelect'); const toSel = document.getElementById('currencyToSelect');
    const temp = fromSel.value; fromSel.value = toSel.value; toSel.value = temp; convertCurrency();
    const val = toSel.value; document.querySelectorAll('.quick-target-btn').forEach(b => { b.classList.toggle('active', b.dataset.cur === val); });
}
function renderCurrencyQuickTargets() {
    const container = document.getElementById('currencyQuickTargets'); if (!container) return;
    const flags = { 'IDR': '🇮🇩', 'EUR': '🇪🇺', 'JPY': '🇯🇵', 'GBP': '🇬🇧', 'SGD': '🇸🇬', 'MYR': '🇲🇾', 'CNY': '🇨🇳', 'AUD': '🇦🇺', 'KRW': '🇰🇷', 'THB': '🇹🇭', 'USD': '🇺🇸' };
    container.innerHTML = QUICK_TARGETS.map(cur => `<button class="quick-target-btn ${cur === 'IDR' ? 'active' : ''}" data-cur="${cur}">${flags[cur]} ${cur}</button>`).join('');
    container.querySelectorAll('.quick-target-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.quick-target-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active'); document.getElementById('currencyToSelect').value = btn.dataset.cur; convertCurrency();
        });
    });
}
async function openCurrencyModal() { populateCurrencyDropdowns(); document.getElementById('currencyModal').classList.add('active'); renderCurrencyQuickTargets(); await convertCurrency(); }
function closeCurrencyModal() { document.getElementById('currencyModal').classList.remove('active'); }

// ============ CHART COLORS ============
const CHART_COLORS = ['#fbbf24', '#22d3ee', '#10b981', '#a855f7', '#ef4444', '#ec4899', '#f97316', '#3b82f6', '#84cc16', '#06b6d4', '#8b5cf6', '#eab308', '#14b8a6', '#f43f5e', '#facc15', '#fb7185', '#4ade80', '#60a5fa'];

// ============ STOCK UNIVERSE (130+ ASET) ============
const STOCK_UNIVERSE = [
    // US TECH
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
    // US FINANCE
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
    // US HEALTHCARE
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
    // US CONSUMER
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
    // US INDUSTRIAL
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
    // US ENERGY
    { symbol: 'XOM', name: 'Exxon Mobil Corp.', type: 'stock', category: 'us-energy' },
    { symbol: 'CVX', name: 'Chevron Corp.', type: 'stock', category: 'us-energy' },
    { symbol: 'COP', name: 'ConocoPhillips', type: 'stock', category: 'us-energy' },
    { symbol: 'SLB', name: 'Schlumberger Ltd.', type: 'stock', category: 'us-energy' },
    { symbol: 'NEE', name: 'NextEra Energy', type: 'stock', category: 'us-energy' },
    { symbol: 'OXY', name: 'Occidental Petroleum', type: 'stock', category: 'us-energy' },
    // INTERNATIONAL
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
    // CRYPTO
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
    // COMMODITY
    { symbol: 'GC=F', name: 'Gold Futures', type: 'commodity', category: 'commodity' },
    { symbol: 'SI=F', name: 'Silver Futures', type: 'commodity', category: 'commodity' },
    { symbol: 'CL=F', name: 'Crude Oil WTI', type: 'commodity', category: 'commodity' },
    { symbol: 'NG=F', name: 'Natural Gas', type: 'commodity', category: 'commodity' },
    { symbol: 'HG=F', name: 'Copper Futures', type: 'commodity', category: 'commodity' },
    { symbol: 'PL=F', name: 'Platinum Futures', type: 'commodity', category: 'commodity' },
    { symbol: 'ZC=F', name: 'Corn Futures', type: 'commodity', category: 'commodity' },
    { symbol: 'ZW=F', name: 'Wheat Futures', type: 'commodity', category: 'commodity' },
    // INDEX
    { symbol: '^GSPC', name: 'S&P 500', type: 'stock', category: 'index' },
    { symbol: '^DJI', name: 'Dow Jones Industrial', type: 'stock', category: 'index' },
    { symbol: '^IXIC', name: 'NASDAQ Composite', type: 'stock', category: 'index' },
    { symbol: '^RUT', name: 'Russell 2000', type: 'stock', category: 'index' },
    { symbol: '^N225', name: 'Nikkei 225', type: 'stock', category: 'index' },
    { symbol: '^HSI', name: 'Hang Seng Index', type: 'stock', category: 'index' },
    { symbol: '^FTSE', name: 'FTSE 100', type: 'stock', category: 'index' },
    { symbol: '^GDAXI', name: 'DAX Index', type: 'stock', category: 'index' },
];

// ============ MOVERS UNIVERSE ============
const MOVERS_UNIVERSE = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'AMD', 'INTC', 'NFLX', 'AVGO', 'ADBE', 'JPM', 'BAC', 'V', 'MA', 'GS', 'WFC', 'WMT', 'DIS', 'MCD', 'NKE', 'SBUX', 'KO', 'PEP', 'JNJ', 'PFE', 'UNH', 'LLY', 'BTC', 'ETH', 'SOL', 'BNB', 'XRP'];
let marketMoversData = { gainers: [], losers: [] };

// ============ SECTOR CONFIG (buat Heatmap) ============
const SECTOR_CONFIG = [
    { key: 'us-tech', name: 'Technology', icon: '💻' },
    { key: 'us-finance', name: 'Finance', icon: '🏦' },
    { key: 'us-healthcare', name: 'Healthcare', icon: '💊' },
    { key: 'us-consumer', name: 'Consumer', icon: '🛒' },
    { key: 'us-industrial', name: 'Industrial', icon: '🏭' },
    { key: 'us-energy', name: 'Energy', icon: '⚡' },
    { key: 'international', name: 'International', icon: '🌍' },
    { key: 'crypto', name: 'Crypto', icon: '₿' },
    { key: 'commodity', name: 'Commodity', icon: '🥇' },
    { key: 'index', name: 'Index', icon: '📊' }
];

// ============ TAB NAV ============
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active'); document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
        if (tab.dataset.tab === 'news') renderNews();
        if (tab.dataset.tab === 'portfolio') { renderPortfolio(); analyzePortfolioRisk(); }
        if (tab.dataset.tab === 'heatmap') renderSectorHeatmap();
    });
});

// ============ DATA ============
let watchlist = JSON.parse(localStorage.getItem('fitraWatchlist')) || [
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' }, { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock' }, { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' }
];
function saveWatchlist() { localStorage.setItem('fitraWatchlist', JSON.stringify(watchlist)); }
let favorites = JSON.parse(localStorage.getItem('fitraFavorites')) || [];
function saveFavorites() { localStorage.setItem('fitraFavorites', JSON.stringify(favorites)); }
function isFavorite(symbol) { return favorites.includes(symbol); }
function toggleFavorite(symbol, event) {
    if (event) event.stopPropagation();
    const idx = favorites.indexOf(symbol);
    if (idx >= 0) favorites.splice(idx, 1); else favorites.push(symbol);
    saveFavorites(); renderWatchlist();
}
let alerts = JSON.parse(localStorage.getItem('fitraAlerts')) || [];
function saveAlerts() { localStorage.setItem('fitraAlerts', JSON.stringify(alerts)); }
function hasAlert(symbol) { return alerts.some(a => a.symbol === symbol && !a.triggered); }
let portfolio = JSON.parse(localStorage.getItem('fitraPortfolio')) || [];
function savePortfolio() { localStorage.setItem('fitraPortfolio', JSON.stringify(portfolio)); }

// ============ SMART ALERT MODAL ============
function openAlertModal(symbol, name, price, type) {
    currentAlertSymbol = symbol; currentAlertName = name; currentAlertAssetType = type; currentAlertPrice = price;
    currentAlertType = 'price'; currentAlertDirection = 'above';
    document.getElementById('alertSymbol').textContent = symbol;
    document.getElementById('alertName').textContent = name;
    document.getElementById('alertCurrentPrice').textContent = 'Harga Sekarang: $' + price.toLocaleString('en-US', { maximumFractionDigits: 2 });
    document.getElementById('alertTargetPrice').value = ''; document.getElementById('alertNote').value = '';
    document.getElementById('alertRsiValue').value = ''; document.getElementById('alertEmaPeriod').value = '20';
    document.getElementById('alertVolumeMultiplier').value = '2';
    document.querySelectorAll('.alert-type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.alert-type-btn[data-type="price"]').classList.add('active');
    document.querySelectorAll('.direction-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.direction-btn[data-dir="above"]').classList.add('active');
    updateAlertFormFields(); updateAlertPreview();
    document.getElementById('alertModal').classList.add('active');
    setTimeout(() => document.getElementById('alertTargetPrice').focus(), 300);
}
function closeAlertModal() { document.getElementById('alertModal').classList.remove('active'); }
function selectAlertType(type) {
    currentAlertType = type;
    document.querySelectorAll('.alert-type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.alert-type-btn[data-type="${type}"]`).classList.add('active');
    updateAlertFormFields(); updateAlertPreview();
}
function selectDirection(dir) {
    currentAlertDirection = dir;
    document.querySelectorAll('.direction-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.direction-btn[data-dir="${dir}"]`).classList.add('active');
    updateAlertPreview();
}
function updateAlertFormFields() {
    const priceField = document.getElementById('alertPriceField'); const rsiField = document.getElementById('alertRsiField');
    const emaField = document.getElementById('alertEmaField'); const volumeField = document.getElementById('alertVolumeField');
    const directionGroup = document.getElementById('alertDirectionGroup');
    priceField.style.display = 'none'; rsiField.style.display = 'none'; emaField.style.display = 'none'; volumeField.style.display = 'none';
    directionGroup.style.display = 'grid';
    if (currentAlertType === 'price') priceField.style.display = 'block';
    else if (currentAlertType === 'rsi') { rsiField.style.display = 'block'; directionGroup.style.display = 'none'; }
    else if (currentAlertType === 'ema') { emaField.style.display = 'block'; directionGroup.style.display = 'none'; }
    else if (currentAlertType === 'volume') { volumeField.style.display = 'block'; directionGroup.style.display = 'none'; }
    else if (currentAlertType === 'multi') { priceField.style.display = 'block'; rsiField.style.display = 'block'; }
}
function updateAlertPreview() {
    const preview = document.getElementById('alertPreview');
    const priceInput = document.getElementById('alertTargetPrice').value;
    const rsiInput = document.getElementById('alertRsiValue').value;
    let previewText = '';
    if (currentAlertType === 'price') {
        if (!priceInput || isNaN(parseFloat(priceInput))) previewText = '🔔 Alert bakal aktif kalau harga nyentuh target';
        else { const target = parseFloat(priceInput); const dirText = currentAlertDirection === 'above' ? 'naik ke atas' : 'turun ke bawah'; previewText = `🔔 Notif kalau <strong>${currentAlertSymbol}</strong> ${dirText} <strong>$${target.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong>`; }
    } else if (currentAlertType === 'rsi') {
        if (!rsiInput || isNaN(parseFloat(rsiInput))) previewText = '🔔 Alert bakal aktif kalau RSI nyentuh target';
        else { const rsi = parseFloat(rsiInput); const zone = rsi <= 30 ? 'oversold (beli)' : rsi >= 70 ? 'overbought (jual)' : 'netral'; previewText = `🔔 Notif kalau <strong>${currentAlertSymbol}</strong> RSI ${rsi} (${zone})`; }
    } else if (currentAlertType === 'ema') {
        const period = document.getElementById('alertEmaPeriod').value || '20'; previewText = `🔔 Notif kalau <strong>${currentAlertSymbol}</strong> menyentuh EMA ${period}`;
    } else if (currentAlertType === 'volume') {
        const multiplier = document.getElementById('alertVolumeMultiplier').value || '2'; previewText = `🔔 Notif kalau <strong>${currentAlertSymbol}</strong> volume ${multiplier}x dari rata-rata`;
    } else if (currentAlertType === 'multi') { previewText = `🔔 Alert multi-kondisi untuk <strong>${currentAlertSymbol}</strong>`; }
    preview.innerHTML = `<span class="alert-preview-icon">🔔</span><span class="alert-preview-text">${previewText}</span>`;
}
function saveAlert() {
    let alertData = { id: 'alert-' + Date.now(), symbol: currentAlertSymbol, name: currentAlertName, type: currentAlertAssetType, alertType: currentAlertType, createdAt: Date.now(), triggered: false, note: document.getElementById('alertNote').value.trim() };
    if (currentAlertType === 'price') {
        const targetInput = document.getElementById('alertTargetPrice').value;
        if (!targetInput || isNaN(parseFloat(targetInput))) { alert('Isi target harga dulu!'); return; }
        const target = parseFloat(targetInput);
        if (currentAlertDirection === 'above' && target <= currentAlertPrice) { alert('⚠️ Alert "Di Atas" harus LEBIH TINGGI!'); return; }
        if (currentAlertDirection === 'below' && target >= currentAlertPrice) { alert('⚠️ Alert "Di Bawah" harus LEBIH RENDAH!'); return; }
        alertData.targetPrice = target; alertData.direction = currentAlertDirection;
    } else if (currentAlertType === 'rsi') {
        const rsiInput = document.getElementById('alertRsiValue').value;
        if (!rsiInput || isNaN(parseFloat(rsiInput))) { alert('Isi target RSI dulu!'); return; }
        alertData.rsiValue = parseFloat(rsiInput);
    } else if (currentAlertType === 'ema') { alertData.emaPeriod = parseInt(document.getElementById('alertEmaPeriod').value || '20'); }
    else if (currentAlertType === 'volume') { alertData.volumeMultiplier = parseFloat(document.getElementById('alertVolumeMultiplier').value || '2'); }
    else if (currentAlertType === 'multi') {
        const targetInput = document.getElementById('alertTargetPrice').value; const rsiInput = document.getElementById('alertRsiValue').value;
        if (!targetInput || !rsiInput) { alert('Isi target harga DAN RSI!'); return; }
        alertData.targetPrice = parseFloat(targetInput); alertData.rsiValue = parseFloat(rsiInput); alertData.direction = currentAlertDirection;
    }
    const existing = alerts.find(a => a.symbol === alertData.symbol && a.alertType === alertData.alertType && !a.triggered);
    if (existing) { if (!confirm(`Udah ada alert ${alertData.alertType} buat ${alertData.symbol}. Ganti?`)) return; alerts = alerts.filter(a => a.id !== existing.id); }
    alerts.push(alertData); saveAlerts(); closeAlertModal(); renderPriceAlerts(); renderWatchlist(); showAlertToast(alertData, null, true);
}
function deleteAlert(id, event) { if (event) event.stopPropagation(); if (!confirm('Hapus alert ini?')) return; alerts = alerts.filter(a => a.id !== id); saveAlerts(); renderPriceAlerts(); renderWatchlist(); }

async function checkAlerts() {
    if (alerts.length === 0) return;
    const activeAlerts = alerts.filter(a => !a.triggered); if (activeAlerts.length === 0) return;
    let hasNewTrigger = false;
    for (const alert of activeAlerts) {
        try {
            const priceData = await fetchPrice(alert.symbol, alert.type); if (!priceData) continue;
            let triggered = false; let triggerReason = '';
            if (alert.alertType === 'price' || !alert.alertType) {
                const direction = alert.direction || 'above';
                if (direction === 'above' && priceData.price >= alert.targetPrice) { triggered = true; triggerReason = `Harga naik ke $${priceData.price.toFixed(2)}`; }
                else if (direction === 'below' && priceData.price <= alert.targetPrice) { triggered = true; triggerReason = `Harga turun ke $${priceData.price.toFixed(2)}`; }
            } else if (alert.alertType === 'rsi') {
                const candles = await fetchChartData(alert.symbol, alert.type, '1d', '1mo');
                if (candles.length >= 15) { const closes = candles.map(c => c.close); const rsi = calcRSI(closes, 14); const targetRsi = alert.rsiValue; if ((targetRsi <= 30 && rsi <= targetRsi) || (targetRsi >= 70 && rsi >= targetRsi)) { triggered = true; triggerReason = `RSI ${rsi.toFixed(1)} menyentuh ${targetRsi}`; } }
            } else if (alert.alertType === 'ema') {
                const candles = await fetchChartData(alert.symbol, alert.type, '1d', '3mo');
                if (candles.length >= alert.emaPeriod) { const closes = candles.map(c => c.close); const ema = calcEMA(closes, alert.emaPeriod); const currentPrice = closes[closes.length - 1]; if (Math.abs(currentPrice - ema) / ema < 0.01) { triggered = true; triggerReason = `Harga menyentuh EMA ${alert.emaPeriod} ($${ema.toFixed(2)})`; } }
            } else if (alert.alertType === 'volume') {
                const candles = await fetchChartData(alert.symbol, alert.type, '1d', '1mo');
                if (candles.length >= 20) { const recentVolume = candles[candles.length - 1].volume || 0; const avgVolume = candles.slice(-20, -1).reduce((sum, c) => sum + (c.volume || 0), 0) / 19; if (recentVolume >= avgVolume * alert.volumeMultiplier) { triggered = true; triggerReason = `Volume spike ${alert.volumeMultiplier}x`; } }
            } else if (alert.alertType === 'multi') {
                const candles = await fetchChartData(alert.symbol, alert.type, '1d', '1mo');
                if (candles.length >= 15) { const closes = candles.map(c => c.close); const rsi = calcRSI(closes, 14); const currentPrice = priceData.price; const priceCondition = alert.direction === 'above' ? currentPrice >= alert.targetPrice : currentPrice <= alert.targetPrice; const rsiCondition = rsi <= alert.rsiValue; if (priceCondition && rsiCondition) { triggered = true; triggerReason = `Harga $${currentPrice.toFixed(2)} + RSI ${rsi.toFixed(1)}`; } }
            }
            if (triggered) { alert.triggered = true; alert.triggeredAt = Date.now(); alert.triggeredPrice = priceData.price; alert.triggerReason = triggerReason; hasNewTrigger = true; showAlertToast(alert, priceData.price, false, triggerReason); }
        } catch (error) { console.error(`Error checking alert ${alert.id}:`, error); }
    }
    if (hasNewTrigger) { saveAlerts(); renderPriceAlerts(); renderWatchlist(); }
}
function showAlertToast(alert, currentPrice, isNewSet = false, reason = '') {
    const toast = document.getElementById('alertToast'); const title = document.getElementById('alertToastTitle'); const message = document.getElementById('alertToastMessage');
    if (isNewSet) { title.textContent = '🔔 Alert Aktif!'; const typeLabels = { price: 'Harga', rsi: 'RSI', ema: 'EMA', volume: 'Volume', multi: 'Multi-Kondisi' }; message.textContent = `${alert.symbol} - Alert ${typeLabels[alert.alertType] || 'Price'} berhasil dibuat`; }
    else { title.textContent = '🔔 SMART ALERT TRIGGERED!'; message.innerHTML = `<strong>${alert.symbol}</strong>: ${reason}<br/>Harga sekarang: $${currentPrice?.toFixed(2) || 'N/A'}${alert.note ? '<br/>Note: ' + alert.note : ''}`; }
    toast.classList.add('active'); setTimeout(() => toast.classList.remove('active'), 10000);
}
function closeAlertToast() { document.getElementById('alertToast').classList.remove('active'); }
function renderPriceAlerts() {
    const section = document.getElementById('priceAlertsSection'); const list = document.getElementById('priceAlertsList'); const count = document.getElementById('alertsCount');
    if (!section || !list || !count) return;
    const activeAlerts = alerts.filter(a => !a.triggered);
    if (activeAlerts.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block'; count.textContent = activeAlerts.length;
    const typeIcons = { price: '💰', rsi: '📊', ema: '📈', volume: '📶', multi: '🧠' };
    const typeLabels = { price: 'Price', rsi: 'RSI', ema: 'EMA', volume: 'Volume', multi: 'Multi' };
    list.innerHTML = activeAlerts.map(a => {
        const icon = typeIcons[a.alertType] || '🔔'; const label = typeLabels[a.alertType] || 'Price'; let detail = '';
        if (a.alertType === 'price' || !a.alertType) { const dir = a.direction === 'above' ? '↑' : '↓'; detail = `${dir} $${a.targetPrice?.toLocaleString('en-US', { maximumFractionDigits: 2 })}`; }
        else if (a.alertType === 'rsi') detail = `RSI ${a.rsiValue}`;
        else if (a.alertType === 'ema') detail = `EMA ${a.emaPeriod}`;
        else if (a.alertType === 'volume') detail = `${a.volumeMultiplier}x Volume`;
        else if (a.alertType === 'multi') detail = `Price + RSI ${a.rsiValue}`;
        return `<div class="price-alert-item" onclick="openAssetDetail('${a.symbol}', '${a.name.replace(/'/g, "\\'")}', 0, 0, '${a.type}')">
            <div class="price-alert-icon">${icon}</div>
            <div class="price-alert-info"><div class="price-alert-symbol">${a.symbol} <span class="price-alert-dir">${label}</span></div><div class="price-alert-target">${detail}${a.note ? ' • ' + a.note : ''}</div></div>
            <button class="price-alert-delete" onclick="deleteAlert('${a.id}', event)">×</button>
        </div>`;
    }).join('');
}

// ============ BROWSE & FETCH ============
function openBrowseModal() { document.getElementById('browseModal').classList.add('active'); renderBrowseStocks(); }
function closeBrowseModal() { document.getElementById('browseModal').classList.remove('active'); }
function renderBrowseStocks() {
    const body = document.getElementById('browseBody'); const search = (document.getElementById('browseSearch').value || '').toLowerCase().trim(); const cat = currentBrowseCategory;
    let filtered = STOCK_UNIVERSE; if (cat !== 'all') filtered = filtered.filter(s => s.category === cat);
    if (search) filtered = filtered.filter(s => s.symbol.toLowerCase().includes(search) || s.name.toLowerCase().includes(search));
    if (filtered.length === 0) { body.innerHTML = '<div class="empty-state">Gak ada saham yang match.</div>'; return; }
    body.innerHTML = filtered.map(stock => {
        const inWatchlist = watchlist.some(w => w.symbol === stock.symbol);
        return `<div class="browse-item ${inWatchlist ? 'in-watchlist' : ''}" onclick="toggleFromBrowse('${stock.symbol}', '${stock.name.replace(/'/g, "\\'")}', '${stock.type}')"><div class="browse-item-info"><span class="browse-symbol">${stock.symbol}</span><span class="browse-name">${stock.name}</span></div><div class="browse-item-action">${inWatchlist ? '<span class="browse-badge added">✓ Added</span>' : '<span class="browse-badge add">+ Add</span>'}</div></div>`;
    }).join('');
}
function toggleFromBrowse(symbol, name, type) {
    const idx = watchlist.findIndex(w => w.symbol === symbol);
    if (idx >= 0) watchlist.splice(idx, 1); else watchlist.push({ symbol, name, type });
    saveWatchlist(); renderBrowseStocks(); renderWatchlist();
}

async function fetchPrice(symbol, type) {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-price`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ symbol, type }) });
        if (!response.ok) throw new Error('HTTP ' + response.status); const data = await response.json();
        if (type === 'crypto' && data.price) return { price: data.price, currency: 'USD', change: data.change || 0, name: data.name || symbol };
        if (type !== 'crypto' && data.chart && data.chart.result) { const meta = data.chart.result[0].meta; return { price: meta.regularMarketPrice, currency: meta.currency, change: meta.regularMarketChangePercent || 0, name: meta.longName || meta.shortName }; }
        return null;
    } catch (error) { return null; }
}
async function fetchFundamental(symbol, type) {
    try { const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-fundamental`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ symbol, type }) }); if (!response.ok) throw new Error('HTTP ' + response.status); const data = await response.json(); return data.fundamental || {}; } catch (error) { return {}; }
}
async function fetchChartData(symbol, type, interval = '1mo', range = 'max') {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-chart`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ symbol, type, interval, range }) });
        if (!response.ok) throw new Error('HTTP ' + response.status); const data = await response.json();
        if (data.data && Array.isArray(data.data)) return data.data.map(c => ({ time: c.time, open: parseFloat(c.open), high: parseFloat(c.high), low: parseFloat(c.low), close: parseFloat(c.close), volume: parseFloat(c.volume || 0) })).filter(c => !isNaN(c.open) && !isNaN(c.close));
        if (data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0]; const timestamps = result.timestamp || []; const quote = (result.indicators && result.indicators.quote && result.indicators.quote[0]) || {};
            const opens = quote.open || [], highs = quote.high || [], lows = quote.low || [], closes = quote.close || [], volumes = quote.volume || []; const candles = [];
            for (let i = 0; i < timestamps.length; i++) { if (opens[i] == null || closes[i] == null) continue; candles.push({ time: timestamps[i], open: opens[i], high: highs[i], low: lows[i], close: closes[i], volume: volumes[i] || 0 }); } return candles;
        } return [];
    } catch (error) { return []; }
}

// ============ MARKET MOVERS ============
async function fetchMarketMovers() {
    const container = document.getElementById('marketMovers'); if (!container) return;
    container.innerHTML = '<div class="movers-loading"><div class="loading-spinner"></div><p class="loading-text">Memuat pergerakan pasar...</p></div>';
    const results = []; const batchSize = 10;
    for (let i = 0; i < MOVERS_UNIVERSE.length; i += batchSize) {
        const batch = MOVERS_UNIVERSE.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(async (symbol) => {
            const stockInfo = STOCK_UNIVERSE.find(s => s.symbol === symbol) || { symbol, name: symbol, type: 'stock' };
            const priceData = await fetchPrice(symbol, stockInfo.type); if (!priceData) return null;
            return { symbol, name: priceData.name || stockInfo.name, type: stockInfo.type, price: priceData.price, change: priceData.change };
        })); results.push(...batchResults.filter(Boolean));
    }
    if (results.length === 0) { container.innerHTML = '<div class="empty-state">Gagal memuat data</div>'; return; }
    const sorted = results.sort((a, b) => b.change - a.change); marketMoversData = { gainers: sorted.filter(r => r.change > 0).slice(0, 5), losers: sorted.filter(r => r.change < 0).slice(-5).reverse() }; renderMarketMovers();
}
function renderMarketMovers() {
    const container = document.getElementById('marketMovers'); if (!container) return;
    const { gainers, losers } = marketMoversData; if (gainers.length === 0 && losers.length === 0) { container.innerHTML = '<div class="empty-state">Belum ada data</div>'; return; }
    let html = '';
    if (gainers.length > 0) html += `<div class="movers-section"><div class="movers-header"><span class="movers-title gainers-title">📈 Top Gainers</span><span class="movers-count">${gainers.length}</span></div><div class="movers-list">${gainers.map(g => `<div class="mover-item gainer" onclick="openAssetDetail('${g.symbol}', '${g.name.replace(/'/g, "\\'")}', ${g.price}, ${g.change}, '${g.type}')"><div class="mover-info"><span class="mover-symbol">${g.symbol}</span><span class="mover-name">${g.name}</span></div><div class="mover-price-wrap"><span class="mover-price">$${g.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span><span class="mover-change gainer">+${g.change.toFixed(2)}%</span></div></div>`).join('')}</div></div>`;
    if (losers.length > 0) html += `<div class="movers-section"><div class="movers-header"><span class="movers-title losers-title">📉 Top Losers</span><span class="movers-count">${losers.length}</span></div><div class="movers-list">${losers.map(l => `<div class="mover-item loser" onclick="openAssetDetail('${l.symbol}', '${l.name.replace(/'/g, "\\'")}', ${l.price}, ${l.change}, '${l.type}')"><div class="mover-info"><span class="mover-symbol">${l.symbol}</span><span class="mover-name">${l.name}</span></div><div class="mover-price-wrap"><span class="mover-price">$${l.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span><span class="mover-change loser">${l.change.toFixed(2)}%</span></div></div>`).join('')}</div></div>`;
    container.innerHTML = html;
}

// ============ RENDER WATCHLIST ============
function renderAssetCard(asset, priceData, index) {
    const p = priceData; const isFav = isFavorite(asset.symbol); const hasAl = hasAlert(asset.symbol);
    if (!p) return `<div class="watchlist-card-wrapper"><button class="star-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${asset.symbol}', event)">${isFav ? '★' : '☆'}</button><div class="asset-card"><div class="asset-info"><span class="asset-symbol">${asset.symbol}</span><span class="asset-name">${asset.name}</span></div><div class="asset-price"><div class="price">-</div><div class="change">Gagal memuat</div></div></div><button class="watchlist-delete" onclick="deleteFromWatchlist(${index}, event)">×</button></div>`;
    const trend = p.change >= 0 ? 'up' : 'down'; const changeStr = (p.change >= 0 ? '+' : '') + p.change.toFixed(2) + '%'; const priceStr = '$' + p.price.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return `<div class="watchlist-card-wrapper"><button class="star-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${asset.symbol}', event)">${isFav ? '★' : '☆'}</button><div class="asset-card" onclick="openAssetDetail('${asset.symbol}', '${p.name || asset.name}', ${p.price}, ${p.change}, '${asset.type}')"><div class="asset-info"><span class="asset-symbol">${asset.symbol}${hasAl ? ' <span class="alert-badge">🔔</span>' : ''}</span><span class="asset-name">${asset.name}</span></div><div class="asset-price"><div class="price">${priceStr}</div><div class="change ${trend}">${changeStr}</div></div></div><button class="watchlist-delete" onclick="deleteFromWatchlist(${index}, event)">×</button></div>`;
}
async function renderWatchlist() {
    const container = document.getElementById('watchlist'); container.innerHTML = '<div class="empty-state">Memuat data...</div>';
    if (watchlist.length === 0) { container.innerHTML = '<div class="empty-state">Watchlist kosong.</div>'; return; }
    const results = await Promise.all(watchlist.map(async (asset) => { const priceData = await fetchPrice(asset.symbol, asset.type); return { ...asset, priceData }; }));
    const favAssets = results.filter(a => isFavorite(a.symbol)); const otherAssets = results.filter(a => !isFavorite(a.symbol));
    let html = '';
    if (favAssets.length > 0) html += `<div class="watchlist-section"><div class="watchlist-section-header"><span class="watchlist-section-title">⭐ Favorites</span><span class="watchlist-section-count">${favAssets.length}</span></div>${favAssets.map(a => { const idx = watchlist.findIndex(w => w.symbol === a.symbol); return renderAssetCard(a, a.priceData, idx); }).join('')}</div>`;
    html += `<div class="watchlist-section"><div class="watchlist-section-header"><span class="watchlist-section-title">📊 ${favAssets.length > 0 ? 'Semua Aset' : 'Watchlist'}</span><span class="watchlist-section-count">${otherAssets.length}</span></div>${otherAssets.length > 0 ? otherAssets.map(a => { const idx = watchlist.findIndex(w => w.symbol === a.symbol); return renderAssetCard(a, a.priceData, idx); }).join('') : '<div class="empty-state" style="padding:20px;font-size:12px;">Semua saham udah favorite ⭐</div>'}</div>`;
    container.innerHTML = html;
}
function deleteFromWatchlist(index, event) {
    if (event) event.stopPropagation(); const asset = watchlist[index]; if (!confirm(`Hapus ${asset.symbol}?`)) return;
    const favIdx = favorites.indexOf(asset.symbol); if (favIdx >= 0) { favorites.splice(favIdx, 1); saveFavorites(); }
    alerts = alerts.filter(a => a.symbol !== asset.symbol); saveAlerts(); renderPriceAlerts(); watchlist.splice(index, 1); saveWatchlist(); renderWatchlist();
}

// ============ 🤖 AI SORT WATCHLIST ============
async function sortWatchlistByAI() {
    const btn = document.getElementById('sortAiBtn');
    if (!btn) return;
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Sorting...'; btn.style.opacity = '0.7'; btn.disabled = true;
    try {
        const scoredWatchlist = await Promise.all(watchlist.map(async (asset) => {
            const fund = await fetchFundamental(asset.symbol, asset.type);
            let score = 50;
            const roe = fund.roe || 0; const der = fund.debt_to_equity || 0; const pe = fund.pe_ratio || 0; const epsGrowth = fund.eps_growth || 0;
            if (roe > 0.15) score += 25; else if (roe > 0.10) score += 10;
            if (der < 0.5) score += 20; else if (der < 1.0) score += 10; else score -= 10;
            if (epsGrowth > 0.10) score += 20; else if (epsGrowth > 0) score += 10;
            if (pe > 0 && pe < 15) score += 15; else if (pe >= 15 && pe < 25) score += 5; else if (pe >= 35) score -= 10;
            score = Math.max(0, Math.min(100, score));
            return { ...asset, aiScore: score };
        }));
        scoredWatchlist.sort((a, b) => b.aiScore - a.aiScore);
        watchlist = scoredWatchlist;
        renderWatchlist();
    } catch (error) { console.error("Error sorting watchlist:", error); alert("Gagal mengurutkan watchlist."); }
    finally { btn.innerHTML = originalText; btn.style.opacity = '1'; btn.disabled = false; }
}

// ============ INDIKATOR ============
function calcEMA(closes, period) { if (closes.length < period) return closes[closes.length - 1] || 0; const k = 2 / (period + 1); let ema = closes[0]; for (let i = 1; i < closes.length; i++) ema = closes[i] * k + ema * (1 - k); return ema; }
function calcRSI(closes, period = 14) { if (closes.length < period + 1) return 50; let gains = 0, losses = 0; for (let i = 1; i <= period; i++) { const diff = closes[i] - closes[i - 1]; if (diff >= 0) gains += diff; else losses -= diff; } let avgGain = gains / period, avgLoss = losses / period; for (let i = period + 1; i < closes.length; i++) { const diff = closes[i] - closes[i - 1]; avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period; avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period; } if (avgLoss === 0) return 100; const rs = avgGain / avgLoss; return 100 - 100 / (1 + rs); }
function calcSentiment(candles) { const recent = candles.slice(-20); let buyVol = 0, sellVol = 0; recent.forEach(c => { if (c.close >= c.open) buyVol += c.volume || 0; else sellVol += c.volume || 0; }); const total = buyVol + sellVol; if (total === 0) return { buyPct: 50, sellPct: 50 }; const buyPct = (buyVol / total) * 100; return { buyPct, sellPct: 100 - buyPct }; }
async function updateIndicators(symbol, type) {
    const candles = await fetchChartData(symbol, type, '1d', '3mo'); if (candles.length < 20) return;
    const closes = candles.map(c => c.close).filter(c => c); const currentPrice = closes[closes.length - 1];
    const ema20 = calcEMA(closes, 20), ema5 = calcEMA(closes, 5), rsi = calcRSI(closes, 14);
    const htf = currentPrice > ema20 ? 'BULLISH' : 'BEARISH'; const ltf = ema5 > ema20 ? 'BULLISH' : 'BEARISH';
    const htfEl = document.getElementById('htfValue'); const ltfEl = document.getElementById('ltfValue'); const emaEl = document.getElementById('ema20Value'); const rsiEl = document.getElementById('rsiValue');
    htfEl.textContent = htf; htfEl.className = 'ind-value ' + (htf === 'BULLISH' ? 'bullish' : 'bearish');
    ltfEl.textContent = ltf; ltfEl.className = 'ind-value ' + (ltf === 'BULLISH' ? 'bullish' : 'bearish');
    emaEl.textContent = ema20.toFixed(2); emaEl.className = 'ind-value neutral';
    rsiEl.textContent = rsi.toFixed(0); if (rsi >= 70) rsiEl.className = 'ind-value bearish'; else if (rsi <= 30) rsiEl.className = 'ind-value bullish'; else rsiEl.className = 'ind-value neutral';
    const bid = currentPrice - (currentPrice * 0.0001); const ask = currentPrice + (currentPrice * 0.0001);
    document.getElementById('bidValue').textContent = '$' + bid.toFixed(2); document.getElementById('askValue').textContent = '$' + ask.toFixed(2);
    const sentiment = calcSentiment(candles);
    document.getElementById('buyerPct').textContent = sentiment.buyPct.toFixed(0) + '% Buy'; document.getElementById('sellerPct').textContent = sentiment.sellPct.toFixed(0) + '% Sell';
    document.getElementById('buyerBar').style.width = sentiment.buyPct + '%'; document.getElementById('sellerBar').style.width = sentiment.sellPct + '%';
}

// ============ ASSET DETAIL & CHART ============
let currentSymbol = null, currentType = null, currentName = null, currentPrice = 0, currentChange = 0;
async function openAssetDetail(symbol, name, price, change, type) {
    currentSymbol = symbol; currentType = type; currentName = name; currentPrice = price; currentChange = change;
    document.getElementById('chartModal').classList.add('active'); document.getElementById('chartTitle').textContent = symbol + ' — ' + name;
    updateChartPrice(); document.getElementById('analysisBody').innerHTML = `<div class="loading-spinner"></div><p class="loading-text">Mengambil data fundamental...</p>`;
    ['htfValue','ltfValue','ema20Value','rsiValue','bidValue','askValue','buyerPct','sellerPct'].forEach(id => document.getElementById(id).textContent = '-');
    loadChart(symbol, type); updateIndicators(symbol, type); loadAnalysis(symbol, name, price, type);
    if (indicatorInterval) clearInterval(indicatorInterval); indicatorInterval = setInterval(() => { if (currentSymbol) updateIndicators(currentSymbol, currentType); }, 15000);
}
function updateChartPrice() { const changeStr = (currentChange >= 0 ? '+' : '') + currentChange.toFixed(2) + '%'; const priceStr = '$' + currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 }); const priceEl = document.getElementById('chartPrice'); priceEl.textContent = priceStr + '  ' + changeStr; priceEl.style.color = currentChange >= 0 ? '#10b981' : '#ef4444'; }

function loadChart(symbol, type) {
    const container = document.getElementById('tradingviewContainer'); container.innerHTML = ''; if (currentChart) { currentChart.remove(); currentChart = null; }
    const isMobile = window.innerWidth < 400; const chartHeight = isMobile ? 450 : 520;
    if (typeof LightweightCharts === 'undefined') { container.innerHTML = '<div style="color:#f00;padding:20px;">❌ Library gagal dimuat.</div>'; return; }
    currentChart = LightweightCharts.createChart(container, { width: container.clientWidth, height: chartHeight, layout: { background: { color: 'transparent' }, textColor: 'rgba(255, 255, 255, 0.6)', fontFamily: 'Inter, sans-serif' }, grid: { vertLines: { color: 'rgba(255, 255, 255, 0.04)' }, horzLines: { color: 'rgba(255, 255, 255, 0.04)' } }, crosshair: { mode: LightweightCharts.CrosshairMode.Normal, vertLine: { color: 'rgba(251, 191, 36, 0.5)', labelBackgroundColor: '#fbbf24' }, horzLine: { color: 'rgba(251, 191, 36, 0.5)', labelBackgroundColor: '#fbbf24' } }, rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.08)', scaleMargins: { top: 0.1, bottom: 0.25 } }, timeScale: { borderColor: 'rgba(255, 255, 255, 0.08)', timeVisible: true, secondsVisible: false, rightOffset: 10, barSpacing: 12 }, handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false }, handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true } });
    candleSeries = currentChart.addCandlestickSeries({ upColor: '#ffffff', downColor: '#a855f7', borderUpColor: '#ffffff', borderDownColor: '#a855f7', wickUpColor: '#ffffff', wickDownColor: '#a855f7' });
    volumeSeries = currentChart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '' }); volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.75, bottom: 0 } });
    const activeAlert = alerts.find(a => a.symbol === symbol && !a.triggered && (a.alertType === 'price' || !a.alertType)); if (activeAlert && candleSeries) candleSeries.createPriceLine({ price: activeAlert.targetPrice, color: activeAlert.direction === 'above' ? '#10b981' : '#ef4444', lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: '🔔 Alert' });
    loadChartData(symbol, type, currentTimeframe); setupTimeframeButtons(); window.addEventListener('resize', resizeChart);
}
async function loadChartData(symbol, type, timeframe) {
    const intervalMap = { '5M': '5m', '30M': '30m', '1H': '1h', 'D': '1d', 'W': '1wk', 'M': '1mo', 'Y': '1mo' }; const rangeMap = { '5M': '5d', '30M': '1mo', '1H': '3mo', 'D': '1y', 'W': '5y', 'M': '20y', 'Y': 'max' };
    const interval = intervalMap[timeframe] || '1mo'; const range = rangeMap[timeframe] || 'max';
    let candles = await fetchChartData(symbol, type, interval, range); if (!candles || candles.length === 0 || !candleSeries) return;
    if (timeframe === 'Y') candles = aggregateToYearly(candles);
    const formattedData = candles.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })).filter(d => d.time != null && !isNaN(d.open) && !isNaN(d.high) && !isNaN(d.low) && !isNaN(d.close));
    const volumeData = candles.map(c => ({ time: c.time, value: c.volume || 0, color: c.close >= c.open ? 'rgba(255, 255, 255, 0.4)' : 'rgba(168, 85, 247, 0.4)' })).filter(d => d.time != null && !isNaN(d.value));
    candleSeries.setData(formattedData); volumeSeries.setData(volumeData);
    const totalCandles = formattedData.length; if (totalCandles > 100) currentChart.timeScale().setVisibleLogicalRange({ from: totalCandles - 100, to: totalCandles + 5 }); else currentChart.timeScale().fitContent();
}
function aggregateToYearly(monthlyCandles) {
    const yearlyMap = {}; monthlyCandles.forEach(c => { const date = new Date(c.time * 1000); const year = date.getFullYear(); if (!yearlyMap[year]) yearlyMap[year] = { year, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume || 0, firstTime: c.time, lastTime: c.time }; else { const y = yearlyMap[year]; if (c.time < y.firstTime) { y.open = c.open; y.firstTime = c.time; } if (c.time > y.lastTime) { y.close = c.close; y.lastTime = c.time; } if (c.high > y.high) y.high = c.high; if (c.low < y.low) y.low = c.low; y.volume += c.volume || 0; } });
    return Object.values(yearlyMap).sort((a, b) => a.year - b.year).map(y => ({ time: y.firstTime, open: y.open, high: y.high, low: y.low, close: y.close, volume: y.volume }));
}
function setupTimeframeButtons() { document.querySelectorAll('.tf-btn').forEach(btn => { const newBtn = btn.cloneNode(true); btn.parentNode.replaceChild(newBtn, btn); newBtn.addEventListener('click', () => { document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active')); newBtn.classList.add('active'); currentTimeframe = newBtn.dataset.tf; if (currentSymbol && currentType) loadChartData(currentSymbol, currentType, currentTimeframe); }); }); }
function resizeChart() { if (currentChart) { const container = document.getElementById('tradingviewContainer'); currentChart.applyOptions({ width: container.clientWidth }); } }

// ============ AI BUFFETT ANALYSIS ============
async function loadAnalysis(symbol, name, price, type) {
    const container = document.getElementById('analysisBody');
    container.innerHTML = `<div style="text-align:center; padding: 30px 0;"><div class="loading-spinner"></div><p class="loading-text" style="margin-top:10px;">🤖 AI Warren Buffett sedang menganalisis ${symbol}...</p></div>`;
    try {
        const fundamental = await fetchFundamental(symbol, type);
        const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-stock`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ symbol, name, price, fundamental }) });
        if (!response.ok) throw new Error('HTTP ' + response.status); const data = await response.json();
        if (data.ai_signal && data.confidence !== undefined) renderAISignalUI(data, container);
        else container.innerHTML = `<div class="ai-analysis-text">${formatAnalysis(data.analysis || 'Gagal memuat analisis.')}</div>`;
    } catch (error) { container.innerHTML = `<div class="analysis-error"><p>❌ Gagal memuat analisis AI</p><p class="error-detail">${error.message}</p></div>`; }
}
function renderAISignalUI(data, container) {
    const signal = data.ai_signal.toUpperCase(); const confidence = data.confidence; const reasons = data.reasons || [];
    let signalClass = 'hold'; let signalIcon = '⏸️'; let barColor = 'var(--gold)';
    if (signal.includes('BUY')) { signalClass = 'buy'; signalIcon = '🚀'; barColor = 'var(--green)'; }
    else if (signal.includes('SELL') || signal.includes('AVOID')) { signalClass = 'sell'; signalIcon = '⚠️'; barColor = 'var(--red)'; }
    const reasonsHtml = reasons.length > 0 ? `<div class="ai-reasons-title">💡 Alasan Fundamental:</div><div class="ai-reasons-list">${reasons.map(reason => `<div class="ai-reason-item"><span class="ai-reason-icon">✦</span><span>${reason}</span></div>`).join('')}</div>` : '';
    container.innerHTML = `<div class="ai-signal-container"><div class="ai-signal-badge ${signalClass}"><span style="font-size: 16px;">${signalIcon}</span><span>AI Signal: ${signal}</span></div><div class="ai-confidence-wrap"><div class="ai-confidence-header"><span>Buffett Confidence Score</span><span style="color: ${barColor}; font-size: 13px;">${confidence}/100</span></div><div class="ai-confidence-bar"><div class="ai-confidence-fill" style="width: 0%; background: ${barColor};"></div></div></div>${reasonsHtml}${data.analysis ? `<div class="ai-analysis-text"><strong>📝 Kesimpulan AI:</strong><br>${formatAnalysis(data.analysis)}</div>` : ''}</div>`;
    setTimeout(() => { const fillBar = container.querySelector('.ai-confidence-fill'); if (fillBar) fillBar.style.width = confidence + '%'; }, 100);
}
function formatAnalysis(text) { if (!text) return ''; return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'); }
function closeAssetDetail() { document.getElementById('chartModal').classList.remove('active'); document.getElementById('tradingviewContainer').innerHTML = ''; if (currentChart) { currentChart.remove(); currentChart = null; candleSeries = null; volumeSeries = null; } if (indicatorInterval) { clearInterval(indicatorInterval); indicatorInterval = null; } window.removeEventListener('resize', resizeChart); }

// ============ SCREENER ============
async function runScreener() {
    const results = document.getElementById('screenerResults'); results.innerHTML = '<div class="empty-state">Screener lagi diproses...</div>';
    const peMax = parseFloat(document.getElementById('peMax').value) || 15; const pbMax = parseFloat(document.getElementById('pbMax').value) || 1.5;
    const roeMin = (parseFloat(document.getElementById('roeMin').value) || 15) / 100; const derMax = parseFloat(document.getElementById('derMax').value) || 1; const divMin = (parseFloat(document.getElementById('divMin').value) || 3) / 100;
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/run-screener`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ peMax, pbMax, roeMin, derMax, divMin }) });
        if (!response.ok) throw new Error('HTTP ' + response.status); const data = await response.json();
        if (!data.results || data.results.length === 0) { results.innerHTML = '<div class="empty-state">Gak ada saham yang lolos filter.</div>'; return; }
        results.innerHTML = `<p class="description">${data.count} saham lolos filter:</p>` + data.results.map(stock => `<div class="asset-card"><div class="asset-info"><span class="asset-symbol">${stock.symbol}</span><span class="asset-name">${stock.company_name}</span><span class="asset-metrics">P/E ${stock.pe_ratio?.toFixed(2)} · P/B ${stock.pb_ratio?.toFixed(2)} · ROE ${((stock.roe || 0) * 100).toFixed(1)}% · Div ${((stock.dividend_yield || 0) * 100).toFixed(1)}%</span></div></div>`).join('');
    } catch (error) { results.innerHTML = `<div class="empty-state">❌ Gagal: ${error.message}</div>`; }
}

// ============ PORTFOLIO ============
async function renderPortfolio() {
    const container = document.getElementById('holdings'); const totalValueEl = document.getElementById('totalValue'); const unrealizedPLEl = document.getElementById('unrealizedPL');
    const totalCostEl = document.getElementById('totalCost'); const totalHoldingsEl = document.getElementById('totalHoldings'); const chartSection = document.getElementById('portfolioChartSection');
    if (portfolio.length === 0) { container.innerHTML = '<div class="empty-state">Belum ada holding.</div>'; totalValueEl.textContent = '$ 0'; unrealizedPLEl.textContent = '$ 0'; totalCostEl.textContent = '$ 0'; totalHoldingsEl.textContent = '0'; if (chartSection) chartSection.style.display = 'none'; return; }
    container.innerHTML = '<div class="empty-state">Memuat harga...</div>';
    const holdingsWithPrice = await Promise.all(portfolio.map(async (h) => { const priceData = await fetchPrice(h.symbol, h.type); return { ...h, currentPrice: priceData?.price || 0 }; }));
    const holdingsWithValues = holdingsWithPrice.map(h => ({ ...h, currentValue: h.currentPrice * h.shares, costBasis: h.avgPrice * h.shares, pl: (h.currentPrice * h.shares) - (h.avgPrice * h.shares) }));
    const totalValue = holdingsWithValues.reduce((s, h) => s + h.currentValue, 0); const totalCost = holdingsWithValues.reduce((s, h) => s + h.costBasis, 0);
    container.innerHTML = holdingsWithValues.map(h => { const plPercent = h.costBasis > 0 ? (h.pl / h.costBasis) * 100 : 0; const plClass = h.pl >= 0 ? 'up' : 'down'; const plSign = h.pl >= 0 ? '+' : ''; return `<div class="holding-card"><div class="holding-info"><span class="holding-symbol">${h.symbol}</span><span class="holding-detail">${h.shares} × $${h.avgPrice.toFixed(2)} = $${h.costBasis.toFixed(2)}</span><span class="holding-detail">Current: $${h.currentPrice.toFixed(2)}</span></div><div class="holding-pl"><span class="holding-value">$${h.currentValue.toFixed(2)}</span><span class="holding-pl-amount ${plClass}">${plSign}$${h.pl.toFixed(2)} (${plSign}${plPercent.toFixed(2)}%)</span></div><button class="holding-delete" onclick="deleteHolding('${h.id}')">×</button></div>`; }).join('');
    const totalPL = totalValue - totalCost; const totalPLSign = totalPL >= 0 ? '+' : '';
    totalValueEl.textContent = '$ ' + totalValue.toFixed(2); unrealizedPLEl.textContent = `${totalPLSign}$${totalPL.toFixed(2)}`; unrealizedPLEl.style.color = totalPL >= 0 ? '#10b981' : '#ef4444';
    totalCostEl.textContent = '$ ' + totalCost.toFixed(2); totalHoldingsEl.textContent = portfolio.length; renderPortfolioPieChart(holdingsWithValues, totalValue);
}
function renderPortfolioPieChart(holdings, totalValue) {
    const chartSection = document.getElementById('portfolioChartSection'); const canvas = document.getElementById('portfolioPieChart'); const centerValue = document.getElementById('chartCenterValue'); const legend = document.getElementById('portfolioLegend');
    if (!chartSection || !canvas || !centerValue || !legend) return; if (holdings.length === 0 || totalValue <= 0) { chartSection.style.display = 'none'; return; }
    chartSection.style.display = 'block'; const sorted = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
    const dpr = window.devicePixelRatio || 1; const size = 240; canvas.width = size * dpr; canvas.height = size * dpr; canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
    const ctx = canvas.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, size, size);
    const cx = size / 2, cy = size / 2; const outerRadius = size / 2 - 8; const innerRadius = outerRadius * 0.62; let startAngle = -Math.PI / 2;
    sorted.forEach((h, i) => { const pct = h.currentValue / totalValue; const angle = pct * Math.PI * 2; const endAngle = startAngle + angle; const color = CHART_COLORS[i % CHART_COLORS.length]; ctx.beginPath(); ctx.arc(cx, cy, outerRadius, startAngle, endAngle); ctx.arc(cx, cy, innerRadius, endAngle, startAngle, true); ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'rgba(10, 10, 15, 0.9)'; ctx.lineWidth = 2; ctx.stroke(); startAngle = endAngle; });
    centerValue.textContent = '$' + totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 });
    legend.innerHTML = sorted.map((h, i) => { const pct = (h.currentValue / totalValue) * 100; const color = CHART_COLORS[i % CHART_COLORS.length]; return `<div class="portfolio-legend-item"><span class="legend-dot" style="background: ${color}; box-shadow: 0 0 8px ${color}80;"></span><span class="legend-symbol">${h.symbol}</span><span class="legend-pct">${pct.toFixed(1)}%</span><span class="legend-value">$${h.currentValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span></div>`; }).join('');
}
function deleteHolding(id) { if (!confirm('Hapus holding ini?')) return; portfolio = portfolio.filter(h => h.id !== id); savePortfolio(); renderPortfolio(); analyzePortfolioRisk(); }

// ============ AI PORTFOLIO RISK ============
async function analyzePortfolioRisk() {
    const container = document.getElementById('portfolioRiskAnalysis'); if (!container || portfolio.length === 0) { if (container) container.style.display = 'none'; return; }
    container.style.display = 'block'; container.innerHTML = '<div class="loading-spinner"></div><p class="loading-text">🧠 AI sedang menganalisis risiko portofolio...</p>';
    try {
        const sectorMap = { 'us-tech': 'Technology', 'us-finance': 'Finance', 'us-healthcare': 'Healthcare', 'us-consumer': 'Consumer', 'us-industrial': 'Industrial', 'us-energy': 'Energy', 'international': 'International', 'crypto': 'Crypto', 'commodity': 'Commodity', 'index': 'Index' };
        const sectorAllocation = {}; let totalValue = 0;
        await Promise.all(portfolio.map(async (h) => { const priceData = await fetchPrice(h.symbol, h.type); const value = (priceData?.price || 0) * h.shares; totalValue += value; const stockInfo = STOCK_UNIVERSE.find(s => s.symbol === h.symbol); const sector = stockInfo ? sectorMap[stockInfo.category] || 'Other' : 'Other'; if (!sectorAllocation[sector]) sectorAllocation[sector] = 0; sectorAllocation[sector] += value; }));
        const sectorPercentages = Object.entries(sectorAllocation).map(([sector, value]) => ({ sector, percentage: (value / totalValue) * 100 })).sort((a, b) => b.percentage - a.percentage);
        let riskLevel = 'LOW'; let riskColor = 'var(--green)'; let riskMessage = 'Portofolio terdiversifikasi dengan baik.';
        const topSector = sectorPercentages[0];
        if (topSector && topSector.percentage > 60) { riskLevel = 'HIGH'; riskColor = 'var(--red)'; riskMessage = `⚠️ Terlalu terkonsentrasi di ${topSector.sector} (${topSector.percentage.toFixed(1)}%). Pertimbangkan diversifikasi!`; }
        else if (topSector && topSector.percentage > 40) { riskLevel = 'MEDIUM'; riskColor = 'var(--gold)'; riskMessage = `⚠️ ${topSector.sector} mendominasi (${topSector.percentage.toFixed(1)}%). Monitor closely.`; }
        const sectorHtml = sectorPercentages.map(s => `<div class="risk-sector-item"><span class="risk-sector-name">${s.sector}</span><span class="risk-sector-pct" style="color: ${s.percentage > 40 ? 'var(--red)' : 'var(--green)'}">${s.percentage.toFixed(1)}%</span></div>`).join('');
        container.innerHTML = `<div class="risk-analysis-container"><div class="risk-header"><span class="risk-level-badge" style="background: ${riskColor}20; color: ${riskColor}; border-color: ${riskColor}">${riskLevel} RISK</span></div><p class="risk-message">${riskMessage}</p><div class="risk-sectors"><div class="risk-section-title">📊 Alokasi Sektor:</div>${sectorHtml}</div></div>`;
    } catch (error) { container.innerHTML = `<div class="analysis-error"><p>❌ Gagal menganalisis risiko</p></div>`; }
}

// ============ 🔥 SECTOR HEATMAP ============
function getHeatColor(change) {
    // Change dalam persen
    if (change >= 3) return '#10b981';
    if (change >= 1.5) return '#34d399';
    if (change >= 0.5) return '#6ee7b7';
    if (change > 0) return '#a7f3d0';
    if (change === 0) return '#64748b';
    if (change > -0.5) return '#fecaca';
    if (change > -1.5) return '#f87171';
    if (change > -3) return '#ef4444';
    return '#dc2626';
}

async function fetchSectorData(sectorKey) {
    const stocks = STOCK_UNIVERSE.filter(s => s.category === sectorKey);
    const results = await Promise.all(stocks.map(async (stock) => {
        const priceData = await fetchPrice(stock.symbol, stock.type);
        if (!priceData) return null;
        return { symbol: stock.symbol, name: stock.name, type: stock.type, price: priceData.price, change: priceData.change };
    }));
    return results.filter(Boolean);
}

async function renderSectorHeatmap() {
    const grid = document.getElementById('heatmapGrid');
    const sentimentBar = document.getElementById('heatmapSentiment');
    if (!grid) return;
    
    grid.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding: 30px 20px;"><div class="loading-spinner"></div><p class="loading-text">Memuat data sektor...</p></div>';
    
    try {
        // Fetch semua sektor secara paralel (batch biar gak overwhelming)
        const sectorResults = [];
        for (const sector of SECTOR_CONFIG) {
            const stocks = await fetchSectorData(sector.key);
            if (stocks.length === 0) continue;
            const avgChange = stocks.reduce((sum, s) => sum + s.change, 0) / stocks.length;
            const bullishCount = stocks.filter(s => s.change > 0).length;
            const bearishCount = stocks.filter(s => s.change < 0).length;
            sectorResults.push({
                ...sector,
                stocks,
                avgChange,
                bullishCount,
                bearishCount,
                totalStocks: stocks.length
            });
        }
        
        if (sectorResults.length === 0) {
            grid.innerHTML = '<div class="empty-state">Gagal memuat data sektor</div>';
            return;
        }
        
        heatmapData = sectorResults.sort((a, b) => b.avgChange - a.avgChange);
        
        // Hitung market breadth overall
        let totalBullish = 0, totalBearish = 0;
        sectorResults.forEach(s => { totalBullish += s.bullishCount; totalBearish += s.bearishCount; });
        const totalStocks = totalBullish + totalBearish;
        const bullPct = totalStocks > 0 ? (totalBullish / totalStocks) * 100 : 50;
        const bearPct = 100 - bullPct;
        
        // Update sentiment bar
        document.getElementById('hmBullFill').style.width = bullPct + '%';
        document.getElementById('hmBearFill').style.width = bearPct + '%';
        document.getElementById('heatmapSentimentStats').innerHTML = `
            <span class="sentiment-stat bullish">🟢 ${bullPct.toFixed(1)}% Bullish (${totalBullish})</span>
            <span class="sentiment-stat bearish">🔴 ${bearPct.toFixed(1)}% Bearish (${totalBearish})</span>
        `;
        
        // Render grid
        grid.innerHTML = heatmapData.map((sector, idx) => {
            const avgChange = sector.avgChange;
            const trendClass = avgChange > 0 ? 'up' : avgChange < 0 ? 'down' : 'flat';
            const trendSign = avgChange > 0 ? '+' : '';
            const heatColor = getHeatColor(avgChange);
            
            // Mini heat dots (max 10 dots)
            const dotsToShow = sector.stocks.slice(0, 10);
            const dotsHtml = dotsToShow.map(s => {
                const dotColor = getHeatColor(s.change);
                return `<div class="sector-heat-dot" style="background:${dotColor}; box-shadow: 0 0 4px ${dotColor}80;"></div>`;
            }).join('');
            
            return `<div class="sector-card" style="border-left: 3px solid ${heatColor};" onclick="openSectorDetail(${idx})">
                <div class="sector-card-header">
                    <span class="sector-card-icon">${sector.icon}</span>
                    <span class="sector-card-name">${sector.name}</span>
                </div>
                <div class="sector-card-avg ${trendClass}">${trendSign}${avgChange.toFixed(2)}%</div>
                <div class="sector-card-count">${sector.totalStocks} stocks · 🟢 ${sector.bullishCount} · 🔴 ${sector.bearishCount}</div>
                <div class="sector-card-heat-dots">${dotsHtml}</div>
            </div>`;
        }).join('');
    } catch (error) {
        console.error('Heatmap error:', error);
        grid.innerHTML = '<div class="empty-state">❌ Gagal memuat heatmap</div>';
    }
}

function openSectorDetail(index) {
    const sector = heatmapData[index];
    if (!sector) return;
    
    const modal = document.getElementById('sectorDetailModal');
    modal.classList.add('active');
    
    document.getElementById('sdIcon').textContent = sector.icon;
    document.getElementById('sdName').textContent = sector.name;
    document.getElementById('sdSubtitle').textContent = `${sector.totalStocks} stocks dalam sektor ini`;
    
    const avgChange = sector.avgChange;
    const avgEl = document.getElementById('sdAvgChange');
    avgEl.textContent = (avgChange > 0 ? '+' : '') + avgChange.toFixed(2) + '%';
    avgEl.className = 'summary-value ' + (avgChange > 0 ? 'up' : avgChange < 0 ? 'down' : '');
    
    document.getElementById('sdBullish').textContent = sector.bullishCount;
    document.getElementById('sdBearish').textContent = sector.bearishCount;
    
    // Sort stocks by change
    const sortedStocks = [...sector.stocks].sort((a, b) => b.change - a.change);
    
    document.getElementById('sdStocksList').innerHTML = sortedStocks.map(s => {
        const trendClass = s.change > 0 ? 'up' : s.change < 0 ? 'down' : 'flat';
        const sign = s.change > 0 ? '+' : '';
        const barColor = getHeatColor(s.change);
        const barWidth = Math.min(Math.abs(s.change) * 20, 100); // Max 5% = 100%
        
        return `<div class="sector-stock-item" onclick="closeSectorDetail(); openAssetDetail('${s.symbol}', '${s.name.replace(/'/g, "\\'")}', ${s.price}, ${s.change}, '${s.type}')">
            <div class="sector-stock-top">
                <div class="sector-stock-info">
                    <span class="sector-stock-symbol">${s.symbol}</span>
                    <span class="sector-stock-name">${s.name}</span>
                </div>
                <div class="sector-stock-price-wrap">
                    <div class="sector-stock-price">$${s.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                    <div class="sector-stock-change ${trendClass}">${sign}${s.change.toFixed(2)}%</div>
                </div>
            </div>
            <div class="sector-stock-bar"><div class="sector-stock-bar-fill" style="width: ${barWidth}%; background: ${barColor};"></div></div>
        </div>`;
    }).join('');
}

function closeSectorDetail() {
    document.getElementById('sectorDetailModal').classList.remove('active');
}

// ============ NEWS SENTIMENT ============
function getNewsSentiment(text) {
    if (!text) return { label: 'NEUTRAL', class: 'neutral', icon: '⚪' };
    const lowerText = text.toLowerCase();
    const bullishWords = ['surge', 'jump', 'rally', 'beat', 'growth', 'profit', 'gain', 'bull', 'soar', 'record', 'up', 'rise', 'boost', 'high', 'buy', 'upgrade', 'positive', 'strong', 'recovery', 'breakout', 'momentum'];
    const bearishWords = ['drop', 'fall', 'crash', 'miss', 'loss', 'decline', 'bear', 'plunge', 'slump', 'down', 'cut', 'warn', 'low', 'sell', 'downgrade', 'negative', 'weak', 'recession', 'fear', 'risk', 'inflation', 'debt'];
    let bullScore = 0; let bearScore = 0;
    bullishWords.forEach(word => { if (lowerText.includes(word)) bullScore++; });
    bearishWords.forEach(word => { if (lowerText.includes(word)) bearScore++; });
    if (bullScore > bearScore) return { label: 'BULLISH', class: 'positive', icon: '🟢' };
    if (bearScore > bullScore) return { label: 'BEARISH', class: 'negative', icon: '🔴' };
    return { label: 'NEUTRAL', class: 'neutral', icon: '⚪' };
}

// ============ NEWS ============
async function renderNews() {
    const container = document.getElementById('newsList'); container.innerHTML = '<div class="empty-state">Memuat berita...</div>';
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-news`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ category: 'all' }) });
        if (!response.ok) throw new Error('HTTP ' + response.status); const data = await response.json();
        const news = data.news || []; newsCache = news;
        if (news.length === 0) { container.innerHTML = '<div class="empty-state">Belum ada berita</div>'; return; }
        container.innerHTML = news.map((item, i) => {
            const time = formatTime(item.timePublished); const category = (item.category || 'NEWS').toUpperCase();
            const fullText = (item.title || '') + ' ' + (item.summary || '');
            const sentiment = getNewsSentiment(fullText);
            return `<div class="news-card" id="news-card-${i}" onclick="openNewsDetail(${i})">
                <div class="news-title" id="news-title-${i}"><span class="trans-inline-spinner"></span>${item.title}</div>
                <div class="news-summary" id="news-summary-${i}">${item.summary ? item.summary.substring(0, 150) + '...' : ''}</div>
                <div class="news-meta">
                    <span class="sentiment-tag ${sentiment.class}">${sentiment.icon} ${sentiment.label}</span>
                    <span>${item.source || 'Unknown'}</span><span>${time}</span>
                    <span class="trans-done-badge" id="trans-badge-${i}" style="display:none;">🌐 ID</span>
                </div>
            </div>`;
        }).join('');
        translateNewsInBackground(news);
    } catch (error) { container.innerHTML = `<div class="empty-state">❌ ${error.message}</div>`; }
}
async function translateNewsInBackground(news) {
    for (let i = 0; i < news.length; i++) {
        const item = news[i]; try {
            if (item.title) { const transTitle = await translateText(item.title); const titleEl = document.getElementById(`news-title-${i}`); if (titleEl && transTitle !== item.title) titleEl.textContent = transTitle; }
            if (item.summary) { const shortSummary = item.summary.substring(0, 150); const transSummary = await translateText(shortSummary); const summaryEl = document.getElementById(`news-summary-${i}`); if (summaryEl && transSummary !== shortSummary) summaryEl.textContent = transSummary + (item.summary.length > 150 ? '...' : ''); }
            const badgeEl = document.getElementById(`trans-badge-${i}`); if (badgeEl) badgeEl.style.display = 'inline-block';
        } catch (e) {}
    }
}
function openNewsDetail(index) {
    const item = newsCache[index]; if (!item) return; currentNewsItem = item;
    document.getElementById('newsDetailModal').classList.add('active');
    document.getElementById('ndSource').textContent = item.source || 'Unknown'; document.getElementById('ndTime').textContent = formatTime(item.timePublished);
    document.getElementById('ndCategory').textContent = (item.category || 'NEWS').toUpperCase();
    document.getElementById('ndTitle').textContent = item.title; document.getElementById('ndSummary').textContent = item.summary || 'Tidak ada ringkasan tersedia.';
    const badge = document.getElementById('ndTransBadge'); badge.style.display = 'inline-flex'; badge.classList.remove('trans-done'); badge.innerHTML = '<span class="trans-loading-spinner"></span> 🌐 Menerjemahkan...';
    translateNewsDetail(item);
}
async function translateNewsDetail(item) {
    const badge = document.getElementById('ndTransBadge'); try {
        const [transTitle, transSummary] = await Promise.all([translateText(item.title), translateText(item.summary || '')]);
        if (currentNewsItem !== item) return;
        document.getElementById('ndTitle').textContent = transTitle; if (transSummary && transSummary.trim()) document.getElementById('ndSummary').textContent = transSummary;
        badge.innerHTML = '🌐 Diterjemahkan dari Bahasa Inggris'; badge.classList.add('trans-done');
    } catch (e) { badge.style.display = 'none'; }
}
function closeNewsDetail() { document.getElementById('newsDetailModal').classList.remove('active'); currentNewsItem = null; }
function openNewsOriginal() { if (currentNewsItem && currentNewsItem.url) window.open(currentNewsItem.url, '_blank'); }
function copyNewsLink() {
    if (!currentNewsItem || !currentNewsItem.url) return; const url = currentNewsItem.url;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => showToastSimple('📋 Link berhasil dicopy!')).catch(() => fallbackCopy(url)); else fallbackCopy(url);
}
function fallbackCopy(text) { const temp = document.createElement('textarea'); temp.value = text; temp.style.position = 'fixed'; temp.style.left = '-9999px'; document.body.appendChild(temp); temp.select(); try { document.execCommand('copy'); showToastSimple('📋 Link berhasil dicopy!'); } catch (e) { showToastSimple('❌ Gagal copy link'); } document.body.removeChild(temp); }
function showToastSimple(message) { const toast = document.createElement('div'); toast.style.cssText = `position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#1a1a2e,#0f0f1a);color:#fff;padding:12px 20px;border-radius:12px;border:1px solid rgba(251,191,36,0.4);font-size:13px;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,0.5);z-index:9999;animation:toastIn 0.3s ease;`; toast.textContent = message; document.body.appendChild(toast); setTimeout(() => { toast.style.animation = 'toastOut 0.3s ease'; setTimeout(() => document.body.removeChild(toast), 300); }, 2000); }
function formatTime(timeStr) { if (!timeStr) return ''; const date = new Date(timeStr * 1000); const day = String(date.getDate()).padStart(2, '0'); const month = String(date.getMonth() + 1).padStart(2, '0'); const year = date.getFullYear(); const hour = String(date.getHours()).padStart(2, '0'); const minute = String(date.getMinutes()).padStart(2, '0'); return `${day}/${month}/${year} ${hour}:${minute}`; }

// ============ EVENT LISTENERS & INIT ============
document.getElementById('browseStockBtn').addEventListener('click', openBrowseModal); document.getElementById('closeBrowseModal').addEventListener('click', closeBrowseModal); document.getElementById('browseSearch').addEventListener('input', renderBrowseStocks);
document.querySelectorAll('.cat-btn').forEach(btn => { btn.addEventListener('click', () => { document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); currentBrowseCategory = btn.dataset.cat; renderBrowseStocks(); }); });
const assetModal = document.getElementById('assetModal'); document.getElementById('addAssetBtn').addEventListener('click', () => assetModal.classList.add('active')); document.getElementById('closeAssetModal').addEventListener('click', () => assetModal.classList.remove('active')); document.getElementById('cancelAsset').addEventListener('click', () => assetModal.classList.remove('active'));
document.getElementById('saveAsset').addEventListener('click', () => { const symbol = document.getElementById('assetSymbol').value.trim().toUpperCase(); const name = document.getElementById('assetName').value.trim(); const type = document.getElementById('assetType').value; if (!symbol || !name) { alert('Isi semua field!'); return; } if (watchlist.some(a => a.symbol === symbol)) { alert(`${symbol} udah ada!`); return; } watchlist.push({ symbol, name, type }); saveWatchlist(); assetModal.classList.remove('active'); document.getElementById('assetSymbol').value = ''; document.getElementById('assetName').value = ''; renderWatchlist(); });
document.getElementById('setAlertBtn').addEventListener('click', () => openAlertModal(currentSymbol, currentName, currentPrice, currentType)); document.getElementById('closeAlertModal').addEventListener('click', closeAlertModal); document.getElementById('cancelAlert').addEventListener('click', closeAlertModal); document.getElementById('saveAlert').addEventListener('click', saveAlert);
document.getElementById('alertTargetPrice').addEventListener('input', updateAlertPreview); document.getElementById('alertRsiValue').addEventListener('input', updateAlertPreview); document.getElementById('alertEmaPeriod').addEventListener('change', updateAlertPreview); document.getElementById('alertVolumeMultiplier').addEventListener('input', updateAlertPreview);
document.getElementById('alertToastClose').addEventListener('click', closeAlertToast); document.getElementById('closeChartModal').addEventListener('click', closeAssetDetail); document.getElementById('runScreener').addEventListener('click', runScreener);

// SORT AI
document.getElementById('sortAiBtn').addEventListener('click', sortWatchlistByAI);

const holdingModal = document.getElementById('holdingModal'); document.getElementById('addHolding').addEventListener('click', () => holdingModal.classList.add('active')); document.getElementById('closeHoldingModal').addEventListener('click', () => holdingModal.classList.remove('active')); document.getElementById('cancelHolding').addEventListener('click', () => holdingModal.classList.remove('active'));
document.getElementById('saveHolding').addEventListener('click', () => { const symbol = document.getElementById('holdingSymbol').value.trim().toUpperCase(); const name = document.getElementById('holdingName').value.trim(); const type = document.getElementById('holdingType').value; const shares = parseFloat(document.getElementById('holdingShares').value); const avgPrice = parseFloat(document.getElementById('holdingAvgPrice').value); if (!symbol || !name || !shares || !avgPrice) { alert('Isi semua field!'); return; } portfolio.push({ id: 'holding-' + Date.now(), symbol, name, type, shares, avgPrice, addedAt: Date.now() }); savePortfolio(); holdingModal.classList.remove('active'); document.getElementById('holdingSymbol').value = ''; document.getElementById('holdingName').value = ''; document.getElementById('holdingShares').value = ''; document.getElementById('holdingAvgPrice').value = ''; renderPortfolio(); analyzePortfolioRisk(); });
document.getElementById('closeNewsDetail').addEventListener('click', closeNewsDetail); document.getElementById('ndOpenOriginal').addEventListener('click', openNewsOriginal); document.getElementById('ndCopyLink').addEventListener('click', copyNewsLink);
document.getElementById('currencyOpenBtn').addEventListener('click', openCurrencyModal); document.getElementById('closeCurrencyModal').addEventListener('click', closeCurrencyModal); document.getElementById('currencyFromAmount').addEventListener('input', convertCurrency); document.getElementById('currencyFromSelect').addEventListener('change', convertCurrency);
document.getElementById('currencyToSelect').addEventListener('change', () => { const val = document.getElementById('currencyToSelect').value; document.querySelectorAll('.quick-target-btn').forEach(b => b.classList.toggle('active', b.dataset.cur === val)); convertCurrency(); });
document.getElementById('currencySwapBtn').addEventListener('click', () => { const btn = document.getElementById('currencySwapBtn'); btn.style.transform = 'rotate(180deg)'; setTimeout(() => btn.style.transform = 'rotate(0deg)', 300); swapCurrencies(); });
document.getElementById('currencyRefreshBtn').addEventListener('click', async () => { const btn = document.getElementById('currencyRefreshBtn'); btn.querySelector('.refresh-icon').style.animation = 'spin 1s linear infinite'; await fetchCurrencyRates(true); await convertCurrency(); btn.querySelector('.refresh-icon').style.animation = ''; });
document.querySelectorAll('.quick-amount-btn').forEach(btn => { btn.addEventListener('click', () => { document.querySelectorAll('.quick-amount-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); document.getElementById('currencyFromAmount').value = btn.dataset.amount; convertCurrency(); }); });

// SECTOR DETAIL
document.getElementById('closeSectorDetail').addEventListener('click', closeSectorDetail);

// INIT
populateCurrencyDropdowns();
renderWatchlist(); renderPriceAlerts(); fetchMarketMovers();
setTimeout(() => checkAlerts(), 5000); alertCheckInterval = setInterval(checkAlerts, 60000);
