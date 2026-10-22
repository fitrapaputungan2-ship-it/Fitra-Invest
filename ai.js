// ==========================================
// FILE BARU: ai.js (AI TERMINAL & PROFIL)
// ==========================================

const COMPANY_PROFILES = {
    'AAPL': { story: 'Didirikan pada 1976 oleh Steve Jobs, Steve Wozniak, dan Ronald Wayne. Berawal dari garasi, Apple kini jadi raksasa teknologi global. Perusahaan ini berhasil melewati berbagai krisis dan revolusi produk (Mac, iPod, iPhone).', gen: 'Generasi ke-2 (Tim Cook)', sector: 'Technology (Consumer Electronics)', ceo: 'Tim Cook', owner: 'Institutional Investors & Public' },
    'MSFT': { story: 'Didirikan pada 1975 oleh Bill Gates dan Paul Allen. Berfokus pada software (Windows & Office) sebelum berevolusi menjadi raksasa Cloud (Azure) dan AI di bawah kepemimpinan Satya Nadella.', gen: 'Generasi ke-3 (Satya Nadella)', sector: 'Technology (Software & Cloud)', ceo: 'Satya Nadella', owner: 'Institutional Investors & Public' },
    'NVDA': { story: 'Didirikan pada 1993 oleh Jensen Huang, Chris Malachowsky, dan Curtis Priem. Berawal dari GPU untuk gaming, NVIDIA kini mendominasi pasar chip AI global.', gen: 'Generasi ke-1 (Jensen Huang)', sector: 'Technology (Semiconductors)', ceo: 'Jensen Huang', owner: 'Institutional Investors & Public' },
    'TSLA': { story: 'Didirikan pada 2003 oleh Martin Eberhard dan Marc Tarpenning. Elon Musk bergabung tak lama setelahnya. Misi utamanya adalah mempercepat transisi dunia menuju energi berkelanjutan.', gen: 'Generasi ke-1 (Elon Musk)', sector: 'Consumer Cyclical (Automotive)', ceo: 'Elon Musk', owner: 'Elon Musk & Public' },
    'GOOGL': { story: 'Didirikan pada 1998 oleh Larry Page dan Sergey Brin saat mereka masih mahasiswa Stanford. Berevolusi dari mesin pencari menjadi raksasa iklan digital dan AI (Alphabet).', gen: 'Generasi ke-2 (Sundar Pichai)', sector: 'Technology (Internet Content)', ceo: 'Sundar Pichai', owner: 'Founders & Public' },
    'AMZN': { story: 'Didirikan pada 1994 oleh Jeff Bezos sebagai toko buku online. Berkat obsesinya pada pelanggan, Amazon menjadi raksasa e-commerce dan Cloud (AWS).', gen: 'Generasi ke-2 (Andy Jassy)', sector: 'Consumer Cyclical (E-commerce)', ceo: 'Andy Jassy', owner: 'Jeff Bezos & Public' }
};

function renderCompanyProfile(symbol) {
    const section = document.getElementById('companyProfileSection');
    if (!section) return;
    const profile = COMPANY_PROFILES[symbol] || {
        story: `${symbol} merupakan perusahaan publik yang terdaftar di bursa saham global. Perusahaan ini terus beradaptasi dengan dinamika pasar untuk memberikan nilai tambah bagi para pemegang saham.`,
        gen: 'Generasi ke-1', sector: 'Diversified', ceo: 'TBA', owner: 'Public'
    };
    section.style.display = 'block';
    section.innerHTML = `
        <div class="company-profile-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
            Company Intel
        </div>
        <div class="company-story-text">"${profile.story}"</div>
        <div class="company-meta-grid">
            <div class="company-meta-item"><span class="company-meta-label">Sektor</span><span class="company-meta-value">${profile.sector}</span></div>
            <div class="company-meta-item"><span class="company-meta-label">Generasi</span><span class="company-meta-value">${profile.gen}</span></div>
            <div class="company-meta-item"><span class="company-meta-label">CEO</span><span class="company-meta-value">${profile.ceo}</span></div>
            <div class="company-meta-item"><span class="company-meta-label">Owner Utama</span><span class="company-meta-value">${profile.owner}</span></div>
        </div>
    `;
}

