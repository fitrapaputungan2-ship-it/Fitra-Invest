// ============ KONFIGURASI ============
const SUPABASE_URL = "https://twxsupmgnmkzsyiqebln.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_9KSdez89Nm7-zE2I2-yzMA_9NPYAMRC";

// ============ 🛡️ SAFE JSON PARSER (Mencegah Crash) ============
function safeParse(key, fallback) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.warn("Data localStorage korup, mereset ke default:", key);
        return fallback;
    }
}

// ============ ⏱️ FETCH WITH TIMEOUT ============
function fetchWithTimeout(url, options = {}, timeout = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const opts = { ...options, signal: controller.signal };
    return fetch(url, opts)
        .then(res => { clearTimeout(timer); return res; })
        .catch(err => {
            clearTimeout(timer);
            if (err.name === 'AbortError') throw new Error('Request timeout');
            throw err;
        });
}

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
let compareChart = null;
let indeksFilter = 'all';
let indeksSearch = '';
let indeksDetailChart = null;
let indeksDetailSymbol = null;
let indeksRenderToken = 0;
let currentMoveAssetSymbol = null;
let currentSortMode = 'default';

// Crypto globals
let cryptoData = [];
let cryptoView = 'marketcap';
let cryptoRates = {};
let cryptoLastFetch = 0;
let currentCryptoData = null;
let cryptoCatView = 'all';
let corrChartInstance = null;
let stakingChartInstance = null;
let dcaChartInstance = null;

// Commodity globals
let commodityData = [];
let commodityFilter = 'all';
let commCorrChartInstance = null;
let dxyChartInstance = null;
let seasonalityChartInstance = null;
let inflationChartInstance = null;

// ============ DATA & LOCALSTORAGE ============
let watchlist = safeParse('fitraWatchlist', [
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', group: '' }, 
    { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock', group: '' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock', group: '' }, 
    { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', group: '' }
]);
function saveWatchlist() { localStorage.setItem('fitraWatchlist', JSON.stringify(watchlist)); }

let favorites = safeParse('fitraFavorites', []);
function saveFavorites() { localStorage.setItem('fitraFavorites', JSON.stringify(favorites)); }
function isFavorite(symbol) { return favorites.includes(symbol); }
function toggleFavorite(symbol, event) {
    if (event) event.stopPropagation();
    const idx = favorites.indexOf(symbol);
    if (idx >= 0) favorites.splice(idx, 1); else favorites.push(symbol);
    saveFavorites(); renderWatchlist();
}

let alerts = safeParse('fitraAlerts', []);
function saveAlerts() { localStorage.setItem('fitraAlerts', JSON.stringify(alerts)); }
function hasAlert(symbol) { return alerts.some(a => a.symbol === symbol && !a.triggered); }

let portfolio = safeParse('fitraPortfolio', []);
function savePortfolio() { localStorage.setItem('fitraPortfolio', JSON.stringify(portfolio)); }

let groups = safeParse('fitraGroups', []);
let activeGroup = 'all';
function saveGroups() { localStorage.setItem('fitraGroups', JSON.stringify(groups)); }

// ============ 🌐 TRANSLATION CACHE ============
let translationCache = safeParse('fitraTranslationCache', {});
function saveTranslationCache() { try { localStorage.setItem('fitraTranslationCache', JSON.stringify(translationCache)); } catch (e) { translationCache = {}; } }
async function translateText(text) {
    if (!text || text.trim() === '') return text;
    if (translationCache[text]) return translationCache[text];
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=id&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetchWithTimeout(url, {}, 8000);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        const translated = data[0].map(item => item[0]).filter(Boolean).join('');
        translationCache[text] = translated; saveTranslationCache(); return translated;
    } catch (error) { return text; }
}

