// ============ KONFIGURASI ============
const SUPABASE_URL = "https://twxsupmgnmkzsyiqebln.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_9KSdez89Nm7-zE2I2-yzMA_9NPYAMRC";

let currentFilter = 'all';
let currentSearch = '';
let currentDetailChart = null;
let currentDetailSymbol = null;

// ============ DATABASE INDEKS GLOBAL ============
const GLOBAL_INDICES = [
    // ============ AMERICAS ============
    {
        symbol: '^GSPC',
        name: 'S&P 500',
        country: 'United States',
        region: 'americas',
        flag: '🇺🇸',
        sectors: [
            { name: 'Technology', pct: 29.5, color: '#22d3ee' },
            { name: 'Financials', pct: 13.2, color: '#fbbf24' },
            { name: 'Healthcare', pct: 12.8, color: '#10b981' },
            { name: 'Consumer Discretionary', pct: 10.5, color: '#a855f7' },
            { name: 'Communication', pct: 9.4, color: '#ec4899' },
            { name: 'Industrials', pct: 7.8, color: '#f97316' },
            { name: 'Others', pct: 16.8, color: '#64748b' }
        ],
        topHoldings: [
            { symbol: 'AAPL', name: 'Apple Inc.' },
            { symbol: 'MSFT', name: 'Microsoft Corp.' },
            { symbol: 'NVDA', name: 'NVIDIA Corp.' },
            { symbol: 'AMZN', name: 'Amazon.com Inc.' },
            { symbol: 'META', name: 'Meta Platforms Inc.' }
        ]
    },
    {
        symbol: '^DJI',
        name: 'Dow Jones',
        country: 'United States',
        region: 'americas',
        flag: '🇺🇸',
        sectors: [
            { name: 'Technology', pct: 22.1, color: '#22d3ee' },
            { name: 'Financials', pct: 17.4, color: '#fbbf24' },
            { name: 'Healthcare', pct: 15.2, color: '#10b981' },
            { name: 'Industrials', pct: 14.8, color: '#f97316' },
            { name: 'Consumer Discretionary', pct: 12.3, color: '#a855f7' },
            { name: 'Others', pct: 18.2, color: '#64748b' }
        ],
        topHoldings: [
            { symbol: 'UNH', name: 'UnitedHealth' },
            { symbol: 'GS', name: 'Goldman Sachs' },
            { symbol: 'MSFT', name: 'Microsoft' },
            { symbol: 'HD', name: 'Home Depot' },
            { symbol: 'MCD', name: 'McDonald\'s' }
        ]
    },
    {
        symbol: '^IXIC',
        name: 'NASDAQ Composite',
        country: 'United States',
        region: 'americas',
        flag: '🇺🇸',
        sectors: [
            { name: 'Technology', pct: 51.2, color: '#22d3ee' },
            { name: 'Communication', pct: 15.6, color: '#ec4899' },
            { name: 'Consumer Discretionary', pct: 12.4, color: '#a855f7' },
            { name: 'Healthcare', pct: 7.8, color: '#10b981' },
            { name: 'Financials', pct: 6.2, color: '#fbbf24' },
            { name: 'Others', pct: 6.8, color: '#64748b' }
        ],
        topHoldings: [
            { symbol: 'AAPL', name: 'Apple' },
            { symbol: 'MSFT', name: 'Microsoft' },
            { symbol: 'NVDA', name: 'NVIDIA' },
            { symbol: 'AMZN', name: 'Amazon' },
            { symbol: 'AVGO', name: 'Broadcom' }
        ]
    },
    {
        symbol: '^RUT',
        name: 'Russell 2000',
        country: 'United States',
        region: 'americas',
        flag: '🇺🇸',
        sectors: [
            { name: 'Financials', pct: 18.4, color: '#fbbf24' },
            { name: 'Healthcare', pct: 17.2, color: '#10b981' },
            { name: 'Industrials', pct: 15.8, color: '#f97316' },
            { name: 'Technology', pct: 14.6, color: '#22d3ee' },
            { name: 'Consumer Discretionary', pct: 12.1, color: '#a855f7' },
            { name: 'Others', pct: 21.9, color: '#64748b' }
        ],
        topHoldings: [
            { symbol: 'SMCI', name: 'Super Micro Computer' },
            { symbol: 'INSM', name: 'Insmed Inc.' },
            { symbol: 'FN', name: 'Fabrinet' },
            { symbol: 'ONTO', name: 'Onto Innovation' },
            { symbol: 'MSTR', name: 'MicroStrategy' }
        ]
    },
    {
        symbol: '^BVSP',
        name: 'Bovespa',
        country: 'Brazil',
        region: 'americas',
        flag: '🇧🇷',
        sectors: [
            { name: 'Financials', pct: 24.8, color: '#fbbf24' },
            { name: 'Materials', pct: 18.2, color: '#f97316' },
            { name: 'Energy', pct: 14.5, color: '#ef4444' },
            { name: 'Consumer Staples', pct: 11.6, color: '#10b981' },
            { name: 'Utilities', pct: 8.4, color: '#22d3ee' },
            { name: 'Others', pct: 22.5, color: '#64748b' }
        ],
        topHoldings: [
            { symbol: 'VALE3.SA', name: 'Vale S.A.' },
            { symbol: 'PETR4.SA', name: 'Petrobras' },
            { symbol: 'ITUB4.SA', name: 'Itaú Unibanco' },
            { symbol: 'BBDC4.SA', name: 'Banco Bradesco' },
            { symbol: 'ABEV3.SA', name: 'Ambev' }
        ]
    },
    {
        symbol: '^GSPTSE',
        name: 'S&P/TSX',
        country: 'Canada',
        region: 'americas',
        flag: '🇨🇦',
        sectors: [
            { name: 'Financials', pct: 32.4, color: '#fbbf24' },
            { name: 'Energy', pct: 17.8, color: '#ef4444' },
            { name: 'Industrials', pct: 12.6, color: '#f97316' },
            { name: 'Materials', pct: 11.2, color: '#a855f7' },
            { name: 'Technology', pct: 7.8, color: '#22d3ee' },
            { name: 'Others', pct: 18.2, color: '#64748b' }
        ],
        topHoldings: [
            { symbol: 'RY.TO', name: 'Royal Bank of Canada' },
            { symbol: 'TD.TO', name: 'Toronto-Dominion Bank' },
            { symbol: 'SHOP.TO', name: 'Shopify Inc.' },
            { symbol: 'ENB.TO', name: 'Enbridge Inc.' },
            { symbol: 'CNR.TO', name: 'Canadian National Railway' }
        ]
    },

    // ============ EUROPE ============
    {
        symbol: '^FTSE',
        name: 'FTSE 100',
        country: 'United Kingdom',
        region: 'europe',
        flag: '🇬🇧',
        sectors: [
            { name: 'Financials', pct: 20.5, color: '#fbbf24' },
            { name: 'Consumer Staples', pct: 16.4, color: '#10b981' },
            { name: 'Energy', pct: 13.8, color: '#ef4444' },
            { name: 'Healthcare', pct: 12.2, color: '#22d3ee' },
            { name: 'Industrials', pct: 11.6, color: '#f97316' },
            { name: 'Others', pct: 25.5, color: '#64748b' }
        ],
        topHoldings: [
            { symbol: 'SHEL.L', name: 'Shell plc' },
            { symbol: 'AZN.L', name: 'AstraZeneca' },
            { symbol: 'HSBA.L', name: 'HSBC Holdings' },
            { symbol: 'ULVR.L', name: 'Unilever' },
            { symbol: 'BP.L', name: 'BP plc' }
        ]
    },
    {
        symbol: '^GDAXI',
        name: 'DAX',
        country: 'Germany',
        region: 'europe',
        flag: '🇩🇪',
        sectors: [
            { name: 'Industrials', pct: 22.4, color: '#f97316' },
            { name: 'Technology', pct: 18.6, color: '#22d3ee' },
            { name: 'Financials', pct: 16.8, color: '#fbbf24' },
            { name: 'Consumer Discretionary', pct: 14.2, color: '#a855f7' },
            { name: 'Healthcare', pct: 12.1, color: '#10b981' },
            { name: 'Others', pct: 15.9, color: '#64748b' }
        ],
        topHoldings: [
            { symbol: 'SAP.DE', name: 'SAP SE' },
            { symbol: 'SIE.DE', name: 'Siemens AG' },
            { symbol: 'ALV.DE', name: 'Allianz SE' },
            { symbol: 'DTE.DE', name: 'Deutsche Telekom' },
            { symbol: 'AIR.DE', name: 'Airbus SE' }
        ]
    },
    {
        symbol: '^FCHI',
        name: 'CAC 40',
        country: 'France',
        region: 'europe',
        flag: '🇫🇷',
        sectors: [
            { name: 'Consumer Discretionary', pct: 20.8, color: '#a855f7' },
            { name: 'Industrials', pct: 18.2, color: '#f97316' },
            { name: 'Financials', pct: 15.6, color: '#fbbf24' },
            { name: 'Consumer Staples', pct: 14.4, color: '#10b981' },
            { name: 'Healthcare', pct: 11.8, color: '#22d3ee' },
            { name: 'Others', pct: 19.2, color: '#64748b' }
        ],
        topHoldings: [
            { symbol: 'MC.PA', name: 'LVMH' },
            { symbol: 'OR.PA', name: 'L\'Oréal' },
            { symbol: 'TTE.PA', name: 'TotalEnergies' },
            { symbol: 'RMS.PA', name: 'Hermès' },
            { symbol: 'SAN.PA', name: 'Sanofi' }
        ]
    },
    {
        symbol: '^STOXX50E',
        name: 'Euro Stoxx 50',
        country: 'Eurozone',
        region: 'europe',
        flag: '🇪🇺',
        sectors: [
            { name: 'Financials', pct: 21.2, color: '#fbbf24' },
            { name: 'Industrials', pct: 17.4, color: '#f97316' },
            { name: 'Consumer Discretionary', pct: 15.8, color: '#a855f7' },
            { name: 'Technology', pct: 14.6, color: '#22d3ee' },
            { name: 'Healthcare', pct: 12.2, color: '#10b981' },
            { name: 'Others', pct: 18.8, color: '#64748b' }
        ],
        topHoldings: [
            { symbol: 'ASML.AS', name: 'ASML Holding' },
            { symbol: 'MC.PA', name: 'LVMH' },
            { symbol: 'SAP.DE', name: 'SAP SE' },
            { symbol: 'NESN.SW', name: 'Nestlé' },
            { symbol: 'SIE.DE', name: 'Siemens' }
        ]
    },

    // ============ ASIA ============
    {
        symbol: '^N225',
        name: 'Nikkei 225',
        country: 'Japan',
        region: 'asia',
        flag: '🇯🇵',
        sectors: [
            { name: 'Technology', pct: 24.5, color: '#22d3ee' },
            { name: 'Industrials', pct: 18.4, color: '#f97316' },
            { name: 'Consumer Discretionary', pct: 16.2, color: '#a855f7' },
            { name: 'Financials', pct: 13.8, color: '#fbbf24' },
            { name: 'Healthcare', pct: 10.4, color: '#10b981' },
            { name: 'Others', pct: 16.7, color: '#64748b' }
        ],
        topHoldings: [
            { symbol: '7203.T', name: 'Toyota Motor' },
            { symbol: '6758.T', name: 'Sony Group' },
            { symbol: '6861.T', name: 'Keyence' },
            { symbol: '9984.T', name: 'SoftBank Group' },
            { symbol: '8306.T', name: 'Mitsubishi UFJ' }
        ]
    },
    {
        symbol: '^HSI',
        name: 'Hang Seng',
        country: 'Hong Kong',
        region: 'asia',
        flag: '🇭🇰',
        sectors: [
            { name: 'Financials', pct: 32.6, color: '#fbbf24' },
            { name: 'Technology', pct: 21.4, color: '#22d3ee' },
            { name: 'Consumer Discretionary', pct: 15.2, color: '#a855f7' },
            { name: 'Real Estate', pct: 11.8, color: '#ef4444' },
            { name: 'Telecom', pct: 8.4, color: '#10b981' },
            { name: 'Others', pct: 10.6, color: '#64748b' }
        ],
        topHoldings: [
            { symbol: '0700.HK', name: 'Tencent Holdings' },
            { symbol: '0005.HK', name: 'HSBC Holdings' },
            { symbol: '9988.HK', name: 'Alibaba Group' },
            { symbol: '1299.HK', name: 'AIA Group' },
            { symbol: '3690.HK', name: 'Meituan' }
        ]
    },
    {
        symbol: '000001.SS',
        name: 'Shanghai Composite',
        country: 'China',
        region: 'asia',
        flag: '🇨🇳',
        sectors: [
            { name: 'Financials', pct: 28.4, color: '#fbbf24' },
            { name: 'Industrials', pct: 18.6, color: '#f97316' },
            { name: 'Consumer Staples', pct: 14.2, color: '#10b981' },
            { name: 'Materials', pct: 12.8, color: '#a855f7' },
            { name: 'Technology', pct: 10.4, color: '#22d3ee' },
            { name: 'Others', pct: 15.6, color: '#64748b' }
        ],
        topHoldings: [
            { symbol: '601398.SS', name: 'ICBC' },
            { symbol: '600519.SS', name: 'Kweichow Moutai' },
            { symbol: '601857.SS', name: 'PetroChina' },
            { symbol: '601288.SS', name: 'Agricultural Bank of China' },
            { symbol: '600036.SS', name: 'China Merchants Bank' }
        ]
    },
    {
        symbol: '^NSEI',
        name: 'NIFTY 50',
        country: 'India',
        region: 'asia',
        flag: '🇮🇳',
        sectors: [
            { name: 'Financials', pct: 34.8, color: '#fbbf24' },
            { name: 'Technology', pct: 16.4, color: '#22d3ee' },
            { name: 'Energy', pct: 12.6, color: '#ef4444' },
            { name: 'Consumer Goods', pct: 11.2, color: '#10b981' },
            { name: 'Auto', pct: 8.4, color: '#a855f7' },
            { name: 'Others', pct: 16.6, color: '#64748b' }
        ],
        topHoldings: [
            { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
            { symbol: 'TCS.NS', name: 'Tata Consultancy' },
            { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
            { symbol: 'INFY.NS', name: 'Infosys' },
            { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' }
        ]
    },

    // ============ OCEANIA ============
    {
        symbol: '^AXJO',
        name: 'ASX 200',
        country: 'Australia',
        region: 'oceania',
        flag: '🇦🇺',
        sectors: [
            { name: 'Financials', pct: 30.2, color: '#fbbf24' },
            { name: 'Materials', pct: 19.4, color: '#a855f7' },
            { name: 'Healthcare', pct: 11.8, color: '#10b981' },
            { name: 'Consumer Discretionary', pct: 10.4, color: '#22d3ee' },
            { name: 'Industrials', pct: 9.6, color: '#f97316' },
            { name: 'Others', pct: 18.6, color: '#64748b' }
        ],
        topHoldings: [
            { symbol: 'BHP.AX', name: 'BHP Group' },
            { symbol: 'CBA.AX', name: 'Commonwealth Bank' },
            { symbol: 'CSL.AX', name: 'CSL Limited' },
            { symbol: 'NAB.AX', name: 'National Australia Bank' },
            { symbol: 'WBC.AX', name: 'Westpac Banking' }
        ]
    }
];

// ============ UTILITIES ============
function formatNumber(num, decimals = 2) {
    if (num == null || isNaN(num)) return '-';
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatVolume(vol) {
    if (!vol || vol === 0) return '-';
    if (vol >= 1e12) return (vol / 1e12).toFixed(2) + ' T';
    if (vol >= 1e9) return (vol / 1e9).toFixed(2) + ' B';
    if (vol >= 1e6) return (vol / 1e6).toFixed(2) + ' M';
    if (vol >= 1e3) return (vol / 1e3).toFixed(2) + ' K';
    return vol.toString();
}

// ============ FETCH INDEX DATA ============
async function fetchIndexData(symbol) {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-price`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ symbol, type: 'stock' })
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        
        if (data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const meta = result.meta;
            const quote = (result.indicators && result.indicators.quote && result.indicators.quote[0]) || {};
            const volumes = quote.volume || [];
            
            // Ambil volume terakhir yang ada
            let lastVolume = 0;
            for (let i = volumes.length - 1; i >= 0; i--) {
                if (volumes[i] != null && volumes[i] > 0) { lastVolume = volumes[i]; break; }
            }
            
            return {
                price: meta.regularMarketPrice,
                change: meta.regularMarketChangePercent || 0,
                changeNominal: meta.regularMarketChange || 0,
                high: meta.regularMarketDayHigh,
                low: meta.regularMarketDayLow,
                prevClose: meta.chartPreviousClose || meta.previousClose,
                volume: meta.regularMarketVolume || lastVolume,
                currency: meta.currency,
                name: meta.longName || meta.shortName
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetchIndexData (' + symbol + '):', error);
        return null;
    }
}

// ============ FETCH CHART DATA ============
async function fetchIndexChartData(symbol, interval = '1d', range = '1y') {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-chart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ symbol, type: 'stock', interval, range })
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        
        if (data.data && Array.isArray(data.data)) {
            return data.data.map(c => ({
                time: c.time,
                open: parseFloat(c.open),
                high: parseFloat(c.high),
                low: parseFloat(c.low),
                close: parseFloat(c.close),
                volume: parseFloat(c.volume || 0)
            })).filter(c => !isNaN(c.open) && !isNaN(c.close));
        }
        
        if (data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const timestamps = result.timestamp || [];
            const quote = (result.indicators && result.indicators.quote && result.indicators.quote[0]) || {};
            const opens = quote.open || [];
            const highs = quote.high || [];
            const lows = quote.low || [];
            const closes = quote.close || [];
            const volumes = quote.volume || [];
            const candles = [];
            for (let i = 0; i < timestamps.length; i++) {
                if (opens[i] == null || closes[i] == null) continue;
                candles.push({
                    time: timestamps[i],
                    open: opens[i], high: highs[i], low: lows[i], close: closes[i],
                    volume: volumes[i] || 0
                });
            }
            return candles;
        }
        return [];
    } catch (error) {
        console.error('Error fetchIndexChartData:', error);
        return [];
    }
}

// ============ RENDER INDICES LIST ============
async function renderIndices() {
    const list = document.getElementById('indeksList');
    list.innerHTML = `
        <div class="indeks-loading">
            <div class="loading-spinner"></div>
            <p class="loading-text">Memuat indeks global...</p>
        </div>
    `;
    
    // Filter dulu berdasarkan region & search
    let filtered = GLOBAL_INDICES;
    if (currentFilter !== 'all') {
        filtered = filtered.filter(i => i.region === currentFilter);
    }
    if (currentSearch) {
        const q = currentSearch.toLowerCase();
        filtered = filtered.filter(i => 
            i.name.toLowerCase().includes(q) || 
            i.symbol.toLowerCase().includes(q) ||
            i.country.toLowerCase().includes(q)
        );
    }
    
    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state">Gak ada indeks yang match. Coba kata kunci lain.</div>';
        return;
    }
    
    // Fetch semua data paralel
    const withData = await Promise.all(
        filtered.map(async (idx) => {
            const data = await fetchIndexData(idx.symbol);
            return { ...idx, data };
        })
    );
    
    list.innerHTML = withData.map(idx => renderIndeksCard(idx)).join('');
    
    // Update last update time
    const now = new Date();
    document.getElementById('lastUpdated').textContent = 'Terakhir diupdate: ' + 
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ============ RENDER SINGLE CARD ============
function renderIndeksCard(idx) {
    const d = idx.data;
    
    if (!d || d.price == null) {
        return `
            <div class="indeks-card" onclick="openIndeksDetail('${idx.symbol}')">
                <div class="indeks-card-header">
                    <div class="indeks-card-title">
                        <span class="indeks-card-flag">${idx.flag}</span>
                        <div class="indeks-card-name-wrap">
                            <span class="indeks-card-name">${idx.name}</span>
                            <span class="indeks-card-country">${idx.country}</span>
                        </div>
                    </div>
                    <div class="indeks-card-price-wrap">
                        <div class="indeks-card-price">-</div>
                        <div class="indeks-card-change">Gagal memuat</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    const trend = d.change >= 0 ? 'up' : 'down';
    const sign = d.change >= 0 ? '+' : '';
    const changeStr = `${sign}${d.change.toFixed(2)}%`;
    const changeNominalStr = `${sign}${d.changeNominal.toFixed(2)}`;
    const priceStr = formatNumber(d.price, 2);
    
    // Mini sector bars (ambil 5 teratas)
    const sectorBars = idx.sectors.slice(0, 5).map(s => 
        `<div class="indeks-sector-mini-bar" style="flex:${s.pct}; background:${s.color};"></div>`
    ).join('');
    
    return `
        <div class="indeks-card" onclick="openIndeksDetail('${idx.symbol}')">
            <div class="indeks-card-header">
                <div class="indeks-card-title">
                    <span class="indeks-card-flag">${idx.flag}</span>
                    <div class="indeks-card-name-wrap">
                        <span class="indeks-card-name">${idx.name}</span>
                        <span class="indeks-card-country">${idx.country}</span>
                    </div>
                </div>
                <div class="indeks-card-price-wrap">
                    <div class="indeks-card-price">${priceStr}</div>
                    <div class="indeks-card-change ${trend}">${changeStr} (${changeNominalStr})</div>
                </div>
            </div>
            <div class="indeks-card-stats">
                <div class="indeks-stat-cell">
                    <span class="indeks-stat-cell-label">High</span>
                    <span class="indeks-stat-cell-value up">${formatNumber(d.high, 2)}</span>
                </div>
                <div class="indeks-stat-cell">
                    <span class="indeks-stat-cell-label">Low</span>
                    <span class="indeks-stat-cell-value down">${formatNumber(d.low, 2)}</span>
                </div>
                <div class="indeks-stat-cell">
                    <span class="indeks-stat-cell-label">Volume</span>
                    <span class="indeks-stat-cell-value">${formatVolume(d.volume)}</span>
                </div>
            </div>
            <div class="indeks-card-sectors">${sectorBars}</div>
        </div>
    `;
}

// ============ OPEN DETAIL MODAL ============
async function openIndeksDetail(symbol) {
    const idx = GLOBAL_INDICES.find(i => i.symbol === symbol);
    if (!idx) return;
    
    currentDetailSymbol = symbol;
    const modal = document.getElementById('indeksDetailModal');
    modal.classList.add('active');
    
    // Set header
    document.getElementById('detailFlag').textContent = idx.flag;
    document.getElementById('detailTitle').textContent = idx.name;
    document.getElementById('detailSubtitle').textContent = idx.country;
    
    // Reset values
    document.getElementById('detailPrice').textContent = '-';
    document.getElementById('detailChange').textContent = '-';
    document.getElementById('detailChange').className = 'indeks-detail-change';
    document.getElementById('detailHigh').textContent = '-';
    document.getElementById('detailLow').textContent = '-';
    document.getElementById('detailPrevClose').textContent = '-';
    document.getElementById('detailVolume').textContent = '-';
    
    // Render sectors (dari data statis)
    renderSectors(idx.sectors);
    
    // Render top holdings (dari data statis, harga bakal di-fetch)
    renderTopHoldings(idx.topHoldings);
    
    // Fetch live data
    const data = await fetchIndexData(symbol);
    if (data && data.price != null) {
        const trend = data.change >= 0 ? 'up' : 'down';
        const sign = data.change >= 0 ? '+' : '';
        
        document.getElementById('detailPrice').textContent = formatNumber(data.price, 2);
        const changeEl = document.getElementById('detailChange');
        changeEl.textContent = `${sign}${data.change.toFixed(2)}%  (${sign}${data.changeNominal.toFixed(2)})`;
        changeEl.className = 'indeks-detail-change ' + trend;
        
        document.getElementById('detailHigh').textContent = formatNumber(data.high, 2);
        document.getElementById('detailLow').textContent = formatNumber(data.low, 2);
        document.getElementById('detailPrevClose').textContent = formatNumber(data.prevClose, 2);
        document.getElementById('detailVolume').textContent = formatVolume(data.volume);
    }
    
    // Fetch chart 1 tahun
    loadIndeksChart(symbol);
    
    // Fetch live prices untuk top holdings
    loadTopHoldingsPrices(idx.topHoldings);
}

// ============ RENDER SECTORS ============
function renderSectors(sectors) {
    const container = document.getElementById('detailSectors');
    container.innerHTML = sectors.map(s => `
        <div class="indeks-sector-row">
            <div class="indeks-sector-row-top">
                <span class="indeks-sector-name">${s.name}</span>
                <span class="indeks-sector-pct">${s.pct.toFixed(1)}%</span>
            </div>
            <div class="indeks-sector-bar-bg">
                <div class="indeks-sector-bar-fill" style="width: ${s.pct}%; background: ${s.color};"></div>
            </div>
        </div>
    `).join('');
}

// ============ RENDER TOP HOLDINGS ============
function renderTopHoldings(holdings) {
    const container = document.getElementById('detailConstituents');
    container.innerHTML = holdings.map(h => `
        <div class="indeks-constituent-item" data-symbol="${h.symbol}">
            <div class="indeks-constituent-left">
                <span class="indeks-constituent-symbol">${h.symbol}</span>
                <span class="indeks-constituent-name">${h.name}</span>
            </div>
            <div class="indeks-constituent-right">
                <span class="indeks-constituent-price" id="const-price-${h.symbol}">-</span>
                <span class="indeks-constituent-change" id="const-change-${h.symbol}">-</span>
            </div>
        </div>
    `).join('');
}

// ============ LOAD TOP HOLDINGS PRICES ============
async function loadTopHoldingsPrices(holdings) {
    await Promise.all(holdings.map(async (h) => {
        try {
            const data = await fetchIndexData(h.symbol);
            const priceEl = document.getElementById('const-price-' + h.symbol);
            const changeEl = document.getElementById('const-change-' + h.symbol);
            
            if (!priceEl || !changeEl) return;
            
            if (data && data.price != null) {
                priceEl.textContent = formatNumber(data.price, 2);
                const trend = data.change >= 0 ? 'up' : 'down';
                const sign = data.change >= 0 ? '+' : '';
                changeEl.textContent = `${sign}${data.change.toFixed(2)}%`;
                changeEl.className = 'indeks-constituent-change ' + trend;
            } else {
                priceEl.textContent = 'N/A';
                changeEl.textContent = '-';
            }
        } catch (e) {
            console.error('Error loading holding price:', h.symbol, e);
        }
    }));
}

// ============ LOAD INDEX CHART ============
async function loadIndeksChart(symbol) {
    const container = document.getElementById('indeksChartContainer');
    container.innerHTML = '';
    
    if (currentDetailChart) {
        currentDetailChart.remove();
        currentDetailChart = null;
    }
    
    if (typeof LightweightCharts === 'undefined') {
        container.innerHTML = '<div style="color:#f00;padding:20px;text-align:center;font-size:12px;">❌ Library chart gagal dimuat</div>';
        return;
    }
    
    // Buat chart
    currentDetailChart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: 260,
        layout: { 
            background: { color: 'transparent' }, 
            textColor: 'rgba(255, 255, 255, 0.6)', 
            fontFamily: 'Inter, sans-serif' 
        },
        grid: { 
            vertLines: { color: 'rgba(255, 255, 255, 0.04)' }, 
            horzLines: { color: 'rgba(255, 255, 255, 0.04)' } 
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
            vertLine: { color: 'rgba(251, 191, 36, 0.5)', labelBackgroundColor: '#fbbf24' },
            horzLine: { color: 'rgba(251, 191, 36, 0.5)', labelBackgroundColor: '#fbbf24' }
        },
        rightPriceScale: { 
            borderColor: 'rgba(255, 255, 255, 0.08)',
            scaleMargins: { top: 0.1, bottom: 0.1 }
        },
        timeScale: { 
            borderColor: 'rgba(255, 255, 255, 0.08)',
            timeVisible: false
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
        handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true }
    });
    
    // Candle series
    const series = currentDetailChart.addCandlestickSeries({
        upColor: '#ffffff',
        downColor: '#a855f7',
        borderUpColor: '#ffffff',
        borderDownColor: '#a855f7',
        wickUpColor: '#ffffff',
        wickDownColor: '#a855f7'
    });
    
    // Fetch data 1 tahun
    const candles = await fetchIndexChartData(symbol, '1d', '1y');
    
    if (!candles || candles.length === 0) {
        container.innerHTML = '<div style="color:rgba(255,255,255,0.4);padding:20px;text-align:center;font-size:12px;">Data chart gak tersedia</div>';
        return;
    }
    
    const formattedData = candles.map(c => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
    })).filter(d => d.time != null && !isNaN(d.open) && !isNaN(d.close));
    
    series.setData(formattedData);
    currentDetailChart.timeScale().fitContent();
}

// ============ CLOSE DETAIL MODAL ============
function closeIndeksDetail() {
    document.getElementById('indeksDetailModal').classList.remove('active');
    if (currentDetailChart) {
        currentDetailChart.remove();
        currentDetailChart = null;
    }
    document.getElementById('indeksChartContainer').innerHTML = '';
}

// ============ EVENT LISTENERS ============
document.getElementById('closeDetailModal').addEventListener('click', closeIndeksDetail);

document.getElementById('indeksSearch').addEventListener('input', (e) => {
    currentSearch = e.target.value.trim();
    renderIndices();
});

document.querySelectorAll('.indeks-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.indeks-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.region;
        renderIndices();
    });
});

document.getElementById('refreshBtn').addEventListener('click', () => {
    const btn = document.getElementById('refreshBtn');
    btn.style.transform = 'rotate(360deg)';
    btn.style.transition = 'transform 0.6s';
    setTimeout(() => {
        btn.style.transform = 'rotate(0deg)';
        btn.style.transition = 'none';
    }, 600);
    renderIndices();
});

// ============ INIT ============
renderIndices();
