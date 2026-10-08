// ============ KONFIGURASI ============
const SUPABASE_URL = "https://twxsupmgnmkzsyiqebln.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_9KSdez89Nm7-zE2I2-yzMA_9NPYAMRC";

let indicatorInterval = null;

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

function saveWatchlist() {
    localStorage.setItem('fitraWatchlist', JSON.stringify(watchlist));
}

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
            'BTC': 'BINANCE:BTCUSDT',
            'ETH': 'BINANCE:ETHUSDT',
            'SOL': 'BINANCE:SOLUSDT',
            'BNB': 'BINANCE:BNBUSDT',
            'XRP': 'BINANCE:XRPUSDT',
            'ADA': 'BINANCE:ADAUSDT',
            'DOGE': 'BINANCE:DOGEUSDT',
            'MATIC': 'BINANCE:MATICUSDT',
        };
        return cryptoSymbols[upperSymbol] || 'BINANCE:' + upperSymbol + 'USDT';
    }
    
    if (type === 'commodity') {
        const commoditySymbols = {
            'GC=F': 'TVC:GOLD',
            'SI=F': 'TVC:SILVER',
            'CL=F': 'TVC:USOIL',
            'NG=F': 'TVC:NATURALGAS',
        };
        return commoditySymbols[upperSymbol] || 'TVC:GOLD';
    }
    
    const nyseStocks = ['JPM', 'V', 'WMT', 'DIS', 'KO', 'MCD', 'NKE', 'GS', 'AXP', 'BA', 'CAT', 'CVX', 'IBM', 'JNJ', 'MMM', 'PG', 'TRV', 'UNH', 'VZ', 'HD', 'HON', 'CRM'];
    if (nyseStocks.includes(upperSymbol)) {
        return 'NYSE:' + upperSymbol;
    }
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

// ============ FETCH CHART DATA ============
async function fetchChartData(symbol, type, interval = '1d', range = '1mo') {
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
        return data.data || [];
    } catch (error) {
        console.error('Error fetching chart data:', error);
        return [];
    }
}

// ============ RENDER WATCHLIST ============
async function renderWatchlist() {
    const container = document.getElementById('watchlist');
    container.innerHTML = '<div class="empty-state">Memuat data...</div>';
    
    if (watchlist.length === 0) {
        container.innerHTML = '<div class="empty-state">Watchlist kosong. Klik ＋ buat nambah aset.</div>';
        return;
    }
    
    const results = await Promise.all(
        watchlist.map(async (asset) => {
            const priceData = await fetchPrice(asset.symbol, asset.type);
            return { ...asset, priceData };
        })
    );
    
    container.innerHTML = results.map((asset, index) => {
        const p = asset.priceData;
        if (!p) return `
            <div class="watchlist-card-wrapper">
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
                <button class="watchlist-delete" onclick="deleteFromWatchlist(${index})">×</button>
            </div>
        `;
        
        const trend = p.change >= 0 ? 'up' : 'down';
        const changeStr = (p.change >= 0 ? '+' : '') + p.change.toFixed(2) + '%';
        const priceStr = '$' + p.price.toLocaleString('en-US', { maximumFractionDigits: 2 });
        
        return `
            <div class="watchlist-card-wrapper">
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
                <button class="watchlist-delete" onclick="deleteFromWatchlist(${index})">×</button>
            </div>
        `;
    }).join('');
}

function deleteFromWatchlist(index) {
    const asset = watchlist[index];
    if (!confirm(`Hapus ${asset.symbol} dari watchlist?`)) return;
    watchlist.splice(index, 1);
    saveWatchlist();
    renderWatchlist();
}

// ============ MODAL TAMBAH ASSET ============
const assetModal = document.getElementById('assetModal');

document.getElementById('addAssetBtn').addEventListener('click', () => {
    assetModal.classList.add('active');
});

document.getElementById('closeAssetModal').addEventListener('click', () => {
    assetModal.classList.remove('active');
});

document.getElementById('cancelAsset').addEventListener('click', () => {
    assetModal.classList.remove('active');
});

