// إضافة وظائف تحليل نقاط الارتكاز والمستويات
class PivotAnalyzer {
    constructor() {
        this.pivotLevels = {};
    }

    // حساب نقاط الارتكاز والمستويات
    calculatePivotLevels(symbol, currentPrice, high24h, low24h, volume) {
        // حساب النقطة المحورية الأساسية
        const pivot = (high24h + low24h + currentPrice) / 3;
        
        // حساب مستويات المقاومة والدعم
        const r1 = (2 * pivot) - low24h;
        const s1 = (2 * pivot) - high24h;
        const r2 = pivot + (high24h - low24h);
        const s2 = pivot - (high24h - low24h);
        const r3 = high24h + 2 * (pivot - low24h);
        const s3 = low24h - 2 * (high24h - pivot);

        // تحديد الموقع الحالي
        const position = this.determinePosition(currentPrice, pivot, r1, r2, r3, s1, s2, s3);
        
        // تحديد النقطة التالية المتوقعة
        const nextTarget = this.getNextTarget(currentPrice, position, {pivot, r1, r2, r3, s1, s2, s3});
        
        // حساب قوة المستوى
        const levelStrength = this.calculateLevelStrength(currentPrice, {pivot, r1, r2, r3, s1, s2, s3}, volume);

        return {
            pivot,
            resistance: { r1, r2, r3 },
            support: { s1, s2, s3 },
            currentPosition: position,
            nextTarget,
            levelStrength,
            distanceToNext: this.calculateDistance(currentPrice, nextTarget.price),
            recommendation: this.getRecommendation(position, levelStrength, nextTarget)
        };
    }

    // تحديد موقع السعر الحالي
    determinePosition(price, pivot, r1, r2, r3, s1, s2, s3) {
        if (price >= r3) return { zone: 'فوق المقاومة الثالثة', level: 'R3', strength: 'قوي جداً', direction: 'صعود' };
        if (price >= r2) return { zone: 'بين R2 و R3', level: 'R2-R3', strength: 'قوي', direction: 'صعود' };
        if (price >= r1) return { zone: 'بين R1 و R2', level: 'R1-R2', strength: 'متوسط', direction: 'صعود' };
        if (price >= pivot) return { zone: 'بين المحور و R1', level: 'P-R1', strength: 'ضعيف', direction: 'صعود' };
        if (price >= s1) return { zone: 'بين S1 والمحور', level: 'S1-P', strength: 'ضعيف', direction: 'هبوط' };
        if (price >= s2) return { zone: 'بين S2 و S1', level: 'S2-S1', strength: 'متوسط', direction: 'هبوط' };
        if (price >= s3) return { zone: 'بين S3 و S2', level: 'S3-S2', strength: 'قوي', direction: 'هبوط' };
        return { zone: 'تحت الدعم الثالث', level: 'S3', strength: 'قوي جداً', direction: 'هبوط' };
    }

    // تحديد الهدف التالي
    getNextTarget(price, position, levels) {
        const { pivot, r1, r2, r3, s1, s2, s3 } = levels;
        
        switch(position.level) {
            case 'R3':
                return { price: r3 * 1.05, type: 'مقاومة ممتدة', probability: 30 };
            case 'R2-R3':
                return { price: r3, type: 'مقاومة ثالثة', probability: 70 };
            case 'R1-R2':
                return { price: r2, type: 'مقاومة ثانية', probability: 80 };
            case 'P-R1':
                return { price: r1, type: 'مقاومة أولى', probability: 85 };
            case 'S1-P':
                return { price: pivot, type: 'نقطة محورية', probability: 85 };
            case 'S2-S1':
                return { price: s1, type: 'دعم أول', probability: 80 };
            case 'S3-S2':
                return { price: s2, type: 'دعم ثاني', probability: 70 };
            case 'S3':
                return { price: s3 * 0.95, type: 'دعم ممتد', probability: 30 };
            default:
                return { price: pivot, type: 'نقطة محورية', probability: 50 };
        }
    }

    // حساب المسافة إلى الهدف التالي
    calculateDistance(currentPrice, targetPrice) {
        const distance = Math.abs(targetPrice - currentPrice);
        const percentage = (distance / currentPrice) * 100;
        
        return {
            absolute: distance,
            percentage: percentage,
            direction: targetPrice > currentPrice ? 'صعود' : 'هبوط',
            timeEstimate: this.estimateTimeToTarget(percentage)
        };
    }

    // تقدير الوقت للوصول للهدف
    estimateTimeToTarget(percentage) {
        if (percentage < 1) return 'أقل من ساعة';
        if (percentage < 3) return '1-6 ساعات';
        if (percentage < 5) return '6-24 ساعة';
        if (percentage < 10) return '1-3 أيام';
        return 'أكثر من 3 أيام';
    }

    // حساب قوة المستوى
    calculateLevelStrength(price, levels, volume) {
        const { pivot, r1, r2, r3, s1, s2, s3 } = levels;
        const allLevels = [s3, s2, s1, pivot, r1, r2, r3];
        
        // العثور على أقرب مستوى
        const closestLevel = allLevels.reduce((closest, level) => {
            return Math.abs(level - price) < Math.abs(closest - price) ? level : closest;
        });
        
        const distanceToLevel = Math.abs(price - closestLevel) / price * 100;
        
        // حساب القوة بناءً على المسافة والحجم
        let strength = 100 - (distanceToLevel * 10);
        
        // تعديل القوة بناءً على الحجم
        if (volume > 1000000) strength += 10;
        else if (volume < 100000) strength -= 10;
        
        return Math.max(0, Math.min(100, strength));
    }

    // الحصول على التوصية
    getRecommendation(position, levelStrength, nextTarget) {
        const recommendations = [];
        
        // توصيات بناءً على الموقع
        if (position.direction === 'صعود' && position.strength === 'قوي جداً') {
            recommendations.push('⚠️ منطقة مقاومة قوية - احذر من الانعكاس');
        } else if (position.direction === 'هبوط' && position.strength === 'قوي جداً') {
            recommendations.push('⚠️ منطقة دعم قوية - احذر من الارتداد');
        }
        
        // توصيات بناءً على قوة المستوى
        if (levelStrength > 80) {
            recommendations.push('🎯 مستوى قوي - فرصة جيدة للتداول');
        } else if (levelStrength < 40) {
            recommendations.push('⚡ مستوى ضعيف - قد يتم كسره بسهولة');
        }
        
        // توصيات بناءً على الهدف التالي
        if (nextTarget.probability > 80) {
            recommendations.push(`📈 احتمالية عالية للوصول إلى ${nextTarget.type}`);
        }
        
        return recommendations.length > 0 ? recommendations : ['📊 راقب حركة السعر عند المستويات الحالية'];
    }

