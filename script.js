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
            return {
                price: data.price,
                currency: 'USD',
                change: data.change || 0,
                name: data.name || symbol
            };
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
            <div class="asset-card" onclick="openChart('${asset.symbol}', '${p.name || asset.name}', ${p.price}, ${p.change}, '${asset.type}')">
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

// ============ CHART ============
let currentChart = null;
let currentCandlestick = null;
let currentSymbol = null;
let currentType = null;
let currentPrice = 0;
let currentChange = 0;

async function openChart(symbol, name, price, change, type) {
    currentSymbol = symbol;
    currentType = type;
    currentPrice = price;
    currentChange = change;
    
    const modal = document.getElementById('chartModal');
    modal.classList.add('active');
    
    document.getElementById('chartTitle').textContent = symbol + ' — ' + name;
    updateChartPrice();
    
    // Reset timeframe aktif ke 1M
    document.querySelectorAll('.tf-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.range === '1m');
    });
    
    await loadChart(symbol, type, '1m');
}

function updateChartPrice() {
    const changeStr = (currentChange >= 0 ? '+' : '') + currentChange.toFixed(2) + '%';
    const priceStr = '$' + currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 });
    const priceEl = document.getElementById('chartPrice');
    priceEl.textContent = priceStr + '  ' + changeStr;
    priceEl.style.color = currentChange >= 0 ? '#10b981' : '#ef4444';
}

async function loadChart(symbol, type, range) {
    const container = document.getElementById('chartContainer');
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.4);font-size:13px;">Memuat chart...</div>';
    
    try {
        // Map range ke interval + yahoo range
        let interval = '1d';
        let yahooRange = range;
        if (range === '1w') { interval = '1h'; yahooRange = '5d'; }
        else if (range === '1m') { interval = '1d'; yahooRange = '1mo'; }
        else if (range === '3m') { interval = '1d'; yahooRange = '3mo'; }
        else if (range === '1y') { interval = '1wk'; yahooRange = '1y'; }
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-chart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ symbol, type, interval, range: yahooRange })
        });
        
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        const candles = data.data || [];
        
        if (candles.length === 0) {
            container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.4);font-size:13px;">Chart tidak tersedia</div>';
            return;
        }
        
        // Render chart
        container.innerHTML = '';
        
        const chart = LightweightCharts.createChart(container, {
            layout: {
                background: { color: 'transparent' },
                textColor: 'rgba(255, 255, 255, 0.6)',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.08)',
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.08)',
                timeVisible: true,
                secondsVisible: false,
            },
            handleScroll: true,
            handleScale: true,
        });
        
        const candlestick = chart.addCandlestickSeries({
            upColor: '#10b981',
            downColor: '#ef4444',
            borderDownColor: '#ef4444',
            borderUpColor: '#10b981',
            wickDownColor: '#ef4444',
            wickUpColor: '#10b981',
        });
        
        // Format data buat Lightweight Charts
        const chartData = candles.map(c => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        })).filter(c => c.open && c.high && c.low && c.close);
        
        candlestick.setData(chartData);
        chart.timeScale().fitContent();
        
        currentChart = chart;
        currentCandlestick = candlestick;
        
        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
            chart.applyOptions({ 
                width: container.clientWidth, 
                height: container.clientHeight 
            });
        });
        resizeObserver.observe(container);
        
    } catch (error) {
        container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;font-size:13px;">❌ ${error.message}</div>`;
    }
}

function closeChart() {
    document.getElementById('chartModal').classList.remove('active');
    if (currentChart) {
        currentChart.remove();
        currentChart = null;
        currentCandlestick = null;
    }
}

// Event: timeframe buttons
document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (currentSymbol) {
            loadChart(currentSymbol, currentType, btn.dataset.range);
        }
    });
});

document.getElementById('closeChartModal').addEventListener('click', closeChart);

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
