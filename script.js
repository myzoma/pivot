class PivotPointsIndicator {
    constructor() {
        this.length = 50;
        this.coins = [];
        this.timeframe = '4h';
        this.updateInterval = 5 * 60 * 1000;
        
        // متغيرات المؤشر الأصلي
        this.zigzag = null;
        this.ghost_level = null;
        this.max = 0;
        this.min = 0;
        this.max_x1 = 0;
        this.min_x1 = 0;
        this.follow_max = 0;
        this.follow_max_x1 = 0;
        this.follow_min = 0;
        this.follow_min_x1 = 0;
        this.os = 0;
        this.py1 = 0;
        this.px1 = 0;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startAutoUpdate();
        this.fetchData();
    }

    setupEventListeners() {
        document.getElementById('timeframe').addEventListener('change', (e) => {
            this.timeframe = e.target.value;
            this.fetchData();
        });
    }

    startAutoUpdate() {
        setInterval(() => {
            this.fetchData();
        }, this.updateInterval);
    }

    async fetchData() {
        this.showLoading(true);
        
        try {
            const symbols = await this.getBinanceSymbols();
            const analysisPromises = symbols.slice(0, 100).map(symbol => 
                this.analyzeSymbol(symbol)
            );
            
            const results = await Promise.all(analysisPromises);
            
            this.coins = results
                .filter(result => result && result.signal)
                .sort((a, b) => Math.abs(b.strength) - Math.abs(a.strength))
                .slice(0, 30);
            
            this.updateUI();
            this.updateStats();
            
        } catch (error) {
            console.error('خطأ في جلب البيانات:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async getBinanceSymbols() {
        try {
            const response = await fetch('https://api1.binance.com/api/v3/exchangeInfo');
            const data = await response.json();
            
            return data.symbols
                .filter(symbol => 
                    symbol.status === 'TRADING' && 
                    symbol.symbol.endsWith('USDT') &&
                    !symbol.symbol.includes('UP') &&
                    !symbol.symbol.includes('DOWN') &&
                    !symbol.symbol.includes('BEAR') &&
                    !symbol.symbol.includes('BULL')
                )
                .map(symbol => symbol.symbol)
                .slice(0, 100);
        } catch (error) {
            console.error('خطأ في جلب رموز العملات:', error);
            return [];
        }
    }

    async analyzeSymbol(symbol) {
        try {
            const klines = await this.getKlines(symbol, this.timeframe, 500);
            if (!klines || klines.length < this.length * 3) return null;

            const analysis = this.calculatePivotPointsOriginal(klines);
            const currentPrice = parseFloat(klines[klines.length - 1][4]);
            const prevPrice = parseFloat(klines[klines.length - 2][4]);
            const change = ((currentPrice - prevPrice) / prevPrice) * 100;

            if (!analysis.signal) return null;

            return {
                symbol: symbol.replace('USDT', ''),
                price: currentPrice,
                change: change,
                signal: analysis.signal,
                strength: analysis.strength,
                pivotHigh: analysis.pivotHigh,
                pivotLow: analysis.pivotLow,
                target1: analysis.target1,
                target2: analysis.target2,
                direction: analysis.direction,
                missedPivots: analysis.missedPivots,
                regularPivots: analysis.regularPivots
            };
        } catch (error) {
            console.error(`خطأ في تحليل ${symbol}:`, error);
            return null;
        }
    }

    async getKlines(symbol, interval, limit) {
        try {
            const response = await fetch(
                `https://api1.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
            );
            return await response.json();
        } catch (error) {
            console.error(`خطأ في جلب بيانات ${symbol}:`, error);
            return null;
        }
    }

    // تطبيق المنطق الأصلي للمؤشر حرفياً
    calculatePivotPointsOriginal(klines) {
        const highs = klines.map(k => parseFloat(k[2]));
        const lows = klines.map(k => parseFloat(k[3]));
        const closes = klines.map(k => parseFloat(k[4]));
        
        // إعادة تعيين المتغيرات
        let max = 0, min = Infinity;
        let max_x1 = 0, min_x1 = 0;
        let follow_max = 0, follow_max_x1 = 0;
        let follow_min = Infinity, follow_min_x1 = 0;
        let os = 0, py1 = 0, px1 = 0;
        
        const pivotHighs = [];
        const pivotLows = [];
        const missedPivots = [];
        const regularPivots = [];
        
        // حساب نقاط الارتكاز كما في Pine Script
        for (let n = this.length; n < klines.length - this.length; n++) {
            // حساب pivot high و pivot low
            const ph = this.pivotHigh(highs, n, this.length);
            const pl = this.pivotLow(lows, n, this.length);
            
            // تحديث القيم كما في الكود الأصلي
            max = Math.max(highs[n], max);
            min = Math.min(lows[n], min);
            follow_max = Math.max(highs[n], follow_max);
            follow_min = Math.min(lows[n], follow_min);
            
            if (max > (n > 0 ? Math.max(...highs.slice(0, n)) : 0)) {
                max_x1 = n;
                follow_min = lows[n];
            }
            
            if (min < (n > 0 ? Math.min(...lows.slice(0, n)) : Infinity)) {
                min_x1 = n;
                follow_max = highs[n];
            }
            
            if (follow_min < (n > 0 ? Math.min(...lows.slice(Math.max(0, min_x1), n)) : Infinity)) {
                follow_min_x1 = n;
            }
            
            if (follow_max > (n > 0 ? Math.max(...highs.slice(Math.max(0, max_x1), n)) : 0)) {
                follow_max_x1 = n;
            }
            
            // منطق pivot high
            if (ph !== null) {
                let missedPivot = false;
                
                if (os === 1) {
                    // إضافة missed pivot
                    missedPivots.push({
                        type: 'low',
                        price: min,
                        index: min_x1
                    });
                    missedPivot = true;
                } else if (ph < max) {
                    // إضافة missed pivots
                    missedPivots.push({
                        type: 'high',
                        price: max,
                        index: max_x1
                    });
                    missedPivots.push({
                        type: 'low',
                        price: follow_min,
                        index: follow_min_x1
                    });
                    missedPivot = true;
                }
                
                // إضافة regular pivot
                regularPivots.push({
                    type: 'high',
                    price: ph,
                    index: n,
                    missed: missedPivot
                });
                
                pivotHighs.push(ph);
                py1 = ph;
                px1 = n;
                os = 1;
                max = ph;
                min = ph;
            }
            
            // منطق pivot low
            if (pl !== null) {
                let missedPivot = false;
                
                if (os === 0) {
                    // إضافة missed pivot
                    missedPivots.push({
                        type: 'high',
                        price: max,
                        index: max_x1
                    });
                    missedPivot = true;
                } else if (pl > min) {
                    // إضافة missed pivots
                    missedPivots.push({
                        type: 'high',
                        price: follow_max,
                        index: follow_max_x1
                    });
                    missedPivots.push({
                        type: 'low',
                        price: min,
                        index: min_x1
                    });
                    missedPivot = true;
                }
                
                // إضافة regular pivot
                regularPivots.push({
                    type: 'low',
                    price: pl,
                    index: n,
                    missed: missedPivot
                });
                
                pivotLows.push(pl);
                py1 = pl;
                px1 = n;
                os = 0;
                max = pl;
                min = pl;
            }
        }
        
        // تحديد الإشارة بناءً على آخر pivot ومستوى الانعكاس المفقود
        const currentPrice = closes[closes.length - 1];
        const lastPivotHigh = pivotHighs.length > 0 ? pivotHighs[pivotHighs.length - 1] : null;
        const lastPivotLow = pivotLows.length > 0 ? pivotLows[pivotLows.length - 1] : null;
        
        let signal = null;
        let strength = 0;
        let direction = 'محايد';
        
        // منطق الإشارة بناءً على المستويات المفقودة
        const recentMissedPivots = missedPivots.slice(-3);
        const hasRecentMissedLow = recentMissedPivots.some(p => p.type === 'low');
        const hasRecentMissedHigh = recentMissedPivots.some(p => p.type === 'high');
        
        if (hasRecentMissedLow && currentPrice > (lastPivotLow || 0) * 1.01) {
            signal = 'صعود';
            direction = 'صاعد';
            strength = Math.min(100, ((currentPrice - (lastPivotLow || 0)) / (lastPivotLow || 1)) * 1000);
        } else if (hasRecentMissedHigh && currentPrice < (lastPivotHigh || Infinity) * 0.99) {
            signal = 'هبوط';
            direction = 'هابط';
            strength = Math.min(100, (((lastPivotHigh || 0) - currentPrice) / (lastPivotHigh || 1)) * 1000);
        }
        
        // حساب الأهداف بدقة 5-7%
        const target1 = signal === 'صعود' ? 
            currentPrice * 1.05 : currentPrice * 0.95;
        const target2 = signal === 'صعود' ? 
            currentPrice * 1.07 : currentPrice * 0.93;
        
        return {
            signal,
            strength: Math.abs(strength),
            direction,
            pivotHigh: lastPivotHigh,
            pivotLow: lastPivotLow,
            target1,
            target2,
            missedPivots: missedPivots.length,
            regularPivots: regularPivots.length
        };
    }

    // دالة pivot high كما في Pine Script
    pivotHigh(data, index, length) {
        if (index < length || index >= data.length - length) return null;
        
        const centerValue = data[index];
        
        // فحص اليسار
        for (let i = index - length; i < index; i++) {
            if (data[i] >= centerValue) return null;
        }
        
        // فحص اليمين
        for (let i = index + 1; i <= index + length; i++) {
            if (data[i] >= centerValue) return null;
        }
        
        return centerValue;
    }

    // دالة pivot low كما في Pine Script
    pivotLow(data, index, length) {
        if (index < length || index >= data.length - length) return null;
        
        const centerValue = data[index];
        
        // فحص اليسار
        for (let i = index - length; i < index; i++) {
            if (data[i] <= centerValue) return null;
        }
        
        // فحص اليمين
        for (let i = index + 1; i <= index + length; i++) {
            if (data[i] <= centerValue) return null;
        }
        
        return centerValue;
    }

    updateUI() {
        const grid = document.getElementById('cryptoGrid');
        
        if (this.coins.length === 0) {
            grid.innerHTML = '<div class="no-data">لا توجد بيانات متاحة</div>';
            return;
        }
        
        grid.innerHTML = this.coins.map(coin => this.createCoinCard(coin)).join('');
        
        document.getElementById('lastUpdate').textContent = 
            `آخر تحديث: ${new Date().toLocaleTimeString('ar-SA')}`;
    }

    createCoinCard(coin) {
        const signalClass = coin.signal === 'صعود' ? 'bullish' : 'bearish';
        const changeClass = coin.change >= 0 ? 'positive' : 'negative';
        const changeSign = coin.change >= 0 ? '+' : '';
        
        return `
            <div class="crypto-card">
                <div class="card-header">
                    <div class="symbol">${coin.symbol}</div>
                    <div class="signal ${signalClass}">${coin.signal}</div>
                </div>
                
                <div class="price-info">
                    <div class="price-item">
                        <label>السعر الحالي</label>
                        <div class="value price">$${coin.price.toFixed(6)}</div>
                    </div>
                    <div class="price-item">
                        <label>التغيير</label>
                        <div class="value change ${changeClass}">
                            ${changeSign}${coin.change.toFixed(2)}%
                        </div>
                    </div>
                </div>
                
                <div class="pivot-info">
                    <h4>تحليل نقاط الارتكاز</h4>
                    <div class="pivot-levels">
                        <div class="pivot-level">
                            <span class="label">آخر قمة:</span>
                            <span class="value">${coin.pivotHigh ? '$' + coin.pivotHigh.toFixed(6) : 'غير محدد'}</span>
                        </div>
                        <div class="pivot-level">
                            <span class="label">آخر قاع:</span>
                            <span class="value">${coin.pivotLow ? '$' + coin.pivotLow.toFixed(6) : 'غير محدد'}</span>
                        </div>
                        <div class="pivot-level">
                            <span class="label">الاتجاه:</span>
                            <span class="value ${signalClass}">${coin.direction}</span>
                        </div>
                        <div class="pivot-level">
                            <span class="label">قوة الإشارة:</span>
                            <span class="value">${coin.strength.toFixed(1)}%</span>
                        </div>
                        <div class="pivot-level">
                            <span class="label">نقاط مفقودة:</span>
                            <span class="value">${coin.missedPivots}</span>
                        </div>
                        <div class="pivot-level">
                            <span class="label">نقاط عادية:</span>
                            <span class="value">${coin.regularPivots}</span>
                        </div>
                    </div>
                </div>
                
                <div class="targets">
                    <div class="target target-1">
                        <label>الهدف الأول (5%)</label>
                        <div class="value">$${coin.target1.toFixed(6)}</div>
                    </div>
                    <div class="target target-2">
                        <label>الهدف الثاني (7%)</label>
                        <div class="value">$${coin.target2.toFixed(6)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    updateStats() {
        const totalCoins = this.coins.length;
        const bullishSignals = this.coins.filter(coin => coin.signal === 'صعود').length;
        const bearishSignals = this.coins.filter(coin => coin.signal === 'هبوط').length;
        
        document.getElementById('totalCoins').textContent = totalCoins;
        document.getElementById('bullishSignals').textContent = bullishSignals;
        document.getElementById('bearishSignals').textContent = bearishSignals;
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        loading.style.display = show ? 'block' : 'none';
    }
}

// إضافة فئة مساعدة لحساب المؤشرات التقنية
class TechnicalAnalysis {
    static sma(data, period) {
        const result = [];
        for (let i = period - 1; i < data.length; i++) {
            const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            result.push(sum / period);
        }
        return result;
    }

    static ema(data, period) {
        const result = [];
        const multiplier = 2 / (period + 1);
        result[0] = data[0];
        
        for (let i = 1; i < data.length; i++) {
            result[i] = (data[i] * multiplier) + (result[i - 1] * (1 - multiplier));
        }
        return result;
    }

    static rsi(data, period = 14) {
        const gains = [];
        const losses = [];
        
        for (let i = 1; i < data.length; i++) {
            const change = data[i] - data[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }
        
        const avgGains = this.sma(gains, period);
        const avgLosses = this.sma(losses, period);
        
        return avgGains.map((gain, i) => {
            const rs = gain / avgLosses[i];
            return 100 - (100 / (1 + rs));
        });
    }

    static bollinger(data, period = 20, stdDev = 2) {
        const sma = this.sma(data, period);
        const result = [];
        
        for (let i = 0; i < sma.length; i++) {
            const slice = data.slice(i, i + period);
            const mean = sma[i];
            const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
            const std = Math.sqrt(variance);
            
            result.push({
                middle: mean,
                upper: mean + (std * stdDev),
                lower: mean - (std * stdDev)
            });
        }
        
        return result;
    }
}

// تشغيل التطبيق
document.addEventListener('DOMContentLoaded', () => {
    new PivotPointsIndicator();
});

// معالجة الأخطاء
window.addEventListener('error', (e) => {
    console.error('خطأ في التطبيق:', e.error);
    
    // إظهار رسالة خطأ للمستخدم
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div style="background: #ef5350; color: white; padding: 10px; border-radius: 5px; margin: 10px; text-align: center;">
            حدث خطأ في التطبيق. يرجى إعادة تحميل الصفحة.
        </div>
    `;
    document.body.insertBefore(errorDiv, document.body.firstChild);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('خطأ في الشبكة:', e.reason);
    
    // إظهار رسالة خطأ شبكة
    const errorDiv = document.createElement('div');
    errorDiv.className = 'network-error';
    errorDiv.innerHTML = `
        <div style="background: #ff9800; color: white; padding: 10px; border-radius: 5px; margin: 10px; text-align: center;">
            خطأ في الاتصال بالشبكة. يرجى التحقق من الاتصال بالإنترنت.
        </div>
    `;
    document.body.insertBefore(errorDiv, document.body.firstChild);
    
    // إزالة رسالة الخطأ بعد 5 ثوان
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
});

// إضافة وظائف إضافية للتحكم
class UIController {
    static addFilterControls() {
        const controlsDiv = document.querySelector('.controls');
        
        const filterHTML = `
            <div class="filter-controls">
                <select id="signalFilter">
                    <option value="all">جميع الإشارات</option>
                    <option value="صعود">إشارات الصعود فقط</option>
                    <option value="هبوط">إشارات الهبوط فقط</option>
                </select>
                
                <select id="strengthFilter">
                    <option value="0">جميع القوى</option>
                    <option value="50">قوة أكبر من 50%</option>
                    <option value="70">قوة أكبر من 70%</option>
                    <option value="90">قوة أكبر من 90%</option>
                </select>
                
                <button id="exportData">تصدير البيانات</button>
            </div>
        `;
        
        controlsDiv.insertAdjacentHTML('beforeend', filterHTML);
        
        // إضافة مستمعي الأحداث
        document.getElementById('signalFilter').addEventListener('change', this.filterBySignal);
        document.getElementById('strengthFilter').addEventListener('change', this.filterByStrength);
        document.getElementById('exportData').addEventListener('click', this.exportToCSV);
    }

    static filterBySignal(event) {
        const filterValue = event.target.value;
        const cards = document.querySelectorAll('.crypto-card');
        
        cards.forEach(card => {
            const signal = card.querySelector('.signal').textContent;
            if (filterValue === 'all' || signal === filterValue) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    static filterByStrength(event) {
        const minStrength = parseFloat(event.target.value);
        const cards = document.querySelectorAll('.crypto-card');
        
        cards.forEach(card => {
            const strengthText = card.querySelector('.pivot-level:nth-child(4) .value').textContent;
            const strength = parseFloat(strengthText.replace('%', ''));
            
            if (strength >= minStrength) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    static exportToCSV() {
        const cards = document.querySelectorAll('.crypto-card:not([style*="display: none"])');
        let csvContent = 'الرمز,السعر,التغيير,الإشارة,القوة,الهدف الأول,الهدف الثاني\n';
        
        cards.forEach(card => {
            const symbol = card.querySelector('.symbol').textContent;
            const price = card.querySelector('.price').textContent;
            const change = card.querySelector('.change').textContent;
            const signal = card.querySelector('.signal').textContent;
            const strength = card.querySelector('.pivot-level:nth-child(4) .value').textContent;
            const target1 = card.querySelector('.target-1 .value').textContent;
            const target2 = card.querySelector('.target-2 .value').textContent;
            
            csvContent += `${symbol},${price},${change},${signal},${strength},${target1},${target2}\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `pivot_analysis_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// تهيئة عناصر التحكم الإضافية
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        UIController.addFilterControls();
    }, 1000);
});