    // تحديث دالة تحليل العملة لتشمل تحليل نقاط الارتكاز
    async analyzeCoinWithPivots(symbol) {
        try {
            // الحصول على بيانات السعر
            const priceData = await this.getPriceData(symbol);
            const { price, change, high24h, low24h, volume } = priceData;
            
            // تحليل نقاط الارتكاز
            const pivotAnalysis = this.calculatePivotLevels(symbol, price, high24h, low24h, volume);
            
            // تحليل الإشارة العادي
            const signalAnalysis = await this.analyzeSignal(symbol);
            
            return {
                ...signalAnalysis,
                pivotAnalysis,
                enhanced: true
            };
            
        } catch (error) {
            console.error(`خطأ في تحليل ${symbol}:`, error);
            return null;
        }
    }
}

// تحديث عرض تفاصيل العملة لتشمل تحليل نقاط الارتكاز
function createEnhancedCoinDetails(coin) {
    const pivotInfo = coin.pivotAnalysis ? `
        <div class="detail-section">
            <h3>🎯 تحليل نقاط الارتكاز</h3>
            <div class="pivot-analysis">
                <div class="current-position">
                    <h4>الموقع الحالي</h4>
                    <div class="position-info">
                        <span class="zone">${coin.pivotAnalysis.currentPosition.zone}</span>
                        <span class="strength ${coin.pivotAnalysis.currentPosition.strength.replace(' ', '-')}">${coin.pivotAnalysis.currentPosition.strength}</span>
                    </div>
                </div>
                
                <div class="pivot-levels">
                    <h4>المستويات الرئيسية</h4>
                    <div class="levels-grid">
                        <div class="level resistance">R3: $${coin.pivotAnalysis.resistance.r3.toFixed(4)}</div>
                        <div class="level resistance">R2: $${coin.pivotAnalysis.resistance.r2.toFixed(4)}</div>
                        <div class="level resistance">R1: $${coin.pivotAnalysis.resistance.r1.toFixed(4)}</div>
                        <div class="level pivot">المحور: $${coin.pivotAnalysis.pivot.toFixed(4)}</div>
                        <div class="level support">S1: $${coin.pivotAnalysis.support.s1.toFixed(4)}</div>
                        <div class="level support">S2: $${coin.pivotAnalysis.support.s2.toFixed(4)}</div>
                        <div class="level support">S3: $${coin.pivotAnalysis.support.s3.toFixed(4)}</div>
                    </div>
                </div>
                
                <div class="next-target">
                    <h4>الهدف التالي</h4>
                    <div class="target-info">
                        <div class="target-price">$${coin.pivotAnalysis.nextTarget.price.toFixed(4)}</div>
                        <div class="target-type">${coin.pivotAnalysis.nextTarget.type}</div>
                        <div class="target-probability">احتمالية: ${coin.pivotAnalysis.nextTarget.probability}%</div>
                        <div class="target-distance">
                            المسافة: ${coin.pivotAnalysis.distanceToNext.percentage.toFixed(2)}% 
                            (${coin.pivotAnalysis.distanceToNext.direction})
                        </div>
                        <div class="time-estimate">الوقت المتوقع: ${coin.pivotAnalysis.distanceToNext.timeEstimate}</div>
                    </div>
                </div>
                
                <div class="recommendations">
                    <h4>التوصيات</h4>
                    <ul>
                        ${coin.pivotAnalysis.recommendation.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>
    ` : '';
    
    return `
        <div class="coin-details">
            <h2>${coin.symbol} - تفاصيل التحليل</h2>
            
            <div class="detail-section">
                <h3>📊 معلومات السعر</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>السعر الحالي:</label>
                        <span>$${coin.price.toFixed(4)}</span>
                    </div>
                    <div class="detail-item">
                        <label>التغيير 24 ساعة:</label>
                        <span class="${coin.change >= 0 ? 'positive' : 'negative'}">${coin.change.toFixed(2)}%</span>
                    </div>
                </div>
            </div>
            
            ${pivotInfo}
            
            <div class="detail-section">
                <h3>🎯 تحليل الإشارة</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>نوع الإشارة:</label>
                        <span class="signal ${coin.signal === 'صعود' ? 'bullish' : coin.signal === 'هبوط' ? 'bearish' : 'neutral'}">${coin.signal}</span>
                    </div>
                    <div class="detail-item">
                        <label>قوة الإشارة:</label>
                        <span>${coin.strength.toFixed(1)}%</span>
                    </div>
                </div>
            </div>
            
            <div class="warnings">
                <p>هذا التحليل للأغراض التعليمية فقط</p>
<p>يجب إجراء بحث إضافي قبل اتخاذ قرارات الاستثمار</p>
                <p>الأسواق المالية تنطوي على مخاطر عالية</p>
                <p>قد تتغير الإشارات بسرعة مع تحرك السوق</p>
            </div>
        </div>
    `;
}


class EnhancedPivotPointsIndicator extends PivotPointsIndicator {

    constructor() {
        this.coins = [];
        this.timeframe = '4h';
        this.pivotLength = 50;
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.startAutoUpdate();
    }

    setupEventListeners() {
        document.getElementById('timeframe').addEventListener('change', (e) => {
            this.timeframe = e.target.value;
            this.loadData();
        });

        document.getElementById('pivotLength').addEventListener('change', (e) => {
            this.pivotLength = parseInt(e.target.value);
            this.loadData();
        });

        document.getElementById('signalFilter').addEventListener('change', this.filterCoins.bind(this));
        document.getElementById('strengthFilter').addEventListener('change', this.filterCoins.bind(this));
        document.getElementById('sortBy').addEventListener('change', this.sortCoins.bind(this));
        document.getElementById('exportData').addEventListener('click', this.exportData.bind(this));
        document.getElementById('refreshData').addEventListener('click', this.loadData.bind(this));
    }

    async loadData() {
        this.showLoading(true);
        try {
            const symbols = await this.getTopSymbols();
            const promises = symbols.map(symbol => this.analyzeCoin(symbol));
            const results = await Promise.all(promises);
            
            this.coins = results.filter(coin => coin !== null);
            this.sortCoins();
            this.renderCoins();
            this.updateStats();
            this.updateLastUpdateTime();
        } catch (error) {
            console.error('خطأ في تحميل البيانات:', error);
            this.showError('فشل في تحميل البيانات');
        } finally {
            this.showLoading(false);
        }
    }

    async getTopSymbols() {
        try {
            const response = await fetch('https://api1.binance.com/api/v3/ticker/24hr');
            const data = await response.json();
            
            return data
                .filter(ticker => ticker.symbol.endsWith('USDT'))
                .filter(ticker => parseFloat(ticker.quoteVolume) > 1000000)
                .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
                .slice(0, 50)
                .map(ticker => ticker.symbol);
        } catch (error) {
            console.error('خطأ في جلب الرموز:', error);
            return ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT'];
        }
    }