document.getElementById('saveAsset').addEventListener('click', () => {
    const symbol = document.getElementById('assetSymbol').value.trim().toUpperCase();
    const name = document.getElementById('assetName').value.trim();
    const type = document.getElementById('assetType').value;
    
    if (!symbol || !name) {
        alert('Isi semua field dulu!');
        return;
    }
    
    if (watchlist.some(a => a.symbol === symbol)) {
        alert(`${symbol} udah ada di watchlist!`);
        return;
    }
    
    watchlist.push({ symbol, name, type });
    saveWatchlist();
    assetModal.classList.remove('active');
    
    document.getElementById('assetSymbol').value = '';
    document.getElementById('assetName').value = '';
    
    renderWatchlist();
});

// ============ INDIKATOR CALCULATIONS ============
function calcEMA(closes, period) {
    if (closes.length < period) return closes[closes.length - 1] || 0;
    const k = 2 / (period + 1);
    let ema = closes[0];
    for (let i = 1; i < closes.length; i++) {
        ema = closes[i] * k + ema * (1 - k);
    }
    return ema;
}

function calcRSI(closes, period = 14) {
    if (closes.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff; else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
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
    recent.forEach(c => {
        if (c.close >= c.open) buyVol += c.volume || 0;
        else sellVol += c.volume || 0;
    });
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

    const ema20 = calcEMA(closes, 20);
    const ema5 = calcEMA(closes, 5);
    const rsi = calcRSI(closes, 14);

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
    updateChartPrice();
    
    document.getElementById('analysisBody').innerHTML = `
        <div class="loading-spinner"></div>
        <p class="loading-text" id="loadingText">Mengambil data fundamental...</p>
    `;
    
    document.getElementById('htfValue').textContent = '-';
    document.getElementById('ltfValue').textContent = '-';
    document.getElementById('ema20Value').textContent = '-';
    document.getElementById('rsiValue').textContent = '-';
    document.getElementById('bidValue').textContent = '-';
    document.getElementById('askValue').textContent = '-';
    document.getElementById('buyerPct').textContent = '-';
    document.getElementById('sellerPct').textContent = '-';
    
    loadTradingViewChart(symbol, type);
    updateIndicators(symbol, type);
    loadAnalysis(symbol, name, price, type);
    
    if (indicatorInterval) clearInterval(indicatorInterval);
    indicatorInterval = setInterval(() => {
        if (currentSymbol) updateIndicators(currentSymbol, currentType);
    }, 15000);
}

function updateChartPrice() {
    const changeStr = (currentChange >= 0 ? '+' : '') + currentChange.toFixed(2) + '%';
    const priceStr = '$' + currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 });
    const priceEl = document.getElementById('chartPrice');
    priceEl.textContent = priceStr + '  ' + changeStr;
    priceEl.style.color = currentChange >= 0 ? '#10b981' : '#ef4444';
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
            "hide_side_toolbar": true,
            "hide_top_toolbar": false,
            "withdateranges": false,
            "details": false,
            "hotlist": false,
            "calendar": false,
            "studies": [],
            "overrides": {
                "mainSeriesProperties.candleStyle.upColor": "#ffffff",
                "mainSeriesProperties.candleStyle.downColor": "#a855f7",
                "mainSeriesProperties.candleStyle.borderUpColor": "#ffffff",
                "mainSeriesProperties.candleStyle.borderDownColor": "#a855f7",
                "mainSeriesProperties.candleStyle.wickUpColor": "#ffffff",
                "mainSeriesProperties.candleStyle.wickDownColor": "#a855f7",
                "mainSeriesProperties.candleStyle.drawBorder": true,
                "mainSeriesProperties.candleStyle.drawWick": true,
                "paneProperties.background": "#0a0a0f",
                "paneProperties.backgroundType": "solid",
                "paneProperties.vertGridProperties.color": "rgba(255, 255, 255, 0.04)",
                "paneProperties.horzGridProperties.color": "rgba(255, 255, 255, 0.04)",
                "scalesProperties.textColor": "rgba(255, 255, 255, 0.6)",
                "scalesProperties.lineColor": "rgba(255, 255, 255, 0.08)",
                "mainSeriesProperties.volumeStyle.upColor": "rgba(255, 255, 255, 0.5)",
                "mainSeriesProperties.volumeStyle.downColor": "rgba(168, 85, 247, 0.5)"
            },
            "show_popup_button": false,
            "popup_width": "1000",
            "popup_height": "650",
        });
    } else {
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.4);font-size:12px;">TradingView gagal dimuat.</div>';
    }
}

