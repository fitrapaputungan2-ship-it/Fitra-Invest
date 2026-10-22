// ==========================================
// 🥷 STANDALONE AI SCRIPT (TIDAK BUTUH HTML LU)
// ==========================================

(function() {
    // 1. SUNTIKKAN CSS LANGSUNG DARI JS (Biar gak perlu edit style.css)
    const style = document.createElement('style');
    style.innerHTML = `
        .standalone-ai-box { background: #050a14; border: 1px solid #50E4F2; border-radius: 12px; padding: 16px; margin-top: 16px; box-shadow: 0 0 20px rgba(80,228,242,0.1); width: 100%; box-sizing: border-box; animation: fadeIn 0.5s ease-out; }
        .std-header { display: flex; justify-content: space-between; border-bottom: 1px solid #1a2b3c; padding-bottom: 8px; margin-bottom: 12px; color: #50E4F2; font-family: monospace; font-size: 12px; }
        .std-status { color: #43D6A2; font-family: monospace; font-size: 10px; }
        .std-verdict-box { text-align: center; margin-bottom: 16px; }
        .std-verdict-signal { display: inline-block; padding: 10px 20px; border-radius: 8px; font-weight: 900; font-size: 16px; }
        .std-verdict-signal.buy { border: 2px solid #43D6A2; color: #43D6A2; box-shadow: 0 0 15px rgba(67,214,162,0.3); }
        .std-verdict-signal.sell { border: 2px solid #FF7387; color: #FF7387; box-shadow: 0 0 15px rgba(255,115,135,0.3); }
        .std-verdict-signal.hold { border: 2px solid #E9B949; color: #E9B949; box-shadow: 0 0 15px rgba(233,185,73,0.3); }
        .std-conf-bar { width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; margin-top: 8px; }
        .std-conf-fill { height: 100%; transition: width 1s; }
        .std-insight { background: rgba(0,0,0,0.3); border-left: 3px solid #B9A0FF; padding: 10px; margin-bottom: 8px; border-radius: 0 8px 8px 0; font-size: 11px; color: #F4F7FB; line-height: 1.4; }
        .std-insight.risk { border-left-color: #FF7387; background: rgba(255,115,135,0.05); }
        .std-insight.opportunity { border-left-color: #43D6A2; background: rgba(67,214,162,0.05); }
        .std-summary { font-size: 11px; line-height: 1.5; color: #91A8BB; margin-top: 12px; border-top: 1px dashed #26394C; padding-top: 12px; }
    `;
    document.head.appendChild(style);

    // 2. OVERRIDE FUNGSI LOAD ANALYSIS
    window.loadAnalysis = async function(symbol, name, price, type) {
        // Sembunyikan Company Profile kalau crypto
        const cp = document.getElementById('companyProfileSection');
        if (cp) cp.style.display = type === 'stock' ? 'block' : 'none';

        // Cari container chart-content tempat kita naruh kotak
        const chartContent = document.querySelector('.chart-content');
        if (!chartContent) return;

        // Hapus kotak AI lama kalau ada (biar gak numpuk)
        const oldAi = document.getElementById('standalone-ai-box');
        if (oldAi) oldAi.remove();

        // Bikin kotak baru dari nol
        const aiBox = document.createElement('div');
        aiBox.id = 'standalone-ai-box';
        aiBox.className = 'standalone-ai-box';
        aiBox.innerHTML = `
            <div class="std-header">
                <div><span style="color:#FF5F56">●</span> <span style="color:#FFBD2E">●</span> <span style="color:#27C93F">●</span> AI_WARREN_BUFFETT.exe</div>
                <div class="std-status" id="std-status">SYS.ANALYZING...</div>
            </div>
            <div id="std-body" style="text-align:center; padding:20px; font-family:monospace; color:#50E4F2;">
                <div class="loading-spinner"></div>
                <p style="margin-top:10px;">> Menganalisis fundamental ${symbol}...</p>
            </div>
        `;
        
        // Selipkan tepat setelah Company Profile atau di paling bawah chart
        if (cp && cp.parentNode) {
            cp.parentNode.insertBefore(aiBox, cp.nextSibling);
        } else {
            chartContent.appendChild(aiBox);
        }

        const body = document.getElementById('std-body');
        const status = document.getElementById('std-status');

        try {
            // Fetch Data Fundamental (Manual, biar gak error)
            let fundamental = {};
            try {
                const fRes = await fetch("https://twxsupmgnmkzsyiqebln.supabase.co/functions/v1/fetch-fundamental", {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer sb_publishable_9KSdez89Nm7-zE2I2-yzMA_9NPYAMRC', 'apikey': 'sb_publishable_9KSdez89Nm7-zE2I2-yzMA_9NPYAMRC' }, body: JSON.stringify({ symbol, type })
                });
                const fData = await fRes.json();
                fundamental = fData.fundamental || {};
            } catch (e) { console.log("Fund fetch err", e); }

            // Fetch Analisis AI
            const res = await fetch("https://twxsupmgnmkzsyiqebln.supabase.co/functions/v1/analyze-stock", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer sb_publishable_9KSdez89Nm7-zE2I2-yzMA_9NPYAMRC', 'apikey': 'sb_publishable_9KSdez89Nm7-zE2I2-yzMA_9NPYAMRC' },
                body: JSON.stringify({ symbol, name, price, fundamental })
            });
            
            if (!res.ok) throw new Error("API Error " + res.status);
            const data = await res.json();
            
            status.textContent = 'SYS.ONLINE';
            
            // Render UI
            const signal = data.ai_signal ? data.ai_signal.toUpperCase() : 'HOLD';
            let sigClass = signal.includes('BUY') ? 'buy' : signal.includes('SELL') ? 'sell' : 'hold';
            let sigIcon = signal.includes('BUY') ? '🚀' : signal.includes('SELL') ? '⚠️' : '⏸️';
            let color = signal.includes('BUY') ? '#43D6A2' : signal.includes('SELL') ? '#FF7387' : '#E9B949';
            let conf = data.confidence || 50;
            
            const reasonsHtml = (data.reasons || []).map(r => {
                let cls = 'std-insight';
                let icon = '💡';
                if (r.toLowerCase().includes('risk') || r.toLowerCase().includes('debt') || r.toLowerCase().includes('turun')) { cls += ' risk'; icon = '🚨'; }
                else if (r.toLowerCase().includes('growth') || r.toLowerCase().includes('profit') || r.toLowerCase().includes('naik')) { cls += ' opportunity'; icon = '📈'; }
                return `<div class="${cls}"><strong>${icon}</strong> ${r}</div>`;
            }).join('');

            body.innerHTML = `
                <div class="std-verdict-box">
                    <div class="std-verdict-signal ${sigClass}">${sigIcon} ${signal}</div>
                    <div style="font-size:10px; color:#91A8BB; margin-top:10px; margin-bottom:4px;">Confidence Score: ${conf}/100</div>
                    <div class="std-conf-bar"><div class="std-conf-fill" style="width:${conf}%; background:${color};"></div></div>
                </div>
                <div style="font-size:11px; font-weight:bold; color:#E9B949; margin-bottom:8px;">🧠 CRITICAL INSIGHTS</div>
                ${reasonsHtml}
                <div class="std-summary"><strong style="color:#50E4F2;">> EXECUTIVE SUMMARY:</strong><br>${data.analysis || "Tidak ada ringkasan teks dari AI."}</div>
            `;

        } catch (err) {
            status.textContent = 'SYS.ERROR';
            body.innerHTML = `<div style="color:#FF7387; font-family:monospace; text-align:center;">❌ SYS.ERROR: Gagal terhubung ke Neural Network.<br><span style="font-size:10px;">${err.message}</span></div>`;
        }
    };
})();