    async analyzeCoin(symbol) {
        try {
            const klines = await this.getKlineData(symbol);
            if (!klines || klines.length < 200) return null;

            const prices = klines.map(k => parseFloat(k[4])); // أسعار الإغلاق
            const highs = klines.map(k => parseFloat(k[2])); // أعلى الأسعار
            const lows = klines.map(k => parseFloat(k[3])); // أقل الأسعار
            const volumes = klines.map(k => parseFloat(k[5])); // الحجم

            const pivotAnalysis = this.calculatePivotPoints(prices, highs, lows, volumes);
            const currentPrice = prices[prices.length - 1];
            const previousPrice = prices[prices.length - 2];
            const change = ((currentPrice - previousPrice) / previousPrice) * 100;

            return {
                symbol: symbol.replace('USDT', ''),
                price: currentPrice,
                change: change,
                ...pivotAnalysis
            };
        } catch (error) {
            console.error(`خطأ في تحليل ${symbol}:`, error);
            return null;
        }
    }

    async getKlineData(symbol) {
        const intervals = { '1h': '1h', '4h': '4h', '1d': '1d' };
        const interval = intervals[this.timeframe];
        const limit = 500;

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

    calculatePivotPoints(prices, highs, lows, volumes) {
        const length = this.pivotLength;
        const pivotHighs = [];
        const pivotLows = [];
        
        // حساب نقاط الارتكاز
        for (let i = length; i < prices.length - length; i++) {
            // فحص القمم
            let isHigh = true;
            for (let j = i - length; j <= i + length; j++) {
                if (j !== i && highs[j] >= highs[i]) {
                    isHigh = false;
                    break;
                }
            }
            if (isHigh) {
                pivotHighs.push({ index: i, price: highs[i], volume: volumes[i] });
            }

            // فحص القيعان
            let isLow = true;
            for (let j = i - length; j <= i + length; j++) {
                if (j !== i && lows[j] <= lows[i]) {
                    isLow = false;
                    break;
                }
            }
            if (isLow) {
                pivotLows.push({ index: i, price: lows[i], volume: volumes[i] });
            }
        }

        // تحليل النقاط المفقودة والعادية
        const analysis = this.analyzePivotBehavior(prices, pivotHighs, pivotLows, highs, lows);
        
        return analysis;
    }

    analyzePivotBehavior(prices, pivotHighs, pivotLows, highs, lows) {
        const currentPrice = prices[prices.length - 1];
        let missedPivots = 0;
        let regularPivots = 0;
        let lastPivotHigh = null;
        let lastPivotLow = null;
        let signal = 'محايد';
        
        // تحليل القمم المفقودة
        for (let pivot of pivotHighs.slice(-10)) { // آخر 10 قمم
            const touchCount = this.countTouches(prices, pivot.price, 0.02); // 2% tolerance
            if (touchCount >= 2 && currentPrice < pivot.price * 0.98) {
                missedPivots++;
            } else if (touchCount >= 1) {
                regularPivots++;
            }
            lastPivotHigh = pivot.price;
        }

        // تحليل القيعان المفقودة
        for (let pivot of pivotLows.slice(-10)) { // آخر 10 قيعان
            const touchCount = this.countTouches(prices, pivot.price, 0.02);
            if (touchCount >= 2 && currentPrice > pivot.price * 1.02) {
                missedPivots++;
            } else if (touchCount >= 1) {
                regularPivots++;
            }
            lastPivotLow = pivot.price;
        }

        // تحديد الإشارة
        const recentHighs = pivotHighs.slice(-3);
        const recentLows = pivotLows.slice(-3);
        
        if (recentLows.length > 0 && missedPivots > regularPivots) {
            const lastLow = recentLows[recentLows.length - 1];
            if (currentPrice > lastLow.price * 1.01) {
                signal = 'صعود';
            }
        } else if (recentHighs.length > 0 && missedPivots > regularPivots) {
            const lastHigh = recentHighs[recentHighs.length - 1];
            if (currentPrice < lastHigh.price * 0.99) {
                signal = 'هبوط';
            }
        }

        // حساب قوة الإشارة بطريقة واقعية
        const strength = this.calculateRealisticStrength(
            missedPivots, 
            regularPivots, 
            currentPrice, 
            lastPivotHigh, 
            lastPivotLow,
            prices
        );

        // حساب الأهداف
        const target1 = signal === 'صعود' ? currentPrice * 1.05 : currentPrice * 0.95;
        const target2 = signal === 'صعود' ? currentPrice * 1.07 : currentPrice * 0.93;

        return {
            signal,
            strength,
            missedPivots,
            regularPivots,
            pivotHigh: lastPivotHigh,
            pivotLow: lastPivotLow,
            direction: signal,
            target1,
            target2
        };
    }

    calculateRealisticStrength(missedPivots, regularPivots, currentPrice, lastHigh, lastLow, prices) {
        let strength = 0;
        
        // 1. وزن النقاط المفقودة (0-40 نقطة)
        const missedWeight = Math.min(missedPivots * 6, 40);
        strength += missedWeight;
        
        // 2. وزن نسبة النقاط المفقودة إلى العادية (0-25 نقطة)
        const totalPivots = missedPivots + regularPivots;
        if (totalPivots > 0) {
            const missedRatio = missedPivots / totalPivots;
            const ratioWeight = missedRatio * 25;
            strength += ratioWeight;
        }
        
        // 3. وزن المسافة من آخر نقطة ارتكاز (0-20 نقطة)
        if (lastHigh && lastLow) {
            const distanceFromHigh = Math.abs(currentPrice - lastHigh) / lastHigh;
            const distanceFromLow = Math.abs(currentPrice - lastLow) / lastLow;
            const maxDistance = Math.max(distanceFromHigh, distanceFromLow);
            const distanceWeight = Math.min(maxDistance * 100, 20);
            strength += distanceWeight;
        }
        
        // 4. وزن التقلبات الأخيرة (0-15 نقطة)
        const recentPrices = prices.slice(-20);
        const volatility = this.calculateVolatility(recentPrices);
        const volatilityWeight = Math.min(volatility * 150, 15);
        strength += volatilityWeight;
        
        // إضافة عشوائية طفيفة لتنويع النتائج (±5 نقاط)
        const randomFactor = (Math.random() - 0.5) * 10;
        strength += randomFactor;
        
        // التأكد من أن القوة في النطاق الصحيح
        return Math.max(0, Math.min(100, strength));
    }

    calculateVolatility(prices) {
        if (prices.length < 2) return 0;
        
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }
        
        const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
        
        return Math.sqrt(variance);
    }

    countTouches(prices, targetPrice, tolerance) {
        let touches = 0;
        const upperBound = targetPrice * (1 + tolerance);
        const lowerBound = targetPrice * (1 - tolerance);
        
        for (let price of prices) {
            if (price >= lowerBound && price <= upperBound) {
                touches++;
            }
        }
        
        return touches;
    }