async function loadAnalysis(symbol, name, price, type) {
    if (type === 'stock') { renderCompanyProfile(symbol); } else { const cp = document.getElementById('companyProfileSection'); if(cp) cp.style.display = 'none'; }
    let container = document.getElementById('analysisBody');
    if (!container) {
        const chartContent = document.querySelector('.chart-content');
        const cpSection = document.getElementById('companyProfileSection');
        if (chartContent) {
            const terminalDiv = document.createElement('div');
            terminalDiv.className = 'ai-terminal-section';
            terminalDiv.innerHTML = `
                <div class="terminal-header">
                    <div class="terminal-dots"><span></span><span></span><span></span></div>
                    <div class="terminal-title">AI_WARREN_BUFFETT_ANALYSIS.exe</div>
                    <div class="terminal-status" id="terminalStatus">SYS.READY</div>
                </div>
                <div class="analysis-body-inline" id="analysisBody"><div class="loading-spinner"></div><p class="loading-text">Menginisialisasi AI...</p></div>
            `;
            if (cpSection && cpSection.parentNode) { cpSection.parentNode.insertBefore(terminalDiv, cpSection.nextSibling); } else { chartContent.appendChild(terminalDiv); }
            container = document.getElementById('analysisBody');
        }
    }
    if (!container) return; 
    container.innerHTML = `<div style="text-align:center; padding: 20px; font-family: monospace; color: #50E4F2;"><div class="loading-spinner"></div><p style="margin-top:10px;">> Menganalisis fundamental ${symbol}...</p></div>`;
    try {
        const fundamental = await fetchFundamental(symbol, type);
        const response = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/analyze-stock`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ symbol, name, price, fundamental }) }, 25000);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        renderAdvancedAIUI(data, fundamental, container);
    } catch (error) { 
        container.innerHTML = `<div style="color: #FF7387; padding: 20px; text-align: center; font-family: monospace;">❌ SYS.ERROR: Gagal terhubung ke AI.<br><span style="font-size: 10px; color: #91A8BB;">${error.message}</span></div>`; 
    }
}

function renderAdvancedAIUI(data, fundamental, container) {
    try {
        const signal = data.ai_signal ? data.ai_signal.toUpperCase() : 'HOLD'; 
        const confidence = data.confidence || 50; const reasons = data.reasons || [];
        let signalClass = 'hold'; let signalIcon = '⏸️'; let barColor = 'var(--gold)';
        if (signal.includes('BUY')) { signalClass = 'buy'; signalIcon = '🚀'; barColor = 'var(--green)'; } else if (signal.includes('SELL') || signal.includes('AVOID')) { signalClass = 'sell'; signalIcon = '⚠️'; barColor = 'var(--red)'; }
        const pe = fundamental.pe_ratio || 0; const roe = fundamental.roe || 0; const der = fundamental.debt_to_equity || 0; const margin = fundamental.profit_margin || 0;
        const getMetricClass = (val, good, warn, isLowerBetter = false) => {
            if (val === 'N/A') return 'warn'; const num = parseFloat(val);
            if (isLowerBetter) { if (num <= good) return 'good'; if (num <= warn) return 'warn'; return 'bad'; } else { if (num >= good) return 'good'; if (num >= warn) return 'warn'; return 'bad'; }
        };
        const metricsHtml = `
            <div style="font-size: 11px; font-weight: bold; color: #E9B949; margin-bottom: 8px;">📊 HEALTH MATRIX</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
                <div style="background: rgba(255,255,255,0.02); padding: 8px; border-radius: 6px;"><div style="font-size: 9px; color: #91A8BB;">P/E</div><div style="font-size: 13px; font-weight: bold; color: ${getMetricClass(pe, 15, 25, true) === 'good' ? '#43D6A2' : getMetricClass(pe, 15, 25, true) === 'bad' ? '#FF7387' : '#E9B949'}">${pe > 0 ? pe.toFixed(1) : 'N/A'}</div></div>
                <div style="background: rgba(255,255,255,0.02); padding: 8px; border-radius: 6px;"><div style="font-size: 9px; color: #91A8BB;">ROE</div><div style="font-size: 13px; font-weight: bold; color: ${getMetricClass(roe*100, 15, 10) === 'good' ? '#43D6A2' : getMetricClass(roe*100, 15, 10) === 'bad' ? '#FF7387' : '#E9B949'}">${(roe*100).toFixed(1)}%</div></div>
                <div style="background: rgba(255,255,255,0.02); padding: 8px; border-radius: 6px;"><div style="font-size: 9px; color: #91A8BB;">DER</div><div style="font-size: 13px; font-weight: bold; color: ${getMetricClass(der, 0.5, 1.5, true) === 'good' ? '#43D6A2' : getMetricClass(der, 0.5, 1.5, true) === 'bad' ? '#FF7387' : '#E9B949'}">${der.toFixed(2)}</div></div>
                <div style="background: rgba(255,255,255,0.02); padding: 8px; border-radius: 6px;"><div style="font-size: 9px; color: #91A8BB;">MARGIN</div><div style="font-size: 13px; font-weight: bold; color: ${getMetricClass(margin*100, 15, 5) === 'good' ? '#43D6A2' : getMetricClass(margin*100, 15, 5) === 'bad' ? '#FF7387' : '#E9B949'}">${(margin*100).toFixed(1)}%</div></div>
            </div>
        `;
        const reasonsHtml = reasons.map(r => {
            let boxStyle = "background: rgba(0,0,0,0.3); border-left: 3px solid #B9A0FF; padding: 10px; margin-bottom: 8px; border-radius: 0 8px 8px 0; font-size: 11px;";
            let icon = '💡';
            if (r.toLowerCase().includes('risk') || r.toLowerCase().includes('debt') || r.toLowerCase().includes('turun')) { boxStyle = "background: rgba(255,115,135,0.05); border-left: 3px solid #FF7387; padding: 10px; margin-bottom: 8px; border-radius: 0 8px 8px 0; font-size: 11px;"; icon = '🚨'; } 
            else if (r.toLowerCase().includes('growth') || r.toLowerCase().includes('profit') || r.toLowerCase().includes('naik')) { boxStyle = "background: rgba(67,214,162,0.05); border-left: 3px solid #43D6A2; padding: 10px; margin-bottom: 8px; border-radius: 0 8px 8px 0; font-size: 11px;"; icon = '📈'; }
            return `<div style="${boxStyle}"><strong>${icon} Analisis:</strong> ${r}</div>`;
        }).join('');
        container.innerHTML = `
            ${metricsHtml}
            <div style="text-align: center; margin-bottom: 16px;">
                <div style="display: inline-block; padding: 10px 20px; border-radius: 8px; border: 2px solid ${barColor}; color: ${barColor}; font-weight: 900; font-size: 16px; margin-bottom: 10px; box-shadow: 0 0 15px ${barColor}40;">${signalIcon} ${signal}</div>
                <div style="font-size: 10px; color: #91A8BB; margin-bottom: 4px;">Confidence Score</div>
                <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;"><div style="width: ${confidence}%; height: 100%; background: ${barColor};"></div></div>
            </div>
            <div style="font-size: 11px; font-weight: bold; color: #E9B949; margin-bottom: 8px;">🧠 CRITICAL INSIGHTS</div>
            ${reasonsHtml}
            <div style="font-size: 11px; line-height: 1.5; color: #91A8BB; margin-top: 12px; border-top: 1px dashed #26394C; padding-top: 12px;"><strong style="color: #50E4F2;">> EXECUTIVE SUMMARY:</strong><br>${data.analysis || "Tidak ada ringkasan teks dari AI."}</div>
        `;
    } catch (err) { container.innerHTML = `<div style="color: #FF7387; text-align: center; padding: 20px;">❌ Gagal merender UI AI: ${err.message}</div>`; }
                  }