async function loadAnalysis(symbol, name, price, type) {
    const container = document.getElementById('analysisBody');
    
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
    } catch (error) {
        container.innerHTML = `
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

function closeAssetDetail() {
    document.getElementById('chartModal').classList.remove('active');
    document.getElementById('tradingviewContainer').innerHTML = '';
    if (indicatorInterval) {
        clearInterval(indicatorInterval);
        indicatorInterval = null;
    }
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

// ============ PORTFOLIO ============
async function renderPortfolio() {
    const container = document.getElementById('holdings');
    const totalValueEl = document.getElementById('totalValue');
    const unrealizedPLEl = document.getElementById('unrealizedPL');
    const totalCostEl = document.getElementById('totalCost');
    const totalHoldingsEl = document.getElementById('totalHoldings');
    
    if (portfolio.length === 0) {
        container.innerHTML = '<div class="empty-state">Belum ada holding. Klik "Tambah Holding" buat mulai.</div>';
        totalValueEl.textContent = '$ 0';
        unrealizedPLEl.textContent = '$ 0';
        totalCostEl.textContent = '$ 0';
        totalHoldingsEl.textContent = '0';
        return;
    }
    
    container.innerHTML = '<div class="empty-state">Memuat harga...</div>';
    
    const holdingsWithPrice = await Promise.all(
        portfolio.map(async (h) => {
            const priceData = await fetchPrice(h.symbol, h.type);
            return { ...h, currentPrice: priceData?.price || 0 };
        })
    );
    
    let totalValue = 0;
    let totalCost = 0;
    
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
    totalValueEl.style.color = '#fbbf24';
    
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

// ============ MODAL TAMBAH HOLDING ============
const holdingModal = document.getElementById('holdingModal');

document.getElementById('addHolding').addEventListener('click', () => {
    holdingModal.classList.add('active');
});

document.getElementById('closeHoldingModal').addEventListener('click', () => {
    holdingModal.classList.remove('active');
});

document.getElementById('cancelHolding').addEventListener('click', () => {
    holdingModal.classList.remove('active');
});

document.getElementById('saveHolding').addEventListener('click', () => {
    const symbol = document.getElementById('holdingSymbol').value.trim().toUpperCase();
    const name = document.getElementById('holdingName').value.trim();
    const type = document.getElementById('holdingType').value;
    const shares = parseFloat(document.getElementById('holdingShares').value);
    const avgPrice = parseFloat(document.getElementById('holdingAvgPrice').value);
    
    if (!symbol || !name || !shares || !avgPrice) {
        alert('Isi semua field dulu!');
        return;
    }
    
    portfolio.push({
        id: 'holding-' + Date.now(),
        symbol,
        name,
        type,
        shares,
        avgPrice,
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
        const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-news`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ category: 'all' })
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        const news = data.news || [];
        
        if (news.length === 0) {
            container.innerHTML = '<div class="empty-state">Belum ada berita</div>';
            return;
        }
        
        container.innerHTML = news.map(item => {
            const time = formatTime(item.timePublished);
            return `
                <div class="news-card" onclick="window.open('${item.url}', '_blank')">
                    <div class="news-title">${item.title}</div>
                    <div class="news-summary">${item.summary ? item.summary.substring(0, 150) + '...' : ''}</div>
                    <div class="news-meta">
                        <span class="sentiment-tag neutral">${(item.category || 'NEWS').toUpperCase()}</span>
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