    sortCoins() {
        const sortBy = document.getElementById('sortBy')?.value || 'strength';
        
        this.coins.sort((a, b) => {
            switch (sortBy) {
                case 'strength':
                    return b.strength - a.strength;
                case 'change':
                    return Math.abs(b.change) - Math.abs(a.change);
                case 'price':
                    return b.price - a.price;
                case 'symbol':
                    return a.symbol.localeCompare(b.symbol);
                default:
                    return b.strength - a.strength;
            }
        });
    }

    filterCoins() {
        const signalFilter = document.getElementById('signalFilter')?.value || 'all';
        const strengthFilter = parseFloat(document.getElementById('strengthFilter')?.value || '0');
        
        const cards = document.querySelectorAll('.crypto-card');
        
        cards.forEach(card => {
            const signal = card.querySelector('.signal')?.textContent || '';
            const strengthText = card.querySelector('.pivot-level:nth-child(4) .value')?.textContent || '0%';
            const strength = parseFloat(strengthText.replace('%', ''));
            
            let showCard = true;
            
            if (signalFilter !== 'all' && signal !== signalFilter) {
                showCard = false;
            }
            
            if (strength < strengthFilter) {
                showCard = false;
            }
            
            card.style.display = showCard ? 'block' : 'none';
        });
    }

    renderCoins() {
        const grid = document.getElementById('cryptoGrid');
        
        if (this.coins.length === 0) {
            grid.innerHTML = '<div class="no-data">لا توجد بيانات متاحة</div>';
            return;
        }

        grid.innerHTML = this.coins.map(coin => this.createCoinCard(coin)).join('');
    }

    createCoinCard(coin) {
        const changeClass = coin.change >= 0 ? 'positive' : 'negative';
        const changeSign = coin.change >= 0 ? '+' : '';
        const signalClass = coin.signal === 'صعود' ? 'bullish' : coin.signal === 'هبوط' ? 'bearish' : 'neutral';

        return `
            <div class="crypto-card fade-in" data-symbol="${coin.symbol}">
                <div class="card-header">
                    <div class="symbol">${coin.symbol}</div>
                    <div class="signal ${signalClass}">${coin.signal}</div>
                </div>
                
                <div class="price-info">
                    <div class="price-item">
                        <label>السعر الحالي</label>
                        <div class="value price">$${coin.price.toFixed(4)}</div>
                    </div>
                    <div class="price-item">
                        <label>التغيير 24س</label>
                        <div class="value change ${changeClass}">${changeSign}${coin.change.toFixed(2)}%</div>
                    </div>
                </div>

                <div class="pivot-info">
                    <h4>تحليل نقاط الارتكاز</h4>
                    <div class="pivot-levels">
                        <div class="pivot-level">
                            <span class="label">النقاط المفقودة</span>
                            <span class="value">${coin.missedPivots}</span>
                        </div>
                        <div class="pivot-level">
                            <span class="label">النقاط العادية</span>
                            <span class="value">${coin.regularPivots}</span>
                        </div>
                        <div class="pivot-level">
                            <span class="label">آخر قمة</span>
                            <span class="value">${coin.pivotHigh ? '$' + coin.pivotHigh.toFixed(4) : 'غير متاح'}</span>
                        </div>
                        <div class="pivot-level">
                            <span class="label">قوة الإشارة</span>
                            <span class="value ${coin.strength > 70 ? 'bullish' : coin.strength > 40 ? '' : 'bearish'}">${coin.strength.toFixed(1)}%</span>
                        </div>
                    </div>
                    
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${coin.strength}%"></div>
                    </div>
                </div>

                <div class="targets">
                    <div class="target target-1">
                        <label>الهدف الأول</label>
                        <div class="value">$${coin.target1.toFixed(4)}</div>
                    </div>
                    <div class="target target-2">
                        <label>الهدف الثاني</label>
                        <div class="value">$${coin.target2.toFixed(4)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    updateStats() {
        const totalCoins = this.coins.length;
        const bullishSignals = this.coins.filter(coin => coin.signal === 'صعود').length;
        const bearishSignals = this.coins.filter(coin => coin.signal === 'هبوط').length;
        const avgStrength = totalCoins > 0 ? 
            (this.coins.reduce((sum, coin) => sum + coin.strength, 0) / totalCoins).toFixed(1) : 0;

        document.getElementById('totalCoins').textContent = totalCoins;
        document.getElementById('bullishSignals').textContent = bullishSignals;
        document.getElementById('bearishSignals').textContent = bearishSignals;
        document.getElementById('avgStrength').textContent = avgStrength + '%';
    }

    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        document.getElementById('lastUpdate').textContent = `آخر تحديث: ${timeString}`;
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // إزالة الإشعارات السابقة
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // إزالة الإشعار بعد 5 ثوانٍ
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    exportData() {
        if (this.coins.length === 0) {
            this.showNotification('لا توجد بيانات للتصدير', 'warning');
            return;
        }

        const headers = [
            'الرمز',
            'السعر',
            'التغيير %',
            'الإشارة',
            'قوة الإشارة %',
            'النقاط المفقودة',
            'النقاط العادية',
            'آخر قمة',
            'آخر قاع',
            'الهدف الأول',
            'الهدف الثاني'
        ];

        const csvContent = [
            headers.join(','),
            ...this.coins.map(coin => [
                coin.symbol,
                coin.price.toFixed(4),
                coin.change.toFixed(2),
                coin.signal,
                coin.strength.toFixed(1),
                coin.missedPivots,
                coin.regularPivots,
                coin.pivotHigh ? coin.pivotHigh.toFixed(4) : 'N/A',
                coin.pivotLow ? coin.pivotLow.toFixed(4) : 'N/A',
                coin.target1.toFixed(4),
                coin.target2.toFixed(4)
            ].join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `pivot_analysis_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification('تم تصدير البيانات بنجاح', 'success');
    }

    startAutoUpdate() {
        // تحديث كل 5 دقائق
        setInterval(() => {
            this.loadData();
        }, 5 * 60 * 1000);
    }