// ============ 💱 CURRENCY CONVERTER ============
let currencyRates = safeParse('fitraCurrencyRates', null);
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
        const response = await fetchWithTimeout('https://open.er-api.com/v6/latest/USD', {}, 8000);
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
    const fromSel = document.getElementById('currencyFromSelect'); const toSel = document.getElementById('currencyToSelect');
    if (!fromSel || !toSel) return;
    const options = ALL_CURRENCIES.map(c => `<option value="${c.code}">${c.flag} ${c.name}</option>`).join('');
    fromSel.innerHTML = options; toSel.innerHTML = options; fromSel.value = 'USD'; toSel.value = 'IDR';
}
async function convertCurrency() {
    const fromAmount = parseFloat(document.getElementById('currencyFromAmount').value) || 0;
    const fromCur = document.getElementById('currencyFromSelect').value; const toCur = document.getElementById('currencyToSelect').value;
    const resultEl = document.getElementById('currencyToResult'); const rateLine = document.getElementById('currencyRateLine');
    if (!currencyRates) { resultEl.textContent = 'Memuat...'; rateLine.innerHTML = '<span class="rate-loading-spinner"></span> Mengambil rate...'; const rates = await fetchCurrencyRates(); if (!rates) { resultEl.textContent = '❌ Gagal memuat'; rateLine.textContent = 'Error'; return; } }
    const fromRate = currencyRates[fromCur] || 1; const toRate = currencyRates[toCur] || 1;
    const result = (fromAmount / fromRate) * toRate;
    resultEl.textContent = formatCurrencyAmount(result, toCur);
    const rate1 = (1 / fromRate) * toRate; const rateDecimals = ['JPY', 'KRW', 'IDR'].includes(toCur) ? 2 : 4;
    rateLine.innerHTML = `💱 <strong>1 ${fromCur}</strong> = <strong>${rate1.toLocaleString('en-US', { minimumFractionDigits: rateDecimals, maximumFractionDigits: rateDecimals })} ${toCur}</strong>`;
    if (currencyLastFetch) { const date = new Date(currencyLastFetch); const hh = String(date.getHours()).padStart(2, '0'); const mm = String(date.getMinutes()).padStart(2, '0'); document.getElementById('currencyRateUpdate').textContent = `Terakhir diupdate: ${hh}:${mm}`; }
}
function swapCurrencies() { const fromSel = document.getElementById('currencyFromSelect'); const toSel = document.getElementById('currencyToSelect'); const temp = fromSel.value; fromSel.value = toSel.value; toSel.value = temp; convertCurrency(); const val = toSel.value; document.querySelectorAll('.quick-target-btn').forEach(b => { b.classList.toggle('active', b.dataset.cur === val); }); }
function renderCurrencyQuickTargets() {
    const container = document.getElementById('currencyQuickTargets'); if (!container) return;
    const flags = { 'IDR': '🇮🇩', 'EUR': '🇪🇺', 'JPY': '🇯🇵', 'GBP': '🇬🇧', 'SGD': '🇸🇬', 'MYR': '🇲🇾', 'CNY': '🇨🇳', 'AUD': '🇦🇺', 'KRW': '🇰🇷', 'THB': '🇹🇭', 'USD': '🇺🇸' };
    container.innerHTML = QUICK_TARGETS.map(cur => `<button class="quick-target-btn ${cur === 'IDR' ? 'active' : ''}" data-cur="${cur}">${flags[cur]} ${cur}</button>`).join('');
    container.querySelectorAll('.quick-target-btn').forEach(btn => { btn.addEventListener('click', () => { container.querySelectorAll('.quick-target-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); document.getElementById('currencyToSelect').value = btn.dataset.cur; convertCurrency(); }); });
}
async function openCurrencyModal() { populateCurrencyDropdowns(); document.getElementById('currencyModal').classList.add('active'); renderCurrencyQuickTargets(); await convertCurrency(); }
function closeCurrencyModal() { document.getElementById('currencyModal').classList.remove('active'); }

// ============ CHART COLORS ============
const CHART_COLORS = ['#50E4F2', '#B9A0FF', '#43D6A2', '#E9B949', '#FF7387', '#ec4899', '#f97316', '#3b82f6', '#84cc16', '#06b6d4', '#8b5cf6', '#eab308', '#14b8a6', '#f43f5e', '#facc15', '#fb7185', '#4ade80', '#60a5fa'];

// ============ STOCK UNIVERSE ============
const STOCK_UNIVERSE = [
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', category: 'us-tech' }, { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock', category: 'us-tech' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', category: 'us-tech' }, { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', category: 'us-tech' },
    { symbol: 'META', name: 'Meta Platforms Inc.', type: 'stock', category: 'us-tech' }, { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock', category: 'us-tech' },
    { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', category: 'us-tech' }, { symbol: 'AMD', name: 'Advanced Micro Devices', type: 'stock', category: 'us-tech' },
    { symbol: 'INTC', name: 'Intel Corp.', type: 'stock', category: 'us-tech' }, { symbol: 'ORCL', name: 'Oracle Corp.', type: 'stock', category: 'us-tech' },
    { symbol: 'CRM', name: 'Salesforce Inc.', type: 'stock', category: 'us-tech' }, { symbol: 'ADBE', name: 'Adobe Inc.', type: 'stock', category: 'us-tech' },
    { symbol: 'NFLX', name: 'Netflix Inc.', type: 'stock', category: 'us-tech' }, { symbol: 'AVGO', name: 'Broadcom Inc.', type: 'stock', category: 'us-tech' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', type: 'stock', category: 'us-finance' }, { symbol: 'BAC', name: 'Bank of America', type: 'stock', category: 'us-finance' },
    { symbol: 'V', name: 'Visa Inc.', type: 'stock', category: 'us-finance' }, { symbol: 'MA', name: 'Mastercard Inc.', type: 'stock', category: 'us-finance' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', type: 'stock', category: 'us-healthcare' }, { symbol: 'PFE', name: 'Pfizer Inc.', type: 'stock', category: 'us-healthcare' },
    { symbol: 'UNH', name: 'UnitedHealth Group', type: 'stock', category: 'us-healthcare' }, { symbol: 'WMT', name: 'Walmart Inc.', type: 'stock', category: 'us-consumer' },
    { symbol: 'COST', name: 'Costco Wholesale', type: 'stock', category: 'us-consumer' }, { symbol: 'KO', name: 'Coca-Cola Co.', type: 'stock', category: 'us-consumer' },
    { symbol: 'BA', name: 'Boeing Co.', type: 'stock', category: 'us-industrial' }, { symbol: 'CAT', name: 'Caterpillar Inc.', type: 'stock', category: 'us-industrial' },
    { symbol: 'XOM', name: 'Exxon Mobil Corp.', type: 'stock', category: 'us-energy' }, { symbol: 'CVX', name: 'Chevron Corp.', type: 'stock', category: 'us-energy' },
    { symbol: 'TSM', name: 'Taiwan Semiconductor', type: 'stock', category: 'international' }, { symbol: 'BABA', name: 'Alibaba Group', type: 'stock', category: 'international' },
    { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', category: 'crypto' }, { symbol: 'ETH', name: 'Ethereum', type: 'crypto', category: 'crypto' },
    { symbol: 'SOL', name: 'Solana', type: 'crypto', category: 'crypto' }, { symbol: 'BNB', name: 'Binance Coin', type: 'crypto', category: 'crypto' },
    { symbol: 'GC=F', name: 'Gold Futures', type: 'commodity', category: 'commodity' }, { symbol: 'SI=F', name: 'Silver Futures', type: 'commodity', category: 'commodity' },
    { symbol: 'CL=F', name: 'Crude Oil WTI', type: 'commodity', category: 'commodity' }, { symbol: 'NG=F', name: 'Natural Gas', type: 'commodity', category: 'commodity' },
    { symbol: '^GSPC', name: 'S&P 500', type: 'stock', category: 'index' }, { symbol: '^DJI', name: 'Dow Jones', type: 'stock', category: 'index' },
    { symbol: '^IXIC', name: 'NASDAQ Composite', type: 'stock', category: 'index' }
];

const SECTOR_CONFIG = [
    { key: 'us-tech', name: 'Technology', icon: '💻' },
    { key: 'us-finance', name: 'Finance', icon: '🏦' },
    { key: 'us-healthcare', name: 'Healthcare', icon: '💊' },
    { key: 'us-consumer', name: 'Consumer', icon: '🛒' },
    { key: 'us-industrial', name: 'Industrial', icon: '🏭' },
    { key: 'us-energy', name: 'Energy', icon: '⚡' },
    { key: 'international', name: 'International', icon: '🌍' },
    { key: 'crypto', name: 'Crypto', icon: '🪙' },
    { key: 'commodity', name: 'Commodity', icon: '🥇' },
    { key: 'index', name: 'Index', icon: '📈' }
];

const GLOBAL_INDICES = [
    { symbol: '^GSPC', name: 'S&P 500', country: 'USA', region: 'americas', flag: '🇺🇸', sectors: [{ name: 'Tech', pct: 30, color: '#50E4F2' }, { name: 'Finance', pct: 15, color: '#B9A0FF' }, { name: 'Healthcare', pct: 12, color: '#43D6A2' }], topHoldings: [{ symbol: 'AAPL', name: 'Apple' }, { symbol: 'MSFT', name: 'Microsoft' }, { symbol: 'AMZN', name: 'Amazon' }] },
    { symbol: '^DJI', name: 'Dow Jones', country: 'USA', region: 'americas', flag: '🇺🇸', sectors: [{ name: 'Industrial', pct: 20, color: '#E9B949' }, { name: 'Finance', pct: 18, color: '#B9A0FF' }, { name: 'Healthcare', pct: 15, color: '#43D6A2' }], topHoldings: [{ symbol: 'UNH', name: 'UnitedHealth' }, { symbol: 'GS', name: 'Goldman Sachs' }, { symbol: 'HD', name: 'Home Depot' }] },
    { symbol: '^IXIC', name: 'NASDAQ', country: 'USA', region: 'americas', flag: '🇺🇸', sectors: [{ name: 'Tech', pct: 60, color: '#50E4F2' }, { name: 'Consumer', pct: 15, color: '#FF7387' }, { name: 'Healthcare', pct: 10, color: '#43D6A2' }], topHoldings: [{ symbol: 'AAPL', name: 'Apple' }, { symbol: 'NVDA', name: 'NVIDIA' }, { symbol: 'META', name: 'Meta' }] },
    { symbol: '^N225', name: 'Nikkei 225', country: 'Japan', region: 'asia', flag: '🇯🇵', sectors: [{ name: 'Industrial', pct: 25, color: '#E9B949' }, { name: 'Tech', pct: 20, color: '#50E4F2' }, { name: 'Consumer', pct: 15, color: '#FF7387' }], topHoldings: [{ symbol: 'TM', name: 'Toyota' }, { symbol: 'SONY', name: 'Sony' }] },
    { symbol: '^FTSE', name: 'FTSE 100', country: 'UK', region: 'europe', flag: '🇬🇧', sectors: [{ name: 'Finance', pct: 25, color: '#B9A0FF' }, { name: 'Energy', pct: 15, color: '#FF7387' }, { name: 'Consumer', pct: 15, color: '#E9B949' }], topHoldings: [{ symbol: 'SHEL', name: 'Shell' }, { symbol: 'HSBC', name: 'HSBC' }] }
];

const MOVERS_UNIVERSE = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'AMD', 'INTC', 'NFLX', 'AVGO', 'ADBE', 'JPM', 'BAC', 'V', 'MA', 'GS', 'WFC', 'WMT', 'DIS', 'MCD', 'NKE', 'SBUX', 'KO', 'PEP', 'JNJ', 'PFE', 'UNH', 'LLY', 'BTC', 'ETH', 'SOL', 'BNB', 'XRP'];
let marketMoversData = { gainers: [], losers: [] };

// ============ TAB NAV ============
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active'); document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
        if (tab.dataset.tab === 'news') renderNews();
        if (tab.dataset.tab === 'portfolio') { renderPortfolio(); analyzePortfolioRisk(); }
        if (tab.dataset.tab === 'heatmap') renderSectorHeatmap();
        if (tab.dataset.tab === 'compare') populateCompareDropdowns();
        if (tab.dataset.tab === 'indeks') renderIndices();
        if (tab.dataset.tab === 'crypto') initCryptoTab();
        if (tab.dataset.tab === 'commodity') initCommodityTab();
    });
});

// ============ 📁 WATCHLIST FOLDERS & SORTING ============
function renderGroupsBar() {
    const bar = document.getElementById('watchlistGroupsBar'); if (!bar) return;
    let html = `<button class="group-chip ${activeGroup === 'all' ? 'active' : ''}" data-group="all">🌐 Semua Aset</button>`;
    html += `<button class="group-chip ${activeGroup === 'favorites' ? 'active' : ''}" data-group="favorites">⭐ Favorites</button>`;
    groups.forEach(g => { 
        const count = watchlist.filter(w => w.group === g.id).length; 
        const isActive = activeGroup === g.id ? 'active' : ''; 
        html += `<button class="group-chip ${isActive}" data-group="${g.id}">${g.icon} ${g.name} (${count})<span class="group-del-badge" onclick="event.stopPropagation(); deleteGroup('${g.id}')">×</span></button>`; 
    });
    bar.innerHTML = html;
    bar.querySelectorAll('.group-chip').forEach(chip => { 
        chip.addEventListener('click', (e) => { 
            if (e.target.classList.contains('group-del-badge')) return; 
            activeGroup = chip.dataset.group; 
            renderGroupsBar(); renderWatchlist(); 
        }); 
    });
}
function deleteGroup(groupId) {
    if (!confirm('Hapus folder ini?')) return;
    groups = groups.filter(g => g.id !== groupId);
    watchlist = watchlist.map(w => w.group === groupId ? { ...w, group: '' } : w);
    saveGroups(); saveWatchlist(); if (activeGroup === groupId) activeGroup = 'all';
    renderGroupsBar(); renderWatchlist();
}
function openGroupModal() { 
    document.getElementById('groupName').value = ''; 
    document.getElementById('groupIcon').value = '📁'; 
    document.getElementById('groupSector').value = 'all';
    document.getElementById('groupModal').classList.add('active'); 
}
function closeGroupModal() { document.getElementById('groupModal').classList.remove('active'); }
function saveGroup() { 
    const name = document.getElementById('groupName').value.trim(); 
    const icon = document.getElementById('groupIcon').value.trim() || '📁'; 
    const sector = document.getElementById('groupSector').value;
    if (!name) { alert('Isi nama folder dulu!'); return; } 
    const id = 'group-' + Date.now(); 
    groups.push({ id, name, icon, sector }); 
    saveGroups(); closeGroupModal(); renderGroupsBar(); 
}
function openMoveFolderModal(symbol) {
    const asset = watchlist.find(w => w.symbol === symbol);
    if (!asset) return;
    currentMoveAssetSymbol = symbol;
    document.getElementById('moveAssetSymbol').textContent = symbol;
    const assetInfo = STOCK_UNIVERSE.find(s => s.symbol === symbol) || { category: asset.type };
    const sel = document.getElementById('moveAssetGroupSelect');
    let opts = '<option value="">— Keluarkan dari Folder —</option>';
    groups.forEach(g => {
        if (g.sector === 'all' || g.sector === assetInfo.category) {
            opts += `<option value="${g.id}">${g.icon} ${g.name}</option>`;
        }
    });
    sel.innerHTML = opts;
    sel.value = asset.group || '';
    document.getElementById('moveFolderModal').classList.add('active');
}
function closeMoveFolderModal() { document.getElementById('moveFolderModal').classList.remove('active'); }
function saveMoveFolder() {
    const newGroup = document.getElementById('moveAssetGroupSelect').value;
    const assetIdx = watchlist.findIndex(w => w.symbol === currentMoveAssetSymbol);
    if (assetIdx >= 0) {
        watchlist[assetIdx].group = newGroup;
        saveWatchlist();
        closeMoveFolderModal();
        renderWatchlist();
        renderGroupsBar();
    }
}
function openSortModal() { document.getElementById('sortModal').classList.add('active'); }
function closeSortModal() { document.getElementById('sortModal').classList.remove('active'); }
function applySort(mode) {
    currentSortMode = mode;
    closeSortModal();
    renderWatchlist();
}

// ============ 🎯 RENDER WATCHLIST (SORTING DIPERBAIKI) ============
async function renderWatchlist() {
    const container = document.getElementById('watchlist'); if (!container) return;
    
    let filteredWatchlist = [...watchlist]; 
    if (activeGroup === 'favorites') filteredWatchlist = filteredWatchlist.filter(w => isFavorite(w.symbol)); 
    else if (activeGroup !== 'all') filteredWatchlist = filteredWatchlist.filter(w => w.group === activeGroup);
    
    if (filteredWatchlist.length === 0) { 
        const msg = activeGroup === 'favorites' ? 'Belum ada saham favorit.' : activeGroup === 'all' ? 'Watchlist kosong.' : 'Folder ini masih kosong.'; 
        container.innerHTML = `<div class="empty-state">${msg}</div>`; 
        return; 
    }

    let skeletonHtml = '';
    filteredWatchlist.forEach((asset) => {
        skeletonHtml += `
        <div class="watchlist-card-wrapper" id="skeleton-${asset.symbol}">
            <div class="asset-card-new neutral" style="opacity: 0.6;">
                <div class="asset-info-new"><span class="asset-symbol-new">${asset.symbol}</span><span class="asset-name-new">${asset.name}</span></div>
                <div class="asset-price-wrap-new"><span class="asset-price-new">...</span><span class="asset-change-new" style="color:var(--text-muted)">Loading</span></div>
            </div>
        </div>`;
    });
    container.innerHTML = `<div class="watchlist-section">${skeletonHtml}</div>`;

    // Fetch all prices first for accurate sorting
    const assetsWithPrices = await Promise.all(filteredWatchlist.map(async (asset) => {
        const priceData = await fetchPrice(asset.symbol, asset.type);
        return { ...asset, priceData };
    }));

    // Apply Sorting Logic
    assetsWithPrices.sort((a, b) => {
        if (currentSortMode === 'az') return a.symbol.localeCompare(b.symbol);
        if (currentSortMode === 'favorites') return (isFavorite(b.symbol) ? 1 : 0) - (isFavorite(a.symbol) ? 1 : 0);
        
        const priceA = a.priceData ? a.priceData.price : 0;
        const priceB = b.priceData ? b.priceData.price : 0;
        const changeA = a.priceData ? a.priceData.change : 0;
        const changeB = b.priceData ? b.priceData.change : 0;

        if (currentSortMode === 'price-desc') return priceB - priceA;
        if (currentSortMode === 'price-asc') return priceA - priceB;
        if (currentSortMode === 'change-desc') return changeB - changeA;
        if (currentSortMode === 'change-asc') return changeA - changeB;
        return 0; // default
    });

    // Re-render sorted
    let finalHtml = '';
    assetsWithPrices.forEach((asset) => {
        const idx = watchlist.findIndex(w => w.symbol === asset.symbol);
        finalHtml += renderAssetCard(asset, asset.priceData, idx);
    });
    container.innerHTML = `<div class="watchlist-section">${finalHtml}</div>`;
}

function renderAssetCard(asset, priceData, index) {
    const p = priceData; 
    const isFav = isFavorite(asset.symbol); 
    const hasAl = hasAlert(asset.symbol);
    
    if (!p) {
        return `
        <div class="watchlist-card-wrapper">
            <div class="asset-card-new neutral">
                <div class="asset-info-new"><span class="asset-symbol-new">${asset.symbol}</span><span class="asset-name-new">${asset.name}</span></div>
                <div class="asset-price-wrap-new"><span class="asset-price-new">-</span><span class="asset-change-new" style="color:var(--text-muted)">Gagal</span></div>
                <div class="asset-actions-new"><button class="action-btn-sm delete" onclick="deleteFromWatchlist(${index}, event)">×</button></div>
            </div>
        </div>`;
    }
    
    const trend = p.change >= 0 ? 'up' : 'down'; 
    const changeStr = (p.change >= 0 ? '+' : '') + p.change.toFixed(2) + '%'; 
    const priceStr = '$' + p.price.toLocaleString('en-US', { maximumFractionDigits: 2 });
    
    const sparkPath = trend === 'up' ? "M0,15 L10,12 L20,8 L30,10 L40,2" : "M0,5 L10,8 L20,12 L30,10 L40,18";
    const sparkColor = trend === 'up' ? 'var(--green)' : 'var(--red)';

    return `
    <div class="watchlist-card-wrapper">
        <div class="asset-card-new ${trend}" onclick="openAssetDetail('${asset.symbol}', '${(p.name || asset.name).replace(/'/g, "\\'")}', ${p.price}, ${p.change}, '${asset.type}')">
            <div class="asset-info-new">
                <span class="asset-symbol-new">${asset.symbol}${hasAl ? ' <span style="font-size:10px; animation: bellRing 2s infinite;">🔔</span>' : ''}</span>
                <span class="asset-name-new">${asset.name}</span>
            </div>
            <div class="asset-sparkline">
                <svg width="40" height="20" viewBox="0 0 40 20"><path d="${sparkPath}" fill="none" stroke="${sparkColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <div class="asset-price-wrap-new">
                <span class="asset-price-new">${priceStr}</span>
                <span class="asset-change-new ${trend}">${changeStr}</span>
            </div>
            <div class="asset-actions-new">
                <button class="action-btn-sm star ${isFav ? 'active' : ''}" onclick="toggleFavorite('${asset.symbol}', event)">${isFav ? '★' : '☆'}</button>
                <button class="action-btn-sm move" onclick="openMoveFolderModal('${asset.symbol}'); event.stopPropagation();">📁</button>
                <button class="action-btn-sm delete" onclick="deleteFromWatchlist(${index}, event)">×</button>
            </div>
        </div>
    </div>`;
}

function deleteFromWatchlist(index, event) { 
    if (event) event.stopPropagation(); 
    const asset = watchlist[index]; 
    if (!confirm(`Hapus ${asset.symbol} dari watchlist?`)) return; 
    const favIdx = favorites.indexOf(asset.symbol); 
    if (favIdx >= 0) { favorites.splice(favIdx, 1); saveFavorites(); } 
    alerts = alerts.filter(a => a.symbol !== asset.symbol); saveAlerts(); renderPriceAlerts(); 
    watchlist.splice(index, 1); saveWatchlist(); renderWatchlist(); renderGroupsBar(); 
}

// ============ BROWSE & MARKET MOVERS ============
function openBrowseModal() { document.getElementById('browseModal').classList.add('active'); renderBrowseStocks(); }
function closeBrowseModal() { document.getElementById('browseModal').classList.remove('active'); }
function renderBrowseStocks() {
    const body = document.getElementById('browseBody'); const search = (document.getElementById('browseSearch').value || '').toLowerCase().trim(); const cat = currentBrowseCategory;
    let filtered = STOCK_UNIVERSE; if (cat !== 'all') filtered = filtered.filter(s => s.category === cat);
    if (search) filtered = filtered.filter(s => s.symbol.toLowerCase().includes(search) || s.name.toLowerCase().includes(search));
    if (filtered.length === 0) { body.innerHTML = '<div class="empty-state">Gak ada saham yang match.</div>'; return; }
    body.innerHTML = filtered.map(stock => { const inWatchlist = watchlist.some(w => w.symbol === stock.symbol); return `<div class="browse-item ${inWatchlist ? 'in-watchlist' : ''}" onclick="toggleFromBrowse('${stock.symbol}', '${stock.name.replace(/'/g, "\\'")}', '${stock.type}')"><div class="browse-item-info"><span class="browse-symbol">${stock.symbol}</span><span class="browse-name">${stock.name}</span></div><div class="browse-item-action">${inWatchlist ? '<span class="browse-badge added">✓ Added</span>' : '<span class="browse-badge add">+ Add</span>'}</div></div>`; }).join('');
}
function toggleFromBrowse(symbol, name, type) { 
    const idx = watchlist.findIndex(w => w.symbol === symbol); 
    if (idx >= 0) watchlist.splice(idx, 1); 
    else watchlist.push({ symbol, name, type, group: '' }); 
    saveWatchlist(); renderBrowseStocks(); renderWatchlist(); renderGroupsBar();
}

async function fetchMarketMovers() {
    const container = document.getElementById('marketMovers'); if (!container) return;
    container.innerHTML = '<div class="movers-loading"><div class="loading-spinner"></div><p class="loading-text">Memuat pergerakan pasar...</p></div>';
    const results = []; const batchSize = 10;
    for (let i = 0; i < MOVERS_UNIVERSE.length; i += batchSize) { const batch = MOVERS_UNIVERSE.slice(i, i + batchSize); const batchResults = await Promise.all(batch.map(async (symbol) => { const stockInfo = STOCK_UNIVERSE.find(s => s.symbol === symbol) || { symbol, name: symbol, type: 'stock' }; const priceData = await fetchPrice(symbol, stockInfo.type); if (!priceData) return null; return { symbol, name: priceData.name || stockInfo.name, type: stockInfo.type, price: priceData.price, change: priceData.change }; })); results.push(...batchResults.filter(Boolean)); }
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

// ============ FETCH HELPERS ============
async function fetchPrice(symbol, type) {
    try {
        const response = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/fetch-price`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ symbol, type }) }, 10000);
        if (!response.ok) throw new Error('HTTP ' + response.status); const data = await response.json();
        if (type === 'crypto' && data.price) return { price: data.price, currency: 'USD', change: data.change || 0, name: data.name || symbol };
        if (type !== 'crypto' && data.chart && data.chart.result) { const meta = data.chart.result[0].meta; return { price: meta.regularMarketPrice, currency: meta.currency, change: meta.regularMarketChangePercent || 0, name: meta.longName || meta.shortName }; }
        return null;
    } catch (error) { return null; }
}
async function fetchFundamental(symbol, type) {
    try { const response = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/fetch-fundamental`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ symbol, type }) }, 10000); if (!response.ok) throw new Error('HTTP ' + response.status); const data = await response.json(); return data.fundamental || {}; } catch (error) { return {}; }
}
async function fetchChartData(symbol, type, interval = '1mo', range = 'max') {
    try {
        const response = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/fetch-chart`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ symbol, type, interval, range }) }, 10000);
        if (!response.ok) throw new Error('HTTP ' + response.status); const data = await response.json();
        if (data.data && Array.isArray(data.data)) return data.data.map(c => ({ time: c.time, open: parseFloat(c.open), high: parseFloat(c.high), low: parseFloat(c.low), close: parseFloat(c.close), volume: parseFloat(c.volume || 0) })).filter(c => !isNaN(c.open) && !isNaN(c.close));
        if (data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0]; const timestamps = result.timestamp || []; const quote = (result.indicators && result.indicators.quote && result.indicators.quote[0]) || {};
            const opens = quote.open || [], highs = quote.high || [], lows = quote.low || [], closes = quote.close || [], volumes = quote.volume || []; const candles = [];
            for (let i = 0; i < timestamps.length; i++) { if (opens[i] == null || closes[i] == null) continue; candles.push({ time: timestamps[i], open: opens[i], high: highs[i], low: lows[i], close: closes[i], volume: volumes[i] || 0 }); } return candles;
        } return [];
    } catch (error) { return []; }
}

// ============ 🪙 CRYPTO TAB ============
const CRYPTO_FALLBACK = [
    { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png', current_price: 65000, market_cap: 1280000000000, market_cap_rank: 1, price_change_percentage_24h: 0, total_volume: 30000000000, circulating_supply: 19000000, total_supply: 21000000, ath: 73750, ath_change_percentage: -12 },
    { id: 'ethereum', symbol: 'eth', name: 'Ethereum', image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png', current_price: 3500, market_cap: 420000000000, market_cap_rank: 2, price_change_percentage_24h: 0, total_volume: 15000000000, circulating_supply: 120000000, total_supply: 120000000, ath: 4878, ath_change_percentage: -28 }
];

const CRYPTO_CATEGORY_MAP = {
    'uni': 'defi', 'aave': 'defi', 'link': 'defi', 'mkr': 'defi', 'comp': 'defi', 'snx': 'defi', 'crv': 'defi', 'ldo': 'defi', 'sushi': 'defi', '1inch': 'defi', 'grt': 'defi', 'rpl': 'defi', 'ens': 'defi', 'dydx': 'defi', 'cake': 'defi', 'pancakeswap': 'defi',
    'fet': 'ai', 'agix': 'ai', 'rndr': 'ai', 'tao': 'ai', 'ocean': 'ai', 'nmr': 'ai', 'grt': 'ai', 'wld': 'ai', 'arkm': 'ai', 'ai': 'ai', 'aioz': 'ai',
    'doge': 'meme', 'shib': 'meme', 'pepe': 'meme', 'wif': 'meme', 'bonk': 'meme', 'floki': 'meme', 'elon': 'meme', 'babydoge': 'meme', 'mog': 'meme', 'brett': 'meme', 'popcat': 'meme',
    'btc': 'layer1', 'eth': 'layer1', 'sol': 'layer1', 'bnb': 'layer1', 'ada': 'layer1', 'avax': 'layer1', 'dot': 'layer1', 'atom': 'layer1', 'near': 'layer1', 'trx': 'layer1', 'ton': 'layer1', 'apt': 'layer1', 'sui': 'layer1', 'sei': 'layer1', 'icp': 'layer1', 'ftm': 'layer1', 'algo': 'layer1', 'hbar': 'layer1', 'xrp': 'layer1', 'ltc': 'layer1', 'bch': 'layer1', 'etc': 'layer1', 'xlm': 'layer1', 'vet': 'layer1', 'kas': 'layer1',
    'axs': 'gamefi', 'sand': 'gamefi', 'mana': 'gamefi', 'imx': 'gamefi', 'gala': 'gamefi', 'enj': 'gamefi', 'ape': 'gamefi', 'flow': 'gamefi', 'ilv': 'gamefi', 'beam': 'gamefi', 'prime': 'gamefi',
    'ondo': 'rwa', 'polyx': 'rwa', 'mpl': 'rwa', 'cfg': 'rwa', 'gfi': 'rwa', 'rio': 'rwa', 'landx': 'rwa', 'tru': 'rwa', 'mkr': 'rwa'
};

const CRYPTO_EVENTS_DATA = [
    { date: '2024-04-19', title: 'Bitcoin Halving 2024', desc: 'Block reward BTC turun dari 6.25 ke 3.125 BTC.', coin: 'BTC' },
    { date: '2026-11-15', title: 'Ethereum Pectra Upgrade', desc: 'Update jaringan Ethereum (Account Abstraction & Staking).', coin: 'ETH' },
    { date: '2026-12-01', title: 'Cardano Voltaire Era', desc: 'Upgrade Cardano menuju governance penuh.', coin: 'ADA' },
    { date: '2027-03-01', title: 'Solana Firedancer Launch', desc: 'Validator client baru untuk jaringan Solana yang lebih cepat.', coin: 'SOL' },
    { date: '2028-04-20', title: 'Bitcoin Halving 2028', desc: 'Block reward BTC turun dari 3.125 ke 1.5625 BTC.', coin: 'BTC' }
];

function getCoinCategory(symbol) {
    const lower = (symbol || '').toLowerCase();
    return CRYPTO_CATEGORY_MAP[lower] || null;
}

async function fetchCryptoPrices() {
    try {
        const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h,7d,30d';
        const response = await fetchWithTimeout(url, {}, 12000);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) throw new Error('Empty data');
        return data;
    } catch (error) { return CRYPTO_FALLBACK; }
}
async function fetchCryptoGlobal() { try { const response = await fetchWithTimeout('https://api.coingecko.com/api/v3/global', {}, 8000); if (!response.ok) throw new Error('HTTP ' + response.status); const data = await response.json(); return data.data || null; } catch (error) { return null; } }
async function fetchCryptoFNG() { try { const response = await fetchWithTimeout('https://api.alternative.me/fng/?limit=1', {}, 8000); if (!response.ok) throw new Error('HTTP ' + response.status); const data = await response.json(); if (data.data && data.data[0]) return { value: parseInt(data.data[0].value), label: data.data[0].value_classification }; return null; } catch (error) { return null; } }
async function fetchCryptoTrending() { try { const response = await fetchWithTimeout('https://api.coingecko.com/api/v3/search/trending', {}, 10000); if (!response.ok) throw new Error('HTTP ' + response.status); const data = await response.json(); return (data.coins || []).map(c => c.item).slice(0, 7); } catch (error) { return []; } }
async function fetchCryptoDetail(coinId) {
    try {
        const url = `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=true&sparkline=false`;
        const response = await fetchWithTimeout(url, {}, 12000);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return await response.json();
    } catch (error) { return null; }
}
function formatCryptoPrice(price) { if (price == null || isNaN(price)) return 'N/A'; if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 }); if (price >= 1) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 }); if (price >= 0.01) return '$' + price.toFixed(4); if (price >= 0.0001) return '$' + price.toFixed(6); return '$' + price.toFixed(8); }
function formatCryptoBig(num) { if (!num || isNaN(num)) return 'N/A'; if (num >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T'; if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B'; if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M'; if (num >= 1e3) return '$' + (num / 1e3).toFixed(2) + 'K'; return '$' + num.toFixed(0); }
function getCryptoHeatColor(change) {
    if (change >= 10) return { bg: 'rgba(45, 212, 191, 0.9)', text: '#ffffff' };
    if (change >= 5) return { bg: 'rgba(67, 214, 162, 0.7)', text: '#ffffff' };
    if (change >= 2) return { bg: 'rgba(67, 214, 162, 0.5)', text: '#ffffff' };
    if (change >= 0.5) return { bg: 'rgba(67, 214, 162, 0.35)', text: '#ffffff' };
    if (change > -0.5) return { bg: 'rgba(100, 116, 139, 0.4)', text: '#ffffff' };
    if (change > -2) return { bg: 'rgba(255, 155, 170, 0.4)', text: '#ffffff' };
    if (change > -5) return { bg: 'rgba(255, 115, 135, 0.6)', text: '#ffffff' };
    if (change > -10) { return { bg: 'rgba(255, 115, 135, 0.8)', text: '#ffffff' }; }
    return { bg: 'rgba(200, 60, 80, 0.95)', text: '#ffffff' };
}
async function initCryptoTab() {
    if (cryptoData.length === 0) { renderCryptoList(); renderCryptoHeatmap(); renderCryptoCategoryList(); }
    renderCryptoEvents();
    if (!document.getElementById('cryptoGlobalStats').dataset.loaded) loadCryptoGlobalStats();
    if (!document.getElementById('cryptoFngSection').dataset.loaded) loadCryptoFNG();
    if (!document.getElementById('cryptoTrendingSection').dataset.loaded) loadCryptoTrending();
    if (cryptoData.length === 0) loadCryptoData();
}
async function loadCryptoData() {
    const list = document.getElementById('cryptoList'); if (!list) return;
    list.innerHTML = '<div class="crypto-loading"><div class="loading-spinner"></div><p class="loading-text">Memuat data crypto...</p></div>';
    try {
        const data = await fetchCryptoPrices(); cryptoData = data;
        renderCryptoList(); renderCryptoHeatmap(); renderCryptoCategoryList();
        populateDcaDropdowns();
        const now = new Date(); const el = document.getElementById('cryptoLastUpdated');
        if (el) el.textContent = 'Data dari CoinGecko · Terakhir diupdate: ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (error) { list.innerHTML = '<div class="empty-state">❌ Gagal memuat data crypto.</div>'; }
}
function renderCryptoList() {
    const list = document.getElementById('cryptoList'); if (!list) return;
    if (cryptoData.length === 0) { list.innerHTML = '<div class="empty-state">Belum ada data crypto.</div>'; return; }
    let sorted = [...cryptoData];
    if (cryptoView === 'gainers') sorted = sorted.sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0));
    else if (cryptoView === 'losers') sorted = sorted.sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0));
    else sorted = sorted.sort((a, b) => (a.market_cap_rank || 999) - (b.market_cap_rank || 999));
    const display = cryptoView === 'marketcap' ? sorted.slice(0, 20) : sorted.slice(0, 10);
    list.innerHTML = display.map((coin, i) => {
        const change = coin.price_change_percentage_24h || 0;
        const trend = change >= 0 ? 'up' : 'down'; const sign = change >= 0 ? '+' : '';
        return `<div class="crypto-item" onclick="openCryptoDetail('${coin.id}')"><div class="crypto-item-left"><span class="crypto-rank">${cryptoView === 'marketcap' ? (coin.market_cap_rank || i + 1) : i + 1}</span><img src="${coin.image}" alt="${coin.symbol}" class="crypto-icon" onerror="this.style.display='none'"><div class="crypto-info"><span class="crypto-symbol">${coin.symbol.toUpperCase()}</span><span class="crypto-name">${coin.name}</span></div></div><div class="crypto-item-right"><span class="crypto-price">${formatCryptoPrice(coin.current_price)}</span><span class="crypto-change ${trend}">${sign}${change.toFixed(2)}%</span><span class="crypto-marketcap">${formatCryptoBig(coin.market_cap)}</span></div></div>`;
    }).join('');
}
function renderCryptoHeatmap() {
    const grid = document.getElementById('cryptoHeatmapGrid'); if (!grid) return;
    if (cryptoData.length === 0) { grid.innerHTML = '<div class="crypto-heatmap-loading"><div class="loading-spinner"></div><p class="loading-text">Memuat heatmap...</p></div>'; return; }
    const top50 = cryptoData.slice(0, 50);
    grid.innerHTML = top50.map((coin, i) => {
        const change = coin.price_change_percentage_24h || 0;
        const sign = change >= 0 ? '+' : '';
        const color = getCryptoHeatColor(change);
        const isLarge = i < 2;
        return `<div class="crypto-heatmap-item ${isLarge ? 'large' : ''}" style="background: ${color.bg}; color: ${color.text};" onclick="openCryptoDetail('${coin.id}')">
            <div class="crypto-heatmap-symbol">${coin.symbol.toUpperCase()}</div>
            <div class="crypto-heatmap-change">${sign}${change.toFixed(2)}%</div>
            ${isLarge ? `<div class="crypto-heatmap-name">${coin.name}</div>` : ''}
        </div>`;
    }).join('');
}

function renderCryptoCategoryList() {
    const container = document.getElementById('cryptoCatList'); if (!container) return;
    if (cryptoData.length === 0) { container.innerHTML = '<div class="empty-state">Memuat categories...</div>'; return; }
    let filtered = cryptoData;
    if (cryptoCatView !== 'all') {
        filtered = cryptoData.filter(coin => getCoinCategory(coin.symbol) === cryptoCatView);
    }
    if (cryptoCatView === 'all') {
        filtered = [...cryptoData].sort((a, b) => (a.market_cap_rank || 999) - (b.market_cap_rank || 999)).slice(0, 20);
    }
    if (filtered.length === 0) {
        const catNames = { all: 'All', defi: 'DeFi', ai: 'AI', meme: 'Meme', layer1: 'Layer 1', gamefi: 'GameFi', rwa: 'RWA' };
        container.innerHTML = `<div class="empty-state">Belum ada coin kategori <strong>${catNames[cryptoCatView] || cryptoCatView}</strong> di top 50.</div>`;
        return;
    }
    container.innerHTML = filtered.map((coin, i) => {
        const change = coin.price_change_percentage_24h || 0;
        const trend = change >= 0 ? 'up' : 'down';
        const sign = change >= 0 ? '+' : '';
        const catLabel = cryptoCatView === 'all' ? (getCoinCategory(coin.symbol) ? getCategoryLabel(getCoinCategory(coin.symbol)) : '') : '';
        return `<div class="crypto-item" onclick="openCryptoDetail('${coin.id}')">
            <div class="crypto-item-left">
                <span class="crypto-rank">${coin.market_cap_rank || i + 1}</span>
                <img src="${coin.image}" alt="${coin.symbol}" class="crypto-icon" onerror="this.style.display='none'">
                <div class="crypto-info">
                    <span class="crypto-symbol">${coin.symbol.toUpperCase()}${catLabel ? ` <span class="crypto-symbol-badge">${catLabel}</span>` : ''}</span>
                    <span class="crypto-name">${coin.name}</span>
                </div>
            </div>
            <div class="crypto-item-right">
                <span class="crypto-price">${formatCryptoPrice(coin.current_price)}</span>
                <span class="crypto-change ${trend}">${sign}${change.toFixed(2)}%</span>
                <span class="crypto-marketcap">${formatCryptoBig(coin.market_cap)}</span>
            </div>
        </div>`;
    }).join('');
}
function getCategoryLabel(cat) {
    const labels = { defi: 'DeFi', ai: 'AI', meme: 'Meme', layer1: 'L1', gamefi: 'GameFi', rwa: 'RWA' };
    return labels[cat] || '';
}

function renderCryptoEvents() {
    const list = document.getElementById('cryptoEventsList'); if (!list) return;
    const today = new Date().getTime();
    const sortedEvents = [...CRYPTO_EVENTS_DATA].sort((a, b) => new Date(a.date) - new Date(b.date));
    let html = '';
    sortedEvents.forEach(ev => {
        const evDate = new Date(ev.date).getTime();
        const dateObj = new Date(ev.date);
        const day = dateObj.getDate();
        const month = dateObj.toLocaleString('en-US', { month: 'short' });
        const year = dateObj.getFullYear();
        const diffDays = Math.ceil((evDate - today) / (1000 * 60 * 60 * 24));
        
        let countdown = '';
        if (diffDays > 0) countdown = `${diffDays} hari lagi`;
        else if (diffDays === 0) countdown = 'Hari ini!';
        else countdown = 'Selesai';

        html += `<div class="event-card">
            <div class="event-date-box">
                <span class="event-date-day">${day}</span>
                <span class="event-date-month">${month} '${String(year).slice(-2)}</span>
            </div>
            <div class="event-info">
                <div class="event-title">${ev.title} <span class="crypto-symbol-badge" style="margin-left:6px;">${ev.coin}</span></div>
                <div class="event-desc">${ev.desc}</div>
                <div class="event-countdown" style="${diffDays < 0 ? 'color:var(--text-muted); background:rgba(255,255,255,0.05);' : ''}">${countdown}</div>
            </div>
        </div>`;
    });
    if (!html) html = '<div class="empty-state">Belum ada event terdekat.</div>';
    list.innerHTML = html;
}

async function openCryptoDetail(coinId) {
    const coin = cryptoData.find(c => c.id === coinId); if (!coin) return;
    const symbol = coin.symbol.toUpperCase();
    currentCryptoData = coin;
    openAssetDetail(symbol, coin.name, coin.current_price, coin.price_change_percentage_24h || 0, 'crypto');
}
async function loadCryptoGlobalStats() {
    const el = document.getElementById('cryptoGlobalStats'); if (!el) return;
    const data = await fetchCryptoGlobal();
    if (!data) { el.innerHTML = '<div class="empty-state" style="padding:20px;">Gagal memuat data global</div>'; return; }
    const mcap = data.total_market_cap?.usd || 0; const vol = data.total_volume?.usd || 0;
    const btcDom = data.market_cap_percentage?.btc || 0; const change = data.market_cap_change_percentage_24h_usd || 0;
    const trend = change >= 0 ? 'up' : 'down'; const sign = change >= 0 ? '+' : '';
    el.innerHTML = `<div class="crypto-stats-grid"><div class="crypto-stat-card"><span class="crypto-stat-label">Total Market Cap</span><span class="crypto-stat-value">${formatCryptoBig(mcap)}</span></div><div class="crypto-stat-card"><span class="crypto-stat-label">Volume 24h</span><span class="crypto-stat-value">${formatCryptoBig(vol)}</span></div><div class="crypto-stat-card"><span class="crypto-stat-label">BTC Dominance</span><span class="crypto-stat-value">${btcDom.toFixed(1)}%</span></div><div class="crypto-stat-card"><span class="crypto-stat-label">24h Change</span><span class="crypto-stat-value ${trend}">${sign}${change.toFixed(2)}%</span></div></div>`;
    el.dataset.loaded = '1';
}
async function loadCryptoFNG() {
    const el = document.getElementById('cryptoFngSection'); if (!el) return;
    const data = await fetchCryptoFNG();
    if (!data) { el.innerHTML = '<div class="crypto-fng-title">😱 Fear & Greed Index</div><div class="empty-state" style="padding:20px;">Gagal memuat data</div>'; return; }
    const v = data.value; const label = data.label;
    let cls = 'neutral'; if (v <= 24) cls = 'extreme-fear'; else if (v <= 44) cls = 'fear'; else if (v <= 55) cls = 'neutral'; else if (v <= 74) cls = 'greed'; else cls = 'extreme-greed';
    const labels = { 'Extreme Fear': 'Extreme Fear 😱', 'Fear': 'Fear 😨', 'Neutral': 'Neutral 😐', 'Greed': 'Greed 🤑', 'Extreme Greed': 'Extreme Greed 🚀' };
    const labelDisplay = labels[label] || label;
    el.innerHTML = `<div class="crypto-fng-title">😱 Fear & Greed Index</div><div class="crypto-fng-bar-wrap"><div class="crypto-fng-scale"><div class="crypto-fng-scale-segment extreme-fear"></div><div class="crypto-fng-scale-segment fear"></div><div class="crypto-fng-scale-segment neutral"></div><div class="crypto-fng-scale-segment greed"></div><div class="crypto-fng-scale-segment extreme-greed"></div></div><div class="crypto-fng-marker" style="left:${v}%"></div></div><div class="crypto-fng-result"><div class="crypto-fng-value ${cls}">${v}</div><div class="crypto-fng-label-wrap"><span class="crypto-fng-label ${cls}">${labelDisplay}</span><span class="crypto-fng-sublabel">Sentimen pasar crypto hari ini</span></div></div><div class="crypto-fng-scale-labels"><span>Extreme Fear</span><span>Neutral</span><span>Extreme Greed</span></div>`;
    el.dataset.loaded = '1';
}
async function loadCryptoTrending() {
    const el = document.getElementById('cryptoTrendingSection'); if (!el) return;
    const trending = await fetchCryptoTrending();
    if (trending.length === 0) { el.innerHTML = '<div class="crypto-section-title">🔥 Trending Sekarang</div><div class="empty-state" style="padding:20px;">Gagal memuat trending</div>'; return; }
    el.innerHTML = `<div class="crypto-section-title">🔥 Trending Sekarang</div><div class="crypto-trending-list">${trending.map((coin, i) => {
        const change = coin.data?.price_change_percentage_24h?.usd || 0;
        const trend = change >= 0 ? 'up' : 'down'; const sign = change >= 0 ? '+' : '';
        const price = coin.data?.price ? '$' + parseFloat(coin.data.price).toLocaleString('en-US', { maximumFractionDigits: parseFloat(coin.data.price) < 1 ? 6 : 2 }) : 'N/A';
        return `<div class="crypto-trending-item" onclick="openCryptoDetail('${coin.id}')"><div class="crypto-trending-left"><span class="crypto-trending-rank">#${i + 1}</span><img src="${coin.small || coin.thumb}" alt="${coin.symbol}" class="crypto-icon" style="width:24px; height:24px;" onerror="this.style.display='none'"><div class="crypto-trending-info"><span class="crypto-trending-symbol">${coin.symbol}</span><span class="crypto-trending-name">${coin.name}</span></div></div><div class="crypto-trending-right"><div class="crypto-trending-price">${price}</div><div class="crypto-trending-change ${trend}">${sign}${change.toFixed(2)}%</div></div></div>`;
    }).join('')}</div>`;
    el.dataset.loaded = '1';
}
document.querySelectorAll('.crypto-top-tab').forEach(btn => { btn.addEventListener('click', () => { document.querySelectorAll('.crypto-top-tab').forEach(b => b.classList.remove('active')); btn.classList.add('active'); cryptoView = btn.dataset.view; renderCryptoList(); }); });
document.querySelectorAll('.crypto-cat-chip').forEach(chip => { chip.addEventListener('click', () => { document.querySelectorAll('.crypto-cat-chip').forEach(c => c.classList.remove('active')); chip.classList.add('active'); cryptoCatView = chip.dataset.cat; renderCryptoCategoryList(); }); });

// ============ 🥩 STAKING CALCULATOR ============
function initStakingCalculator() {
    const coinSelect = document.getElementById('stakingCoin');
    if (!coinSelect) return;
    coinSelect.addEventListener('change', () => {
        const selected = coinSelect.options[coinSelect.selectedIndex];
        const apy = selected.dataset.apy || '3.5';
        document.getElementById('stakingApy').value = apy;
    });
}

function calculateStakingRewards() {
    const amount = parseFloat(document.getElementById('stakingAmount').value) || 0;
    const apy = (parseFloat(document.getElementById('stakingApy').value) || 0) / 100;
    const durationDays = parseInt(document.getElementById('stakingDuration').value) || 365;
    const mode = document.getElementById('stakingMode').value;
    const freq = parseInt(document.getElementById('stakingFrequency').value) || 12;
    const coin = document.getElementById('stakingCoin').value;

    if (amount <= 0) { alert('Jumlah staking harus > 0!'); return; }
    if (apy <= 0) { alert('APY harus > 0!'); return; }

    const years = durationDays / 365;
    let finalValue = 0;
    let simpleValue = 0;

    simpleValue = amount * (1 + apy * years);

    if (mode === 'compound') {
        finalValue = amount * Math.pow(1 + apy / freq, freq * years);
    } else {
        finalValue = simpleValue;
    }

    const totalReward = finalValue - amount;
    const effectiveApy = amount > 0 ? ((Math.pow(finalValue / amount, 1 / years) - 1) * 100) : 0;
    const roi = amount > 0 ? (totalReward / amount) * 100 : 0;

    const resultEl = document.getElementById('stakingResult');
    resultEl.style.display = 'block';
    resultEl.innerHTML = `
        <div class="staking-result-main">
            <div class="staking-result-label">Total Reward</div>
            <div class="staking-result-big">$${totalReward.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="staking-result-sub">${mode === 'compound' ? `Compound ${getFrequencyLabel(freq)}` : 'Simple (no compound)'} · ${getDurationLabel(durationDays)}</div>
        </div>
        <div class="staking-result-grid">
            <div class="staking-result-item">
                <span class="staking-result-item-label">Modal Awal</span>
                <span class="staking-result-item-value">$${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
            </div>
            <div class="staking-result-item">
                <span class="staking-result-item-label">Total Akhir</span>
                <span class="staking-result-item-value green">$${finalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
            </div>
            <div class="staking-result-item">
                <span class="staking-result-item-label">APY Efektif</span>
                <span class="staking-result-item-value gold">${effectiveApy.toFixed(2)}%</span>
            </div>
            <div class="staking-result-item">
                <span class="staking-result-item-label">Total ROI</span>
                <span class="staking-result-item-value green">+${roi.toFixed(2)}%</span>
            </div>
        </div>
    `;
    renderStakingChart(amount, apy, durationDays, mode, freq);
    renderStakingComparison(amount, apy, durationDays, freq);
}

function getFrequencyLabel(freq) {
    const labels = { 365: 'Harian', 52: 'Mingguan', 12: 'Bulanan', 4: 'Triwulanan', 1: 'Tahunan' };
    return labels[freq] || 'Bulanan';
}
function getDurationLabel(days) {
    if (days === 30) return '1 Bulan'; if (days === 90) return '3 Bulan'; if (days === 180) return '6 Bulan';
    if (days === 365) return '1 Tahun'; if (days === 730) return '2 Tahun'; if (days === 1095) return '3 Tahun';
    if (days === 1825) return '5 Tahun'; return `${days} hari`;
}

function renderStakingChart(amount, apy, durationDays, mode, freq) {
    const container = document.getElementById('stakingChart'); const section = document.getElementById('stakingChartSection');
    if (!container || !section) return;
    section.style.display = 'block'; container.innerHTML = '';
    if (stakingChartInstance) { try { stakingChartInstance.remove(); } catch(e) {} stakingChartInstance = null; }
    if (typeof LightweightCharts === 'undefined') { container.innerHTML = '<div style="color:#f00;padding:20px;text-align:center;font-size:12px;">❌ Chart library tidak tersedia</div>'; return; }
    stakingChartInstance = LightweightCharts.createChart(container, {
        width: container.clientWidth, height: 200,
        layout: { background: { color: 'transparent' }, textColor: 'rgba(255, 255, 255, 0.6)', fontFamily: 'Inter, sans-serif' },
        grid: { vertLines: { color: 'rgba(255, 255, 255, 0.04)' }, horzLines: { color: 'rgba(255, 255, 255, 0.04)' } },
        rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.08)' }, timeScale: { borderColor: 'rgba(255, 255, 255, 0.08)', timeVisible: false },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false }, handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true }
    });
    const series = stakingChartInstance.addAreaSeries({ lineColor: '#50E4F2', topColor: 'rgba(80, 228, 242, 0.4)', bottomColor: 'rgba(80, 228, 242, 0.02)', lineWidth: 2 });
    const points = 30; const data = []; const now = new Date(); const startDate = new Date(now.getTime() - (durationDays * 24 * 60 * 60 * 1000));
    for (let i = 0; i <= points; i++) {
        const dayFraction = (i / points) * durationDays; const yearsElapsed = dayFraction / 365; let value = 0;
        if (mode === 'compound') { value = amount * Math.pow(1 + apy / freq, freq * yearsElapsed); } else { value = amount * (1 + apy * yearsElapsed); }
        const pointDate = new Date(startDate.getTime() + (dayFraction * 24 * 60 * 60 * 1000)); const timestamp = Math.floor(pointDate.getTime() / 1000);
        data.push({ time: timestamp, value: parseFloat(value.toFixed(2)) });
    }
    series.setData(data); stakingChartInstance.timeScale().fitContent();
}
function renderStakingComparison(amount, apy, durationDays, freq) {
    const el = document.getElementById('stakingComparison'); if (!el) return;
    el.style.display = 'block';
    const years = durationDays / 365;
    const simpleValue = amount * (1 + apy * years);
    const compoundValue = amount * Math.pow(1 + apy / freq, freq * years);
    const simpleReward = simpleValue - amount; const compoundReward = compoundValue - amount; const diff = compoundReward - simpleReward;
    el.innerHTML = `
        <div class="staking-comparison-title">⚖️ Simple vs Compound</div>
        <div class="staking-comparison-grid">
            <div class="staking-comp-card simple"><div class="staking-comp-label">📊 Simple</div><div class="staking-comp-value">$${simpleReward.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div><div class="staking-comp-sub">Total: $${simpleValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div></div>
            <div class="staking-comp-card compound"><div class="staking-comp-label">📈 Compound</div><div class="staking-comp-value">$${compoundReward.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div><div class="staking-comp-sub">Total: $${compoundValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div></div>
        </div>
        ${diff > 0 ? `<div style="margin-top:10px;text-align:center;font-size:11px;color:var(--green);font-weight:700;">💰 Compound lebih untung $${diff.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>` : ''}
    `;
}

// ============ 🆕 IMPERMANENT LOSS CALCULATOR ============
function calculateIL() {
    const initA = parseFloat(document.getElementById('ilInitA').value) || 0;
    const finalA = parseFloat(document.getElementById('ilFinalA').value) || 0;
    const initB = parseFloat(document.getElementById('ilInitB').value) || 0;
    const finalB = parseFloat(document.getElementById('ilFinalB').value) || 0;

    if (initA <= 0 || initB <= 0 || finalA <= 0 || finalB <= 0) { alert('Harga harus lebih besar dari 0!'); return; }

    const priceRatioA = finalA / initA;
    const priceRatioB = finalB / initB;
    const k = priceRatioA / priceRatioB;
    const il = (2 * Math.sqrt(k)) / (1 + k) - 1;
    const ilPercent = il * 100;

    const resultEl = document.getElementById('ilResult');
    resultEl.style.display = 'block';
    
    let verdict = 'Aman';
    let verdictClass = 'positive';
    if (ilPercent < -5 && ilPercent >= -15) { verdict = 'Risiko Sedang'; verdictClass = 'negative'; }
    else if (ilPercent < -15) { verdict = 'Risiko Tinggi!'; verdictClass = 'negative'; }

    resultEl.innerHTML = `
        <div class="il-result-main">
            <div class="il-result-label">Estimasi Impermanent Loss</div>
            <div class="il-result-big ${verdictClass}">${ilPercent.toFixed(2)}%</div>
            <div class="il-result-sub">${verdict}</div>
        </div>
        <div class="il-result-grid">
            <div class="staking-result-item">
                <span class="staking-result-item-label">Rasio Harga A</span>
                <span class="staking-result-item-value gold">${priceRatioA.toFixed(2)}x</span>
            </div>
            <div class="staking-result-item">
                <span class="staking-result-item-label">Rasio Harga B</span>
                <span class="staking-result-item-value gold">${priceRatioB.toFixed(2)}x</span>
            </div>
        </div>
        <div class="corr-insight-box ${ilPercent < -5 ? 'bad' : 'good'}" style="margin-top:12px;">
            <span style="font-size:14px;">${ilPercent < -5 ? '⚠️' : '✅'}</span>
            <span>${ilPercent < -5 ? 'Harga coin tidak seimbang. Hati-hati, kamu berpotensi kehilangan nilai aset dibandingkan sekadar hold (HODL).' : 'Harga coin relatif seimbang. IL kecil, aman untuk tetap di Liquidity Pool.'}</span>
        </div>
    `;
}

// ============ 🆕 DCA CALCULATOR ============
function populateDcaDropdowns() {
    const sel = document.getElementById('dcaCoin');
    if (!sel || sel.options.length > 0) return;
    const options = cryptoData.map(c => `<option value="${c.id}" data-symbol="${c.symbol.toUpperCase()}">${c.symbol.toUpperCase()} — ${c.name}</option>`).join('');
    sel.innerHTML = options;
}

async function calculateDCA() {
    const coinId = document.getElementById('dcaCoin').value;
    const amount = parseFloat(document.getElementById('dcaAmount').value) || 100;
    const freq = parseInt(document.getElementById('dcaFrequency').value) || 30;
    const duration = parseInt(document.getElementById('dcaDuration').value) || 365;

    if (!coinId) { alert('Pilih coin dulu!'); return; }
    if (amount <= 0) { alert('Jumlah harus > 0!'); return; }

    const resultEl = document.getElementById('dcaResult');
    const chartSection = document.getElementById('dcaChartSection');
    resultEl.style.display = 'block';
    resultEl.innerHTML = '<div class="loading-spinner"></div><p class="loading-text">Mengambil data historis...</p>';
    chartSection.style.display = 'none';

    const coin = cryptoData.find(c => c.id === coinId);
    const symbol = coin ? coin.symbol.toUpperCase() : coinId.toUpperCase();
    
    let range = '1y';
    if (duration === 30) range = '1mo';
    else if (duration === 90) range = '3mo';
    else if (duration === 180) range = '6mo';
    else if (duration === 730) range = '2y';

    try {
        const candles = await fetchChartData(symbol, 'crypto', '1d', range);
        if (!candles || candles.length === 0) throw new Error('Data historis gagal dimuat.');

        let totalInvested = 0;
        let totalCoins = 0;
        let dcaDataChart = [];
        
        const startTime = candles[0].time;
        let nextBuyTime = startTime;

        candles.forEach(c => {
            if (c.time >= nextBuyTime) {
                const coinsBought = amount / c.close;
                totalCoins += coinsBought;
                totalInvested += amount;
                nextBuyTime += (freq * 24 * 60 * 60);
            }
            const currentPortfolioValue = totalCoins * c.close;
            if (totalInvested > 0) { dcaDataChart.push({ time: c.time, value: currentPortfolioValue }); }
        });

        const currentPrice = candles[candles.length - 1].close;
        const finalValue = totalCoins * currentPrice;
        const profit = finalValue - totalInvested;
        const roi = (profit / totalInvested) * 100;

        let verdictClass = profit >= 0 ? 'positive' : 'negative';
        let sign = profit >= 0 ? '+' : '';

        resultEl.innerHTML = `
            <div class="dca-result-main">
                <div class="dca-result-label">Nilai Portfolio DCA (${symbol})</div>
                <div class="dca-result-big ${verdictClass}">$${finalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                <div class="dca-result-sub">ROI: ${sign}${roi.toFixed(2)}% (${sign}$${profit.toLocaleString('en-US', { maximumFractionDigits: 2 })})</div>
            </div>
            <div class="dca-result-grid">
                <div class="staking-result-item">
                    <span class="staking-result-item-label">Total Modal</span>
                    <span class="staking-result-item-value">$${totalInvested.toLocaleString('en-US')}</span>
                </div>
                <div class="staking-result-item">
                    <span class="staking-result-item-label">Total Coin Didapat</span>
                    <span class="staking-result-item-value gold">${totalCoins.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${symbol}</span>
                </div>
                <div class="staking-result-item">
                    <span class="staking-result-item-label">Harga Rata-rata (Avg)</span>
                    <span class="staking-result-item-value">$${(totalInvested / totalCoins).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                </div>
                <div class="staking-result-item">
                    <span class="staking-result-item-label">Harga Sekarang</span>
                    <span class="staking-result-item-value">$${currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                </div>
            </div>
            <div class="corr-insight-box ${profit >= 0 ? 'good' : 'bad'}" style="margin-top:12px;">
                <span style="font-size:14px;">${profit >= 0 ? '🚀' : '📉'}</span>
                <span>${profit >= 0 ? 'Selamat! Strategi DCA kamu sedang profit.' : 'Sabar, DCA adalah strategi jangka panjang. Justru saat merah begini kamu bisa dapat lebih banyak coin murah.'}</span>
            </div>
        `;

        chartSection.style.display = 'block';
        setTimeout(() => { renderDcaChart(dcaDataChart); }, 150);
    } catch (err) {
        resultEl.innerHTML = `<div class="analysis-error"><p>❌ ${err.message}</p></div>`;
    }
}

function renderDcaChart(data) {
    const container = document.getElementById('dcaChart');
    if (!container) return;
    container.innerHTML = '';
    if (dcaChartInstance) { try { dcaChartInstance.remove(); } catch(e) {} dcaChartInstance = null; }
    if (typeof LightweightCharts === 'undefined') return;

    dcaChartInstance = LightweightCharts.createChart(container, {
        width: container.clientWidth, height: 200,
        layout: { background: { color: 'transparent' }, textColor: 'rgba(255, 255, 255, 0.6)', fontFamily: 'Inter, sans-serif' },
        grid: { vertLines: { color: 'rgba(255, 255, 255, 0.04)' }, horzLines: { color: 'rgba(255, 255, 255, 0.04)' } },
        rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.08)' }, timeScale: { borderColor: 'rgba(255, 255, 255, 0.08)', timeVisible: false },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false }, handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true }
    });
    const series = dcaChartInstance.addAreaSeries({ lineColor: '#43D6A2', topColor: 'rgba(67, 214, 162, 0.4)', bottomColor: 'rgba(67, 214, 162, 0.02)', lineWidth: 2 });
    series.setData(data);
    dcaChartInstance.timeScale().fitContent();
}

// Crypto converter
function populateCryptoConverterDropdowns() {
    const fromSel = document.getElementById('cryptoConvFrom'); const toSel = document.getElementById('cryptoConvTo');
    if (!fromSel || !toSel) return;
    const options = [{ code: 'USD', name: '💵 USD - US Dollar', price: 1 }];
    cryptoData.slice(0, 30).forEach(c => { options.push({ code: c.symbol.toUpperCase(), name: `🪙 ${c.symbol.toUpperCase()} - ${c.name}`, price: c.current_price }); });
    const html = options.map(o => `<option value="${o.code}" data-price="${o.price}">${o.name}</option>`).join('');
    fromSel.innerHTML = html; toSel.innerHTML = html;
    fromSel.value = 'USD'; toSel.value = cryptoData[0] ? cryptoData[0].symbol.toUpperCase() : 'BTC';
}
function convertCrypto() {
    const amount = parseFloat(document.getElementById('cryptoConvAmount').value) || 0;
    const fromSel = document.getElementById('cryptoConvFrom'); const toSel = document.getElementById('cryptoConvTo');
    const fromPrice = parseFloat(fromSel.selectedOptions[0]?.dataset.price) || 1; const toPrice = parseFloat(toSel.selectedOptions[0]?.dataset.price) || 1;
    const result = (amount * fromPrice) / toPrice; const toCode = toSel.value;
    const resultEl = document.getElementById('cryptoConvResult');
    if (toCode === 'USD') resultEl.textContent = '$' + result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    else resultEl.textContent = result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) + ' ' + toCode;
    const rate = fromPrice / toPrice;
    document.getElementById('cryptoConvRate').innerHTML = `💱 <strong>1 ${fromSel.value}</strong> = <strong>${rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${toCode}</strong>`;
}
async function openCryptoConverter() {
    if (cryptoData.length === 0) { const data = await fetchCryptoPrices(); cryptoData = data; }
    populateCryptoConverterDropdowns(); document.getElementById('cryptoConverterModal').classList.add('active'); convertCrypto();
}
function closeCryptoConverter() { document.getElementById('cryptoConverterModal').classList.remove('active'); }
function swapCryptoConverter() { const fromSel = document.getElementById('cryptoConvFrom'); const toSel = document.getElementById('cryptoConvTo'); const temp = fromSel.value; fromSel.value = toSel.value; toSel.value = temp; const btn = document.getElementById('cryptoConvSwapBtn'); if (btn) { btn.style.transform = 'rotate(180deg)'; setTimeout(() => { btn.style.transform = 'rotate(0deg)'; }, 300); } convertCrypto(); }

// ============ 📊 CRYPTO CORRELATION ============
function populateCorrelationDropdowns() {
    const selA = document.getElementById('corrCoinA'); const selB = document.getElementById('corrCoinB');
    if (!selA || !selB) return;
    if (selA.options.length > 0) return;
    const options = cryptoData.map(c => `<option value="${c.id}" data-symbol="${c.symbol.toUpperCase()}">${c.symbol.toUpperCase()} — ${c.name}</option>`).join('');
    selA.innerHTML = options; selB.innerHTML = options;
    if (cryptoData.length >= 2) { selA.value = cryptoData[0].id; selB.value = cryptoData[1].id; }
}
async function openCryptoCorrelation() {
    if (cryptoData.length === 0) {
        const modal = document.getElementById('cryptoCorrelationModal'); if (modal) modal.classList.add('active');
        const resultEl = document.getElementById('corrResult');
        if (resultEl) { resultEl.style.display = 'block'; resultEl.innerHTML = '<div class="analysis-error"><p>❌ Data crypto belum termuat.</p></div>'; }
        return;
    }
    populateCorrelationDropdowns();
    document.getElementById('cryptoCorrelationModal').classList.add('active');
    document.getElementById('corrResult').style.display = 'none';
    document.getElementById('corrChartSection').style.display = 'none';
}
function closeCryptoCorrelation() {
    document.getElementById('cryptoCorrelationModal').classList.remove('active');
    if (corrChartInstance) { try { corrChartInstance.remove(); } catch(e) {} corrChartInstance = null; }
}
function calculatePearsonCorrelation(xs, ys) {
    const n = Math.min(xs.length, ys.length); if (n < 3) return 0;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) { sumX += xs[i]; sumY += ys[i]; sumXY += xs[i] * ys[i]; sumX2 += xs[i] * xs[i]; sumY2 += ys[i] * ys[i]; }
    const numerator = n * sumXY - sumX * sumY; const denomPart1 = n * sumX2 - sumX * sumX; const denomPart2 = n * sumY2 - sumY * sumY;
    const denom = Math.sqrt(denomPart1 * denomPart2); if (denom === 0) return 0;
    return numerator / denom;
}
function alignReturnsSeries(candlesA, candlesB) {
    const mapA = {}; const mapB = {};
    (candlesA || []).forEach(c => { if (c.time != null && c.close > 0) mapA[c.time] = c.close; });
    (candlesB || []).forEach(c => { if (c.time != null && c.close > 0) mapB[c.time] = c.close; });
    const commonTimes = Object.keys(mapA).filter(t => mapB[t] != null).map(Number).sort((a, b) => a - b);
    if (commonTimes.length < 3) return { returnsA: [], returnsB: [], alignedA: [], alignedB: [], times: [] };
    const alignedA = []; const alignedB = []; const times = [];
    commonTimes.forEach(t => { alignedA.push(mapA[t]); alignedB.push(mapB[t]); times.push(t); });
    const returnsA = []; const returnsB = [];
    for (let i = 1; i < alignedA.length; i++) { returnsA.push((alignedA[i] - alignedA[i-1]) / alignedA[i-1]); returnsB.push((alignedB[i] - alignedB[i-1]) / alignedB[i-1]); }
    return { returnsA, returnsB, alignedA, alignedB, times };
}
function getCorrelationVerdict(coef) {
    if (coef >= 0.8) return { label: 'STRONG POSITIVE', cls: 'strong-pos', icon: '🔥', insight: 'Coin ini bergerak hampir identik. Diversifikasi KURANG efektif — kalau satu turun, yang lain ikut turun.', insightCls: 'bad' };
    if (coef >= 0.5) return { label: 'POSITIVE', cls: 'pos', icon: '📈', insight: 'Coin ini cenderung bergerak searah. Diversifikasi SEDANG — kurang optimal buat hedging.', insightCls: 'warn' };
    if (coef >= 0.2) return { label: 'WEAK POSITIVE', cls: 'neutral', icon: '↗️', insight: 'Ada korelasi lemah. Diversifikasi CUKUP baik, ada sedikit independensi.', insightCls: 'good' };
    if (coef > -0.2) return { label: 'NEUTRAL', cls: 'neutral', icon: '⚖️', insight: 'Coin ini relatif independen. Diversifikasi BAGUS — pergerakan tidak saling terikat.', insightCls: 'good' };
    if (coef > -0.5) return { label: 'WEAK NEGATIVE', cls: 'neutral', icon: '↘️', insight: 'Ada korelasi negatif lemah. Bagus buat diversifikasi — sebagian bergerak berlawanan.', insightCls: 'good' };
    if (coef > -0.8) return { label: 'NEGATIVE', cls: 'neg', icon: '📉', insight: 'Coin ini cenderung bergerak berlawanan. SANGAT BAGUS buat hedging & diversifikasi.', insightCls: 'good' };
    return { label: 'STRONG NEGATIVE', cls: 'strong-neg', icon: '💎', insight: 'Coin ini hampir selalu berlawanan arah. LUAR BIASA buat hedging, tapi hati-hati volatilitas.', insightCls: 'good' };
}
async function runCryptoCorrelation() {
    const selA = document.getElementById('corrCoinA'); const selB = document.getElementById('corrCoinB');
    const periodEl = document.getElementById('corrPeriod'); const btn = document.getElementById('corrCalcBtn'); const resultEl = document.getElementById('corrResult');
    if (!selA || !selB || !periodEl || !btn || !resultEl) return;
    const idA = selA.value; const idB = selB.value;
    if (idA === idB) { alert('Pilih 2 coin yang berbeda!'); return; }
    const days = parseInt(periodEl.value) || 90; let range = '3mo';
    if (days === 30) range = '1mo'; else if (days === 90) range = '3mo'; else if (days === 365) range = '1y';
    const coinA = cryptoData.find(c => c.id === idA); const coinB = cryptoData.find(c => c.id === idB);
    const symbolA = coinA ? coinA.symbol.toUpperCase() : idA.toUpperCase(); const symbolB = coinB ? coinB.symbol.toUpperCase() : idB.toUpperCase();
    const originalText = btn.innerHTML; btn.innerHTML = '⏳ Menghitung...'; btn.disabled = true;
    resultEl.style.display = 'block'; resultEl.innerHTML = '<div class="loading-spinner"></div><p class="loading-text">Mengambil data historis...</p>';
    try {
        const [chartA, chartB] = await Promise.all([ fetchChartData(symbolA, 'crypto', '1d', range), fetchChartData(symbolB, 'crypto', '1d', range) ]);
        if (!chartA || chartA.length < 5 || !chartB || chartB.length < 5) { resultEl.innerHTML = '<div class="analysis-error"><p>❌ Data historis tidak cukup.</p></div>'; return; }
        const { returnsA, returnsB, alignedA, alignedB, times } = alignReturnsSeries(chartA, chartB);
        if (returnsA.length < 3) { resultEl.innerHTML = '<div class="analysis-error"><p>❌ Data tidak cukup untuk hitung korelasi.</p></div>'; return; }
        const coef = calculatePearsonCorrelation(returnsA, returnsB); const verdict = getCorrelationVerdict(coef);
        resultEl.innerHTML = `
            <div class="corr-coef-big ${verdict.cls}">${coef >= 0 ? '+' : ''}${coef.toFixed(3)}</div>
            <div class="corr-coef-label">Pearson Correlation Coefficient</div>
            <div class="corr-verdict-badge ${verdict.cls}">${verdict.icon} ${verdict.label}</div>
            <div class="corr-interpretation"><strong>${symbolA}</strong> vs <strong>${symbolB}</strong> — ${days} hari terakhir (${returnsA.length} data point)</div>
            <div class="corr-insight-box ${verdict.insightCls}"><span style="font-size:14px;">${verdict.insightCls === 'good' ? '✅' : verdict.insightCls === 'warn' ? '⚠️' : '🚨'}</span><span>${verdict.insight}</span></div>
        `;
        document.getElementById('corrChartSection').style.display = 'block';
        setTimeout(() => { renderCorrelationChart(alignedA, alignedB, times, symbolA, symbolB); }, 100);
    } catch (err) { resultEl.innerHTML = `<div class="analysis-error"><p>❌ Gagal menghitung korelasi</p><p style="font-size:11px;">${err.message}</p></div>`; }
    finally { btn.innerHTML = originalText; btn.disabled = false; }
}
function renderCorrelationChart(alignedA, alignedB, times, symbolA, symbolB) {
    const container = document.getElementById('corrChart'); if (!container) return;
    container.innerHTML = '';
    if (corrChartInstance) { try { corrChartInstance.remove(); } catch(e) {} corrChartInstance = null; }
    if (typeof LightweightCharts === 'undefined') { container.innerHTML = '❌ Chart library tidak tersedia'; return; }
    if (!alignedA || alignedA.length < 2) { container.innerHTML = '<div style="color:rgba(255,255,255,0.4);padding:20px;text-align:center;font-size:12px;">Data tidak cukup</div>'; return; }
    corrChartInstance = LightweightCharts.createChart(container, {
        width: container.clientWidth, height: 260,
        layout: { background: { color: 'transparent' }, textColor: 'rgba(255, 255, 255, 0.6)', fontFamily: 'Inter, sans-serif' },
        grid: { vertLines: { color: 'rgba(255, 255, 255, 0.04)' }, horzLines: { color: 'rgba(255, 255, 255, 0.04)' } },
        rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.08)' }, timeScale: { borderColor: 'rgba(255, 255, 255, 0.08)', timeVisible: false },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false }, handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true }
    });
    const baseA = alignedA[0]; const baseB = alignedB[0];
    const seriesA = corrChartInstance.addLineSeries({ color: '#50E4F2', lineWidth: 2, title: symbolA });
    const seriesB = corrChartInstance.addLineSeries({ color: '#B9A0FF', lineWidth: 2, title: symbolB });
    const dataA = alignedA.map((v, i) => ({ time: times[i], value: ((v / baseA) - 1) * 100 })).filter(d => d.time != null && !isNaN(d.value));
    const dataB = alignedB.map((v, i) => ({ time: times[i], value: ((v / baseB) - 1) * 100 })).filter(d => d.time != null && !isNaN(d.value));
    seriesA.setData(dataA); seriesB.setData(dataB); corrChartInstance.timeScale().fitContent();
}

// ============ 🪙 CRYPTO VALUE SCORECARD ============
function calculateCryptoScore(coinData, detailData, chartData) {
    const criteria = []; let totalScore = 0; let maxPossible = 0;
    const rank = coinData.market_cap_rank || 999;
    let rankScore = 0; let rankStatus = 'fail'; let rankDesc = '';
    if (rank <= 5) { rankScore = 15; rankStatus = 'pass'; rankDesc = `Rank #${rank} — top tier`; }
    else if (rank <= 15) { rankScore = 12; rankStatus = 'pass'; rankDesc = `Rank #${rank} — major crypto`; }
    else if (rank <= 30) { rankScore = 8; rankStatus = 'partial'; rankDesc = `Rank #${rank} — mid-cap`; }
    else if (rank <= 100) { rankScore = 4; rankStatus = 'partial'; rankDesc = `Rank #${rank} — small cap`; }
    else { rankScore = 0; rankStatus = 'fail'; rankDesc = `Rank #${rank} — micro cap`; }
    criteria.push({ label: 'Market Cap Rank', icon: '🏆', score: rankScore, max: 15, value: `#${rank}`, status: rankStatus, desc: rankDesc });
    totalScore += rankScore; maxPossible += 15;
    const volMcapRatio = coinData.market_cap > 0 ? (coinData.total_volume / coinData.market_cap) * 100 : 0;
    let liqScore = 0; let liqStatus = 'fail'; let liqDesc = '';
    if (volMcapRatio >= 15) { liqScore = 15; liqStatus = 'pass'; liqDesc = `Liquidity sangat tinggi (${volMcapRatio.toFixed(1)}%)`; }
    else if (volMcapRatio >= 8) { liqScore = 12; liqStatus = 'pass'; liqDesc = `Liquidity tinggi (${volMcapRatio.toFixed(1)}%)`; }
    else if (volMcapRatio >= 4) { liqScore = 8; liqStatus = 'pass'; liqDesc = `Liquidity baik (${volMcapRatio.toFixed(1)}%)`; }
    else if (volMcapRatio >= 1.5) { liqScore = 5; liqStatus = 'partial'; liqDesc = `Liquidity cukup (${volMcapRatio.toFixed(1)}%)`; }
    else if (volMcapRatio > 0) { liqScore = 2; liqStatus = 'fail'; liqDesc = `Liquidity rendah (${volMcapRatio.toFixed(1)}%)`; }
    else { liqScore = 0; liqStatus = 'fail'; liqDesc = 'Data volume tidak tersedia'; }
    criteria.push({ label: 'Liquidity (Vol/MCap)', icon: '💧', score: liqScore, max: 15, value: `${volMcapRatio.toFixed(2)}%`, status: liqStatus, desc: liqDesc });
    totalScore += liqScore; maxPossible += 15;
    const athChange = coinData.ath_change_percentage || 0;
    let athScore = 0; let athStatus = 'fail'; let athDesc = '';
    if (athChange >= -10) { athScore = 3; athStatus = 'fail'; athDesc = `Dekat ATH (${athChange.toFixed(1)}%)`; }
    else if (athChange >= -30) { athScore = 6; athStatus = 'partial'; athDesc = `Turun ${Math.abs(athChange).toFixed(1)}% dari ATH`; }
    else if (athChange >= -60) { athScore = 10; athStatus = 'pass'; athDesc = `Turun ${Math.abs(athChange).toFixed(1)}% dari ATH — potensi`; }
    else if (athChange >= -85) { athScore = 8; athStatus = 'pass'; athDesc = `Turun ${Math.abs(athChange).toFixed(1)}% dari ATH — deep discount`; }
    else { athScore = 4; athStatus = 'partial'; athDesc = `Turun ${Math.abs(athChange).toFixed(1)}% dari ATH`; }
    criteria.push({ label: 'ATH Distance', icon: '📉', score: athScore, max: 10, value: `${athChange.toFixed(1)}%`, status: athStatus, desc: athDesc });
    totalScore += athScore; maxPossible += 10;
    const circ = coinData.circulating_supply || 0; const total = coinData.total_supply || circ || 1;
    const supplyRatio = total > 0 ? (circ / total) * 100 : 100;
    let supScore = 0; let supStatus = 'fail'; let supDesc = '';
    if (supplyRatio >= 95) { supScore = 10; supStatus = 'pass'; supDesc = `Fully circulating (${supplyRatio.toFixed(1)}%)`; }
    else if (supplyRatio >= 75) { supScore = 7; supStatus = 'pass'; supDesc = `Supply ratio baik (${supplyRatio.toFixed(1)}%)`; }
    else if (supplyRatio >= 50) { supScore = 4; supStatus = 'partial'; supDesc = `Supply ratio moderat (${supplyRatio.toFixed(1)}%)`; }
    else { supScore = 0; supStatus = 'fail'; supDesc = `Supply ratio rendah (${supplyRatio.toFixed(1)}%)`; }
    criteria.push({ label: 'Supply Ratio', icon: '🪙', score: supScore, max: 10, value: `${supplyRatio.toFixed(1)}%`, status: supStatus, desc: supDesc });
    totalScore += supScore; maxPossible += 10;
    const change1d = Math.abs(coinData.price_change_percentage_24h || 0);
    let stabScore = 0; let stabStatus = 'fail'; let stabDesc = '';
    if (change1d <= 3) { stabScore = 10; stabStatus = 'pass'; stabDesc = `Volatilitas rendah (${change1d.toFixed(2)}%)`; }
    else if (change1d <= 7) { stabScore = 7; stabStatus = 'pass'; stabDesc = `Volatilitas normal (${change1d.toFixed(2)}%)`; }
    else if (change1d <= 15) { stabScore = 4; stabStatus = 'partial'; stabDesc = `Volatilitas tinggi (${change1d.toFixed(2)}%)`; }
    else { stabScore = 0; stabStatus = 'fail'; stabDesc = `Volatilitas ekstrem (${change1d.toFixed(2)}%)`; }
    criteria.push({ label: 'Price Stability (24h)', icon: '⚖️', score: stabScore, max: 10, value: `${change1d.toFixed(2)}%`, status: stabStatus, desc: stabDesc });
    totalScore += stabScore; maxPossible += 10;
    const change7d = coinData.price_change_percentage_7d_in_currency || 0;
    let wScore = 0; let wStatus = 'fail'; let wDesc = '';
    if (change7d >= 10) { wScore = 10; wStatus = 'pass'; wDesc = `Momentum 7h kuat (+${change7d.toFixed(1)}%)`; }
    else if (change7d >= 3) { wScore = 7; wStatus = 'pass'; wDesc = `Momentum 7h positif (+${change7d.toFixed(1)}%)`; }
    else if (change7d >= -3) { wScore = 4; wStatus = 'partial'; wDesc = `Sideways (${change7d.toFixed(1)}%)`; }
    else if (change7d >= -10) { wScore = 2; wStatus = 'fail'; wDesc = `Momentum 7h negatif (${change7d.toFixed(1)}%)`; }
    else { wScore = 0; wStatus = 'fail'; wDesc = `Momentum 7h buruk (${change7d.toFixed(1)}%)`; }
    criteria.push({ label: 'Momentum 7 Hari', icon: '📊', score: wScore, max: 10, value: `${change7d >= 0 ? '+' : ''}${change7d.toFixed(2)}%`, status: wStatus, desc: wDesc });
    totalScore += wScore; maxPossible += 10;
    const change30d = coinData.price_change_percentage_30d_in_currency || 0;
    let mScore = 0; let mStatus = 'fail'; let mDesc = '';
    if (change30d >= 30) { mScore = 10; mStatus = 'pass'; mDesc = `Bullish kuat 30h (+${change30d.toFixed(1)}%)`; }
    else if (change30d >= 10) { mScore = 7; mStatus = 'pass'; mDesc = `Bullish 30h (+${change30d.toFixed(1)}%)`; }
    else if (change30d >= -10) { mScore = 4; mStatus = 'partial'; mDesc = `Stabil (${change30d.toFixed(1)}%)`; }
    else if (change30d >= -25) { mScore = 2; mStatus = 'fail'; mDesc = `Bearish 30h (${change30d.toFixed(1)}%)`; }
    else { mScore = 0; mStatus = 'fail'; mDesc = `Bearish kuat 30h (${change30d.toFixed(1)}%)`; }
    criteria.push({ label: 'Momentum 30 Hari', icon: '📈', score: mScore, max: 10, value: `${change30d >= 0 ? '+' : ''}${change30d.toFixed(2)}%`, status: mStatus, desc: mDesc });
    totalScore += mScore; maxPossible += 10;
    const mcap = coinData.market_cap || 0;
    let mcScore = 0; let mcStatus = 'fail'; let mcDesc = '';
    if (mcap >= 500e9) { mcScore = 10; mcStatus = 'pass'; mcDesc = `Mega cap (${formatCryptoBig(mcap)})`; }
    else if (mcap >= 50e9) { mcScore = 8; mcStatus = 'pass'; mcDesc = `Large cap (${formatCryptoBig(mcap)})`; }
    else if (mcap >= 5e9) { mcScore = 5; mcStatus = 'partial'; mcDesc = `Mid cap (${formatCryptoBig(mcap)})`; }
    else if (mcap >= 500e6) { mcScore = 3; mcStatus = 'partial'; mcDesc = `Small cap (${formatCryptoBig(mcap)})`; }
    else { mcScore = 0; mcStatus = 'fail'; mcDesc = `Micro cap (${formatCryptoBig(mcap)})`; }
    criteria.push({ label: 'Market Cap Size', icon: '💎', score: mcScore, max: 10, value: formatCryptoBig(mcap), status: mcStatus, desc: mcDesc });
    totalScore += mcScore; maxPossible += 10;
    let commScore = 5; let commStatus = 'partial'; let commDesc = 'Data community tidak tersedia';
    if (detailData && detailData.community_data) {
        const twitterFollowers = detailData.community_data.twitter_followers || 0; const redditSubs = detailData.community_data.reddit_subscribers || 0; const totalCommunity = twitterFollowers + redditSubs;
        if (totalCommunity >= 3000000) { commScore = 10; commStatus = 'pass'; commDesc = `Community sangat besar (${(totalCommunity/1e6).toFixed(2)}M)`; }
        else if (totalCommunity >= 1000000) { commScore = 8; commStatus = 'pass'; commDesc = `Community besar (${(totalCommunity/1e6).toFixed(2)}M)`; }
        else if (totalCommunity >= 300000) { commScore = 6; commStatus = 'pass'; commDesc = `Community baik (${(totalCommunity/1e3).toFixed(0)}K)`; }
        else if (totalCommunity >= 50000) { commScore = 3; commStatus = 'partial'; commDesc = `Community kecil (${(totalCommunity/1e3).toFixed(0)}K)`; }
        else { commScore = 0; commStatus = 'fail'; commDesc = `Community sangat kecil`; }
    }
    criteria.push({ label: 'Community Size', icon: '👥', score: commScore, max: 10, value: detailData && detailData.community_data ? ((detailData.community_data.twitter_followers || 0) + (detailData.community_data.reddit_subscribers || 0)) > 1000 ? ((detailData.community_data.twitter_followers || 0) + (detailData.community_data.reddit_subscribers || 0)).toLocaleString('en-US') : 'N/A' : 'N/A', status: commStatus, desc: commDesc });
    totalScore += commScore; maxPossible += 10;
    let devScore = 5; let devStatus = 'partial'; let devDesc = 'Data developer tidak tersedia';
    if (detailData && detailData.developer_data) {
        const commitCount = detailData.developer_data.commit_count_4_weeks || 0;
        if (commitCount >= 100) { devScore = 10; devStatus = 'pass'; devDesc = `Developer sangat aktif (${commitCount} commits)`; }
        else if (commitCount >= 30) { devScore = 8; devStatus = 'pass'; devDesc = `Developer aktif (${commitCount} commits)`; }
        else if (commitCount >= 10) { devScore = 5; devStatus = 'partial'; devDesc = `Developer moderat (${commitCount} commits)`; }
        else if (commitCount > 0) { devScore = 2; devStatus = 'fail'; devDesc = `Developer kurang aktif (${commitCount} commits)`; }
        else { devScore = 0; devStatus = 'fail'; devDesc = `Tidak ada aktivitas developer`; }
    }
    criteria.push({ label: 'Developer Activity', icon: '💻', score: devScore, max: 10, value: detailData && detailData.developer_data ? `${detailData.developer_data.commit_count_4_weeks || 0} commits/4w` : 'N/A', status: devStatus, desc: devDesc });
    totalScore += devScore; maxPossible += 10;
    const normalizedScore = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;
    return { score: normalizedScore, criteria };
}
function getCryptoVerdict(score) {
    if (score >= 80) return { label: 'EXCELLENT', class: 'excellent', icon: '🏆', desc: 'Crypto berkualitas tinggi. Fundamental & momentum kuat.' };
    if (score >= 60) return { label: 'GOOD', class: 'good', icon: '👍', desc: 'Crypto berkualitas baik. Layak dipertimbangkan.' };
    if (score >= 40) return { label: 'FAIR', class: 'fair', icon: '⚠️', desc: 'Crypto cukup tapi ada red flag. Perlu riset lebih dalam.' };
    return { label: 'POOR', class: 'poor', icon: '🚨', desc: 'Fundamental lemah. Hati-hati dengan risiko tinggi.' };
}
async function openCryptoScorecard() {
    if (!currentSymbol || currentType !== 'crypto') return;
    const modal = document.getElementById('cryptoScorecardModal'); if (!modal) return;
    modal.classList.add('active'); document.getElementById('cryptoScorecardTitle').textContent = currentSymbol + ' — ' + currentName;
    const heroEl = document.getElementById('cryptoScorecardHero'); const breakdownEl = document.getElementById('cryptoScorecardBreakdown'); const verdictEl = document.getElementById('cryptoScorecardVerdict');
    heroEl.innerHTML = '<div class="scorecard-loading"><div class="loading-spinner"></div><p class="loading-text">🤖 Menganalisis crypto...</p></div>';
    breakdownEl.innerHTML = ''; verdictEl.style.display = 'none';
    try {
        let coinData = cryptoData.find(c => c.symbol.toUpperCase() === currentSymbol.toUpperCase());
        if (!coinData && currentCryptoData) coinData = currentCryptoData;
        if (!coinData) {
            const searchRes = await fetchWithTimeout(`https://api.coingecko.com/api/v3/search?query=${currentSymbol}`, {}, 8000);
            if (searchRes.ok) { const searchData = await searchRes.json(); if (searchData.coins && searchData.coins[0]) { const coinId = searchData.coins[0].id; const detail = await fetchCryptoDetail(coinId); if (detail) coinData = { ...detail, current_price: detail.market_data?.current_price?.usd, market_cap: detail.market_data?.market_cap?.usd, total_volume: detail.market_data?.total_volume?.usd, price_change_percentage_24h: detail.market_data?.price_change_percentage_24h, market_cap_rank: detail.market_cap_rank, ath_change_percentage: detail.market_data?.ath_change_percentage?.usd, circulating_supply: detail.market_data?.circulating_supply, total_supply: detail.market_data?.total_supply, price_change_percentage_7d_in_currency: detail.market_data?.price_change_percentage_7d, price_change_percentage_30d_in_currency: detail.market_data?.price_change_percentage_30d }; } }
        }
        if (!coinData) { heroEl.innerHTML = '<div class="analysis-error"><p>❌ Data crypto tidak tersedia</p></div>'; return; }
        let detailData = null; try { if (coinData.id) detailData = await fetchCryptoDetail(coinData.id); } catch (e) {}
        const chartData = await fetchChartData(currentSymbol, 'crypto', '1d', '1y');
        const result = calculateCryptoScore(coinData, detailData, chartData);
        const verdict = getCryptoVerdict(result.score);
        renderCryptoScorecardHero(result.score, verdict); renderCryptoScorecardBreakdown(result.criteria); renderCryptoScorecardVerdict(result, verdict, coinData);
    } catch (error) { heroEl.innerHTML = `<div class="analysis-error"><p>❌ Gagal menganalisis</p><p class="error-detail">${error.message}</p></div>`; }
}
function renderCryptoScorecardHero(score, verdict) { const heroEl = document.getElementById('cryptoScorecardHero'); heroEl.innerHTML = `<div class="scorecard-score-big">${score}</div><div class="scorecard-score-label">Crypto Score / 100</div><div class="scorecard-verdict-badge ${verdict.class}">${verdict.icon} ${verdict.label}</div><div class="scorecard-hero-desc">${verdict.desc}</div>`; }
function renderCryptoScorecardBreakdown(criteria) {
    const breakdownEl = document.getElementById('cryptoScorecardBreakdown');
    let html = `<div class="crypto-scorecard-breakdown-title">📋 Detail Penilaian (10 Kriteria Crypto)</div>`;
    criteria.forEach(c => {
        const pct = c.max > 0 ? (c.score / c.max) * 100 : 0;
        let barColor = '#FF7387'; if (pct >= 70) barColor = '#43D6A2'; else if (pct >= 40) barColor = '#E9B949';
        html += `<div class="crypto-scorecard-criteria-item"><div class="criteria-top"><div class="criteria-label"><span class="criteria-label-icon">${c.icon}</span>${c.label}</div><div style="display:flex; align-items:center; gap:8px;"><span class="criteria-score-badge ${c.status}">${c.score}/${c.max}</span><span class="criteria-value">${c.value}</span></div></div><div class="criteria-bar-bg"><div class="criteria-bar-fill" style="width:${pct}%; background:${barColor};"></div></div><div class="criteria-desc">${c.desc}</div></div>`;
    });
    breakdownEl.innerHTML = html;
}
function renderCryptoScorecardVerdict(result, verdict, coinData) {
    const verdictEl = document.getElementById('cryptoScorecardVerdict');
    const passCount = result.criteria.filter(c => c.status === 'pass').length;
    const partialCount = result.criteria.filter(c => c.status === 'partial').length;
    const failCount = result.criteria.filter(c => c.status === 'fail').length;
    let summaryText = '';
    if (result.score >= 80) summaryText = `<strong>${currentSymbol}</strong> kualitas cryptonya <strong>sangat baik</strong>.`;
    else if (result.score >= 60) summaryText = `<strong>${currentSymbol}</strong> kualitas cryptonya <strong>baik</strong>.`;
    else if (result.score >= 40) summaryText = `<strong>${currentSymbol}</strong> kualitas cryptonya <strong>cukup</strong> tapi ada red flag.`;
    else summaryText = `<strong>${currentSymbol}</strong> kualitas cryptonya <strong>lemah</strong>.`;
    const rank = coinData.market_cap_rank || 'N/A';
    verdictEl.innerHTML = `<div class="scorecard-verdict-title">🧠 Kesimpulan Crypto</div><div class="scorecard-verdict-text">${summaryText}</div><div class="scorecard-stats-row"><div class="scorecard-stat-box"><span class="scorecard-stat-label">Lolos</span><span class="scorecard-stat-value excellent">${passCount}/10</span></div><div class="scorecard-stat-box"><span class="scorecard-stat-label">Skor</span><span class="scorecard-stat-value ${verdict.class}">${result.score}</span></div><div class="scorecard-stat-box"><span class="scorecard-stat-label">Rank</span><span class="scorecard-stat-value">#${rank}</span></div></div>`;
    verdictEl.style.display = 'block';
}
function closeCryptoScorecard() { document.getElementById('cryptoScorecardModal').classList.remove('active'); }

// ============ 🥇 COMMODITY TAB ============
const COMMODITY_LIST = [
    { symbol: 'GC=F', name: 'Gold', icon: '🥇', category: 'metals', unit: 'Troy Ounce' },
    { symbol: 'SI=F', name: 'Silver', icon: '🥈', category: 'metals', unit: 'Troy Ounce' },
    { symbol: 'PL=F', name: 'Platinum', icon: '💍', category: 'metals', unit: 'Troy Ounce' },
    { symbol: 'HG=F', name: 'Copper', icon: '🔌', category: 'metals', unit: 'Pound' },
    { symbol: 'CL=F', name: 'Crude Oil WTI', icon: '🛢️', category: 'energy', unit: 'Barrel' },
    { symbol: 'NG=F', name: 'Natural Gas', icon: '🔥', category: 'energy', unit: 'MMBtu' },
    { symbol: 'ZC=F', name: 'Corn', icon: '🌽', category: 'agri', unit: 'Bushel' },
    { symbol: 'ZW=F', name: 'Wheat', icon: '🌾', category: 'agri', unit: 'Bushel' },
    { symbol: 'KC=F', name: 'Coffee', icon: '☕', category: 'agri', unit: 'Pound' },
    { symbol: 'SB=F', name: 'Sugar', icon: '🍬', category: 'agri', unit: 'Pound' }
];

async function initCommodityTab() {
    if (commodityData.length === 0) {
        await loadCommodityData();
    } else {
        renderCommoditySpotlight();
        renderGoldSilverRatio();
        renderCommodityHeatmap();
        renderCommodityGrid();
    }
    renderSeasonalityChart();
    renderInflationChart();
}

async function loadCommodityData() {
    const grid = document.getElementById('commodityGrid'); if (!grid) return;
    grid.innerHTML = '<div class="crypto-loading"><div class="loading-spinner"></div><p class="loading-text">Memuat data komoditas...</p></div>';
    try {
        const promises = COMMODITY_LIST.map(async (c) => {
            const priceData = await fetchPrice(c.symbol, 'commodity');
            return { ...c, priceData };
        });
        
        const results = await Promise.all(promises);
        commodityData = results.filter(r => r.priceData !== null);

        renderCommoditySpotlight();
        renderGoldSilverRatio();
        renderCommodityHeatmap();
        renderCommodityGrid();
        updateGoldIdrPrice();
    } catch (error) {
        grid.innerHTML = '<div class="empty-state">❌ Gagal memuat data komoditas.</div>';
    }
}

function renderCommoditySpotlight() {
    const container = document.getElementById('goldSpotlight'); if (!container) return;
    const gold = commodityData.find(c => c.symbol === 'GC=F');
    
    if (!gold || !gold.priceData) {
        container.innerHTML = '<div class="empty-state">Data emas tidak tersedia.</div>';
        return;
    }

    const priceOunce = gold.priceData.price;
    const change = gold.priceData.change;
    const priceGram = priceOunce / 31.1034768;
    
    const trend = change >= 0 ? 'up' : 'down';
    const sign = change >= 0 ? '+' : '';
    const color = change >= 0 ? 'var(--green)' : 'var(--red)';

    container.innerHTML = `
        <div class="commodity-spotlight-left">
            <div class="commodity-spotlight-icon">🥇</div>
            <div class="commodity-spotlight-info">
                <span class="commodity-spotlight-name">Gold (Emas)</span>
                <span class="commodity-spotlight-price">$${priceOunce.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span class="commodity-spotlight-change" style="color: ${color};">${sign}${change.toFixed(2)}%</span>
                <span class="commodity-spotlight-gram">≈ $${priceGram.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / gram</span>
            </div>
        </div>
        <div style="text-align: right;">
            <div style="font-size: 10px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Satuan</div>
            <div style="font-size: 12px; font-weight: 700; color: var(--gold);">Troy Ounce</div>
        </div>
    `;
}

function renderGoldSilverRatio() {
    const container = document.getElementById('commodityRatioCard');
    if (!container) return;
    
    const gold = commodityData.find(c => c.symbol === 'GC=F');
    const silver = commodityData.find(c => c.symbol === 'SI=F');
    
    if (!gold?.priceData || !silver?.priceData) {
        container.innerHTML = '<div class="empty-state">Data gold/silver tidak tersedia.</div>';
        return;
    }
    
    const ratio = gold.priceData.price / silver.priceData.price;
    
    let verdict, verdictIcon, verdictDesc, insight;
    if (ratio >= 80) {
        verdict = 'SILVER UNDERVALUED'; verdictIcon = '🥈'; verdictDesc = 'Rasio tinggi — historisnya silver lebih murah relatif terhadap gold.'; insight = 'Ratio di atas 80 menunjukkan perak relatif murah. Sejarah menunjukkan ratio cenderung mean-revert, potensi silver outperform.';
    } else if (ratio >= 65) {
        verdict = 'NORMAL (HIGH)'; verdictIcon = '⚖️'; verdictDesc = 'Rasio di zona atas normal — silver cenderung murah.'; insight = 'Ratio di zona atas normal (65-80). Kalau percaya mean reversion, silver bisa jadi opportunity.';
    } else if (ratio >= 50) {
        verdict = 'NORMAL'; verdictIcon = '⚖️'; verdictDesc = 'Rasio di zona normal sepanjang sejarah.'; insight = 'Ratio di zona normal (50-65). Tidak ada sinyal ekstrem dari ratio ini.';
    } else if (ratio >= 40) {
        verdict = 'NORMAL (LOW)'; verdictIcon = '⚖️'; verdictDesc = 'Rasio di zona bawah normal — gold cenderung murah.'; insight = 'Ratio di zona bawah normal (40-50). Gold relatif lebih murah dibanding silver.';
    } else {
        verdict = 'GOLD UNDERVALUED'; verdictIcon = '🥇'; verdictDesc = 'Rasio rendah — gold relatif murah dibanding silver.'; insight = 'Ratio di bawah 40 = gold murah historis. Hati-hati, ratio bisa stay rendah lama.';
    }
    
    container.innerHTML = `
        <div class="staking-result-main">
            <div class="staking-result-label">Gold/Silver Ratio</div>
            <div class="staking-result-big">${ratio.toFixed(1)}</div>
            <div class="staking-result-sub">${verdictIcon} ${verdict} — ${verdictDesc}</div>
        </div>
        <div class="staking-result-grid">
            <div class="staking-result-item"><span class="staking-result-item-label">🥇 Gold / oz</span><span class="staking-result-item-value gold">$${gold.priceData.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            <div class="staking-result-item"><span class="staking-result-item-label">🥈 Silver / oz</span><span class="staking-result-item-value gold">$${silver.priceData.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        </div>
        <div class="corr-insight-box good" style="margin-top:12px;"><span style="font-size:14px;">💡</span><span>${insight}</span></div>
    `;
}

function renderCommodityHeatmap() {
    const grid = document.getElementById('commodityHeatmapGrid'); if (!grid) return;
    if (commodityData.length === 0) { grid.innerHTML = '<div class="crypto-heatmap-loading"><div class="loading-spinner"></div><p class="loading-text">Memuat heatmap...</p></div>'; return; }
    grid.innerHTML = commodityData.map(c => {
        const p = c.priceData; if (!p) return '';
        const color = getCryptoHeatColor(p.change); const sign = p.change >= 0 ? '+' : '';
        return `<div class="crypto-heatmap-item" style="background: ${color.bg}; color: ${color.text}; cursor: pointer;" onclick="openAssetDetail('${c.symbol}', '${c.name}', ${p.price}, ${p.change}, 'commodity')">
            <div class="crypto-heatmap-symbol">${c.symbol.replace('=F', '')}</div>
            <div class="crypto-heatmap-change">${sign}${p.change.toFixed(2)}%</div>
        </div>`;
    }).join('');
}

async function updateGoldIdrPrice() {
    const priceEl = document.getElementById('goldIdrPrice'); const subEl = document.getElementById('goldIdrSub');
    if (!priceEl || !subEl) return;
    const gold = commodityData.find(c => c.symbol === 'GC=F');
    if (!gold?.priceData) return;
    if (!currencyRates) { await fetchCurrencyRates(); }
    const usdIdrRate = currencyRates ? currencyRates['IDR'] : 0;
    if (!usdIdrRate) { priceEl.textContent = 'Rp -'; subEl.textContent = 'Kurs USD/IDR tidak tersedia'; return; }
    const priceGramIdr = (gold.priceData.price / 31.1034768) * usdIdrRate;
    priceEl.textContent = formatCurrencyAmount(priceGramIdr, 'IDR');
    subEl.textContent = `Kurs: 1 USD = Rp ${usdIdrRate.toLocaleString('id-ID')} · Spot Dunia`;
}

function calculateZakat() {
    const weight = parseFloat(document.getElementById('zakatGoldWeight').value) || 0;
    if (weight <= 0) { alert('Masukkan berat emas yang valid!'); return; }
    const NISAB_GRAM = 85; const ZAKAT_RATE = 0.025;
    const resultEl = document.getElementById('zakatResult'); resultEl.style.display = 'block';
    if (weight < NISAB_GRAM) {
        resultEl.innerHTML = `<div class="il-result-main"><div class="il-result-label">Status Zakat</div><div class="il-result-big" style="color: var(--text-secondary); font-size: 24px;">Belum Wajib Zakat</div><div class="il-result-sub">Berat emas belum mencapai Nisab (${NISAB_GRAM} gram)</div></div><div class="corr-insight-box good" style="margin-top:12px;"><span style="font-size:14px;">💡</span><span>Kamu masih kurang <strong>${(NISAB_GRAM - weight).toFixed(2)} gram</strong> lagi untuk mencapai Nisab zakat emas.</span></div>`;
        return;
    }
    const zakatGram = weight * ZAKAT_RATE;
    let zakatIdr = 0;
    const goldIdrEl = document.getElementById('goldIdrPrice');
    if (goldIdrEl && goldIdrEl.textContent !== 'Rp -') {
        const pricePerGram = parseFloat(goldIdrEl.textContent.replace(/[^0-9]/g, ''));
        if (!isNaN(pricePerGram)) { zakatIdr = zakatGram * pricePerGram; }
    }
    const zakatIdrHtml = zakatIdr > 0 ? `<div class="staking-result-item" style="grid-column: 1/-1;"><span class="staking-result-item-label">Estimasi Zakat (Rupiah)</span><span class="staking-result-item-value green">${formatCurrencyAmount(zakatIdr, 'IDR')}</span></div>` : '';
    resultEl.innerHTML = `
        <div class="il-result-main"><div class="il-result-label">Zakat Emas yang Harus Dibayar</div><div class="il-result-big positive">${zakatGram.toFixed(2)} gram</div><div class="il-result-sub">2.5% dari ${weight} gram</div></div>
        <div class="il-result-grid">
            <div class="staking-result-item"><span class="staking-result-item-label">Total Emas</span><span class="staking-result-item-value">${weight} gram</span></div>
            <div class="staking-result-item"><span class="staking-result-item-label">Nisab</span><span class="staking-result-item-value">${NISAB_GRAM} gram</span></div>
            ${zakatIdrHtml}
        </div>
        <div class="corr-insight-box good" style="margin-top:12px;"><span style="font-size:14px;">✅</span><span>Emas kamu sudah mencapai nisab. Zakat wajib dikeluarkan jika sudah dimiliki selama 1 tahun (haul).</span></div>
    `;
}

function renderCommodityGrid() {
    const grid = document.getElementById('commodityGrid'); if (!grid) return;
    if (commodityData.length === 0) { grid.innerHTML = '<div class="empty-state">Belum ada data.</div>'; return; }
    let filtered = commodityData;
    if (commodityFilter !== 'all') { filtered = commodityData.filter(c => c.category === commodityFilter); }
    grid.innerHTML = filtered.map(c => {
        const p = c.priceData; if (!p) return '';
        const trend = p.change >= 0 ? 'up' : 'down'; const sign = p.change >= 0 ? '+' : ''; const color = p.change >= 0 ? 'var(--green)' : 'var(--red)';
        let priceStr = '$' + p.price.toLocaleString('en-US', { maximumFractionDigits: 2 });
        if (p.price < 10) priceStr = '$' + p.price.toFixed(4);
        return `
            <div class="commodity-card ${trend}" onclick="openAssetDetail('${c.symbol}', '${c.name}', ${p.price}, ${p.change}, 'commodity')">
                <div class="commodity-card-header"><span class="commodity-icon">${c.icon}</span><div class="commodity-info"><span class="commodity-symbol">${c.symbol.replace('=F', '')}</span><span class="commodity-name">${c.name}</span></div></div>
                <div class="commodity-price-wrap"><div class="commodity-price">${priceStr}</div><div class="commodity-change" style="color: ${color};">${sign}${p.change.toFixed(2)}%</div></div>
            </div>
        `;
    }).join('');
    if (filtered.length === 0) { grid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">Tidak ada komoditas di kategori ini.</div>'; }
}

async function renderSeasonalityChart() {
    const container = document.getElementById('seasonalityChart'); if (!container) return;
    container.innerHTML = '<div class="crypto-loading"><div class="loading-spinner"></div><p class="loading-text">Menganalisis 10 tahun data...</p></div>';
    try {
        const candles = await fetchChartData('GC=F', 'commodity', '1mo', '10y');
        if (!candles || candles.length < 24) { container.innerHTML = '<div class="empty-state">Data historis tidak cukup.</div>'; return; }
        const monthlyReturns = Array.from({ length: 12 }, () => []);
        for (let i = 1; i < candles.length; i++) {
            const prevClose = candles[i-1].close; const currClose = candles[i].close;
            const month = new Date(candles[i].time * 1000).getMonth();
            if (prevClose > 0) { monthlyReturns[month].push(((currClose / prevClose) - 1) * 100); }
        }
        const avgReturns = monthlyReturns.map(arr => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        container.innerHTML = '';
        if (seasonalityChartInstance) { try { seasonalityChartInstance.remove(); } catch(e) {} seasonalityChartInstance = null; }
        if (typeof LightweightCharts === 'undefined') { container.innerHTML = '❌ Chart library tidak tersedia'; return; }
        seasonalityChartInstance = LightweightCharts.createChart(container, { width: container.clientWidth, height: 200, layout: { background: { color: 'transparent' }, textColor: 'rgba(255, 255, 255, 0.6)', fontFamily: 'Inter, sans-serif' }, grid: { vertLines: { color: 'rgba(255, 255, 255, 0.04)' }, horzLines: { color: 'rgba(255, 255, 255, 0.04)' } }, rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.08)' }, timeScale: { borderColor: 'rgba(255, 255, 255, 0.08)', timeVisible: false }, handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false }, handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true } });
        const barSeries = seasonalityChartInstance.addHistogramSeries({ priceFormat: { type: 'custom', formatter: price => price.toFixed(2) + '%' }, priceLineVisible: false });
        const data = avgReturns.map((val, idx) => ({ time: `2024-${String(idx + 1).padStart(2, '0')}-01`, value: val, color: val >= 0 ? 'rgba(67, 214, 162, 0.7)' : 'rgba(255, 115, 135, 0.7)' }));
        barSeries.setData(data); seasonalityChartInstance.timeScale().fitContent();
        const positiveMonths = monthNames.filter((_, i) => avgReturns[i] > 0).join(', ');
        const negativeMonths = monthNames.filter((_, i) => avgReturns[i] <= 0).join(', ');
        container.insertAdjacentHTML('beforeend', `<div style="margin-top:10px; font-size:11px; color:var(--text-secondary); text-align:center; line-height:1.5;"><span style="color:var(--green); font-weight:700;">🟢 Bullish:</span> ${positiveMonths}<br><span style="color:var(--red); font-weight:700;">🔴 Bearish:</span> ${negativeMonths}</div>`);
    } catch (e) { container.innerHTML = '<div class="empty-state">Gagal menganalisis musiman.</div>'; }
}

async function renderInflationChart() {
    const container = document.getElementById('inflationChart'); if (!container) return;
    container.innerHTML = '<div class="crypto-loading"><div class="loading-spinner"></div><p class="loading-text">Menganalisis data inflasi...</p></div>';
    try {
        const candles = await fetchChartData('GC=F', 'commodity', '1mo', '10y');
        if (!candles || candles.length === 0) { container.innerHTML = '<div class="empty-state">Data historis gagal dimuat.</div>'; return; }
        container.innerHTML = '';
        if (inflationChartInstance) { try { inflationChartInstance.remove(); } catch(e) {} inflationChartInstance = null; }
        if (typeof LightweightCharts === 'undefined') { container.innerHTML = '❌ Chart library tidak tersedia'; return; }
        inflationChartInstance = LightweightCharts.createChart(container, { width: container.clientWidth, height: 250, layout: { background: { color: 'transparent' }, textColor: 'rgba(255, 255, 255, 0.6)', fontFamily: 'Inter, sans-serif' }, grid: { vertLines: { color: 'rgba(255, 255, 255, 0.04)' }, horzLines: { color: 'rgba(255, 255, 255, 0.04)' } }, rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.08)' }, timeScale: { borderColor: 'rgba(255, 255, 255, 0.08)', timeVisible: false }, handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false }, handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true } });
        const goldSeries = inflationChartInstance.addLineSeries({ color: '#E9B949', lineWidth: 2, title: 'Gold Price' });
        const inflationSeries = inflationChartInstance.addLineSeries({ color: '#FF7387', lineWidth: 2, lineStyle: 2, title: 'Inflation Adjusted' });
        const startPrice = candles[0].close; const startTime = candles[0].time; const INFLATION_RATE = 0.03;
        const goldData = []; const inflationData = [];
        candles.forEach(c => {
            const yearsElapsed = (c.time - startTime) / (365.25 * 24 * 60 * 60);
            const adjustedPrice = startPrice * Math.pow(1 + INFLATION_RATE, yearsElapsed);
            goldData.push({ time: c.time, value: c.close }); inflationData.push({ time: c.time, value: adjustedPrice });
        });
        goldSeries.setData(goldData); inflationSeries.setData(inflationData); inflationChartInstance.timeScale().fitContent();
        const totalReturn = ((candles[candles.length - 1].close / startPrice) - 1) * 100;
        const lastInflationAdj = inflationData[inflationData.length - 1].value;
        const inflationReturn = ((lastInflationAdj / startPrice) - 1) * 100;
        const beatInflation = totalReturn > inflationReturn;
        container.insertAdjacentHTML('beforeend', `<div style="margin-top:10px; font-size:11px; color:var(--text-secondary); text-align:center; line-height:1.5; display:flex; justify-content:space-around;"><div><span style="color:#E9B949;">■</span> Gold: <strong>${totalReturn > 0 ? '+' : ''}${totalReturn.toFixed(1)}%</strong></div><div><span style="color:#FF7387;">■</span> Inflasi: <strong>${inflationReturn > 0 ? '+' : ''}${inflationReturn.toFixed(1)}%</strong></div><div>Status: <strong style="color:${beatInflation ? 'var(--green)' : 'var(--red)'}">${beatInflation ? '✅ Menang' : '❌ Kalah'}</strong></div></div>`);
    } catch (e) { container.innerHTML = '<div class="empty-state">Gagal menganalisis inflasi.</div>'; }
}

function calculateWeightConversion() {
    const amount = parseFloat(document.getElementById('weightAmount').value) || 0;
    const fromUnit = document.getElementById('weightFrom').value;
    const toUnit = document.getElementById('weightTo').value;
    if (amount <= 0) { alert('Jumlah harus > 0!'); return; }
    const TO_GRAM = { 'g': 1, 'kg': 1000, 'toz': 31.1034768 };
    const FROM_LABEL = { 'g': 'Gram', 'kg': 'Kilogram', 'toz': 'Troy Ounce' };
    const UNIT_SYMBOL = { 'g': 'g', 'kg': 'kg', 'toz': 'oz t' };
    const inGrams = amount * TO_GRAM[fromUnit]; const result = inGrams / TO_GRAM[toUnit];
    let goldPriceInfo = '';
    const gold = commodityData.find(c => c.symbol === 'GC=F');
    if (gold?.priceData) {
        const goldPerOunce = gold.priceData.price; const goldPerGram = goldPerOunce / 31.1034768; const goldPerKg = goldPerGram * 1000;
        let goldValue = 0;
        if (toUnit === 'toz') goldValue = result * goldPerOunce; else if (toUnit === 'g') goldValue = result * goldPerGram; else if (toUnit === 'kg') goldValue = result * goldPerKg;
        if (goldValue > 0) { goldPriceInfo = `<div class="staking-result-item" style="margin-top:8px; grid-column: 1/-1;"><span class="staking-result-item-label">💰 Estimasi Nilai Emas</span><span class="staking-result-item-value gold">$${goldValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`; }
    }
    const resultEl = document.getElementById('weightResult'); resultEl.style.display = 'block';
    resultEl.innerHTML = `<div class="il-result-main"><div class="il-result-label">Hasil Konversi</div><div class="il-result-big positive">${result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${UNIT_SYMBOL[toUnit]}</div><div class="il-result-sub">${amount} ${FROM_LABEL[fromUnit]} = ${result.toFixed(6)} ${FROM_LABEL[toUnit]}</div></div><div class="il-result-grid"><div class="staking-result-item"><span class="staking-result-item-label">Gram</span><span class="staking-result-item-value">${inGrams.toFixed(4)} g</span></div><div class="staking-result-item"><span class="staking-result-item-label">Troy Ounce</span><span class="staking-result-item-value">${(inGrams / 31.1034768).toFixed(4)} oz t</span></div><div class="staking-result-item"><span class="staking-result-item-label">Kilogram</span><span class="staking-result-item-value">${(inGrams / 1000).toFixed(6)} kg</span></div><div class="staking-result-item"><span class="staking-result-item-label">Miligram</span><span class="staking-result-item-value">${(inGrams * 1000).toFixed(2)} mg</span></div>${goldPriceInfo}</div>`;
}

function populateCommodityCorrelationDropdowns() {
    const selA = document.getElementById('commCorrA'); const selB = document.getElementById('commCorrB');
    if (!selA || !selB) return; if (selA.options.length > 0) return;
    const source = commodityData.length > 0 ? commodityData : COMMODITY_LIST;
    const options = source.map(c => `<option value="${c.symbol}">${c.icon} ${c.symbol.replace('=F', '')} — ${c.name}</option>`).join('');
    selA.innerHTML = options; selB.innerHTML = options;
    if (source.length >= 2) { selA.value = source[0].symbol; selB.value = source[1].symbol; }
}
function openCommodityCorrelation() {
    document.getElementById('commodityCorrelationModal').classList.add('active');
    document.getElementById('commCorrResult').style.display = 'none'; document.getElementById('commCorrChartSection').style.display = 'none';
    populateCommodityCorrelationDropdowns();
}
function closeCommodityCorrelation() {
    document.getElementById('commodityCorrelationModal').classList.remove('active');
    if (commCorrChartInstance) { try { commCorrChartInstance.remove(); } catch(e) {} commCorrChartInstance = null; }
}
async function runCommodityCorrelation() {
    const selA = document.getElementById('commCorrA'); const selB = document.getElementById('commCorrB');
    const periodEl = document.getElementById('commCorrPeriod'); const btn = document.getElementById('commCorrCalcBtn'); const resultEl = document.getElementById('commCorrResult');
    if (!selA || !selB || !periodEl || !btn || !resultEl) return;
    const symbolA = selA.value; const symbolB = selB.value;
    if (symbolA === symbolB) { alert('Pilih 2 komoditas yang berbeda!'); return; }
    const days = parseInt(periodEl.value) || 90; let range = '3mo';
    if (days === 30) range = '1mo'; else if (days === 90) range = '3mo'; else if (days === 365) range = '1y';
    const source = commodityData.length > 0 ? commodityData : COMMODITY_LIST;
    const commodityA = source.find(c => c.symbol === symbolA); const commodityB = source.find(c => c.symbol === symbolB);
    const nameA = commodityA ? commodityA.name : symbolA; const nameB = commodityB ? commodityB.name : symbolB;
    const originalText = btn.innerHTML; btn.innerHTML = '⏳ Menghitung...'; btn.disabled = true;
    resultEl.style.display = 'block'; resultEl.innerHTML = '<div class="loading-spinner"></div><p class="loading-text">Mengambil data historis...</p>';
    try {
        const [chartA, chartB] = await Promise.all([ fetchChartData(symbolA, 'commodity', '1d', range), fetchChartData(symbolB, 'commodity', '1d', range) ]);
        if (!chartA || chartA.length < 5 || !chartB || chartB.length < 5) { resultEl.innerHTML = '<div class="analysis-error"><p>❌ Data historis tidak cukup.</p></div>'; return; }
        const { returnsA, returnsB, alignedA, alignedB, times } = alignReturnsSeries(chartA, chartB);
        if (returnsA.length < 3) { resultEl.innerHTML = '<div class="analysis-error"><p>❌ Data tidak cukup untuk hitung korelasi.</p></div>'; return; }
        const coef = calculatePearsonCorrelation(returnsA, returnsB); const verdict = getCorrelationVerdict(coef);
        resultEl.innerHTML = `<div class="corr-coef-big ${verdict.cls}">${coef >= 0 ? '+' : ''}${coef.toFixed(3)}</div><div class="corr-coef-label">Pearson Correlation Coefficient</div><div class="corr-verdict-badge ${verdict.cls}">${verdict.icon} ${verdict.label}</div><div class="corr-interpretation"><strong>${nameA}</strong> vs <strong>${nameB}</strong> — ${days} hari terakhir (${returnsA.length} data point)</div><div class="corr-insight-box ${verdict.insightCls}"><span style="font-size:14px;">${verdict.insightCls === 'good' ? '✅' : verdict.insightCls === 'warn' ? '⚠️' : '🚨'}</span><span>${verdict.insight}</span></div>`;
        document.getElementById('commCorrChartSection').style.display = 'block';
        setTimeout(() => { renderCommodityCorrelationChart(alignedA, alignedB, times, nameA, nameB); }, 100);
    } catch (err) { resultEl.innerHTML = `<div class="analysis-error"><p>❌ Gagal menghitung korelasi</p><p style="font-size:11px;">${err.message}</p></div>`; }
    finally { btn.innerHTML = originalText; btn.disabled = false; }
}
function renderCommodityCorrelationChart(alignedA, alignedB, times, nameA, nameB) {
    const container = document.getElementById('commCorrChart'); if (!container) return;
    container.innerHTML = '';
    if (commCorrChartInstance) { try { commCorrChartInstance.remove(); } catch(e) {} commCorrChartInstance = null; }
    if (typeof LightweightCharts === 'undefined') return; if (!alignedA || alignedA.length < 2) return;
    commCorrChartInstance = LightweightCharts.createChart(container, { width: container.clientWidth, height: 260, layout: { background: { color: 'transparent' }, textColor: 'rgba(255, 255, 255, 0.6)', fontFamily: 'Inter, sans-serif' }, grid: { vertLines: { color: 'rgba(255, 255, 255, 0.04)' }, horzLines: { color: 'rgba(255, 255, 255, 0.04)' } }, rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.08)' }, timeScale: { borderColor: 'rgba(255, 255, 255, 0.08)', timeVisible: false } });
    const baseA = alignedA[0]; const baseB = alignedB[0];
    const seriesA = commCorrChartInstance.addLineSeries({ color: '#E9B949', lineWidth: 2, title: nameA }); const seriesB = commCorrChartInstance.addLineSeries({ color: '#B9A0FF', lineWidth: 2, title: nameB });
    const dataA = alignedA.map((v, i) => ({ time: times[i], value: ((v / baseA) - 1) * 100 })).filter(d => d.time != null && !isNaN(d.value));
    const dataB = alignedB.map((v, i) => ({ time: times[i], value: ((v / baseB) - 1) * 100 })).filter(d => d.time != null && !isNaN(d.value));
    seriesA.setData(dataA); seriesB.setData(dataB); commCorrChartInstance.timeScale().fitContent();
}

function openDxyCorrelation() {
    document.getElementById('dxyCorrelationModal').classList.add('active');
    document.getElementById('dxyResult').style.display = 'none'; document.getElementById('dxyChartSection').style.display = 'none';
}
function closeDxyCorrelation() {
    document.getElementById('dxyCorrelationModal').classList.remove('active');
    if (dxyChartInstance) { try { dxyChartInstance.remove(); } catch(e) {} dxyChartInstance = null; }
}
async function runDxyCorrelation() {
    const periodEl = document.getElementById('dxyPeriod'); const btn = document.getElementById('dxyCalcBtn'); const resultEl = document.getElementById('dxyResult');
    if (!periodEl || !btn || !resultEl) return;
    const days = parseInt(periodEl.value) || 90; let range = '3mo';
    if (days === 30) range = '1mo'; else if (days === 90) range = '3mo'; else if (days === 365) range = '1y';
    const originalText = btn.innerHTML; btn.innerHTML = '⏳ Menghitung...'; btn.disabled = true;
    resultEl.style.display = 'block'; resultEl.innerHTML = '<div class="loading-spinner"></div><p class="loading-text">Mengambil data DXY & Gold...</p>';
    try {
        const [chartDxy, chartGold] = await Promise.all([ fetchChartData('DX-Y.NYB', 'stock', '1d', range), fetchChartData('GC=F', 'commodity', '1d', range) ]);
        if (!chartDxy || chartDxy.length < 5 || !chartGold || chartGold.length < 5) { resultEl.innerHTML = '<div class="analysis-error"><p>❌ Data historis tidak cukup.</p></div>'; return; }
        const { returnsA, returnsB, alignedA, alignedB, times } = alignReturnsSeries(chartDxy, chartGold);
        if (returnsA.length < 3) { resultEl.innerHTML = '<div class="analysis-error"><p>❌ Data tidak cukup untuk hitung korelasi.</p></div>'; return; }
        const coef = calculatePearsonCorrelation(returnsA, returnsB); const verdict = getCorrelationVerdict(coef);
        resultEl.innerHTML = `<div class="corr-coef-big ${verdict.cls}">${coef >= 0 ? '+' : ''}${coef.toFixed(3)}</div><div class="corr-coef-label">DXY vs Gold Correlation</div><div class="corr-verdict-badge ${verdict.cls}">${verdict.icon} ${verdict.label}</div><div class="corr-interpretation"><strong>DXY (Dolar AS)</strong> vs <strong>Gold</strong> — ${days} hari terakhir (${returnsA.length} data point)</div><div class="corr-insight-box ${verdict.insightCls}"><span style="font-size:14px;">${verdict.insightCls === 'good' ? '✅' : verdict.insightCls === 'warn' ? '⚠️' : '🚨'}</span><span>${verdict.insight}</span></div>`;
        document.getElementById('dxyChartSection').style.display = 'block';
        setTimeout(() => { renderDxyChart(alignedA, alignedB, times); }, 100);
    } catch (err) { resultEl.innerHTML = `<div class="analysis-error"><p>❌ Gagal menghitung korelasi</p><p style="font-size:11px;">${err.message}</p></div>`; }
    finally { btn.innerHTML = originalText; btn.disabled = false; }
}
function renderDxyChart(alignedA, alignedB, times) {
    const container = document.getElementById('dxyChart'); if (!container) return;
    container.innerHTML = '';
    if (dxyChartInstance) { try { dxyChartInstance.remove(); } catch(e) {} dxyChartInstance = null; }
    if (typeof LightweightCharts === 'undefined') return; if (!alignedA || alignedA.length < 2) return;
    dxyChartInstance = LightweightCharts.createChart(container, { width: container.clientWidth, height: 260, layout: { background: { color: 'transparent' }, textColor: 'rgba(255, 255, 255, 0.6)', fontFamily: 'Inter, sans-serif' }, grid: { vertLines: { color: 'rgba(255, 255, 255, 0.04)' }, horzLines: { color: 'rgba(255, 255, 255, 0.04)' } }, rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.08)' }, timeScale: { borderColor: 'rgba(255, 255, 255, 0.08)', timeVisible: false } });
    const baseA = alignedA[0]; const baseB = alignedB[0];
    const seriesA = dxyChartInstance.addLineSeries({ color: '#43D6A2', lineWidth: 2, title: 'DXY' }); const seriesB = dxyChartInstance.addLineSeries({ color: '#E9B949', lineWidth: 2, title: 'Gold' });
    const dataA = alignedA.map((v, i) => ({ time: times[i], value: ((v / baseA) - 1) * 100 })).filter(d => d.time != null && !isNaN(d.value));
    const dataB = alignedB.map((v, i) => ({ time: times[i], value: ((v / baseB) - 1) * 100 })).filter(d => d.time != null && !isNaN(d.value));
    seriesA.setData(dataA); seriesB.setData(dataB); dxyChartInstance.timeScale().fitContent();
}

// ============ SMART ALERT MODAL ============
function openAlertModal(symbol, name, price, type) {
    currentAlertSymbol = symbol; currentAlertName = name; currentAlertAssetType = type; currentAlertPrice = price;
    currentAlertType = 'price'; currentAlertDirection = 'above';
    document.getElementById('alertSymbol').textContent = symbol; document.getElementById('alertName').textContent = name;
    document.getElementById('alertCurrentPrice').textContent = 'Harga Sekarang: $' + price.toLocaleString('en-US', { maximumFractionDigits: 2 });
    document.getElementById('alertTargetPrice').value = ''; document.getElementById('alertNote').value = '';
    document.getElementById('alertRsiValue').value = ''; document.getElementById('alertEmaPeriod').value = '20'; document.getElementById('alertVolumeMultiplier').value = '2';
    document.querySelectorAll('.alert-type-btn').forEach(b => b.classList.remove('active')); document.querySelector('.alert-type-btn[data-type="price"]').classList.add('active');
    document.querySelectorAll('.direction-btn').forEach(b => b.classList.remove('active')); document.querySelector('.direction-btn[data-dir="above"]').classList.add('active');
    updateAlertFormFields(); updateAlertPreview(); document.getElementById('alertModal').classList.add('active');
    setTimeout(() => document.getElementById('alertTargetPrice').focus(), 300);
}
function closeAlertModal() { document.getElementById('alertModal').classList.remove('active'); }
function selectAlertType(type) { currentAlertType = type; document.querySelectorAll('.alert-type-btn').forEach(b => b.classList.remove('active')); document.querySelector(`.alert-type-btn[data-type="${type}"]`).classList.add('active'); updateAlertFormFields(); updateAlertPreview(); }
function selectDirection(dir) { currentAlertDirection = dir; document.querySelectorAll('.direction-btn').forEach(b => b.classList.remove('active')); document.querySelector(`.direction-btn[data-dir="${dir}"]`).classList.add('active'); updateAlertPreview(); }
function updateAlertFormFields() {
    const priceField = document.getElementById('alertPriceField'); const rsiField = document.getElementById('alertRsiField');
    const emaField = document.getElementById('alertEmaField'); const volumeField = document.getElementById('alertVolumeField'); const directionGroup = document.getElementById('alertDirectionGroup');
    priceField.style.display = 'none'; rsiField.style.display = 'none'; emaField.style.display = 'none'; volumeField.style.display = 'none'; directionGroup.style.display = 'grid';
    if (currentAlertType === 'price') priceField.style.display = 'block';
    else if (currentAlertType === 'rsi') { rsiField.style.display = 'block'; directionGroup.style.display = 'none'; }
    else if (currentAlertType === 'ema') { emaField.style.display = 'block'; directionGroup.style.display = 'none'; }
    else if (currentAlertType === 'volume') { volumeField.style.display = 'block'; directionGroup.style.display = 'none'; }
    else if (currentAlertType === 'multi') { priceField.style.display = 'block'; rsiField.style.display = 'block'; }
}
function updateAlertPreview() {
    const preview = document.getElementById('alertPreview'); const priceInput = document.getElementById('alertTargetPrice').value; const rsiInput = document.getElementById('alertRsiValue').value;
    let previewText = '';
    if (currentAlertType === 'price') { if (!priceInput || isNaN(parseFloat(priceInput))) previewText = '🔔 Alert bakal aktif kalau harga nyentuh target'; else { const target = parseFloat(priceInput); const dirText = currentAlertDirection === 'above' ? 'naik ke atas' : 'turun ke bawah'; previewText = `🔔 Notif kalau <strong>${currentAlertSymbol}</strong> ${dirText} <strong>$${target.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong>`; } }
    else if (currentAlertType === 'rsi') { if (!rsiInput || isNaN(parseFloat(rsiInput))) previewText = '🔔 Alert bakal aktif kalau RSI nyentuh target'; else { const rsi = parseFloat(rsiInput); const zone = rsi <= 30 ? 'oversold' : rsi >= 70 ? 'overbought' : 'netral'; previewText = `🔔 Notif kalau <strong>${currentAlertSymbol}</strong> RSI ${rsi} (${zone})`; } }
    else if (currentAlertType === 'ema') { const period = document.getElementById('alertEmaPeriod').value || '20'; previewText = `🔔 Notif kalau <strong>${currentAlertSymbol}</strong> menyentuh EMA ${period}`; }
    else if (currentAlertType === 'volume') { const multiplier = document.getElementById('alertVolumeMultiplier').value || '2'; previewText = `🔔 Notif kalau <strong>${currentAlertSymbol}</strong> volume ${multiplier}x dari rata-rata`; }
    else if (currentAlertType === 'multi') { previewText = `🔔 Alert multi-kondisi untuk <strong>${currentAlertSymbol}</strong>`; }
    preview.innerHTML = `<span class="alert-preview-icon">🔔</span><span class="alert-preview-text">${previewText}</span>`;
}
function saveAlert() {
    let alertData = { id: 'alert-' + Date.now(), symbol: currentAlertSymbol, name: currentAlertName, type: currentAlertAssetType, alertType: currentAlertType, createdAt: Date.now(), triggered: false, note: document.getElementById('alertNote').value.trim() };
    if (currentAlertType === 'price') { const targetInput = document.getElementById('alertTargetPrice').value; if (!targetInput || isNaN(parseFloat(targetInput))) { alert('Isi target harga dulu!'); return; } const target = parseFloat(targetInput); if (currentAlertDirection === 'above' && target <= currentAlertPrice) { alert('⚠️ Alert "Di Atas" harus LEBIH TINGGI!'); return; } if (currentAlertDirection === 'below' && target >= currentAlertPrice) { alert('⚠️ Alert "Di Bawah" harus LEBIH RENDAH!'); return; } alertData.targetPrice = target; alertData.direction = currentAlertDirection; }
    else if (currentAlertType === 'rsi') { const rsiInput = document.getElementById('alertRsiValue').value; if (!rsiInput || isNaN(parseFloat(rsiInput))) { alert('Isi target RSI dulu!'); return; } alertData.rsiValue = parseFloat(rsiInput); }
    else if (currentAlertType === 'ema') { alertData.emaPeriod = parseInt(document.getElementById('alertEmaPeriod').value || '20'); }
    else if (currentAlertType === 'volume') { alertData.volumeMultiplier = parseFloat(document.getElementById('alertVolumeMultiplier').value || '2'); }
    else if (currentAlertType === 'multi') { const targetInput = document.getElementById('alertTargetPrice').value; const rsiInput = document.getElementById('alertRsiValue').value; if (!targetInput || !rsiInput) { alert('Isi target harga DAN RSI!'); return; } alertData.targetPrice = parseFloat(targetInput); alertData.rsiValue = parseFloat(rsiInput); alertData.direction = currentAlertDirection; }
    const existing = alerts.find(a => a.symbol === alertData.symbol && a.alertType === alertData.alertType && !a.triggered);
    if (existing) { if (!confirm(`Udah ada alert ${alertData.alertType} buat ${alertData.symbol}. Ganti?`)) return; alerts = alerts.filter(a => a.id !== existing.id); }
    alerts.push(alertData); saveAlerts(); closeAlertModal(); renderPriceAlerts(); renderWatchlist(); showAlertToast(alertData, null, true);
}
function deleteAlert(id, event) { if (event) event.stopPropagation(); if (!confirm('Hapus alert ini?')) return; alerts = alerts.filter(a => a.id !== id); saveAlerts(); renderPriceAlerts(); renderWatchlist(); }
async function checkAlerts() {
    if (alerts.length === 0) return; const activeAlerts = alerts.filter(a => !a.triggered); if (activeAlerts.length === 0) return; let hasNewTrigger = false;
    for (const alert of activeAlerts) {
        try {
            const priceData = await fetchPrice(alert.symbol, alert.type); if (!priceData) continue;
            let triggered = false; let triggerReason = '';
            if (alert.alertType === 'price' || !alert.alertType) { const direction = alert.direction || 'above'; if (direction === 'above' && priceData.price >= alert.targetPrice) { triggered = true; triggerReason = `Harga naik ke $${priceData.price.toFixed(2)}`; } else if (direction === 'below' && priceData.price <= alert.targetPrice) { triggered = true; triggerReason = `Harga turun ke $${priceData.price.toFixed(2)}`; } }
            else if (alert.alertType === 'rsi') { const candles = await fetchChartData(alert.symbol, alert.type, '1d', '1mo'); if (candles.length >= 15) { const closes = candles.map(c => c.close); const rsi = calcRSI(closes, 14); const targetRsi = alert.rsiValue; if ((targetRsi <= 30 && rsi <= targetRsi) || (targetRsi >= 70 && rsi >= targetRsi)) { triggered = true; triggerReason = `RSI ${rsi.toFixed(1)}`; } } }
            else if (alert.alertType === 'ema') { const candles = await fetchChartData(alert.symbol, alert.type, '1d', '3mo'); if (candles.length >= alert.emaPeriod) { const closes = candles.map(c => c.close); const ema = calcEMA(closes, alert.emaPeriod); const currentPrice = closes[closes.length - 1]; if (Math.abs(currentPrice - ema) / ema < 0.01) { triggered = true; triggerReason = `Harga menyentuh EMA ${alert.emaPeriod}`; } } }
            else if (alert.alertType === 'volume') { const candles = await fetchChartData(alert.symbol, alert.type, '1d', '1mo'); if (candles.length >= 20) { const recentVolume = candles[candles.length - 1].volume || 0; const avgVolume = candles.slice(-20, -1).reduce((sum, c) => sum + (c.volume || 0), 0) / 19; if (recentVolume >= avgVolume * alert.volumeMultiplier) { triggered = true; triggerReason = `Volume spike ${alert.volumeMultiplier}x`; } } }
            else if (alert.alertType === 'multi') { const candles = await fetchChartData(alert.symbol, alert.type, '1d', '1mo'); if (candles.length >= 15) { const closes = candles.map(c => c.close); const rsi = calcRSI(closes, 14); const currentPrice = priceData.price; const priceCondition = alert.direction === 'above' ? currentPrice >= alert.targetPrice : currentPrice <= alert.targetPrice; const rsiCondition = rsi <= alert.rsiValue; if (priceCondition && rsiCondition) { triggered = true; triggerReason = `Harga $${currentPrice.toFixed(2)} + RSI ${rsi.toFixed(1)}`; } } }
            if (triggered) { alert.triggered = true; alert.triggeredAt = Date.now(); alert.triggeredPrice = priceData.price; alert.triggerReason = triggerReason; hasNewTrigger = true; showAlertToast(alert, priceData.price, false, triggerReason); }
        } catch (error) {}
    }
    if (hasNewTrigger) { saveAlerts(); renderPriceAlerts(); renderWatchlist(); }
}
function showAlertToast(alert, currentPrice, isNewSet = false, reason = '') {
    const toast = document.getElementById('alertToast'); const title = document.getElementById('alertToastTitle'); const message = document.getElementById('alertToastMessage');
    if (isNewSet) { title.textContent = '🔔 Alert Aktif!'; message.textContent = `${alert.symbol} - Alert berhasil dibuat`; }
    else { title.textContent = '🔔 SMART ALERT TRIGGERED!'; message.innerHTML = `<strong>${alert.symbol}</strong>: ${reason}<br/>Harga: $${currentPrice?.toFixed(2) || 'N/A'}`; }
    toast.classList.add('active'); setTimeout(() => toast.classList.remove('active'), 10000);
}
function closeAlertToast() { document.getElementById('alertToast').classList.remove('active'); }
function renderPriceAlerts() {
    const section = document.getElementById('priceAlertsSection'); const list = document.getElementById('priceAlertsList'); const count = document.getElementById('alertsCount'); if (!section || !list || !count) return;
    const activeAlerts = alerts.filter(a => !a.triggered); if (activeAlerts.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block'; count.textContent = activeAlerts.length;
    const typeIcons = { price: '💰', rsi: '📊', ema: '📈', volume: '📶', multi: '🧠' }; const typeLabels = { price: 'Price', rsi: 'RSI', ema: 'EMA', volume: 'Volume', multi: 'Multi' };
    list.innerHTML = activeAlerts.map(a => {
        const icon = typeIcons[a.alertType] || '🔔'; const label = typeLabels[a.alertType] || 'Price'; let detail = '';
        if (a.alertType === 'price' || !a.alertType) { const dir = a.direction === 'above' ? '↑' : '↓'; detail = `${dir} $${a.targetPrice?.toLocaleString('en-US', { maximumFractionDigits: 2 })}`; }
        else if (a.alertType === 'rsi') detail = `RSI ${a.rsiValue}`; else if (a.alertType === 'ema') detail = `EMA ${a.emaPeriod}`; else if (a.alertType === 'volume') detail = `${a.volumeMultiplier}x Volume`; else if (a.alertType === 'multi') detail = `Price + RSI ${a.rsiValue}`;
        const dirClass = (a.alertType === 'price' || !a.alertType) ? (a.direction || 'above') : '';
        return `<div class="price-alert-item ${dirClass}" onclick="openAssetDetail('${a.symbol}', '${a.name.replace(/'/g, "\\'")}', 0, 0, '${a.type}')"><div class="price-alert-icon">${icon}</div><div class="price-alert-info"><div class="price-alert-symbol">${a.symbol} <span class="price-alert-dir">${label}</span></div><div class="price-alert-target">${detail}${a.note ? ' • ' + a.note : ''}</div></div><button class="price-alert-delete" onclick="deleteAlert('${a.id}', event)">×</button></div>`;
    }).join('');
}

// ============ CHART LOGIC & INDICATORS ============
function calcEMA(closes, period) { if (closes.length < period) return closes[closes.length - 1] || 0; const k = 2 / (period + 1); let ema = closes[0]; for (let i = 1; i < closes.length; i++) ema = closes[i] * k + ema * (1 - k); return ema; }
function calcRSI(closes, period = 14) { if (closes.length < period + 1) return 50; let gains = 0, losses = 0; for (let i = 1; i <= period; i++) { const diff = closes[i] - closes[i - 1]; if (diff >= 0) gains += diff; else losses -= diff; } let avgGain = gains / period, avgLoss = losses / period; for (let i = period + 1; i < closes.length; i++) { const diff = closes[i] - closes[i - 1]; avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period; avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period; } if (avgLoss === 0) return 100; const rs = avgGain / avgLoss; return 100 - 100 / (1 + rs); }
function calcSMA(closes, period) { const result = []; for (let i = 0; i < closes.length; i++) { if (i < period - 1) { result.push(null); continue; } let sum = 0; for (let j = i - period + 1; j <= i; j++) sum += closes[j]; result.push(sum / period); } return result; }
function calcBollinger(closes, period = 20, mult = 2) { const sma = calcSMA(closes, period); const upper = [], lower = []; for (let i = 0; i < closes.length; i++) { if (sma[i] == null) { upper.push(null); lower.push(null); continue; } let sumSq = 0; for (let j = i - period + 1; j <= i; j++) sumSq += Math.pow(closes[j] - sma[i], 2); const stdDev = Math.sqrt(sumSq / period); upper.push(sma[i] + mult * stdDev); lower.push(sma[i] - mult * stdDev); } return { middle: sma, upper, lower }; }
function calcMACD(closes, fast = 12, slow = 26, signal = 9) { const emaFast = [], emaSlow = []; const kFast = 2 / (fast + 1), kSlow = 2 / (slow + 1); emaFast[0] = closes[0]; emaSlow[0] = closes[0]; for (let i = 1; i < closes.length; i++) { emaFast[i] = closes[i] * kFast + emaFast[i-1] * (1 - kFast); emaSlow[i] = closes[i] * kSlow + emaSlow[i-1] * (1 - kSlow); } const macdLine = emaFast.map((v, i) => v - emaSlow[i]); const signalLine = [macdLine[0]]; const kSig = 2 / (signal + 1); for (let i = 1; i < macdLine.length; i++) signalLine[i] = macdLine[i] * kSig + signalLine[i-1] * (1 - kSig); const histogram = macdLine.map((v, i) => v - signalLine[i]); return { macdLine, signalLine, histogram }; }
function calcSentiment(candles) { const recent = candles.slice(-20); let buyVol = 0, sellVol = 0; recent.forEach(c => { if (c.close >= c.open) buyVol += c.volume || 0; else sellVol += c.volume || 0; }); const total = buyVol + sellVol; if (total === 0) return { buyPct: 50, sellPct: 50 }; const buyPct = (buyVol / total) * 100; return { buyPct, sellPct: 100 - buyPct }; }
async function updateIndicators(symbol, type) {
    const candles = await fetchChartData(symbol, type, '1d', '3mo'); if (candles.length < 20) return;
    const closes = candles.map(c => c.close).filter(c => c); const currentPrice = closes[closes.length - 1];
    const ema20 = calcEMA(closes, 20), ema5 = calcEMA(closes, 5), rsi = calcRSI(closes, 14);
    const htf = currentPrice > ema20 ? 'BULLISH' : 'BEARISH'; const ltf = ema5 > ema20 ? 'BULLISH' : 'BEARISH';
    const htfEl = document.getElementById('htfValue'); const ltfEl = document.getElementById('ltfValue'); const emaEl = document.getElementById('ema20Value'); const rsiEl = document.getElementById('rsiValue');
    htfEl.textContent = htf; htfEl.className = 'ind-value ' + (htf === 'BULLISH' ? 'bullish' : 'bearish'); ltfEl.textContent = ltf; ltfEl.className = 'ind-value ' + (ltf === 'BULLISH' ? 'bullish' : 'bearish');
    emaEl.textContent = ema20.toFixed(2); emaEl.className = 'ind-value neutral';
    rsiEl.textContent = rsi.toFixed(0); if (rsi >= 70) rsiEl.className = 'ind-value bearish'; else if (rsi <= 30) rsiEl.className = 'ind-value bullish'; else rsiEl.className = 'ind-value neutral';
    const bid = currentPrice - (currentPrice * 0.0001); const ask = currentPrice + (currentPrice * 0.0001);
    document.getElementById('bidValue').textContent = '$' + bid.toFixed(2); document.getElementById('askValue').textContent = '$' + ask.toFixed(2);
    const sentiment = calcSentiment(candles);
    document.getElementById('buyerPct').textContent = sentiment.buyPct.toFixed(0) + '% Buy'; document.getElementById('sellerPct').textContent = sentiment.sellPct.toFixed(0) + '% Sell';
    document.getElementById('buyerBar').style.width = sentiment.buyPct + '%'; document.getElementById('sellerBar').style.width = sentiment.sellPct + '%';
}
let activeIndicators = { ma50: false, ma200: false, bollinger: false, macd: false };
let ma50Series = null, ma200Series = null, bollingerUpper = null, bollingerLower = null, bollingerMiddle = null, macdChart = null, macdLineSeries = null, macdSignalSeries = null, macdHistSeries = null;
function toggleIndicator(ind) { activeIndicators[ind] = !activeIndicators[ind]; const btn = document.querySelector(`.ind-toggle-btn[data-ind="${ind}"]`); if (btn) btn.classList.toggle('active', activeIndicators[ind]); if (currentSymbol && currentType && candleSeries) refreshChartIndicators(); }
document.querySelectorAll('.ind-toggle-btn').forEach(btn => { btn.addEventListener('click', () => toggleIndicator(btn.dataset.ind)); });
async function refreshChartIndicators() {
    if (!candleSeries || !currentChart || !currentSymbol) return;
    const candles = await fetchChartData(currentSymbol, currentType, '1d', '2y'); if (!candles || candles.length < 50) return;
    const validCandles = candles.filter(c => c.time != null && !isNaN(c.close)); const closes = validCandles.map(c => c.close); const times = validCandles.map(c => c.time);
    if (ma50Series && currentChart) { try { currentChart.removeSeries(ma50Series); } catch(e) {} ma50Series = null; }
    if (ma200Series && currentChart) { try { currentChart.removeSeries(ma200Series); } catch(e) {} ma200Series = null; }
    if (bollingerUpper && currentChart) { try { currentChart.removeSeries(bollingerUpper); } catch(e) {} bollingerUpper = null; }
    if (bollingerLower && currentChart) { try { currentChart.removeSeries(bollingerLower); } catch(e) {} bollingerLower = null; }
    if (bollingerMiddle && currentChart) { try { currentChart.removeSeries(bollingerMiddle); } catch(e) {} bollingerMiddle = null; }
    if (activeIndicators.ma50 && closes.length >= 50) { const ma50 = calcSMA(closes, 50); ma50Series = currentChart.addLineSeries({ color: '#E9B949', lineWidth: 1, title: 'MA50' }); ma50Series.setData(ma50.map((v, i) => v != null ? { time: times[i], value: v } : null).filter(Boolean)); }
    if (activeIndicators.ma200 && closes.length >= 200) { const ma200 = calcSMA(closes, 200); ma200Series = currentChart.addLineSeries({ color: '#FF7387', lineWidth: 1, title: 'MA200' }); ma200Series.setData(ma200.map((v, i) => v != null ? { time: times[i], value: v } : null).filter(Boolean)); }
    if (activeIndicators.bollinger && closes.length >= 20) { const bb = calcBollinger(closes, 20, 2); bollingerUpper = currentChart.addLineSeries({ color: 'rgba(80, 228, 242, 0.6)', lineWidth: 1 }); bollingerLower = currentChart.addLineSeries({ color: 'rgba(80, 228, 242, 0.6)', lineWidth: 1 }); bollingerMiddle = currentChart.addLineSeries({ color: 'rgba(185, 160, 255, 0.5)', lineWidth: 1 }); bollingerUpper.setData(bb.upper.map((v, i) => v != null ? { time: times[i], value: v } : null).filter(Boolean)); bollingerLower.setData(bb.lower.map((v, i) => v != null ? { time: times[i], value: v } : null).filter(Boolean)); bollingerMiddle.setData(bb.middle.map((v, i) => v != null ? { time: times[i], value: v } : null).filter(Boolean)); }
    renderMACD(closes, times);
}
function renderMACD(closes, times) {
    const container = document.getElementById('macdContainer'); if (!container) return;
    if (!activeIndicators.macd || closes.length < 26) { container.style.display = 'none'; if (macdChart) { try { macdChart.remove(); } catch(e) {} macdChart = null; } return; }
    container.style.display = 'block'; container.innerHTML = '';
    if (macdChart) { try { macdChart.remove(); } catch(e) {} macdChart = null; }
    macdChart = LightweightCharts.createChart(container, { width: container.clientWidth, height: 140, layout: { background: { color: 'transparent' }, textColor: 'rgba(255, 255, 255, 0.6)', fontFamily: 'Inter, sans-serif' }, grid: { vertLines: { color: 'rgba(255, 255, 255, 0.04)' }, horzLines: { color: 'rgba(255, 255, 255, 0.04)' } }, rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.08)' }, timeScale: { borderColor: 'rgba(255, 255, 255, 0.08)', timeVisible: false }, handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false }, handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true } });
    const macd = calcMACD(closes, 12, 26, 9);
    macdLineSeries = macdChart.addLineSeries({ color: '#50E4F2', lineWidth: 2 }); macdSignalSeries = macdChart.addLineSeries({ color: '#E9B949', lineWidth: 1 }); macdHistSeries = macdChart.addHistogramSeries({});
    const startIdx = 26;
    macdLineSeries.setData(macd.macdLine.slice(startIdx).map((v, i) => ({ time: times[startIdx + i], value: v })).filter(d => d.time != null));
    macdSignalSeries.setData(macd.signalLine.slice(startIdx).map((v, i) => ({ time: times[startIdx + i], value: v })).filter(d => d.time != null));
    macdHistSeries.setData(macd.histogram.slice(startIdx).map((v, i) => ({ time: times[startIdx + i], value: v, color: v >= 0 ? 'rgba(67, 214, 162, 0.5)' : 'rgba(255, 115, 135, 0.5)' })).filter(d => d.time != null));
    macdChart.timeScale().fitContent();
}
function clearIndicatorSeries() {
    if (ma50Series && currentChart) { try { currentChart.removeSeries(ma50Series); } catch(e) {} ma50Series = null; }
    if (ma200Series && currentChart) { try { currentChart.removeSeries(ma200Series); } catch(e) {} ma200Series = null; }
    if (bollingerUpper && currentChart) { try { currentChart.removeSeries(bollingerUpper); } catch(e) {} bollingerUpper = null; }
    if (bollingerLower && currentChart) { try { currentChart.removeSeries(bollingerLower); } catch(e) {} bollingerLower = null; }
    if (bollingerMiddle && currentChart) { try { currentChart.removeSeries(bollingerMiddle); } catch(e) {} bollingerMiddle = null; }
    if (macdChart) { try { macdChart.remove(); } catch(e) {} macdChart = null; }
    const macdContainer = document.getElementById('macdContainer'); if (macdContainer) macdContainer.style.display = 'none';
}
let currentSymbol = null, currentType = null, currentName = null, currentPrice = 0, currentChange = 0;
async function openAssetDetail(symbol, name, price, change, type) {
    currentSymbol = symbol; currentType = type; currentName = name; currentPrice = price; currentChange = change;
    document.getElementById('chartModal').classList.add('active'); document.getElementById('chartTitle').textContent = symbol + ' — ' + name;
    updateChartPrice(); document.getElementById('analysisBody').innerHTML = `<div class="loading-spinner"></div><p class="loading-text">Mengambil data fundamental...</p>`;
    ['htfValue','ltfValue','ema20Value','rsiValue','bidValue','askValue','buyerPct','sellerPct'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '-'; });
    const stockScorecardBtn = document.getElementById('openScorecardBtn'); const cryptoScorecardBtn = document.getElementById('openCryptoScorecardBtn'); const dcfBtn = document.getElementById('openDcfBtn');
    if (type === 'crypto') { if (stockScorecardBtn) stockScorecardBtn.style.display = 'none'; if (dcfBtn) dcfBtn.style.display = 'none'; if (cryptoScorecardBtn) cryptoScorecardBtn.style.display = 'flex'; }
    else { if (stockScorecardBtn) stockScorecardBtn.style.display = 'flex'; if (dcfBtn) dcfBtn.style.display = 'flex'; if (cryptoScorecardBtn) cryptoScorecardBtn.style.display = 'none'; }
    loadChart(symbol, type); updateIndicators(symbol, type); loadAnalysis(symbol, name, price, type);
    if (indicatorInterval) clearInterval(indicatorInterval); indicatorInterval = setInterval(() => { if (currentSymbol) updateIndicators(currentSymbol, currentType); }, 15000);
}
function updateChartPrice() { const changeStr = (currentChange >= 0 ? '+' : '') + currentChange.toFixed(2) + '%'; const priceStr = '$' + currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 }); const priceEl = document.getElementById('chartPrice'); priceEl.textContent = priceStr + '  ' + changeStr; priceEl.style.color = currentChange >= 0 ? '#43D6A2' : '#FF7387'; }
function loadChart(symbol, type) {
    const container = document.getElementById('tradingviewContainer'); container.innerHTML = ''; clearIndicatorSeries();
    if (currentChart) { currentChart.remove(); currentChart = null; }
    const isMobile = window.innerWidth < 400; const chartHeight = isMobile ? 450 : 520;
    if (typeof LightweightCharts === 'undefined') { container.innerHTML = '<div style="color:#f00;padding:20px;">❌ Library gagal dimuat.</div>'; return; }
    currentChart = LightweightCharts.createChart(container, { width: container.clientWidth, height: chartHeight, layout: { background: { color: 'transparent' }, textColor: 'rgba(255, 255, 255, 0.6)', fontFamily: 'Inter, sans-serif' }, grid: { vertLines: { color: 'rgba(255, 255, 255, 0.04)' }, horzLines: { color: 'rgba(255, 255, 255, 0.04)' } }, crosshair: { mode: LightweightCharts.CrosshairMode.Normal, vertLine: { color: 'rgba(80, 228, 242, 0.5)', labelBackgroundColor: '#50E4F2' }, horzLine: { color: 'rgba(80, 228, 242, 0.5)', labelBackgroundColor: '#50E4F2' } }, rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.08)', scaleMargins: { top: 0.1, bottom: 0.25 } }, timeScale: { borderColor: 'rgba(255, 255, 255, 0.08)', timeVisible: true, secondsVisible: false, rightOffset: 10, barSpacing: 12 }, handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false }, handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true } });
    candleSeries = currentChart.addCandlestickSeries({ upColor: '#43D6A2', downColor: '#FF7387', borderUpColor: '#43D6A2', borderDownColor: '#FF7387', wickUpColor: '#43D6A2', wickDownColor: '#FF7387' });
    volumeSeries = currentChart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '' }); volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.75, bottom: 0 } });
    const activeAlert = alerts.find(a => a.symbol === symbol && !a.triggered && (a.alertType === 'price' || !a.alertType)); if (activeAlert && candleSeries) candleSeries.createPriceLine({ price: activeAlert.targetPrice, color: activeAlert.direction === 'above' ? '#43D6A2' : '#FF7387', lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: '🔔 Alert' });
    loadChartData(symbol, type, currentTimeframe); setupTimeframeButtons(); window.addEventListener('resize', resizeChart);
    if (Object.values(activeIndicators).some(v => v)) { setTimeout(() => { if (currentSymbol === symbol) refreshChartIndicators(); }, 700); }
}
async function loadChartData(symbol, type, timeframe) {
    const intervalMap = { '5M': '5m', '30M': '30m', '1H': '1h', 'D': '1d', 'W': '1wk', 'M': '1mo', 'Y': '1mo' }; const rangeMap = { '5M': '5d', '30M': '1mo', '1H': '3mo', 'D': '1y', 'W': '5y', 'M': '20y', 'Y': 'max' };
    const interval = intervalMap[timeframe] || '1mo'; const range = rangeMap[timeframe] || 'max';
    let candles = await fetchChartData(symbol, type, interval, range); if (!candles || candles.length === 0 || !candleSeries) return;
    if (timeframe === 'Y') candles = aggregateToYearly(candles);
    const formattedData = candles.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })).filter(d => d.time != null && !isNaN(d.open) && !isNaN(d.high) && !isNaN(d.low) && !isNaN(d.close));
    const volumeData = candles.map(c => ({ time: c.time, value: c.volume || 0, color: c.close >= c.open ? 'rgba(67, 214, 162, 0.4)' : 'rgba(255, 115, 135, 0.4)' })).filter(d => d.time != null && !isNaN(d.value));
    candleSeries.setData(formattedData); volumeSeries.setData(volumeData);
    const totalCandles = formattedData.length; if (totalCandles > 100) currentChart.timeScale().setVisibleLogicalRange({ from: totalCandles - 100, to: totalCandles + 5 }); else currentChart.timeScale().fitContent();
}
function aggregateToYearly(monthlyCandles) {
    const yearlyMap = {}; monthlyCandles.forEach(c => { const date = new Date(c.time * 1000); const year = date.getFullYear(); if (!yearlyMap[year]) yearlyMap[year] = { year, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume || 0, firstTime: c.time, lastTime: c.time }; else { const y = yearlyMap[year]; if (c.time < y.firstTime) { y.open = c.open; y.firstTime = c.time; } if (c.time > y.lastTime) { y.close = c.close; y.lastTime = c.time; } if (c.high > y.high) y.high = c.high; if (c.low < y.low) y.low = c.low; y.volume += c.volume || 0; } });
    return Object.values(yearlyMap).sort((a, b) => a.year - b.year).map(y => ({ time: y.firstTime, open: y.open, high: y.high, low: y.low, close: y.close, volume: y.volume }));
}
function setupTimeframeButtons() { document.querySelectorAll('.tf-btn').forEach(btn => { const newBtn = btn.cloneNode(true); btn.parentNode.replaceChild(newBtn, btn); newBtn.addEventListener('click', () => { document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active')); newBtn.classList.add('active'); currentTimeframe = newBtn.dataset.tf; if (currentSymbol && currentType) loadChartData(currentSymbol, currentType, currentTimeframe); }); }); }
function resizeChart() { if (currentChart) { const container = document.getElementById('tradingviewContainer'); currentChart.applyOptions({ width: container.clientWidth }); } }
async function loadAnalysis(symbol, name, price, type) {
    const container = document.getElementById('analysisBody');
    container.innerHTML = `<div style="text-align:center; padding: 30px 0;"><div class="loading-spinner"></div><p class="loading-text" style="margin-top:10px;">🤖 AI Warren Buffett sedang menganalisis ${symbol}...</p></div>`;
    try {
        const fundamental = await fetchFundamental(symbol, type);
        const response = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/analyze-stock`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ symbol, name, price, fundamental }) }, 25000);
        if (!response.ok) throw new Error('HTTP ' + response.status); const data = await response.json();
        if (data.ai_signal && data.confidence !== undefined) renderAISignalUI(data, container);
        else container.innerHTML = `<div class="ai-analysis-text">${formatAnalysis(data.analysis || 'Gagal memuat analisis.')}</div>`;
    } catch (error) { container.innerHTML = `<div class="analysis-error"><p>❌ Gagal memuat analisis AI</p><p class="error-detail">${error.message}</p></div>`; }
}
function renderAISignalUI(data, container) {
    const signal = data.ai_signal.toUpperCase(); const confidence = data.confidence; const reasons = data.reasons || [];
    let signalClass = 'hold'; let signalIcon = '⏸️'; let barColor = 'var(--gold)';
    if (signal.includes('BUY')) { signalClass = 'buy'; signalIcon = '🚀'; barColor = 'var(--green)'; } else if (signal.includes('SELL') || signal.includes('AVOID')) { signalClass = 'sell'; signalIcon = '⚠️'; barColor = 'var(--red)'; }
    const reasonsHtml = reasons.length > 0 ? `<div class="ai-reasons-title">💡 Alasan Fundamental:</div><div class="ai-reasons-list">${reasons.map(reason => `<div class="ai-reason-item"><span class="ai-reason-icon">✦</span><span>${reason}</span></div>`).join('')}</div>` : '';
    container.innerHTML = `<div class="ai-signal-container"><div class="ai-signal-badge ${signalClass}"><span style="font-size: 16px;">${signalIcon}</span><span>AI Signal: ${signal}</span></div><div class="ai-confidence-wrap"><div class="ai-confidence-header"><span>Buffett Confidence Score</span><span style="color: ${barColor}; font-size: 13px;">${confidence}/100</span></div><div class="ai-confidence-bar"><div class="ai-confidence-fill" style="width: 0%; background: ${barColor};"></div></div></div>${reasonsHtml}${data.analysis ? `<div class="ai-analysis-text"><strong>📝 Kesimpulan AI:</strong><br>${formatAnalysis(data.analysis)}</div>` : ''}</div>`;
    setTimeout(() => { const fillBar = container.querySelector('.ai-confidence-fill'); if (fillBar) fillBar.style.width = confidence + '%'; }, 100);
}
function formatAnalysis(text) { if (!text) return ''; return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'); }
function closeAssetDetail() { document.getElementById('chartModal').classList.remove('active'); document.getElementById('tradingviewContainer').innerHTML = ''; clearIndicatorSeries(); if (currentChart) { currentChart.remove(); currentChart = null; candleSeries = null; volumeSeries = null; } if (indicatorInterval) { clearInterval(indicatorInterval); indicatorInterval = null; } window.removeEventListener('resize', resizeChart); }
async function runScreener() {
    const results = document.getElementById('screenerResults'); results.innerHTML = '<div class="empty-state">Screener lagi diproses...</div>';
    const peMax = parseFloat(document.getElementById('peMax').value) || 15; const pbMax = parseFloat(document.getElementById('pbMax').value) || 1.5;
    const roeMin = (parseFloat(document.getElementById('roeMin').value) || 15) / 100; const derMax = parseFloat(document.getElementById('derMax').value) || 1; const divMin = (parseFloat(document.getElementById('divMin').value) || 3) / 100;
    try {
        const response = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/run-screener`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ peMax, pbMax, roeMin, derMax, divMin }) }, 20000);
        if (!response.ok) throw new Error('HTTP ' + response.status); const data = await response.json();
        if (!data.results || data.results.length === 0) { results.innerHTML = '<div class="empty-state">Gak ada saham yang lolos filter.</div>'; return; }
        results.innerHTML = `<p class="description">${data.count} saham lolos filter:</p>` + data.results.map(stock => `<div class="asset-card"><div class="asset-info"><span class="asset-symbol">${stock.symbol}</span><span class="asset-name">${stock.company_name}</span><span class="asset-metrics">P/E ${stock.pe_ratio?.toFixed(2)} · P/B ${stock.pb_ratio?.toFixed(2)} · ROE ${((stock.roe || 0) * 100).toFixed(1)}% · Div ${((stock.dividend_yield || 0) * 100).toFixed(1)}%</span></div></div>`).join('');
    } catch (error) { results.innerHTML = `<div class="empty-state">❌ Gagal: ${error.message}</div>`; }
}
let portfolioPerfChart = null;
async function renderPortfolio() {
    const container = document.getElementById('holdings'); const totalValueEl = document.getElementById('totalValue'); const unrealizedPLEl = document.getElementById('unrealizedPL');
    const totalCostEl = document.getElementById('totalCost'); const totalHoldingsEl = document.getElementById('totalHoldings'); const chartSection = document.getElementById('portfolioChartSection');
    if (portfolio.length === 0) { container.innerHTML = '<div class="empty-state">Belum ada holding.</div>'; totalValueEl.textContent = '$ 0'; unrealizedPLEl.textContent = '$ 0'; totalCostEl.textContent = '$ 0'; totalHoldingsEl.textContent = '0'; if (chartSection) chartSection.style.display = 'none'; const perfSec = document.getElementById('portfolioPerfSection'); if (perfSec) perfSec.style.display = 'none'; return; }
    container.innerHTML = '<div class="empty-state">Memuat harga...</div>';
    const holdingsWithPrice = await Promise.all(portfolio.map(async (h) => { const priceData = await fetchPrice(h.symbol, h.type); return { ...h, currentPrice: priceData?.price || 0 }; }));
    const holdingsWithValues = holdingsWithPrice.map(h => ({ ...h, currentValue: h.currentPrice * h.shares, costBasis: h.avgPrice * h.shares, pl: (h.currentPrice * h.shares) - (h.avgPrice * h.shares) }));
    const totalValue = holdingsWithValues.reduce((s, h) => s + h.currentValue, 0); const totalCost = holdingsWithValues.reduce((s, h) => s + h.costBasis, 0);
    container.innerHTML = holdingsWithValues.map(h => { const plPercent = h.costBasis > 0 ? (h.pl / h.costBasis) * 100 : 0; const plClass = h.pl >= 0 ? 'up' : 'down'; const plSign = h.pl >= 0 ? '+' : ''; return `<div class="holding-card"><div class="holding-info"><span class="holding-symbol">${h.symbol}</span><span class="holding-detail">${h.shares} × $${h.avgPrice.toFixed(2)} = $${h.costBasis.toFixed(2)}</span><span class="holding-detail">Current: $${h.currentPrice.toFixed(2)}</span></div><div class="holding-pl"><span class="holding-value">$${h.currentValue.toFixed(2)}</span><span class="holding-pl-amount ${plClass}">${plSign}$${h.pl.toFixed(2)} (${plSign}${plPercent.toFixed(2)}%)</span></div><button class="holding-delete" onclick="deleteHolding('${h.id}')">×</button></div>`; }).join('');
    const totalPL = totalValue - totalCost; const totalPLSign = totalPL >= 0 ? '+' : '';
    totalValueEl.textContent = '$ ' + totalValue.toFixed(2); unrealizedPLEl.textContent = `${totalPLSign}$${totalPL.toFixed(2)}`; unrealizedPLEl.style.color = totalPL >= 0 ? '#43D6A2' : '#FF7387';
    totalCostEl.textContent = '$ ' + totalCost.toFixed(2); totalHoldingsEl.textContent = portfolio.length;
    renderPortfolioPieChart(holdingsWithValues, totalValue); renderPortfolioPerformance();
}
function renderPortfolioPieChart(holdings, totalValue) {
    const chartSection = document.getElementById('portfolioChartSection'); const canvas = document.getElementById('portfolioPieChart'); const centerValue = document.getElementById('chartCenterValue'); const legend = document.getElementById('portfolioLegend');
    if (!chartSection || !canvas || !centerValue || !legend) return; if (holdings.length === 0 || totalValue <= 0) { chartSection.style.display = 'none'; return; }
    chartSection.style.display = 'block'; const sorted = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
    const dpr = window.devicePixelRatio || 1; const size = 240; canvas.width = size * dpr; canvas.height = size * dpr; canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
    const ctx = canvas.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, size, size);
    const cx = size / 2, cy = size / 2; const outerRadius = size / 2 - 8; const innerRadius = outerRadius * 0.62; let startAngle = -Math.PI / 2;
    sorted.forEach((h, i) => { const pct = h.currentValue / totalValue; const angle = pct * Math.PI * 2; const endAngle = startAngle + angle; const color = CHART_COLORS[i % CHART_COLORS.length]; ctx.beginPath(); ctx.arc(cx, cy, outerRadius, startAngle, endAngle); ctx.arc(cx, cy, innerRadius, endAngle, startAngle, true); ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'rgba(8, 17, 30, 0.9)'; ctx.lineWidth = 2; ctx.stroke(); startAngle = endAngle; });
    centerValue.textContent = '$' + totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 });
    legend.innerHTML = sorted.map((h, i) => { const pct = (h.currentValue / totalValue) * 100; const color = CHART_COLORS[i % CHART_COLORS.length]; return `<div class="portfolio-legend-item"><span class="legend-dot" style="background: ${color};"></span><span class="legend-symbol">${h.symbol}</span><span class="legend-pct">${pct.toFixed(1)}%</span><span class="legend-value">$${h.currentValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span></div>`; }).join('');
}
async function renderPortfolioPerformance() {
    const section = document.getElementById('portfolioPerfSection'); const container = document.getElementById('portfolioPerfChart'); const statsEl = document.getElementById('portfolioPerfStats');
    if (!section || !container || !statsEl) return; if (portfolio.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block'; container.innerHTML = '<div class="loading-spinner" style="margin-top:80px;"></div>';
    if (portfolioPerfChart) { try { portfolioPerfChart.remove(); } catch(e) {} portfolioPerfChart = null; }
    try {
        const allCharts = await Promise.all(portfolio.map(async (h) => { const candles = await fetchChartData(h.symbol, h.type, '1d', '1mo'); return { holding: h, candles }; }));
        const dateMap = {}; allCharts.forEach(({ holding, candles }) => { if (!candles || candles.length === 0) return; candles.forEach(c => { const key = c.time; if (!dateMap[key]) dateMap[key] = { time: key, value: 0 }; dateMap[key].value += c.close * holding.shares; }); });
        const sortedPoints = Object.values(dateMap).sort((a, b) => a.time - b.time); if (sortedPoints.length === 0) { section.style.display = 'none'; return; }
        portfolioPerfChart = LightweightCharts.createChart(container, { width: container.clientWidth, height: 220, layout: { background: { color: 'transparent' }, textColor: 'rgba(255, 255, 255, 0.6)', fontFamily: 'Inter, sans-serif' }, grid: { vertLines: { color: 'rgba(255, 255, 255, 0.04)' }, horzLines: { color: 'rgba(255, 255, 255, 0.04)' } }, rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.08)' }, timeScale: { borderColor: 'rgba(255, 255, 255, 0.08)', timeVisible: false }, handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false }, handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true } });
        const series = portfolioPerfChart.addAreaSeries({ lineColor: '#43D6A2', topColor: 'rgba(67, 214, 162, 0.4)', bottomColor: 'rgba(67, 214, 162, 0.02)', lineWidth: 2 });
        series.setData(sortedPoints.map(p => ({ time: p.time, value: p.value }))); portfolioPerfChart.timeScale().fitContent();
        const first = sortedPoints[0].value; const last = sortedPoints[sortedPoints.length - 1].value; const diff = last - first; const diffPct = (diff / first) * 100; const trend = diff >= 0 ? 'up' : 'down'; const sign = diff >= 0 ? '+' : '';
        statsEl.innerHTML = `<div class="perf-stat-box"><span class="perf-stat-label">30 Hari Lalu</span><span class="perf-stat-value">$${first.toLocaleString('en-US', {maximumFractionDigits: 0})}</span></div><div class="perf-stat-box"><span class="perf-stat-label">Sekarang</span><span class="perf-stat-value">$${last.toLocaleString('en-US', {maximumFractionDigits: 0})}</span></div><div class="perf-stat-box"><span class="perf-stat-label">Perubahan</span><span class="perf-stat-value ${trend}">${sign}$${diff.toFixed(0)} (${sign}${diffPct.toFixed(2)}%)</span></div>`;
    } catch (e) { container.innerHTML = '<div class="empty-state">Gagal memuat performance</div>'; }
}
function deleteHolding(id) { if (!confirm('Hapus holding ini?')) return; portfolio = portfolio.filter(h => h.id !== id); savePortfolio(); renderPortfolio(); analyzePortfolioRisk(); }
async function analyzePortfolioRisk() {
    const container = document.getElementById('portfolioRiskAnalysis'); if (!container || portfolio.length === 0) { if (container) container.style.display = 'none'; return; }
    container.style.display = 'block'; container.innerHTML = '<div class="loading-spinner"></div><p class="loading-text">🧠 AI sedang menganalisis risiko...</p>';
    try {
        const sectorMap = { 'us-tech': 'Technology', 'us-finance': 'Finance', 'us-healthcare': 'Healthcare', 'us-consumer': 'Consumer', 'us-industrial': 'Industrial', 'us-energy': 'Energy', 'international': 'International', 'crypto': 'Crypto', 'commodity': 'Commodity', 'index': 'Index' };
        const sectorAllocation = {}; let totalValue = 0;
        await Promise.all(portfolio.map(async (h) => { const priceData = await fetchPrice(h.symbol, h.type); const value = (priceData?.price || 0) * h.shares; totalValue += value; const stockInfo = STOCK_UNIVERSE.find(s => s.symbol === h.symbol); const sector = stockInfo ? sectorMap[stockInfo.category] || 'Other' : 'Other'; if (!sectorAllocation[sector]) sectorAllocation[sector] = 0; sectorAllocation[sector] += value; }));
        const sectorPercentages = Object.entries(sectorAllocation).map(([sector, value]) => ({ sector, percentage: (value / totalValue) * 100 })).sort((a, b) => b.percentage - a.percentage);
        let riskLevel = 'LOW'; let riskColor = 'var(--green)'; let riskMessage = 'Portofolio terdiversifikasi dengan baik.';
        const topSector = sectorPercentages[0];
        if (topSector && topSector.percentage > 60) { riskLevel = 'HIGH'; riskColor = 'var(--red)'; riskMessage = `⚠️ Terlalu terkonsentrasi di ${topSector.sector} (${topSector.percentage.toFixed(1)}%).`; }
        else if (topSector && topSector.percentage > 40) { riskLevel = 'MEDIUM'; riskColor = 'var(--gold)'; riskMessage = `⚠️ ${topSector.sector} mendominasi (${topSector.percentage.toFixed(1)}%).`; }
        const sectorHtml = sectorPercentages.map(s => `<div class="risk-sector-item"><span class="risk-sector-name">${s.sector}</span><span class="risk-sector-pct" style="color: ${s.percentage > 40 ? 'var(--red)' : 'var(--green)'}">${s.percentage.toFixed(1)}%</span></div>`).join('');
        container.innerHTML = `<div class="risk-analysis-container"><div class="risk-header"><span class="risk-level-badge" style="background: ${riskColor}20; color: ${riskColor}; border-color: ${riskColor}">${riskLevel} RISK</span></div><p class="risk-message">${riskMessage}</p><div class="risk-sectors"><div class="risk-section-title">📊 Alokasi Sektor:</div>${sectorHtml}</div></div>`;
    } catch (error) { container.innerHTML = `<div class="analysis-error"><p>❌ Gagal menganalisis risiko</p></div>`; }
}

// ============ SECTOR HEATMAP ============
function getHeatColor(change) { if (change >= 3) return '#43D6A2'; if (change >= 1.5) return '#2DD4BF'; if (change >= 0.5) return '#6ee7b7'; if (change > 0) return '#a7f3d0'; if (change === 0) return '#64748b'; if (change > -0.5) return '#fecaca'; if (change > -1.5) return '#FF9BAA'; if (change > -3) return '#FF7387'; return '#dc2626'; }
async function fetchSectorData(sectorKey) { const stocks = STOCK_UNIVERSE.filter(s => s.category === sectorKey); const results = await Promise.all(stocks.map(async (stock) => { const priceData = await fetchPrice(stock.symbol, stock.type); if (!priceData) return null; return { symbol: stock.symbol, name: stock.name, type: stock.type, price: priceData.price, change: priceData.change }; })); return results.filter(Boolean); }
async function renderSectorHeatmap() {
    const grid = document.getElementById('heatmapGrid'); if (!grid) return;
    grid.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding: 30px 20px;"><div class="loading-spinner"></div><p class="loading-text">Memuat data sektor...</p></div>';
    try {
        const sectorResults = [];
        for (const sector of SECTOR_CONFIG) { const stocks = await fetchSectorData(sector.key); if (stocks.length === 0) continue; const avgChange = stocks.reduce((sum, s) => sum + s.change, 0) / stocks.length; const bullishCount = stocks.filter(s => s.change > 0).length; const bearishCount = stocks.filter(s => s.change < 0).length; sectorResults.push({ ...sector, stocks, avgChange, bullishCount, bearishCount, totalStocks: stocks.length }); }
        if (sectorResults.length === 0) { grid.innerHTML = '<div class="empty-state">Gagal memuat data sektor</div>'; return; }
        heatmapData = sectorResults.sort((a, b) => b.avgChange - a.avgChange);
        let totalBullish = 0, totalBearish = 0; sectorResults.forEach(s => { totalBullish += s.bullishCount; totalBearish += s.bearishCount; });
        const totalStocks = totalBullish + totalBearish; const bullPct = totalStocks > 0 ? (totalBullish / totalStocks) * 100 : 50; const bearPct = 100 - bullPct;
        document.getElementById('hmBullFill').style.width = bullPct + '%'; document.getElementById('hmBearFill').style.width = bearPct + '%';
        document.getElementById('heatmapSentimentStats').innerHTML = `<span class="sentiment-stat bullish">🟢 ${bullPct.toFixed(1)}% Bullish (${totalBullish})</span><span class="sentiment-stat bearish">🔴 ${bearPct.toFixed(1)}% Bearish (${totalBearish})</span>`;
        grid.innerHTML = heatmapData.map((sector, idx) => { const avgChange = sector.avgChange; const trendClass = avgChange > 0 ? 'up' : avgChange < 0 ? 'down' : 'flat'; const trendSign = avgChange > 0 ? '+' : ''; const heatColor = getHeatColor(avgChange); const dotsToShow = sector.stocks.slice(0, 10); const dotsHtml = dotsToShow.map(s => { const dotColor = getHeatColor(s.change); return `<div class="sector-heat-dot" style="background:${dotColor};"></div>`; }).join(''); return `<div class="sector-card" style="border-left: 3px solid ${heatColor};" onclick="openSectorDetail(${idx})"><div class="sector-card-header"><span class="sector-card-icon">${sector.icon}</span><span class="sector-card-name">${sector.name}</span></div><div class="sector-card-avg ${trendClass}">${trendSign}${avgChange.toFixed(2)}%</div><div class="sector-card-count">${sector.totalStocks} stocks · 🟢 ${sector.bullishCount} · 🔴 ${sector.bearishCount}</div><div class="sector-card-heat-dots">${dotsHtml}</div></div>`; }).join('');
    } catch (error) { grid.innerHTML = '<div class="empty-state">❌ Gagal memuat heatmap</div>'; }
}
function openSectorDetail(index) {
    const sector = heatmapData[index]; if (!sector) return;
    const modal = document.getElementById('sectorDetailModal'); modal.classList.add('active');
    document.getElementById('sdIcon').textContent = sector.icon; document.getElementById('sdName').textContent = sector.name; document.getElementById('sdSubtitle').textContent = `${sector.totalStocks} stocks dalam sektor ini`;
    const avgChange = sector.avgChange; const avgEl = document.getElementById('sdAvgChange'); avgEl.textContent = (avgChange > 0 ? '+' : '') + avgChange.toFixed(2) + '%'; avgEl.className = 'summary-value ' + (avgChange > 0 ? 'up' : avgChange < 0 ? 'down' : '');
    document.getElementById('sdBullish').textContent = sector.bullishCount; document.getElementById('sdBearish').textContent = sector.bearishCount;
    const sortedStocks = [...sector.stocks].sort((a, b) => b.change - a.change);
    document.getElementById('sdStocksList').innerHTML = sortedStocks.map(s => { const trendClass = s.change > 0 ? 'up' : s.change < 0 ? 'down' : 'flat'; const sign = s.change > 0 ? '+' : ''; const barColor = getHeatColor(s.change); const barWidth = Math.min(Math.abs(s.change) * 20, 100); return `<div class="sector-stock-item" onclick="closeSectorDetail(); openAssetDetail('${s.symbol}', '${s.name.replace(/'/g, "\\'")}', ${s.price}, ${s.change}, '${s.type}')"><div class="sector-stock-top"><div class="sector-stock-info"><span class="sector-stock-symbol">${s.symbol}</span><span class="sector-stock-name">${s.name}</span></div><div class="sector-stock-price-wrap"><div class="sector-stock-price">$${s.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div><div class="sector-stock-change ${trendClass}">${sign}${s.change.toFixed(2)}%</div></div></div><div class="sector-stock-bar"><div class="sector-stock-bar-fill" style="width: ${barWidth}%; background: ${barColor};"></div></div></div>`; }).join('');
}
function closeSectorDetail() { document.getElementById('sectorDetailModal').classList.remove('active'); }

// ============ NEWS ============
function getNewsSentiment(text) { if (!text) return { label: 'NEUTRAL', class: 'neutral', icon: '⚪' }; const lowerText = text.toLowerCase(); const bullishWords = ['surge', 'jump', 'rally', 'beat', 'growth', 'profit', 'gain', 'bull', 'soar', 'record', 'up', 'rise', 'boost', 'high', 'buy', 'upgrade', 'positive', 'strong', 'recovery', 'breakout', 'momentum']; const bearishWords = ['drop', 'fall', 'crash', 'miss', 'loss', 'decline', 'bear', 'plunge', 'slump', 'down', 'cut', 'warn', 'low', 'sell', 'downgrade', 'negative', 'weak', 'recession', 'fear', 'risk', 'inflation', 'debt']; let bullScore = 0; let bearScore = 0; bullishWords.forEach(word => { if (lowerText.includes(word)) bullScore++; }); bearishWords.forEach(word => { if (lowerText.includes(word)) bearScore++; }); if (bullScore > bearScore) return { label: 'BULLISH', class: 'positive', icon: '🟢' }; if (bearScore > bullScore) return { label: 'BEARISH', class: 'negative', icon: '🔴' }; return { label: 'NEUTRAL', class: 'neutral', icon: '⚪' }; }
async function renderNews() {
    const container = document.getElementById('newsList'); container.innerHTML = '<div class="empty-state">Memuat berita...</div>';
    try {
        const response = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/fetch-news`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ category: 'all' }) }, 12000);
        if (!response.ok) throw new Error('HTTP ' + response.status); const data = await response.json();
        const news = data.news || []; newsCache = news;
        if (news.length === 0) { container.innerHTML = '<div class="empty-state">Belum ada berita</div>'; return; }
        container.innerHTML = news.map((item, i) => { const time = formatTime(item.timePublished); const fullText = (item.title || '') + ' ' + (item.summary || ''); const sentiment = getNewsSentiment(fullText); return `<div class="news-card" id="news-card-${i}" onclick="openNewsDetail(${i})"><div class="news-title" id="news-title-${i}"><span class="trans-inline-spinner"></span>${item.title}</div><div class="news-summary" id="news-summary-${i}">${item.summary ? item.summary.substring(0, 150) + '...' : ''}</div><div class="news-meta"><span class="sentiment-tag ${sentiment.class}">${sentiment.icon} ${sentiment.label}</span><span>${item.source || 'Unknown'}</span><span>${time}</span><span class="trans-done-badge" id="trans-badge-${i}" style="display:none;">🌐 ID</span></div></div>`; }).join('');
        translateNewsInBackground(news);
    } catch (error) { container.innerHTML = `<div class="empty-state">❌ ${error.message}</div>`; }
}
async function translateNewsInBackground(news) { for (let i = 0; i < news.length; i++) { const item = news[i]; try { if (item.title) { const transTitle = await translateText(item.title); const titleEl = document.getElementById(`news-title-${i}`); if (titleEl && transTitle !== item.title) titleEl.textContent = transTitle; } if (item.summary) { const shortSummary = item.summary.substring(0, 150); const transSummary = await translateText(shortSummary); const summaryEl = document.getElementById(`news-summary-${i}`); if (summaryEl && transSummary !== shortSummary) summaryEl.textContent = transSummary + (item.summary.length > 150 ? '...' : ''); } const badgeEl = document.getElementById(`trans-badge-${i}`); if (badgeEl) badgeEl.style.display = 'inline-block'; } catch (e) {} } }
function openNewsDetail(index) { const item = newsCache[index]; if (!item) return; currentNewsItem = item; document.getElementById('newsDetailModal').classList.add('active'); document.getElementById('ndSource').textContent = item.source || 'Unknown'; document.getElementById('ndTime').textContent = formatTime(item.timePublished); document.getElementById('ndCategory').textContent = (item.category || 'NEWS').toUpperCase(); document.getElementById('ndTitle').textContent = item.title; document.getElementById('ndSummary').textContent = item.summary || 'Tidak ada ringkasan tersedia.'; const badge = document.getElementById('ndTransBadge'); badge.style.display = 'inline-flex'; badge.classList.remove('trans-done'); badge.innerHTML = '<span class="trans-loading-spinner"></span> 🌐 Menerjemahkan...'; translateNewsDetail(item); }
async function translateNewsDetail(item) { const badge = document.getElementById('ndTransBadge'); try { const [transTitle, transSummary] = await Promise.all([translateText(item.title), translateText(item.summary || '')]); if (currentNewsItem !== item) return; document.getElementById('ndTitle').textContent = transTitle; if (transSummary && transSummary.trim()) document.getElementById('ndSummary').textContent = transSummary; badge.innerHTML = '🌐 Diterjemahkan dari Bahasa Inggris'; badge.classList.add('trans-done'); } catch (e) { badge.style.display = 'none'; } }
function closeNewsDetail() { document.getElementById('newsDetailModal').classList.remove('active'); currentNewsItem = null; }
function openNewsOriginal() { if (currentNewsItem && currentNewsItem.url) window.open(currentNewsItem.url, '_blank'); }
function copyNewsLink() { if (!currentNewsItem || !currentNewsItem.url) return; const url = currentNewsItem.url; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => showToastSimple('📋 Link berhasil dicopy!')).catch(() => fallbackCopy(url)); else fallbackCopy(url); }
function fallbackCopy(text) { const temp = document.createElement('textarea'); temp.value = text; temp.style.position = 'fixed'; temp.style.left = '-9999px'; document.body.appendChild(temp); temp.select(); try { document.execCommand('copy'); showToastSimple('📋 Link berhasil dicopy!'); } catch (e) { showToastSimple('❌ Gagal copy link'); } document.body.removeChild(temp); }
function showToastSimple(message) { const toast = document.createElement('div'); toast.style.cssText = `position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#1a1a2e,#0f0f1a);color:#fff;padding:12px 20px;border-radius:12px;border:1px solid rgba(80,228,242,0.4);font-size:13px;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,0.5);z-index:9999;animation:toastIn 0.3s ease;`; toast.textContent = message; document.body.appendChild(toast); setTimeout(() => { toast.style.animation = 'toastOut 0.3s ease'; setTimeout(() => document.body.removeChild(toast), 300); }, 2000); }
function formatTime(timeStr) { if (!timeStr) return ''; const date = new Date(timeStr * 1000); const day = String(date.getDate()).padStart(2, '0'); const month = String(date.getMonth() + 1).padStart(2, '0'); const year = date.getFullYear(); const hour = String(date.getHours()).padStart(2, '0'); const minute = String(date.getMinutes()).padStart(2, '0'); return `${day}/${month}/${year} ${hour}:${minute}`; }

// ============ COMPARE ============
function populateCompareDropdowns() { const selA = document.getElementById('compareStockA'); const selB = document.getElementById('compareStockB'); if (!selA || !selB) return; if (selA.options.length > 0) return; const options = STOCK_UNIVERSE.map(s => `<option value="${s.symbol}">${s.symbol} — ${s.name}</option>`).join(''); selA.innerHTML = options; selB.innerHTML = options; selA.value = 'AAPL'; selB.value = 'MSFT'; }
function swapCompareStocks() { const selA = document.getElementById('compareStockA'); const selB = document.getElementById('compareStockB'); if (!selA || !selB) return; const temp = selA.value; selA.value = selB.value; selB.value = temp; const btn = document.getElementById('compareVsBtn'); if (btn) { btn.style.transform = 'rotate(180deg)'; setTimeout(() => { btn.style.transform = 'rotate(0deg)'; }, 300); } const result = document.getElementById('compareResult'); if (result && !result.querySelector('.empty-state')) { runCompare(); } }
async function runCompare() {
    const selA = document.getElementById('compareStockA'); const selB = document.getElementById('compareStockB'); const container = document.getElementById('compareResult'); const btn = document.getElementById('runCompareBtn');
    if (!selA || !selB || !container) return; const symbolA = selA.value; const symbolB = selB.value;
    if (symbolA === symbolB) { alert('Pilih 2 saham yang berbeda!'); return; }
    const originalText = btn.innerHTML; btn.innerHTML = '⏳ Loading...'; btn.disabled = true; btn.style.opacity = '0.7';
    container.innerHTML = `<div style="text-align:center;padding:40px 20px;"><div class="loading-spinner"></div><p class="loading-text">Membandingkan...</p></div>`;
    try {
        const stockA = STOCK_UNIVERSE.find(s => s.symbol === symbolA) || { type: 'stock' }; const stockB = STOCK_UNIVERSE.find(s => s.symbol === symbolB) || { type: 'stock' };
        const [priceA, priceB, fundA, fundB, chartA, chartB] = await Promise.all([fetchPrice(symbolA, stockA.type), fetchPrice(symbolB, stockB.type), fetchFundamental(symbolA, stockA.type), fetchFundamental(symbolB, stockB.type), fetchChartData(symbolA, stockA.type, '1d', '1y'), fetchChartData(symbolB, stockB.type, '1d', '1y')]);
        if (!priceA || !priceB) { container.innerHTML = '<div class="empty-state">❌ Gagal fetch data.</div>'; return; }
        renderCompareResult(symbolA, symbolB, priceA, priceB, fundA, fundB, chartA, chartB, container);
    } catch (error) { container.innerHTML = `<div class="empty-state">❌ Error: ${error.message}</div>`; }
    finally { btn.innerHTML = originalText; btn.disabled = false; btn.style.opacity = '1'; }
}
function renderCompareResult(symbolA, symbolB, priceA, priceB, fundA, fundB, chartA, chartB, container) {
    const nameA = priceA.name || symbolA; const nameB = priceB.name || symbolB; const changeA = priceA.change || 0; const changeB = priceB.change || 0;
    const headCardA = buildCompareHead('a', symbolA, nameA, priceA.price, changeA); const headCardB = buildCompareHead('b', symbolB, nameB, priceB.price, changeB);
    const metrics = [ { label: 'Harga', valA: priceA.price, valB: priceB.price, format: 'money', higherBetter: false }, { label: 'Change', valA: changeA, valB: changeB, format: 'pct', higherBetter: true }, { label: 'P/E', valA: fundA.pe_ratio, valB: fundB.pe_ratio, format: 'num', higherBetter: false }, { label: 'P/B', valA: fundA.pb_ratio, valB: fundB.pb_ratio, format: 'num', higherBetter: false }, { label: 'ROE', valA: fundA.roe, valB: fundB.roe, format: 'pct-raw', higherBetter: true }, { label: 'DER', valA: fundA.debt_to_equity, valB: fundB.debt_to_equity, format: 'num', higherBetter: false }, { label: 'Dividend', valA: fundA.dividend_yield, valB: fundB.dividend_yield, format: 'pct-raw', higherBetter: true } ];
    const rowsHtml = metrics.map(m => { const formattedA = formatCompareValue(m.valA, m.format); const formattedB = formatCompareValue(m.valB, m.format); let classA = '', classB = ''; if (m.valA != null && m.valB != null && !isNaN(m.valA) && !isNaN(m.valB) && m.valA !== 0 && m.valB !== 0) { if (m.higherBetter) { if (m.valA > m.valB) { classA = 'winner'; classB = 'loser'; } else if (m.valB > m.valA) { classB = 'winner'; classA = 'loser'; } } else { if (m.valA < m.valB && m.valA > 0) { classA = 'winner'; classB = 'loser'; } else if (m.valB < m.valA && m.valB > 0) { classB = 'winner'; classA = 'loser'; } } } return `<div class="compare-row"><div class="compare-row-label">${m.label}</div><div class="compare-row-value ${classA}">${formattedA}</div><div class="compare-row-value ${classB}">${formattedB}</div></div>`; }).join('');
    const winner = calculateCompareWinner(symbolA, symbolB, fundA, fundB, chartA, chartB); const chartId = 'compareChart_' + Date.now();
    container.innerHTML = `<div class="compare-heads">${headCardA}${headCardB}</div><div class="compare-table-section"><div class="compare-table-title">📊 Fundamental Comparison</div><div class="compare-table"><div class="compare-row header"><div class="compare-row-label">METRIC</div><div class="compare-row-value">${symbolA}</div><div class="compare-row-value">${symbolB}</div></div>${rowsHtml}</div></div><div class="compare-chart-section"><div class="compare-table-title">📈 Chart Overlay (1 Tahun)</div><div id="${chartId}" class="compare-chart-container"></div></div><div class="compare-winner"><div class="compare-winner-icon">🏆</div><div class="compare-winner-title">WINNER</div><div class="compare-winner-symbol">${winner.symbol}</div><div class="compare-winner-reason">${winner.reason}</div></div>`;
    requestAnimationFrame(() => { renderCompareChart(chartId, symbolA, chartA, symbolB, chartB); });
}
function buildCompareHead(side, symbol, name, price, change) { const trend = change >= 0 ? 'up' : 'down'; const sign = change >= 0 ? '+' : ''; return `<div class="compare-head-card ${side}"><div class="compare-head-symbol">${symbol}</div><div class="compare-head-name">${name}</div><div class="compare-head-price">$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div><div class="compare-head-change ${trend}">${sign}${change.toFixed(2)}%</div></div>`; }
function formatCompareValue(val, format) { if (val == null || isNaN(val) || val === 0) return '-'; if (format === 'money') return '$' + val.toLocaleString('en-US', { maximumFractionDigits: 2 }); if (format === 'pct') return (val >= 0 ? '+' : '') + val.toFixed(2) + '%'; if (format === 'pct-raw') return (val * 100).toFixed(2) + '%'; if (format === 'num') return val.toFixed(2); return val.toString(); }
function calculateCompareWinner(symbolA, symbolB, fundA, fundB, chartA, chartB) {
    let scoreA = 0; let scoreB = 0; const reasonsA = []; const reasonsB = [];
    if (fundA.roe && fundB.roe) { if (fundA.roe > fundB.roe) { scoreA += 25; reasonsA.push(`ROE lebih tinggi`); } else { scoreB += 25; reasonsB.push(`ROE lebih tinggi`); } }
    const peA = fundA.pe_ratio > 0 ? fundA.pe_ratio : 999; const peB = fundB.pe_ratio > 0 ? fundB.pe_ratio : 999;
    if (peA < peB) { scoreA += 20; reasonsA.push(`P/E lebih murah`); } else if (peB < peA) { scoreB += 20; reasonsB.push(`P/E lebih murah`); }
    if (fundA.debt_to_equity && fundB.debt_to_equity) { if (fundA.debt_to_equity < fundB.debt_to_equity) { scoreA += 15; reasonsA.push('Utang lebih rendah'); } else { scoreB += 15; reasonsB.push('Utang lebih rendah'); } }
    if (fundA.dividend_yield && fundB.dividend_yield) { if (fundA.dividend_yield > fundB.dividend_yield) { scoreA += 15; reasonsA.push('Dividen lebih besar'); } else { scoreB += 15; reasonsB.push('Dividen lebih besar'); } }
    if (chartA && chartA.length > 0 && chartB && chartB.length > 0) { const perfA = ((chartA[chartA.length-1].close / chartA[0].close) - 1) * 100; const perfB = ((chartB[chartB.length-1].close / chartB[0].close) - 1) * 100; if (perfA > perfB) { scoreA += 25; reasonsA.push(`Return 1Y lebih tinggi`); } else { scoreB += 25; reasonsB.push(`Return 1Y lebih tinggi`); } }
    if (scoreA >= scoreB) return { symbol: symbolA, reason: `Skor: ${scoreA}/100. ${reasonsA.slice(0, 2).join(', ')}.` };
    return { symbol: symbolB, reason: `Skor: ${scoreB}/100. ${reasonsB.slice(0, 2).join(', ')}.` };
}
function renderCompareChart(containerId, symbolA, chartA, symbolB, chartB) {
    const container = document.getElementById(containerId); if (!container) return;
    if (typeof LightweightCharts === 'undefined') { container.innerHTML = '❌ Chart library tidak tersedia'; return; }
    if (!chartA || chartA.length === 0 || !chartB || chartB.length === 0) { container.innerHTML = 'Data chart tidak tersedia'; return; }
    if (compareChart) { try { compareChart.remove(); } catch(e) {} compareChart = null; }
    compareChart = LightweightCharts.createChart(container, { width: container.clientWidth, height: 320, layout: { background: { color: 'transparent' }, textColor: 'rgba(255, 255, 255, 0.6)', fontFamily: 'Inter, sans-serif' }, grid: { vertLines: { color: 'rgba(255, 255, 255, 0.04)' }, horzLines: { color: 'rgba(255, 255, 255, 0.04)' } }, rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.08)' }, timeScale: { borderColor: 'rgba(255, 255, 255, 0.08)', timeVisible: false }, handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false }, handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true } });
    const baseA = chartA[0].close; const baseB = chartB[0].close;
    const seriesA = compareChart.addLineSeries({ color: '#50E4F2', lineWidth: 2 }); const seriesB = compareChart.addLineSeries({ color: '#B9A0FF', lineWidth: 2 });
    const dataA = chartA.map(c => ({ time: c.time, value: ((c.close / baseA) - 1) * 100 })).filter(d => d.time != null && !isNaN(d.value));
    const dataB = chartB.map(c => ({ time: c.time, value: ((c.close / baseB) - 1) * 100 })).filter(d => d.time != null && !isNaN(d.value));
    seriesA.setData(dataA); seriesB.setData(dataB); compareChart.timeScale().fitContent();
}

// ============ INDEKS ============
function renderIndeksCard(idx) {
    const d = idx.data;
    if (!d || d.price == null) return `<div class="indeks-card" onclick="openIndeksDetail('${idx.symbol}')"><div class="indeks-card-header"><div class="indeks-card-title"><span class="indeks-card-flag">${idx.flag}</span><div class="indeks-card-name-wrap"><span class="indeks-card-name">${idx.name}</span><span class="indeks-card-country">${idx.country}</span></div></div><div class="indeks-card-price-wrap"><div class="indeks-card-price" style="color:rgba(255,255,255,0.4);">N/A</div><div class="indeks-card-change" style="color:rgba(255,255,255,0.3);">Tidak tersedia</div></div></div></div>`;
    const trend = d.change >= 0 ? 'up' : 'down'; const sign = d.change >= 0 ? '+' : ''; const changeStr = `${sign}${d.change.toFixed(2)}%`; const changeNominalStr = `${sign}${d.changeNominal.toFixed(2)}`; const priceStr = formatIndeksNumber(d.price, 2);
    const sectorBars = idx.sectors.slice(0, 5).map(s => `<div class="indeks-sector-mini-bar" style="flex:${s.pct}; background:${s.color};"></div>`).join('');
    return `<div class="indeks-card" onclick="openIndeksDetail('${idx.symbol}')"><div class="indeks-card-header"><div class="indeks-card-title"><span class="indeks-card-flag">${idx.flag}</span><div class="indeks-card-name-wrap"><span class="indeks-card-name">${idx.name}</span><span class="indeks-card-country">${idx.country}</span></div></div><div class="indeks-card-price-wrap"><div class="indeks-card-price">${priceStr}</div><div class="indeks-card-change ${trend}">${changeStr} (${changeNominalStr})</div></div></div><div class="indeks-card-stats"><div class="indeks-stat-cell"><span class="indeks-stat-cell-label">High</span><span class="indeks-stat-cell-value up">${formatIndeksNumber(d.high, 2)}</span></div><div class="indeks-stat-cell"><span class="indeks-stat-cell-label">Low</span><span class="indeks-stat-cell-value down">${formatIndeksNumber(d.low, 2)}</span></div><div class="indeks-stat-cell"><span class="indeks-stat-cell-label">Volume</span><span class="indeks-stat-cell-value">${formatIndeksVolume(d.volume)}</span></div></div><div class="indeks-card-sectors">${sectorBars}</div></div>`;
}
function formatIndeksNumber(num, decimals = 2) { if (num == null || isNaN(num)) return '-'; return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }); }
function formatIndeksVolume(vol) { if (!vol || vol === 0) return '-'; if (vol >= 1e12) return (vol / 1e12).toFixed(2) + ' T'; if (vol >= 1e9) return (vol / 1e9).toFixed(2) + ' B'; if (vol >= 1e6) return (vol / 1e6).toFixed(2) + ' M'; if (vol >= 1e3) return (vol / 1e3).toFixed(2) + ' K'; return vol.toString(); }
async function renderIndices() {
    const list = document.getElementById('indeksList'); if (!list) return;
    const myToken = ++indeksRenderToken; let filtered = GLOBAL_INDICES;
    if (indeksFilter !== 'all') filtered = filtered.filter(i => i.region === indeksFilter);
    if (indeksSearch) { const q = indeksSearch.toLowerCase(); filtered = filtered.filter(i => i.name.toLowerCase().includes(q) || i.symbol.toLowerCase().includes(q) || i.country.toLowerCase().includes(q)); }
    if (filtered.length === 0) { list.innerHTML = '<div class="empty-state">Gak ada indeks yang match.</div>'; return; }
    list.innerHTML = filtered.map((idx) => { const safeId = idx.symbol.replace(/\W/g, '_'); return `<div class="indeks-card" id="indeks-card-${safeId}" style="opacity:0.6;"><div class="indeks-card-header"><div class="indeks-card-title"><span class="indeks-card-flag">${idx.flag}</span><div class="indeks-card-name-wrap"><span class="indeks-card-name">${idx.name}</span><span class="indeks-card-country">${idx.country}</span></div></div><div class="indeks-card-price-wrap"><div class="indeks-card-price" style="color:rgba(255,255,255,0.3);">⏳</div><div class="indeks-card-change" style="color:rgba(255,255,255,0.3);">Loading...</div></div></div><div class="indeks-card-sectors">${idx.sectors.slice(0, 5).map(s => `<div class="indeks-sector-mini-bar" style="flex:${s.pct}; background:${s.color}; opacity:0.4;"></div>`).join('')}</div></div>`; }).join('');
    filtered.forEach(async (idx) => { const data = await fetchIndexData(idx.symbol); if (myToken !== indeksRenderToken) return; const safeId = idx.symbol.replace(/\W/g, '_'); const cardEl = document.getElementById('indeks-card-' + safeId); if (!cardEl) return; const updatedIdx = { ...idx, data }; cardEl.outerHTML = renderIndeksCard(updatedIdx); });
    const now = new Date(); const lastEl = document.getElementById('lastUpdated'); if (lastEl) lastEl.textContent = 'Terakhir diupdate: ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
async function fetchIndexData(symbol) {
    try { const response = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/fetch-price`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ symbol, type: 'stock' }) }, 12000); if (!response.ok) throw new Error('HTTP ' + response.status); const data = await response.json();
        if (data.chart && data.chart.result && data.chart.result[0]) { const result = data.chart.result[0]; const meta = result.meta; const quote = (result.indicators && result.indicators.quote && result.indicators.quote[0]) || {}; const volumes = quote.volume || []; let lastVolume = 0; for (let i = volumes.length - 1; i >= 0; i--) { if (volumes[i] != null && volumes[i] > 0) { lastVolume = volumes[i]; break; } } return { price: meta.regularMarketPrice, change: meta.regularMarketChangePercent || 0, changeNominal: meta.regularMarketChange || 0, high: meta.regularMarketDayHigh, low: meta.regularMarketDayLow, prevClose: meta.chartPreviousClose || meta.previousClose, volume: meta.regularMarketVolume || lastVolume, currency: meta.currency, name: meta.longName || meta.shortName }; } return null;
    } catch (error) { return null; }
}
async function fetchIndexChartData(symbol, interval = '1d', range = '1y') {
    try { const response = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/fetch-chart`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ symbol, type: 'stock', interval, range }) }, 15000); if (!response.ok) throw new Error('HTTP ' + response.status); const data = await response.json();
        if (data.data && Array.isArray(data.data)) return data.data.map(c => ({ time: c.time, open: parseFloat(c.open), high: parseFloat(c.high), low: parseFloat(c.low), close: parseFloat(c.close), volume: parseFloat(c.volume || 0) })).filter(c => !isNaN(c.open) && !isNaN(c.close));
        if (data.chart && data.chart.result && data.chart.result[0]) { const result = data.chart.result[0]; const timestamps = result.timestamp || []; const quote = (result.indicators && result.indicators.quote && result.indicators.quote[0]) || {}; const opens = quote.open || [], highs = quote.high || [], lows = quote.low || [], closes = quote.close || [], volumes = quote.volume || []; const candles = []; for (let i = 0; i < timestamps.length; i++) { if (opens[i] == null || closes[i] == null) continue; candles.push({ time: timestamps[i], open: opens[i], high: highs[i], low: lows[i], close: closes[i], volume: volumes[i] || 0 }); } return candles; } return [];
    } catch (error) { return []; }
}
async function openIndeksDetail(symbol) {
    const idx = GLOBAL_INDICES.find(i => i.symbol === symbol); if (!idx) return;
    indeksDetailSymbol = symbol; const modal = document.getElementById('indeksDetailModal'); if (!modal) return; modal.classList.add('active');
    document.getElementById('detailFlag').textContent = idx.flag; document.getElementById('detailTitle').textContent = idx.name; document.getElementById('detailSubtitle').textContent = idx.country;
    document.getElementById('detailPrice').textContent = '⏳'; document.getElementById('detailChange').textContent = 'Loading...'; document.getElementById('detailChange').className = 'indeks-detail-change';
    document.getElementById('detailHigh').textContent = '-'; document.getElementById('detailLow').textContent = '-'; document.getElementById('detailPrevClose').textContent = '-'; document.getElementById('detailVolume').textContent = '-';
    renderIndeksSectors(idx.sectors); renderIndeksTopHoldings(idx.topHoldings);
    const data = await fetchIndexData(symbol); if (indeksDetailSymbol !== symbol) return;
    if (data && data.price != null) { const trend = data.change >= 0 ? 'up' : 'down'; const sign = data.change >= 0 ? '+' : ''; document.getElementById('detailPrice').textContent = formatIndeksNumber(data.price, 2); const changeEl = document.getElementById('detailChange'); changeEl.textContent = `${sign}${data.change.toFixed(2)}%  (${sign}${data.changeNominal.toFixed(2)})`; changeEl.className = 'indeks-detail-change ' + trend; document.getElementById('detailHigh').textContent = formatIndeksNumber(data.high, 2); document.getElementById('detailLow').textContent = formatIndeksNumber(data.low, 2); document.getElementById('detailPrevClose').textContent = formatIndeksNumber(data.prevClose, 2); document.getElementById('detailVolume').textContent = formatIndeksVolume(data.volume); }
    else { document.getElementById('detailPrice').textContent = 'N/A'; document.getElementById('detailChange').textContent = 'Data gak tersedia'; }
    loadIndeksChart(symbol); loadIndeksTopHoldingsPrices(idx.topHoldings);
}
function renderIndeksSectors(sectors) { const container = document.getElementById('detailSectors'); if (!container) return; container.innerHTML = sectors.map(s => `<div class="indeks-sector-row"><div class="indeks-sector-row-top"><span class="indeks-sector-name">${s.name}</span><span class="indeks-sector-pct">${s.pct.toFixed(1)}%</span></div><div class="indeks-sector-bar-bg"><div class="indeks-sector-bar-fill" style="width: ${s.pct}%; background: ${s.color};"></div></div></div>`).join(''); }
function renderIndeksTopHoldings(holdings) { const container = document.getElementById('detailConstituents'); if (!container) return; container.innerHTML = holdings.map(h => { const safeSym = h.symbol.replace(/\W/g, '_'); return `<div class="indeks-constituent-item" data-symbol="${h.symbol}"><div class="indeks-constituent-left"><span class="indeks-constituent-symbol">${h.symbol}</span><span class="indeks-constituent-name">${h.name}</span></div><div class="indeks-constituent-right"><span class="indeks-constituent-price" id="const-price-${safeSym}">⏳</span><span class="indeks-constituent-change" id="const-change-${safeSym}">-</span></div></div>`; }).join(''); }
async function loadIndeksTopHoldingsPrices(holdings) { await Promise.allSettled(holdings.map(async (h) => { try { const data = await fetchIndexData(h.symbol); const safeSym = h.symbol.replace(/\W/g, '_'); const priceEl = document.getElementById('const-price-' + safeSym); const changeEl = document.getElementById('const-change-' + safeSym); if (!priceEl || !changeEl) return; if (data && data.price != null) { priceEl.textContent = formatIndeksNumber(data.price, 2); const trend = data.change >= 0 ? 'up' : 'down'; const sign = data.change >= 0 ? '+' : ''; changeEl.textContent = `${sign}${data.change.toFixed(2)}%`; changeEl.className = 'indeks-constituent-change ' + trend; } else { priceEl.textContent = 'N/A'; changeEl.textContent = '-'; } } catch (e) {} })); }
async function loadIndeksChart(symbol) {
    const container = document.getElementById('indeksChartContainer'); if (!container) return; container.innerHTML = '';
    if (indeksDetailChart) { try { indeksDetailChart.remove(); } catch(e) {} indeksDetailChart = null; }
    if (typeof LightweightCharts === 'undefined') { container.innerHTML = '❌ Library chart gagal dimuat'; return; }
    indeksDetailChart = LightweightCharts.createChart(container, { width: container.clientWidth, height: 260, layout: { background: { color: 'transparent' }, textColor: 'rgba(255, 255, 255, 0.6)', fontFamily: 'Inter, sans-serif' }, grid: { vertLines: { color: 'rgba(255, 255, 255, 0.04)' }, horzLines: { color: 'rgba(255, 255, 255, 0.04)' } }, rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.08)' }, timeScale: { borderColor: 'rgba(255, 255, 255, 0.08)', timeVisible: false }, handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false }, handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true } });
    const series = indeksDetailChart.addCandlestickSeries({ upColor: '#43D6A2', downColor: '#FF7387', borderUpColor: '#43D6A2', borderDownColor: '#FF7387', wickUpColor: '#43D6A2', wickDownColor: '#FF7387' });
    const candles = await fetchIndexChartData(symbol, '1d', '1y');
    if (!candles || candles.length === 0) { container.innerHTML = 'Data chart tidak tersedia'; return; }
    const formattedData = candles.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })).filter(d => d.time != null && !isNaN(d.open) && !isNaN(d.close));
    series.setData(formattedData); indeksDetailChart.timeScale().fitContent();
}
function closeIndeksDetail() { document.getElementById('indeksDetailModal').classList.remove('active'); if (indeksDetailChart) { try { indeksDetailChart.remove(); } catch(e) {} indeksDetailChart = null; } document.getElementById('indeksChartContainer').innerHTML = ''; indeksDetailSymbol = null; }

// ============ STOCK SCORECARD ============
async function openStockScorecard() {
    if (!currentSymbol || currentType === 'crypto') return;
    const modal = document.getElementById('scorecardModal');
    if (!modal) return;
    modal.classList.add('active');
    document.getElementById('scorecardTitle').textContent = `${currentSymbol} — ${currentName}`;
    const heroEl = document.getElementById('scorecardHero');
    const breakdownEl = document.getElementById('scorecardBreakdown');
    const verdictEl = document.getElementById('scorecardVerdict');
    heroEl.innerHTML = '<div class="scorecard-loading"><div class="loading-spinner"></div><p class="loading-text">🤖 Menghitung skor...</p></div>';
    breakdownEl.innerHTML = ''; verdictEl.style.display = 'none';

    try {
        const fund = await fetchFundamental(currentSymbol, currentType);
        const candles = await fetchChartData(currentSymbol, currentType, '1d', '1y');
        const criteria = [];
        let totalScore = 0;

        // 1. ROE
        const roe = fund.roe || 0;
        let roeScore = 0; let roeStatus = 'fail'; let roeDesc = '';
        if (roe >= 0.20) { roeScore = 10; roeStatus = 'pass'; roeDesc = 'ROE > 20% (Sangat Baik)'; }
        else if (roe >= 0.15) { roeScore = 8; roeStatus = 'pass'; roeDesc = 'ROE > 15% (Baik)'; }
        else if (roe >= 0.10) { roeScore = 5; roeStatus = 'partial'; roeDesc = 'ROE > 10% (Cukup)'; }
        else { roeScore = 0; roeStatus = 'fail'; roeDesc = 'ROE < 10% (Kurang)'; }
        criteria.push({ label: 'Return on Equity', icon: '📈', score: roeScore, max: 10, value: (roe*100).toFixed(1)+'%', status: roeStatus, desc: roeDesc });
        totalScore += roeScore;

        // 2. DER
        const der = fund.debt_to_equity || 0;
        let derScore = 0; let derStatus = 'fail'; let derDesc = '';
        if (der < 0.5 && der >= 0) { derScore = 10; derStatus = 'pass'; derDesc = 'DER < 0.5 (Sangat Sehat)'; }
        else if (der < 1.0) { derScore = 7; derStatus = 'pass'; derDesc = 'DER < 1.0 (Sehat)'; }
        else if (der < 2.0) { derScore = 4; derStatus = 'partial'; derDesc = 'DER < 2.0 (Cukup)'; }
        else { derScore = 0; derStatus = 'fail'; derDesc = 'DER > 2.0 (Berisiko)'; }
        criteria.push({ label: 'Debt to Equity (DER)', icon: '⚖️', score: derScore, max: 10, value: der.toFixed(2), status: derStatus, desc: derDesc });
        totalScore += derScore;

        // 3. P/E Ratio
        const pe = fund.pe_ratio || 0;
        let peScore = 0; let peStatus = 'fail'; let peDesc = '';
        if (pe > 0 && pe < 15) { peScore = 10; peStatus = 'pass'; peDesc = 'P/E < 15 (Undervalued)'; }
        else if (pe >= 15 && pe < 25) { peScore = 7; peStatus = 'pass'; peDesc = 'P/E 15-25 (Wajar)'; }
        else if (pe >= 25 && pe < 40) { peScore = 4; peStatus = 'partial'; peDesc = 'P/E 25-40 (Mahal)'; }
        else if (pe >= 40) { peScore = 0; peStatus = 'fail'; peDesc = 'P/E > 40 (Sangat Mahal)'; }
        else { peScore = 5; peStatus = 'partial'; peDesc = 'P/E N/A (Tidak ada laba)'; }
        criteria.push({ label: 'P/E Ratio', icon: '💰', score: peScore, max: 10, value: pe > 0 ? pe.toFixed(2) : 'N/A', status: peStatus, desc: peDesc });
        totalScore += peScore;

        // 4. Profit Margin
        const margin = fund.profit_margin || 0;
        let marginScore = 0; let marginStatus = 'fail'; let marginDesc = '';
        if (margin >= 0.20) { marginScore = 10; marginStatus = 'pass'; marginDesc = 'Margin > 20% (Sangat Profitabel)'; }
        else if (margin >= 0.10) { marginScore = 7; marginStatus = 'pass'; marginDesc = 'Margin > 10% (Profitabel)'; }
        else if (margin >= 0.05) { marginScore = 4; marginStatus = 'partial'; marginDesc = 'Margin > 5% (Tipis)'; }
        else { marginScore = 0; marginStatus = 'fail'; marginDesc = 'Margin < 5% (Rendah)'; }
        criteria.push({ label: 'Profit Margin', icon: '💵', score: marginScore, max: 10, value: (margin*100).toFixed(1)+'%', status: marginStatus, desc: marginDesc });
        totalScore += marginScore;

        // 5. Dividend Yield
        const div = fund.dividend_yield || 0;
        let divScore = 0; let divStatus = 'fail'; let divDesc = '';
        if (div >= 0.04) { divScore = 10; divStatus = 'pass'; divDesc = 'Yield > 4% (Tinggi)'; }
        else if (div >= 0.02) { divScore = 7; divStatus = 'pass'; divDesc = 'Yield > 2% (Baik)'; }
        else if (div > 0) { divScore = 4; divStatus = 'partial'; divDesc = 'Yield < 2% (Kecil)'; }
        else { divScore = 0; divStatus = 'fail'; divDesc = 'Tidak membagikan dividen'; }
        criteria.push({ label: 'Dividend Yield', icon: '🪙', score: divScore, max: 10, value: (div*100).toFixed(1)+'%', status: divStatus, desc: divDesc });
        totalScore += divScore;

        // 6. Current Ratio
        const cr = fund.current_ratio || 0;
        let crScore = 0; let crStatus = 'fail'; let crDesc = '';
        if (cr >= 2.0) { crScore = 10; crStatus = 'pass'; crDesc = 'Current Ratio > 2.0 (Likuid)'; }
        else if (cr >= 1.5) { crScore = 7; crStatus = 'pass'; crDesc = 'Current Ratio > 1.5 (Sehat)'; }
        else if (cr >= 1.0) { crScore = 4; crStatus = 'partial'; crDesc = 'Current Ratio > 1.0 (Cukup)'; }
        else { crScore = 0; crStatus = 'fail'; crDesc = 'Current Ratio < 1.0 (Berisiko)'; }
        criteria.push({ label: 'Current Ratio', icon: '💧', score: crScore, max: 10, value: cr.toFixed(2), status: crStatus, desc: crDesc });
        totalScore += crScore;

        // 7. P/B Ratio
        const pb = fund.pb_ratio || 0;
        let pbScore = 0; let pbStatus = 'fail'; let pbDesc = '';
        if (pb > 0 && pb < 1.5) { pbScore = 10; pbStatus = 'pass'; pbDesc = 'P/B < 1.5 (Murah)'; }
        else if (pb >= 1.5 && pb < 3) { pbScore = 7; pbStatus = 'pass'; pbDesc = 'P/B 1.5-3 (Wajar)'; }
        else if (pb >= 3) { pbScore = 4; pbStatus = 'partial'; pbDesc = 'P/B > 3 (Mahal)'; }
        else { pbScore = 5; pbStatus = 'partial'; pbDesc = 'P/B N/A'; }
        criteria.push({ label: 'Price to Book', icon: '📚', score: pbScore, max: 10, value: pb > 0 ? pb.toFixed(2) : 'N/A', status: pbStatus, desc: pbDesc });
        totalScore += pbScore;

        // 8. EPS Growth
        const epsGrowth = fund.eps_growth || 0;
        let epsScore = 0; let epsStatus = 'fail'; let epsDesc = '';
        if (epsGrowth > 0.15) { epsScore = 10; epsStatus = 'pass'; epsDesc = 'EPS Growth > 15% (Tumbuh Cepat)'; }
        else if (epsGrowth > 0.05) { epsScore = 7; epsStatus = 'pass'; epsDesc = 'EPS Growth > 5% (Tumbuh)'; }
        else if (epsGrowth >= 0) { epsScore = 4; epsStatus = 'partial'; epsDesc = 'EPS Growth Datar'; }
        else { epsScore = 0; epsStatus = 'fail'; epsDesc = 'EPS Menurun'; }
        criteria.push({ label: 'EPS Growth', icon: '🚀', score: epsScore, max: 10, value: (epsGrowth*100).toFixed(1)+'%', status: epsStatus, desc: epsDesc });
        totalScore += epsScore;

        // 9. Revenue Growth
        const revGrowth = fund.revenue_growth || 0;
        let revScore = 0; let revStatus = 'fail'; let revDesc = '';
        if (revGrowth > 0.10) { revScore = 10; revStatus = 'pass'; revDesc = 'Revenue Growth > 10%'; }
        else if (revGrowth > 0.03) { revScore = 7; revStatus = 'pass'; revDesc = 'Revenue Growth > 3%'; }
        else if (revGrowth >= 0) { revScore = 4; revStatus = 'partial'; revDesc = 'Revenue Datar'; }
        else { revScore = 0; revStatus = 'fail'; revDesc = 'Revenue Menurun'; }
        criteria.push({ label: 'Revenue Growth', icon: '📊', score: revScore, max: 10, value: (revGrowth*100).toFixed(1)+'%', status: revStatus, desc: revDesc });
        totalScore += revScore;

        // 10. Momentum (Price vs MA50)
        let momScore = 0; let momStatus = 'fail'; let momDesc = '';
        if (candles && candles.length >= 50) {
            const closes = candles.map(c => c.close);
            const ma50 = calcSMA(closes, 50);
            const lastMa50 = ma50[ma50.length - 1];
            const currentPrice = closes[closes.length - 1];
            if (currentPrice > lastMa50) { momScore = 10; momStatus = 'pass'; momDesc = 'Harga di atas MA50 (Bullish)'; }
            else { momScore = 0; momStatus = 'fail'; momDesc = 'Harga di bawah MA50 (Bearish)'; }
            criteria.push({ label: 'Momentum (MA50)', icon: '🔥', score: momScore, max: 10, value: currentPrice > lastMa50 ? 'Bullish' : 'Bearish', status: momStatus, desc: momDesc });
        } else {
            criteria.push({ label: 'Momentum (MA50)', icon: '🔥', score: 5, max: 10, value: 'N/A', status: 'partial', desc: 'Data historis belum cukup' });
            momScore = 5;
        }
        totalScore += momScore;

        // Render UI
        const normalizedScore = Math.round((totalScore / 100) * 100);
        let verdictLabel = 'POOR'; let verdictClass = 'poor'; let verdictIcon = '🚨'; let verdictDesc = 'Fundamental sangat lemah, harap waspada.';
        if (normalizedScore >= 80) { verdictLabel = 'EXCELLENT'; verdictClass = 'excellent'; verdictIcon = '🏆'; verdictDesc = 'Kualitas bisnis sangat baik (ala Warren Buffett).'; }
        else if (normalizedScore >= 60) { verdictLabel = 'GOOD'; verdictClass = 'good'; verdictIcon = '👍'; verdictDesc = 'Fundamental cukup kuat dan sehat.'; }
        else if (normalizedScore >= 40) { verdictLabel = 'FAIR'; verdictClass = 'fair'; verdictIcon = '⚠️'; verdictDesc = 'Ada beberapa red flag keuangan.'; }

        heroEl.innerHTML = `<div class="scorecard-score-big">${normalizedScore}</div><div class="scorecard-score-label">Value Score / 100</div><div class="scorecard-verdict-badge ${verdictClass}">${verdictIcon} ${verdictLabel}</div><div class="scorecard-hero-desc">${verdictDesc}</div>`;

        breakdownEl.innerHTML = `<div class="scorecard-breakdown-title">📋 Detail Penilaian (10 Kriteria)</div>` + criteria.map(c => {
            const pct = (c.score / c.max) * 100;
            let barColor = '#FF7387'; if (pct >= 70) barColor = '#43D6A2'; else if (pct >= 40) barColor = '#E9B949';
            return `<div class="scorecard-criteria-item"><div class="criteria-top"><div class="criteria-label"><span class="criteria-label-icon">${c.icon}</span>${c.label}</div><div style="display:flex; align-items:center; gap:8px;"><span class="criteria-score-badge ${c.status}">${c.score}/${c.max}</span><span class="criteria-value">${c.value}</span></div></div><div class="criteria-bar-bg"><div class="criteria-bar-fill" style="width:${pct}%; background:${barColor};"></div></div><div class="criteria-desc">${c.desc}</div></div>`;
        }).join('');

        const passCount = criteria.filter(c => c.status === 'pass').length;
        verdictEl.innerHTML = `<div class="scorecard-verdict-title">🧠 Kesimpulan Value Investing</div><div class="scorecard-verdict-text"><strong>${currentSymbol}</strong> ${normalizedScore >= 60 ? 'layak dipertimbangkan untuk investasi jangka panjang' : 'perlu riset lebih dalam atau dihindari'}. Skor total: ${normalizedScore}/100.</div><div class="scorecard-stats-row"><div class="scorecard-stat-box"><span class="scorecard-stat-label">Lolos</span><span class="scorecard-stat-value excellent">${passCount}/10</span></div><div class="scorecard-stat-box"><span class="scorecard-stat-label">Skor</span><span class="scorecard-stat-value ${verdictClass}">${normalizedScore}</span></div><div class="scorecard-stat-box"><span class="scorecard-stat-label">Verdict</span><span class="scorecard-stat-value ${verdictClass}">${verdictLabel}</span></div></div>`;
        verdictEl.style.display = 'block';

    } catch (error) {
        heroEl.innerHTML = `<div class="analysis-error"><p>❌ Gagal menganalisis Scorecard</p><p class="error-detail">${error.message}</p></div>`;
    }
}
function closeScorecardModal() { document.getElementById('scorecardModal').classList.remove('active'); }

// ============ DCF VALUATION ============
async function openDcfModal() {
    if (!currentSymbol || currentType === 'crypto') return;
    const modal = document.getElementById('dcfModal');
    if (!modal) return;
    modal.classList.add('active');
    document.getElementById('dcfTitle').textContent = `${currentSymbol} — ${currentName}`;
    const heroEl = document.getElementById('dcfHero');
    heroEl.innerHTML = '<div class="scorecard-loading"><div class="loading-spinner"></div><p class="loading-text">🤖 Mengambil data fundamental...</p></div>';

    try {
        const fund = await fetchFundamental(currentSymbol, currentType);
        // Auto-fill EPS
        const eps = fund.eps || fund.trailing_eps || 0;
        document.getElementById('dcfEps').value = eps;
        document.getElementById('dcfResult').style.display = 'none';
        document.getElementById('dcfSensitivity').style.display = 'none';
        document.getElementById('dcfMethods').style.display = 'none';
        heroEl.innerHTML = `<div class="dcf-intrinsic-label">Current Price</div><div class="dcf-intrinsic-value fair">$${currentPrice.toFixed(2)}</div><div class="dcf-hero-desc">Sesuaikan asumsi DCF di bawah untuk melihat valuasi intrinsik.</div>`;
    } catch (error) {
        heroEl.innerHTML = `<div class="analysis-error"><p>❌ Gagal mengambil data fundamental</p></div>`;
    }
}
function closeDcfModal() { document.getElementById('dcfModal').classList.remove('active'); }

function calculateDCF() {
    const eps = parseFloat(document.getElementById('dcfEps').value) || 0;
    const growth1 = (parseFloat(document.getElementById('dcfGrowth1').value) || 10) / 100;
    const growth2 = (parseFloat(document.getElementById('dcfGrowth2').value) || 5) / 100;
    const terminal = (parseFloat(document.getElementById('dcfTerminal').value) || 2.5) / 100;
    const discount = (parseFloat(document.getElementById('dcfDiscount').value) || 10) / 100;

    if (eps <= 0) { alert('EPS harus > 0 untuk DCF!'); return; }

    // Projections
    let pv = 0;
    let currentEps = eps;
    const projections = [];

    // 5 years phase 1
    for (let i = 1; i <= 5; i++) {
        currentEps = currentEps * (1 + growth1);
        pv += currentEps / Math.pow(1 + discount, i);
        projections.push({ year: i, eps: currentEps });
    }
    // 5 years phase 2
    for (let i = 6; i <= 10; i++) {
        currentEps = currentEps * (1 + growth2);
        pv += currentEps / Math.pow(1 + discount, i);
        projections.push({ year: i, eps: currentEps });
    }
    
    // Terminal Value (Gordon Growth)
    const terminalEps = currentEps * (1 + terminal);
    const terminalValue = terminalEps / (discount - terminal);
    const pvTerminal = terminalValue / Math.pow(1 + discount, 10);
    
    const intrinsicValue = pv + pvTerminal;
    const currentPriceVal = currentPrice;
    
    // Verdict
    let verdict = 'FAIR'; let verdictClass = 'fair'; let mos = ((intrinsicValue - currentPriceVal) / intrinsicValue) * 100;
    
    if (intrinsicValue > currentPriceVal * 1.15) { verdict = 'UNDERVALUED'; verdictClass = 'undervalued'; }
    else if (intrinsicValue < currentPriceVal * 0.85) { verdict = 'OVERVALUED'; verdictClass = 'overvalued'; }

    const dcfResultEl = document.getElementById('dcfResult');
    dcfResultEl.style.display = 'flex';
    dcfResultEl.innerHTML = `
        <div class="dcf-result-title">📊 Hasil Valuasi DCF</div>
        <div class="dcf-result-row"><span class="dcf-result-label">Intrinsic Value (Per Share)</span><span class="dcf-result-value positive">$${intrinsicValue.toFixed(2)}</span></div>
        <div class="dcf-result-row"><span class="dcf-result-label">Harga Saat Ini</span><span class="dcf-result-value">$${currentPriceVal.toFixed(2)}</span></div>
        <div class="dcf-result-row"><span class="dcf-result-label">Margin of Safety</span><span class="dcf-result-value ${mos > 0 ? 'positive' : 'negative'}">${mos > 0 ? '+' : ''}${mos.toFixed(2)}%</span></div>
        <div class="dcf-result-row"><span class="dcf-result-label">Estimasi EPS 10 Tahun</span><span class="dcf-result-value">$${projections[projections.length-1].eps.toFixed(2)}</span></div>
    `;

    const heroEl = document.getElementById('dcfHero');
    heroEl.className = `dcf-hero ${verdictClass}`;
    heroEl.innerHTML = `
        <div class="dcf-intrinsic-label">Intrinsic Value Estimate</div>
        <div class="dcf-intrinsic-value ${verdictClass}">$${intrinsicValue.toFixed(2)}</div>
        <div class="dcf-current-price">Harga sekarang: <strong>$${currentPriceVal.toFixed(2)}</strong></div>
        <div class="dcf-verdict-badge ${verdictClass}">${verdict}</div>
        <div class="dcf-margin-of-safety">
            <div class="dcf-mos-item"><span class="dcf-mos-label">Margin of Safety</span><span class="dcf-mos-value ${mos > 0 ? 'positive' : 'negative'}">${mos > 0 ? '+' : ''}${mos.toFixed(2)}%</span></div>
            <div class="dcf-mos-item"><span class="dcf-mos-label">Upside/Downside</span><span class="dcf-mos-value ${mos > 0 ? 'positive' : 'negative'}">${(intrinsicValue/currentPriceVal*100 - 100).toFixed(1)}%</span></div>
        </div>
    `;

    // Sensitivity Matrix
    const dcfSensEl = document.getElementById('dcfSensitivity');
    dcfSensEl.style.display = 'flex';
    let tableHtml = `<div class="dcf-sens-title">🎯 Sensitivity Analysis (Discount vs Growth)</div><div class="dcf-sens-desc">Intrinsic value berdasarkan kombinasi Discount Rate dan Growth Rate.</div><div class="dcf-sens-table">`;
    
    const discounts = [discount - 0.02, discount, discount + 0.02];
    const growths = [growth1 - 0.02, growth1, growth1 + 0.02];

    tableHtml += `<div class="dcf-sens-cell dcf-sens-row-label">Disc \\ Growth</div>`;
    growths.forEach(g => { tableHtml += `<div class="dcf-sens-cell dcf-sens-header">${(g*100).toFixed(0)}%</div>`; });

    discounts.forEach(d => {
        tableHtml += `<div class="dcf-sens-cell dcf-sens-row-label">${(d*100).toFixed(0)}%</div>`;
        growths.forEach(g => {
            let pv = 0; let currentEps = eps;
            for (let i = 1; i <= 5; i++) { currentEps = currentEps * (1 + g); pv += currentEps / Math.pow(1 + d, i); }
            for (let i = 6; i <= 10; i++) { currentEps = currentEps * (1 + growth2); pv += currentEps / Math.pow(1 + d, i); }
            const tv = (currentEps * (1 + terminal)) / (d - terminal);
            const pvTv = tv / Math.pow(1 + d, 10);
            const iv = pv + pvTv;
            
            let cellClass = 'neutral';
            if (iv > currentPriceVal * 1.15) cellClass = 'cheap';
            else if (iv < currentPriceVal * 0.85) cellClass = 'expensive';
            
            tableHtml += `<div class="dcf-sens-cell dcf-sens-value ${cellClass}">$${iv.toFixed(2)}</div>`;
        });
    });
    tableHtml += `</div>`;
    dcfSensEl.innerHTML = tableHtml;

    // Alternative Methods
    const dcfMethodsEl = document.getElementById('dcfMethods');
    dcfMethodsEl.style.display = 'flex';
    
    // Graham Number = sqrt(22.5 * EPS * BVPS)
    const bvps = fund.book_value_per_share || (fund.pb_ratio > 0 ? currentPriceVal / fund.pb_ratio : 0);
    const graham = bvps > 0 ? Math.sqrt(22.5 * eps * bvps) : 0;
    
    // PE Multiple
    const pe = fund.pe_ratio || 15;
    const industryPe = 15; // Asumsi
    const peValuation = eps * industryPe;

    dcfMethodsEl.innerHTML = `
        <div class="dcf-methods-title">⚖️ 3 Metode Alternatif</div>
        <div class="dcf-method-item">
            <div class="dcf-method-name">1. DCF (Discounted Cash Flow)</div>
            <div class="dcf-method-desc">Berdasarkan asumsi pertumbuhan di atas</div>
            <div class="dcf-method-value">$${intrinsicValue.toFixed(2)}</div>
            <div class="dcf-method-verdict ${verdictClass === 'undervalued' ? 'cheap' : verdictClass === 'overvalued' ? 'expensive' : 'fair'}">${verdict}</div>
        </div>
        <div class="dcf-method-item">
            <div class="dcf-method-name">2. Graham Number</div>
            <div class="dcf-method-desc">√(22.5 × EPS × BVPS) ala Benjamin Graham</div>
            <div class="dcf-method-value">$${graham > 0 ? graham.toFixed(2) : 'N/A'}</div>
            ${graham > 0 ? `<div class="dcf-method-verdict ${graham > currentPriceVal ? 'cheap' : 'expensive'}">${graham > currentPriceVal ? 'UNDERVALUED' : 'OVERVALUED'}</div>` : ''}
        </div>
        <div class="dcf-method-item">
            <div class="dcf-method-name">3. P/E Multiple</div>
            <div class="dcf-method-desc">EPS × Fair P/E (15x Industri)</div>
            <div class="dcf-method-value">$${peValuation.toFixed(2)}</div>
            <div class="dcf-method-verdict ${peValuation > currentPriceVal ? 'cheap' : 'expensive'}">${peValuation > currentPriceVal ? 'UNDERVALUED' : 'OVERVALUED'}</div>
        </div>
    `;
}

// ============ EVENT LISTENERS & INIT ============
document.getElementById('browseStockBtn').addEventListener('click', openBrowseModal);
document.getElementById('closeBrowseModal').addEventListener('click', closeBrowseModal);
document.getElementById('browseSearch').addEventListener('input', renderBrowseStocks);
document.querySelectorAll('.cat-btn').forEach(btn => { btn.addEventListener('click', () => { document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); currentBrowseCategory = btn.dataset.cat; renderBrowseStocks(); }); });

// TOMBOL + MANUAL DAN MODALNYA UDAH DIHAPUS TOTAL DARI SINI

document.getElementById('setAlertBtn').addEventListener('click', () => openAlertModal(currentSymbol, currentName, currentPrice, currentType));
document.getElementById('closeAlertModal').addEventListener('click', closeAlertModal);
document.getElementById('cancelAlert').addEventListener('click', closeAlertModal);
document.getElementById('saveAlert').addEventListener('click', saveAlert);
document.getElementById('alertTargetPrice').addEventListener('input', updateAlertPreview);
document.getElementById('alertRsiValue').addEventListener('input', updateAlertPreview);
document.getElementById('alertEmaPeriod').addEventListener('change', updateAlertPreview);
document.getElementById('alertVolumeMultiplier').addEventListener('input', updateAlertPreview);
document.getElementById('alertToastClose').addEventListener('click', closeAlertToast);
document.getElementById('closeChartModal').addEventListener('click', closeAssetDetail);
document.getElementById('runScreener').addEventListener('click', runScreener);

// Scorecard & DCF Listeners
document.getElementById('openScorecardBtn').addEventListener('click', openStockScorecard);
document.getElementById('closeScorecardModal').addEventListener('click', closeScorecardModal);
document.getElementById('openDcfBtn').addEventListener('click', openDcfModal);
document.getElementById('closeDcfModal').addEventListener('click', closeDcfModal);
document.getElementById('dcfCalcBtn').addEventListener('click', calculateDCF);

// Event Listeners Watchlist Baru
document.getElementById('sortWatchlistBtn').addEventListener('click', openSortModal);
document.getElementById('closeSortModal').addEventListener('click', closeSortModal);
document.getElementById('closeMoveFolderModal').addEventListener('click', closeMoveFolderModal);
document.getElementById('cancelMoveFolder').addEventListener('click', closeMoveFolderModal);
document.getElementById('saveMoveFolder').addEventListener('click', saveMoveFolder);
document.getElementById('addGroupBtn').addEventListener('click', openGroupModal);
document.getElementById('closeGroupModal').addEventListener('click', closeGroupModal);
document.getElementById('cancelGroup').addEventListener('click', closeGroupModal);
document.getElementById('saveGroup').addEventListener('click', saveGroup);

// Event Listeners Commodity Baru
document.getElementById('ilCalcBtn').addEventListener('click', calculateIL);
document.getElementById('dcaCalcBtn').addEventListener('click', calculateDCA);
document.getElementById('weightCalcBtn').addEventListener('click', calculateWeightConversion);
document.getElementById('zakatCalcBtn').addEventListener('click', calculateZakat);
document.getElementById('openCommodityCorrelationBtn').addEventListener('click', openCommodityCorrelation);
document.getElementById('closeCommodityCorrelationModal').addEventListener('click', closeCommodityCorrelation);
document.getElementById('commCorrCalcBtn').addEventListener('click', runCommodityCorrelation);
document.getElementById('openDxyCorrelationBtn').addEventListener('click', openDxyCorrelation);
document.getElementById('closeDxyCorrelationModal').addEventListener('click', closeDxyCorrelation);
document.getElementById('dxyCalcBtn').addEventListener('click', runDxyCorrelation);

const holdingModal = document.getElementById('holdingModal');
document.getElementById('addHolding').addEventListener('click', () => holdingModal.classList.add('active'));
document.getElementById('closeHoldingModal').addEventListener('click', () => holdingModal.classList.remove('active'));
document.getElementById('cancelHolding').addEventListener('click', () => holdingModal.classList.remove('active'));
document.getElementById('saveHolding').addEventListener('click', () => { const symbol = document.getElementById('holdingSymbol').value.trim().toUpperCase(); const name = document.getElementById('holdingName').value.trim(); const type = document.getElementById('holdingType').value; const shares = parseFloat(document.getElementById('holdingShares').value); const avgPrice = parseFloat(document.getElementById('holdingAvgPrice').value); if (!symbol || !name || !shares || !avgPrice) { alert('Isi semua field!'); return; } portfolio.push({ id: 'holding-' + Date.now(), symbol, name, type, shares, avgPrice, addedAt: Date.now() }); savePortfolio(); holdingModal.classList.remove('active'); document.getElementById('holdingSymbol').value = ''; document.getElementById('holdingName').value = ''; document.getElementById('holdingShares').value = ''; document.getElementById('holdingAvgPrice').value = ''; renderPortfolio(); analyzePortfolioRisk(); });
document.getElementById('closeNewsDetail').addEventListener('click', closeNewsDetail);
document.getElementById('ndOpenOriginal').addEventListener('click', openNewsOriginal);
document.getElementById('ndCopyLink').addEventListener('click', copyNewsLink);
document.getElementById('currencyOpenBtn').addEventListener('click', openCurrencyModal);
document.getElementById('closeCurrencyModal').addEventListener('click', closeCurrencyModal);
document.getElementById('currencyFromAmount').addEventListener('input', convertCurrency);
document.getElementById('currencyFromSelect').addEventListener('change', convertCurrency);
document.getElementById('currencyToSelect').addEventListener('change', () => { const val = document.getElementById('currencyToSelect').value; document.querySelectorAll('.quick-target-btn').forEach(b => b.classList.toggle('active', b.dataset.cur === val)); convertCurrency(); });
document.getElementById('currencySwapBtn').addEventListener('click', () => { const btn = document.getElementById('currencySwapBtn'); btn.style.transform = 'rotate(180deg)'; setTimeout(() => btn.style.transform = 'rotate(0deg)', 300); swapCurrencies(); });
document.getElementById('currencyRefreshBtn').addEventListener('click', async () => { const btn = document.getElementById('currencyRefreshBtn'); btn.querySelector('.refresh-icon').style.animation = 'spin 1s linear infinite'; await fetchCurrencyRates(true); await convertCurrency(); updateGoldIdrPrice(); btn.querySelector('.refresh-icon').style.animation = ''; });
document.querySelectorAll('.quick-amount-btn').forEach(btn => { btn.addEventListener('click', () => { document.querySelectorAll('.quick-amount-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); document.getElementById('currencyFromAmount').value = btn.dataset.amount; convertCurrency(); }); });
document.getElementById('closeSectorDetail').addEventListener('click', closeSectorDetail);
document.getElementById('runCompareBtn').addEventListener('click', runCompare);
document.getElementById('compareVsBtn').addEventListener('click', swapCompareStocks);
document.getElementById('closeDetailModal').addEventListener('click', closeIndeksDetail);
let indeksSearchDebounce;
document.getElementById('indeksSearch').addEventListener('input', (e) => { clearTimeout(indeksSearchDebounce); indeksSearchDebounce = setTimeout(() => { indeksSearch = e.target.value.trim(); renderIndices(); }, 300); });
document.querySelectorAll('.indeks-filter-btn').forEach(btn => { btn.addEventListener('click', () => { document.querySelectorAll('.indeks-filter-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); indeksFilter = btn.dataset.region; renderIndices(); }); });
document.getElementById('openCryptoConverterBtn').addEventListener('click', openCryptoConverter);
document.getElementById('closeCryptoConverterModal').addEventListener('click', closeCryptoConverter);
document.getElementById('cryptoConvSwapBtn').addEventListener('click', swapCryptoConverter);
document.getElementById('cryptoConvAmount').addEventListener('input', convertCrypto);
document.getElementById('cryptoConvFrom').addEventListener('change', convertCrypto);
document.getElementById('cryptoConvTo').addEventListener('change', convertCrypto);
document.getElementById('cryptoConvRefreshBtn').addEventListener('click', async () => { await loadCryptoData(); populateCryptoConverterDropdowns(); convertCrypto(); });

// ============ CRYPTO CORRELATION EVENTS ============
const openCorrBtn = document.getElementById('openCryptoCorrelationBtn');
if (openCorrBtn) openCorrBtn.addEventListener('click', openCryptoCorrelation);
const closeCorrBtn = document.getElementById('closeCryptoCorrelationModal');
if (closeCorrBtn) closeCorrBtn.addEventListener('click', closeCryptoCorrelation);
const corrCalcBtn = document.getElementById('corrCalcBtn');
if (corrCalcBtn) corrCalcBtn.addEventListener('click', runCryptoCorrelation);
const openCryptoScorecardBtn = document.getElementById('openCryptoScorecardBtn');
if (openCryptoScorecardBtn) openCryptoScorecardBtn.addEventListener('click', openCryptoScorecard);
const closeCryptoScorecardModal = document.getElementById('closeCryptoScorecardModal');
if (closeCryptoScorecardModal) closeCryptoScorecardModal.addEventListener('click', closeCryptoScorecard);

// ============ INIT ============
populateCurrencyDropdowns();
populateCompareDropdowns();
initStakingCalculator();
renderGroupsBar();
renderWatchlist();
renderPriceAlerts();
fetchMarketMovers();
setTimeout(() => checkAlerts(), 5000);
alertCheckInterval = setInterval(checkAlerts, 60000);