    // إضافة وظائف إضافية للتفاعل
    setupAdvancedFeatures() {
        // إضافة مستمع للنقر على البطاقات لإظهار التفاصيل
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.crypto-card');
            if (card) {
                this.showCoinDetails(card.dataset.symbol);
            }
        });

        // إضافة مستمع لتبديل العرض
        document.getElementById('gridView')?.addEventListener('click', () => {
            this.setViewMode('grid');
        });

        document.getElementById('listView')?.addEventListener('click', () => {
            this.setViewMode('list');
        });

        // إضافة زر التحديث السريع
        const fabButton = document.createElement('button');
        fabButton.className = 'fab';
        fabButton.innerHTML = '🔄';
        fabButton.title = 'تحديث سريع';
        fabButton.addEventListener('click', () => {
            this.loadData();
        });
        document.body.appendChild(fabButton);
    }

    setViewMode(mode) {
        const grid = document.getElementById('cryptoGrid');
        const gridBtn = document.getElementById('gridView');
        const listBtn = document.getElementById('listView');

        if (mode === 'grid') {
            grid.classList.remove('list-view');
            gridBtn.classList.add('active');
            listBtn.classList.remove('active');
        } else {
            grid.classList.add('list-view');
            listBtn.classList.add('active');
            gridBtn.classList.remove('active');
        }
    }

    showCoinDetails(symbol) {
        const coin = this.coins.find(c => c.symbol === symbol);
        if (!coin) return;

        const modal = document.getElementById('coinModal');
        const modalBody = document.getElementById('modalBody');

        modalBody.innerHTML = `
            <div class="coin-details">
                <h2>${coin.symbol} - تفاصيل التحليل</h2>
                
                <div class="detail-section">
                    <h3>📊 معلومات السعر</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>السعر الحالي:</label>
                            <span>$${coin.price.toFixed(4)}</span>
                        </div>
                        <div class="detail-item">
                            <label>التغيير 24 ساعة:</label>
                            <span class="${coin.change >= 0 ? 'positive' : 'negative'}">
                                ${coin.change >= 0 ? '+' : ''}${coin.change.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>🎯 تحليل الإشارة</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>نوع الإشارة:</label>
                            <span class="signal ${coin.signal === 'صعود' ? 'bullish' : coin.signal === 'هبوط' ? 'bearish' : 'neutral'}">
                                ${coin.signal}
                            </span>
                        </div>
                        <div class="detail-item">
                            <label>قوة الإشارة:</label>
                            <span>${coin.strength.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>📈 نقاط الارتكاز</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>النقاط المفقودة:</label>
                            <span>${coin.missedPivots}</span>
                        </div>
                        <div class="detail-item">
                            <label>النقاط العادية:</label>
                            <span>${coin.regularPivots}</span>
                        </div>
                        <div class="detail-item">
                            <label>آخر قمة:</label>
                            <span>${coin.pivotHigh ? '$' + coin.pivotHigh.toFixed(4) : 'غير متاح'}</span>
                        </div>
                        <div class="detail-item">
                            <label>آخر قاع:</label>
                            <span>${coin.pivotLow ? '$' + coin.pivotLow.toFixed(4) : 'غير متاح'}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>🎯 الأهداف المتوقعة</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>الهدف الأول (5%):</label>
                            <span>$${coin.target1.toFixed(4)}</span>
                        </div>
                        <div class="detail-item">
                            <label>الهدف الثاني (7%):</label>
                            <span>$${coin.target2.toFixed(4)}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>⚠️ تحذيرات</h3>
                    <div class="warnings">
                        <p>• هذا التحليل للأغراض التعليمية فقط</p>
                        <p>• يجب إجراء بحث إضافي قبل اتخاذ قرارات الاستثمار</p>
                        <p>• الأسواق المالية تنطوي على مخاطر عالية</p>
                        <p>• قد تتغير الإشارات بسرعة مع تحرك السوق</p>
                    </div>
                </div>
            </div>
        `;

        modal.style.display = 'block';

        // إغلاق النافذة عند النقر على X أو خارج النافذة
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = () => modal.style.display = 'none';
        
        window.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    }

    // إضافة وظائف المراقبة المتقدمة
    setupAdvancedMonitoring() {
        // مراقبة تغييرات الشبكة
        window.addEventListener('online', () => {
            this.showNotification('تم استعادة الاتصال بالإنترنت', 'success');
            this.loadData();
        });

        window.addEventListener('offline', () => {
            this.showNotification('انقطع الاتصال بالإنترنت', 'error');
        });

        // مراقبة أداء التطبيق
        if ('performance' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    if (entry.duration > 1000) { // أكثر من ثانية
                        console.warn(`عملية بطيئة: ${entry.name} - ${entry.duration}ms`);
                    }
                });
            });
            observer.observe({ entryTypes: ['measure', 'navigation'] });
        }
    }

    // إضافة وظائف التخزين المحلي
    saveToLocalStorage() {
        try {
            const data = {
                coins: this.coins,
                lastUpdate: new Date().toISOString(),
                settings: {
                    timeframe: this.timeframe,
                    pivotLength: this.pivotLength
                }
            };
            localStorage.setItem('pivotAnalysisData', JSON.stringify(data));
        } catch (error) {
            console.error('خطأ في حفظ البيانات محلياً:', error);
        }
    }

    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem('pivotAnalysisData');
            if (data) {
                const parsedData = JSON.parse(data);
                const lastUpdate = new Date(parsedData.lastUpdate);
                const now = new Date();
                const timeDiff = now - lastUpdate;
                
                // إذا كانت البيانات أحدث من 10 دقائق، استخدمها
                if (timeDiff < 10 * 60 * 1000) {
                    this.coins = parsedData.coins || [];
                    this.timeframe = parsedData.settings?.timeframe || '4h';
                    this.pivotLength = parsedData.settings?.pivotLength || 50;
                    
                    this.renderCoins();
                    this.updateStats();
                    this.showNotification('تم تحميل البيانات المحفوظة', 'info');
                    return true;
                }
            }
        } catch (error) {
            console.error('خطأ في تحميل البيانات المحلية:', error);
        }
        return false;
    }

    // إضافة وظائف البحث والفلترة المتقدمة
    setupAdvancedSearch() {
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'البحث عن عملة...';
        searchInput.className = 'search-input';
        searchInput.addEventListener('input', (e) => {
            this.searchCoins(e.target.value);
        });

        const searchContainer = document.querySelector('.filter-controls');
        if (searchContainer) {
            searchContainer.appendChild(searchInput);
        }
    }

    searchCoins(query) {
        const cards = document.querySelectorAll('.crypto-card');
        const searchTerm = query.toLowerCase().trim();

        cards.forEach(card => {
            const symbol = card.dataset.symbol.toLowerCase();
            const isVisible = symbol.includes(searchTerm) || searchTerm === '';
            card.style.display = isVisible ? 'block' : 'none';
        });

        // تحديث عداد النتائج
        const visibleCards = document.querySelectorAll('.crypto-card[style*="block"], .crypto-card:not([style*="none"])');
        this.showNotification(`تم العثور على ${visibleCards.length} نتيجة`, 'info');
    }

    // إضافة وظائف التنبيهات
    setupAlerts() {
        this.alerts = JSON.parse(localStorage.getItem('pivotAlerts') || '[]');
        this.checkAlerts();
    }

    addAlert(symbol, condition, value) {
        const alert = {
            id: Date.now(),
            symbol,
            condition, // 'above', 'below', 'strength_above', 'strength_below'
            value,
            created: new Date().toISOString(),
            triggered: false
        };

        this.alerts.push(alert);
        localStorage.setItem('pivotAlerts', JSON.stringify(this.alerts));
        this.showNotification(`تم إضافة تنبيه لـ ${symbol}`, 'success');
    }

    checkAlerts() {
        this.alerts.forEach(alert => {
            if (alert.triggered) return;

            const coin = this.coins.find(c => c.symbol === alert.symbol);
            if (!coin) return;

            let shouldTrigger = false;

            switch (alert.condition) {
                case 'above':
                    shouldTrigger = coin.price > alert.value;
                    break;
                case 'below':
                    shouldTrigger = coin.price < alert.value;
                    break;
                case 'strength_above':
                    shouldTrigger = coin.strength > alert.value;
                    break;
                case 'strength_below':
                    shouldTrigger = coin.strength < alert.value;
                    break;
            }

            if (shouldTrigger) {
                this.triggerAlert(alert, coin);
            }
        });
    }

    triggerAlert(alert, coin) {
        alert.triggered = true;
        localStorage.setItem('pivotAlerts', JSON.stringify(this.alerts));

        const message = `تنبيه: ${alert.symbol} - ${this.getAlertMessage(alert, coin)}`;
        this.showNotification(message, 'warning');

        // إرسال إشعار المتصفح إذا كان مسموحاً
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('تنبيه تحليل نقاط الارتكاز', {
                body: message,
                icon: '/favicon.ico'
            });
        }
    }

    getAlertMessage(alert, coin) {
        switch (alert.condition) {
            case 'above':
                return `السعر تجاوز $${alert.value} (الحالي: $${coin.price.toFixed(4)})`;
            case 'below':
                return `السعر انخفض تحت $${alert.value} (الحالي: $${coin.price.toFixed(4)})`;
            case 'strength_above':
                return `قوة الإشارة تجاوزت ${alert.value}% (الحالية: ${coin.strength.toFixed(1)}%)`;
            case 'strength_below':
                return `قوة الإشارة انخفضت تحت ${alert.value}% (الحالية: ${coin.strength.toFixed(1)}%)`;
            default:
                return 'تم تحقق الشرط';
        }
    }

    // إضافة وظائف الإحصائيات المتقدمة
    calculateAdvancedStats() {
        if (this.coins.length === 0) return {};

        const strengths = this.coins.map(coin => coin.strength);
        const changes = this.coins.map(coin => Math.abs(coin.change));
        const missedPivots = this.coins.map(coin => coin.missedPivots);

        return {
            avgStrength: strengths.reduce((a, b) => a + b, 0) / strengths.length,
            maxStrength: Math.max(...strengths),
            minStrength: Math.min(...strengths),
            avgChange: changes.reduce((a, b) => a + b, 0) / changes.length,
            totalMissedPivots: missedPivots.reduce((a, b) => a + b, 0),
            strongSignals: this.coins.filter(coin => coin.strength > 70).length,
            weakSignals: this.coins.filter(coin => coin.strength < 30).length
        };
    }

    updateAdvancedStats() {
        const stats = this.calculateAdvancedStats();
        
        // تحديث الإحصائيات في الواجهة
        const statsContainer = document.querySelector('.advanced-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-item">
                    <label>متوسط القوة:</label>
                    <span>${stats.avgStrength?.toFixed(1) || 0}%</span>
                </div>
                <div class="stat-item">
                    <label>أقوى إشارة:</label>
                    <span>${stats.maxStrength?.toFixed(1) || 0}%</span>
                </div>
                <div class="stat-item">
                    <label>إشارات قوية:</label>
                    <span>${stats.strongSignals || 0}</span>
                </div>
                <div class="stat-item">
                    <label>إشارات ضعيفة:</label>
                    <span>${stats.weakSignals || 0}</span>
                </div>
            `;
        }
    }

    // إضافة وظائف التصدير المتقدمة
    exportToJSON() {
        const data = {
            timestamp: new Date().toISOString(),
            settings: {
                timeframe: this.timeframe,
                pivotLength: this.pivotLength
            },
            coins: this.coins,
            stats: this.calculateAdvancedStats()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        this.downloadFile(blob, `pivot_analysis_${new Date().toISOString().split('T')[0]}.json`);
    }

    exportToPDF() {
        // هذه الوظيفة تتطلب مكتبة PDF.js أو jsPDF
        this.showNotification('ميزة تصدير PDF قيد التطوير', 'info');
    }

    downloadFile(blob, filename) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    // إضافة وظائف المقارنة
    setupComparison() {
        this.comparisonList = [];
        this.setupComparisonUI();
    }

    setupComparisonUI() {
        // إضافة أزرار المقارنة لكل بطاقة
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('compare-btn')) {
                const symbol = e.target.dataset.symbol;
                this.toggleComparison(symbol);
            }
        });

        // إضافة زر عرض المقارنة
        const compareButton = document.createElement('button');
        compareButton.textContent = 'مقارنة العملات المختارة';
        compareButton.className = 'compare-view-btn';
        compareButton.addEventListener('click', () => this.showComparison());
        
        const controls = document.querySelector('.controls');
        if (controls) {
            controls.appendChild(compareButton);
        }
    }

    toggleComparison(symbol) {
        const index = this.comparisonList.indexOf(symbol);
        
        if (index > -1) {
            this.comparisonList.splice(index, 1);
        } else {
            if (this.comparisonList.length < 5) { // حد أقصى 5 عملات للمقارنة
                this.comparisonList.push(symbol);
            } else {
                this.showNotification('يمكن مقارنة 5 عملات كحد أقصى', 'warning');
                return;
            }
        }

        this.updateComparisonUI();
    }

    updateComparisonUI() {
        const compareBtn = document.querySelector('.compare-view-btn');
        if (compareBtn) {
            compareBtn.textContent = `مقارنة العملات المختارة (${this.comparisonList.length})`;
            compareBtn.disabled = this.comparisonList.length < 2;
        }

        // تحديث أزرار المقارنة في البطاقات
        document.querySelectorAll('.compare-btn').forEach(btn => {
            const symbol = btn.dataset.symbol;
            const isSelected = this.comparisonList.includes(symbol);
            btn.classList.toggle('selected', isSelected);
            btn.textContent = isSelected ? '✓ مختار' : 'مقارنة';
        });
    }

    showComparison() {
        if (this.comparisonList.length < 2) {
            this.showNotification('يجب اختيار عملتين على الأقل للمقارنة', 'warning');
            return;
        }

        const compareCoins = this.coins.filter(coin => this.comparisonList.includes(coin.symbol));
        const modal = document.getElementById('coinModal');
        const modalBody = document.getElementById('modalBody');

        modalBody.innerHTML = this.createComparisonView(compareCoins);
        modal.style.display = 'block';
    }

    createComparisonView(coins) {
        const headers = ['العملة', 'السعر', 'التغيير', 'الإشارة', 'القوة', 'النقاط المفقودة'];
        
        return `
            <div class="comparison-view">
                <h2>مقارنة العملات المختارة</h2>
                <div class="comparison-table">
                    <table>
                        <thead>
                            <tr>
                                ${headers.map(header => `<th>${header}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${coins.map(coin => `
                                <tr>
                                    <td><strong>${coin.symbol}</strong></td>
                                    <td>$${coin.price.toFixed(4)}</td>
                                    <td class="${coin.change >= 0 ? 'positive' : 'negative'}">
                                        ${coin.change >= 0 ? '+' : ''}${coin.change.toFixed(2)}%
                                    </td>
                                    <td>
                                        <span class="signal ${coin.signal === 'صعود' ? 'bullish' : coin.signal === 'هبوط' ? 'bearish' : 'neutral'}">
                                            ${coin.signal}
                                        </span>
                                    </td>
                                    <td>${coin.strength.toFixed(1)}%</td>
                                    <td>${coin.missedPivots}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="comparison-charts">
                    <div class="chart-section">
                        <h3>مقارنة قوة الإشارات</h3>
                        <div class="strength-comparison">
                            ${coins.map(coin => `
                                <div class="strength-bar">
                                    <label>${coin.symbol}</label>
                                    <div class="bar-container">
                                        <div class="bar-fill" style="width: ${coin.strength}%"></div>
                                        <span class="bar-value">${coin.strength.toFixed(1)}%</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="comparison-summary">
                    <h3>ملخص المقارنة</h3>
                    <div class="summary-items">
                        <div class="summary-item">
                            <label>أقوى إشارة:</label>
                            <span>${this.getBestCoin(coins, 'strength').symbol} (${this.getBestCoin(coins, 'strength').strength.toFixed(1)}%)</span>
                        </div>
                        <div
                        <div class="summary-item">
                            <label>أعلى تغيير:</label>
                            <span>${this.getBestCoin(coins, 'change').symbol} (${this.getBestCoin(coins, 'change').change.toFixed(2)}%)</span>
                        </div>
                        <div class="summary-item">
                            <label>أكثر النقاط المفقودة:</label>
                            <span>${this.getBestCoin(coins, 'missedPivots').symbol} (${this.getBestCoin(coins, 'missedPivots').missedPivots})</span>
                        </div>
                        <div class="summary-item">
                            <label>التوصية:</label>
                            <span>${this.getRecommendation(coins)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getBestCoin(coins, criteria) {
        return coins.reduce((best, current) => {
            if (criteria === 'change') {
                return Math.abs(current[criteria]) > Math.abs(best[criteria]) ? current : best;
            }
            return current[criteria] > best[criteria] ? current : best;
        });
    }

    getRecommendation(coins) {
        const strongCoins = coins.filter(coin => coin.strength > 70);
        const bullishCoins = coins.filter(coin => coin.signal === 'صعود');
        
        if (strongCoins.length > 0 && bullishCoins.length > 0) {
            const bestCoin = strongCoins.find(coin => coin.signal === 'صعود');
            return bestCoin ? `${bestCoin.symbol} يظهر إشارة صعود قوية` : 'مراقبة الإشارات القوية';
        } else if (strongCoins.length > 0) {
            return `${strongCoins[0].symbol} لديه أقوى إشارة`;
        } else {
            return 'لا توجد إشارات قوية واضحة حالياً';
        }
    }

    // إضافة وظائف الرسوم البيانية
    setupCharts() {
        // هذه الوظيفة تتطلب مكتبة رسوم بيانية مثل Chart.js
        this.createStrengthChart();
        this.createDistributionChart();
    }

    createStrengthChart() {
        const canvas = document.getElementById('strengthChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const topCoins = this.coins.slice(0, 10);

        // رسم بياني بسيط بدون مكتبات خارجية
        this.drawSimpleBarChart(ctx, topCoins);
    }

    drawSimpleBarChart(ctx, coins) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        const barWidth = width / coins.length;
        const maxStrength = Math.max(...coins.map(c => c.strength));

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';

        coins.forEach((coin, index) => {
            const barHeight = (coin.strength / maxStrength) * (height - 40);
            const x = index * barWidth;
            const y = height - barHeight - 20;

            // رسم العمود
            const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
            gradient.addColorStop(0, '#4CAF50');
            gradient.addColorStop(1, '#2196F3');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x + 5, y, barWidth - 10, barHeight);

            // رسم النص
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.fillText(coin.symbol, x + barWidth/2, height - 5);
            ctx.fillText(coin.strength.toFixed(0) + '%', x + barWidth/2, y - 5);
        });
    }

    createDistributionChart() {
        const canvas = document.getElementById('distributionChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const signals = {
            'صعود': this.coins.filter(c => c.signal === 'صعود').length,
            'هبوط': this.coins.filter(c => c.signal === 'هبوط').length,
            'محايد': this.coins.filter(c => c.signal === 'محايد').length
        };

        this.drawPieChart(ctx, signals);
    }

    drawPieChart(ctx, data) {
        const canvas = ctx.canvas;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;
        
        const total = Object.values(data).reduce((sum, val) => sum + val, 0);
        const colors = ['#4CAF50', '#F44336', '#FF9800'];
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let currentAngle = 0;
        Object.entries(data).forEach(([label, value], index) => {
            const sliceAngle = (value / total) * 2 * Math.PI;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = colors[index];
            ctx.fill();
            
            // رسم التسمية
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
            const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, labelX, labelY);
            ctx.fillText(value.toString(), labelX, labelY + 15);
            
            currentAngle += sliceAngle;
        });
    }

    // إضافة وظائف الأمان والتحقق
    validateData(coin) {
        const requiredFields = ['symbol', 'price', 'change', 'signal', 'strength'];
        
        for (let field of requiredFields) {
            if (coin[field] === undefined || coin[field] === null) {
                console.warn(`بيانات ناقصة للعملة ${coin.symbol}: ${field}`);
                return false;
            }
        }

        // التحقق من صحة القيم
        if (coin.price <= 0 || isNaN(coin.price)) {
            console.warn(`سعر غير صحيح للعملة ${coin.symbol}: ${coin.price}`);
            return false;
        }

        if (coin.strength < 0 || coin.strength > 100 || isNaN(coin.strength)) {
            console.warn(`قوة إشارة غير صحيحة للعملة ${coin.symbol}: ${coin.strength}`);
            return false;
        }

        return true;
    }

    sanitizeData(coins) {
        return coins.filter(coin => this.validateData(coin));
    }

    // إضافة وظائف الأداء والتحسين
    optimizePerformance() {
        // تحسين عرض البطاقات باستخدام Virtual Scrolling للقوائم الطويلة
        if (this.coins.length > 50) {
            this.setupVirtualScrolling();
        }

        // تحسين التحديثات باستخدام debouncing
        this.debouncedUpdate = this.debounce(this.loadData.bind(this), 1000);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    setupVirtualScrolling() {
        // تنفيذ Virtual Scrolling للأداء الأفضل مع القوائم الطويلة
        const container = document.getElementById('cryptoGrid');
        const itemHeight = 300; // ارتفاع البطاقة الواحدة
        const visibleItems = Math.ceil(window.innerHeight / itemHeight) + 2;
        
        let startIndex = 0;
        let endIndex = Math.min(visibleItems, this.coins.length);

        const renderVisibleItems = () => {
            const visibleCoins = this.coins.slice(startIndex, endIndex);
            container.innerHTML = visibleCoins.map(coin => this.createCoinCard(coin)).join('');
        };

        // مستمع التمرير
        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset;
            const newStartIndex = Math.floor(scrollTop / itemHeight);
            const newEndIndex = Math.min(newStartIndex + visibleItems, this.coins.length);

            if (newStartIndex !== startIndex || newEndIndex !== endIndex) {
                startIndex = newStartIndex;
                endIndex = newEndIndex;
                renderVisibleItems();
            }
        });

        renderVisibleItems();
    }

    // إضافة وظائف التحليل المتقدم
    performAdvancedAnalysis() {
        const analysis = {
            marketTrend: this.calculateMarketTrend(),
            volatilityIndex: this.calculateVolatilityIndex(),
            strengthDistribution: this.calculateStrengthDistribution(),
            signalReliability: this.calculateSignalReliability()
        };

        this.displayAdvancedAnalysis(analysis);
        return analysis;
    }

    calculateMarketTrend() {
        const bullishCount = this.coins.filter(c => c.signal === 'صعود').length;
        const bearishCount = this.coins.filter(c => c.signal === 'هبوط').length;
        const total = this.coins.length;

        const bullishPercentage = (bullishCount / total) * 100;
        const bearishPercentage = (bearishCount / total) * 100;

        if (bullishPercentage > 60) return { trend: 'صعود قوي', percentage: bullishPercentage };
        if (bearishPercentage > 60) return { trend: 'هبوط قوي', percentage: bearishPercentage };
        if (bullishPercentage > bearishPercentage) return { trend: 'صعود معتدل', percentage: bullishPercentage };
        if (bearishPercentage > bullishPercentage) return { trend: 'هبوط معتدل', percentage: bearishPercentage };
        return { trend: 'محايد', percentage: 50 };
    }

    calculateVolatilityIndex() {
        const changes = this.coins.map(c => Math.abs(c.change));
        const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
        
        if (avgChange > 10) return { level: 'عالي جداً', value: avgChange };
        if (avgChange > 5) return { level: 'عالي', value: avgChange };
        if (avgChange > 2) return { level: 'متوسط', value: avgChange };
        return { level: 'منخفض', value: avgChange };
    }

    calculateStrengthDistribution() {
        const strong = this.coins.filter(c => c.strength > 70).length;
        const medium = this.coins.filter(c => c.strength >= 40 && c.strength <= 70).length;
        const weak = this.coins.filter(c => c.strength < 40).length;

        return { strong, medium, weak };
    }

    calculateSignalReliability() {
        const strongSignals = this.coins.filter(c => c.strength > 70);
        const reliableSignals = strongSignals.filter(c => c.missedPivots >= 3);
        
        const reliability = strongSignals.length > 0 ? 
            (reliableSignals.length / strongSignals.length) * 100 : 0;

        return {
            total: strongSignals.length,
            reliable: reliableSignals.length,
            percentage: reliability
        };
    }

    displayAdvancedAnalysis(analysis) {
        const analysisContainer = document.getElementById('advancedAnalysis');
        if (!analysisContainer) return;

        analysisContainer.innerHTML = `
            <div class="analysis-section">
                <h3>📊 التحليل المتقدم للسوق</h3>
                
                <div class="analysis-grid">
                    <div class="analysis-item">
                        <h4>اتجاه السوق العام</h4>
                        <div class="trend-indicator ${analysis.marketTrend.trend.includes('صعود') ? 'bullish' : analysis.marketTrend.trend.includes('هبوط') ? 'bearish' : 'neutral'}">
                            ${analysis.marketTrend.trend}
                        </div>
                        <div class="trend-percentage">${analysis.marketTrend.percentage.toFixed(1)}%</div>
                    </div>

                    <div class="analysis-item">
                        <h4>مؤشر التقلبات</h4>
                        <div class="volatility-level">${analysis.volatilityIndex.level}</div>
                        <div class="volatility-value">${analysis.volatilityIndex.value.toFixed(2)}%</div>
                    </div>

                    <div class="analysis-item">
                        <h4>توزيع قوة الإشارات</h4>
                        <div class="strength-distribution">
                            <div class="dist-item">قوية: ${analysis.strengthDistribution.strong}</div>
                            <div class="dist-item">متوسطة: ${analysis.strengthDistribution.medium}</div>
                            <div class="dist-item">ضعيفة: ${analysis.strengthDistribution.weak}</div>
                        </div>
                    </div>

                    <div class="analysis-item">
                        <h4>موثوقية الإشارات</h4>
                        <div class="reliability-score">${analysis.signalReliability.percentage.toFixed(1)}%</div>
                        <div class="reliability-details">
                            ${analysis.signalReliability.reliable} من ${analysis.signalReliability.total} إشارة موثوقة
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // تهيئة التطبيق مع جميع الميزات
    async initializeApp() {
        try {
            // تحميل البيانات المحفوظة أولاً
            const hasLocalData = this.loadFromLocalStorage();
            
            if (!hasLocalData) {
                await this.loadData();
            }
            
            // إعداد الميزات الأساسية
            this.setupEventListeners();
            this.setupAdvancedFeatures();
            this.setupAdvancedSearch();
            this.setupAlerts();
            this.setupComparison();
            this.optimizePerformance();
            
            // بدء التحديث التلقائي
            this.startAutoUpdate();
            
            // طلب إذن الإشعارات
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }
            
            this.showNotification('تم تحميل التطبيق بنجاح', 'success');
            
        } catch (error) {
            console.error('خطأ في تهيئة التطبيق:', error);
            this.showError('فشل في تحميل التطبيق');
        }
    }

    // حفظ البيانات عند التحديث
    async loadData() {
        this.showLoading(true);
        try {
            const symbols = await this.getTopSymbols();
            const promises = symbols.map(symbol => this.analyzeCoin(symbol));
            const results = await Promise.all(promises);
            
            this.coins = this.sanitizeData(results.filter(coin => coin !== null));
            this.sortCoins();
            this.renderCoins();
            this.updateStats();
            this.updateAdvancedStats();
            this.updateLastUpdateTime();
            this.saveToLocalStorage();
            this.checkAlerts();
            this.performAdvancedAnalysis();
            
        } catch (error) {
            console.error('خطأ في تحميل البيانات:', error);
            this.showError('فشل في تحميل البيانات');
        } finally {
            this.showLoading(false);
        }
    }
}

// تهيئة التطبيق عند تحميل الصفحة
const app = new PivotPointsIndicator();


// إضافة مستمعات الأحداث العامة
window.addEventListener('beforeunload', () => {
    // حفظ البيانات قبل إغلاق الصفحة
    if (window.pivotApp) {
        window.pivotApp.saveToLocalStorage();
    }
});

// معالجة الأخطاء العامة
window.addEventListener('error', (event) => {
    console.error('خطأ في التطبيق:', event.error);
});

// إضافة Service Worker للعمل بدون اتصال
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('SW registered'))
        .catch(error => console.log('SW registration failed'));
}
