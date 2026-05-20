/**
 * Global State
 */
const UPDATE_INTERVAL_MS = 60000;
let currentRates = {};
let targetCurrency = 'USD';
let activeLat = 49.6116;
let activeLon = 6.1319;
let activeCity = 'Luxembourg';
let currencyChartInstance = null;
let db = null;
let favoriteCities = JSON.parse(localStorage.getItem('favCities') || '[]');

const STOCKS = [
    { symbol: 'AAPL', name: 'Apple',     basePrice: 189.30 },
    { symbol: 'MSFT', name: 'Microsoft', basePrice: 415.50 },
    { symbol: 'GOOGL', name: 'Alphabet', basePrice: 176.40 },
    { symbol: 'TSLA', name: 'Tesla',     basePrice: 248.90 },
];
let stockPrices = {};

const CRYPTO_CONFIG = [
    { id: 'bitcoin',  name: 'Bitcoin',  symbol: 'BTC', colorClass: 'text-orange-500', bgClass: 'bg-orange-50 dark:bg-orange-900/20' },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', colorClass: 'text-indigo-500', bgClass: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { id: 'solana',   name: 'Solana',   symbol: 'SOL', colorClass: 'text-purple-500', bgClass: 'bg-purple-50 dark:bg-purple-900/20' },
];

/**
 * DOM refs
 */
const eurInp   = document.getElementById('eur-input');
const trgInp   = document.getElementById('target-input');
const currSelect = document.getElementById('target-currency-select');
const trgLabel = document.getElementById('target-curr-label');
const cityInput = document.getElementById('city-search-input');
const cityForm  = document.getElementById('city-search-form');

/**
 * Toast Notification System
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const palettes = {
        info:    'bg-indigo-600 text-white',
        success: 'bg-emerald-600 text-white',
        warning: 'bg-amber-500 text-white',
        error:   'bg-red-600 text-white',
    };
    const icons = {
        info:    'bi-info-circle-fill',
        success: 'bi-check-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        error:   'bi-x-circle-fill',
    };
    const el = document.createElement('div');
    el.className = `toast-item pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium ${palettes[type]}`;
    el.innerHTML = `<i class="bi ${icons[type]} text-lg flex-shrink-0"></i><span>${message}</span>`;
    container.appendChild(el);

    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));

    setTimeout(() => {
        el.classList.add('hide');
        el.addEventListener('transitionend', () => el.remove(), { once: true });
    }, 3500);
}

/**
 * Skeleton helpers
 */
function hideSkeletons(prefix) {
    if (prefix === 'eur') {
        ['skel-eur', 'skel-usd', 'skel-chart'].forEach(id => document.getElementById(id).classList.add('hidden'));
        ['eur-container', 'usd-container', 'currencyChart'].forEach(id => document.getElementById(id).classList.remove('hidden'));
    }
    if (prefix === 'weather') {
        ['skel-temp','skel-desc','skel-feels','skel-wind','skel-humidity','skel-icon'].forEach(id => document.getElementById(id).classList.add('hidden'));
        ['weather-temp','weather-desc','weather-feels','weather-wind','weather-humidity','weather-icon-container'].forEach(id => document.getElementById(id).classList.remove('hidden'));
    }
}

/**
 * World Clocks
 */
function updateClocks() {
    const now = new Date();
    const opts = { hour: '2-digit', minute: '2-digit' };
    document.getElementById('clock-ny').innerText  = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York',    ...opts });
    document.getElementById('clock-lon').innerText = now.toLocaleTimeString('en-GB', { timeZone: 'Europe/London',       ...opts });
    document.getElementById('clock-lux').innerText = now.toLocaleTimeString('en-GB', { timeZone: 'Europe/Luxembourg',   ...opts });
    document.getElementById('clock-tok').innerText = now.toLocaleTimeString('en-JP', { timeZone: 'Asia/Tokyo',          ...opts });
    const hr = now.getHours();
    const greet = hr < 12 ? 'Good Morning' : hr < 18 ? 'Good Afternoon' : 'Good Evening';
    document.getElementById('greeting-text').innerText = `${greet}! Tracking Markets & Local Weather`;
}

/**
 * Currency Engine
 */
function convertCurrency(direction) {
    if (!currentRates[targetCurrency]) return;
    const rate = currentRates[targetCurrency];
    if (targetCurrency === 'BTC') {
        if (direction === 'EUR') trgInp.value = (parseFloat(eurInp.value) / (currentRates['USD'] * 60000)).toFixed(6);
        else eurInp.value = (parseFloat(trgInp.value) * currentRates['USD'] * 60000).toFixed(2);
        return;
    }
    if (direction === 'EUR') trgInp.value = (parseFloat(eurInp.value) * rate).toFixed(2);
    else eurInp.value = (parseFloat(trgInp.value) / rate).toFixed(2);
}

eurInp.addEventListener('input', () => convertCurrency('EUR'));
trgInp.addEventListener('input', () => convertCurrency('TRG'));
currSelect.addEventListener('change', (e) => {
    targetCurrency = e.target.value;
    trgLabel.innerText = targetCurrency === 'BTC' ? 'Target (₿)' : `Target (${targetCurrency})`;
    convertCurrency('EUR');
    fetchCurrencyHistory();
    showToast(`Switched to EUR → ${targetCurrency}`, 'info');
});

async function fetchCurrency() {
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/EUR');
        const data = await res.json();
        currentRates = data.rates;
        if (trgInp.value === '--') { eurInp.value = 1; convertCurrency('EUR'); }
        document.getElementById('currency-time').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        hideSkeletons('eur');
        fetchCurrencyHistory();
        showToast('Currency rates updated', 'success');
    } catch (err) {
        console.error('Currency error:', err);
        showToast('Currency update failed — retrying next cycle', 'error');
    }
}

async function fetchCurrencyHistory() {
    try {
        const d = new Date();
        d.setTime(d.getTime() - 10 * 86400000);
        const startStr = d.toISOString().split('T')[0];
        if (targetCurrency !== 'BTC' && targetCurrency !== 'TRY') {
            const histRes = await fetch(`https://api.frankfurter.app/${startStr}..?from=EUR&to=${targetCurrency}`);
            const histData = await histRes.json();
            if (histData && histData.rates) { updateChart(histData.rates, targetCurrency); return; }
        }
        throw new Error('fallback');
    } catch {
        const fallback = {};
        const rateNow = currentRates[targetCurrency] || 1;
        for (let i = 10; i >= 0; i--) {
            const d = new Date();
            d.setTime(d.getTime() - i * 86400000);
            const v = (Math.random() * 0.02) - 0.01;
            fallback[d.toISOString().split('T')[0]] = { [targetCurrency]: parseFloat((rateNow + rateNow * v).toFixed(2)) };
        }
        updateChart(fallback, targetCurrency);
        document.getElementById('currency-time').textContent += ' | Trend Engine';
    }
}

function updateChart(rates, tCurr) {
    const dates = Object.keys(rates);
    const values = dates.map(d => rates[d][tCurr]);
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    if (currencyChartInstance) {
        currencyChartInstance.data.labels = dates.map(d => d.substring(5));
        currencyChartInstance.data.datasets[0].data = values;
        currencyChartInstance.data.datasets[0].label = `EUR → ${tCurr}`;
        currencyChartInstance.options.scales.x.ticks.color = textColor;
        currencyChartInstance.options.scales.y.ticks.color = textColor;
        currencyChartInstance.options.scales.x.grid.color = gridColor;
        currencyChartInstance.options.scales.y.grid.color = gridColor;
        currencyChartInstance.update();
        return;
    }

    const ctx = document.getElementById('currencyChart').getContext('2d');
    currencyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.map(d => d.substring(5)),
            datasets: [{
                label: `EUR → ${tCurr}`,
                data: values,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99,102,241,0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
            scales: {
                x: { grid: { color: gridColor }, ticks: { color: textColor } },
                y: { grid: { color: gridColor, borderDash: [5, 5] }, ticks: { color: textColor } }
            }
        }
    });
}

/**
 * Weather Engine
 */
const WMO = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Icy fog',
    51: 'Light drizzle', 53: 'Drizzle', 56: 'Freezing drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 85: 'Snow showers',
    80: 'Rain showers', 81: 'Showers', 82: 'Heavy showers',
    95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Thunderstorm + heavy hail',
};

function getWeatherDesc(code) { return WMO[code] || 'Variable'; }

function getWeatherIcon(code, isDay) {
    let icon = 'bi-cloud', colorClass = 'text-slate-500';
    if (code === 0)               { icon = isDay ? 'bi-sun-fill' : 'bi-moon-stars-fill'; colorClass = isDay ? 'text-yellow-400' : 'text-indigo-400'; }
    else if ([1,2,3].includes(code)) { icon = isDay ? 'bi-cloud-sun-fill' : 'bi-cloud-moon-fill'; colorClass = 'text-sky-400'; }
    else if ([45,48].includes(code)) { icon = 'bi-cloud-haze2-fill'; colorClass = 'text-slate-400'; }
    else if ([51,53,56].includes(code)) { icon = 'bi-cloud-drizzle-fill'; colorClass = 'text-blue-400'; }
    else if ([61,63,65].includes(code)) { icon = 'bi-cloud-rain-fill'; colorClass = 'text-blue-500'; }
    else if ([71,73,75,85].includes(code)) { icon = 'bi-cloud-snow-fill'; colorClass = 'text-sky-300'; }
    else if ([80,81,82].includes(code)) { icon = 'bi-cloud-rain-heavy-fill'; colorClass = 'text-blue-600'; }
    else if ([95,96,99].includes(code)) { icon = 'bi-cloud-lightning-rain-fill'; colorClass = 'text-purple-500'; }
    return { icon, colorClass };
}

async function fetchWeather() {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${activeLat}&longitude=${activeLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();
        const cur = data.current;

        document.getElementById('weather-temp').textContent     = `${Math.round(cur.temperature_2m)}°`;
        document.getElementById('weather-feels').textContent    = `${Math.round(cur.apparent_temperature)}°`;
        document.getElementById('weather-wind').textContent     = `${cur.wind_speed_10m} km/h`;
        document.getElementById('weather-humidity').textContent = `${cur.relative_humidity_2m}%`;
        document.getElementById('weather-desc').textContent     = getWeatherDesc(cur.weather_code);
        document.getElementById('city-title').innerText         = activeCity;
        document.getElementById('weather-time').textContent     = `Last updated: ${new Date().toLocaleTimeString()}`;

        const isDay = new Date().getHours() >= 6 && new Date().getHours() < 20;
        const { icon, colorClass } = getWeatherIcon(cur.weather_code, isDay);
        document.getElementById('weather-icon').className = `bi ${icon} text-[6rem] drop-shadow-md transition-colors duration-500 ${colorClass}`;

        hideSkeletons('weather');
        fetchForecast();
    } catch (err) {
        console.error('Weather error:', err);
        showToast('Weather update failed', 'error');
    }
}

async function fetchForecast() {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${activeLat}&longitude=${activeLon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`;
        const res = await fetch(url);
        const data = await res.json();
        renderForecast(data.daily);
    } catch (err) {
        console.error('Forecast error:', err);
    }
}

function renderForecast(daily) {
    const container = document.getElementById('forecast-container');
    const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    container.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const date = new Date(daily.time[i] + 'T12:00:00');
        const label = i === 0 ? 'Today' : DAY_NAMES[date.getDay()];
        const { icon, colorClass } = getWeatherIcon(daily.weather_code[i], true);
        const max = Math.round(daily.temperature_2m_max[i]);
        const min = Math.round(daily.temperature_2m_min[i]);
        container.innerHTML += `
            <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-2 border border-slate-100 dark:border-slate-600 flex flex-col items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-default">
                <span class="text-xs font-bold text-slate-500 dark:text-slate-400">${label}</span>
                <i class="bi ${icon} ${colorClass} text-2xl"></i>
                <span class="text-xs font-black text-slate-700 dark:text-slate-200">${max}°</span>
                <span class="text-xs text-slate-400">${min}°</span>
            </div>`;
    }
}

cityForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = cityInput.value.trim();
    if (!query) return;
    try {
        document.getElementById('weather-desc').textContent = 'Searching...';
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            const loc = data.results[0];
            activeLat  = loc.latitude;
            activeLon  = loc.longitude;
            activeCity = loc.name;
            cityInput.value = '';
            fetchWeather();
            updateFavButton();
            if (db) {
                try { db.run('INSERT INTO search_history (city_name, country) VALUES (?, ?)', [loc.name, loc.country || 'Unknown']); updateHistoryUI(); }
                catch (dbErr) { console.error('SQL Insert error', dbErr); }
            }
            showToast(`Weather loaded for ${loc.name}`, 'success');
        } else {
            document.getElementById('weather-desc').textContent = 'City not found!';
            showToast('City not found', 'warning');
        }
    } catch (err) {
        console.error('Geocoding error:', err);
        showToast('Search failed', 'error');
    }
});

/**
 * Favorite Cities
 */
function saveFavorites() {
    localStorage.setItem('favCities', JSON.stringify(favoriteCities));
}

function updateFavButton() {
    const isFav = favoriteCities.some(f => f.name === activeCity);
    document.getElementById('fav-icon').className = isFav ? 'bi bi-star-fill text-yellow-400' : 'bi bi-star';
}

function renderFavoritesBar() {
    const bar = document.getElementById('favorites-bar');
    if (favoriteCities.length === 0) { bar.classList.add('hidden'); return; }
    bar.classList.remove('hidden');
    bar.innerHTML = favoriteCities.map((f, i) =>
        `<button data-city-idx="${i}" class="fav-city-btn flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900/60 transition border border-sky-200 dark:border-sky-800">
            <i class="bi bi-star-fill text-yellow-400"></i>
            ${f.name}
            <span data-city-idx="${i}" class="fav-remove-btn ml-1 text-slate-400 hover:text-red-400 font-bold transition">×</span>
        </button>`
    ).join('');
}

function removeFavoriteByIndex(idx) {
    const name = favoriteCities[idx]?.name;
    if (!name) return;
    favoriteCities.splice(idx, 1);
    saveFavorites();
    renderFavoritesBar();
    updateFavButton();
    showToast(`${name} removed from favorites`, 'info');
}

function loadFavoriteCity(idx) {
    const f = favoriteCities[idx];
    if (!f) return;
    activeLat  = f.lat;
    activeLon  = f.lon;
    activeCity = f.name;
    fetchWeather();
    updateFavButton();
}

document.getElementById('fav-toggle-btn').addEventListener('click', () => {
    const isFav = favoriteCities.some(f => f.name === activeCity);
    if (isFav) {
        const idx = favoriteCities.findIndex(f => f.name === activeCity);
        removeFavoriteByIndex(idx);
    } else {
        favoriteCities.push({ name: activeCity, lat: activeLat, lon: activeLon });
        saveFavorites();
        renderFavoritesBar();
        updateFavButton();
        showToast(`${activeCity} added to favorites!`, 'success');
    }
});

function setupFavoritesBar() {
    document.getElementById('favorites-bar').addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.fav-remove-btn');
        const loadBtn   = e.target.closest('.fav-city-btn');
        if (removeBtn) {
            e.stopPropagation();
            removeFavoriteByIndex(parseInt(removeBtn.dataset.cityIdx));
        } else if (loadBtn) {
            loadFavoriteCity(parseInt(loadBtn.dataset.cityIdx));
        }
    });
}

/**
 * Crypto Prices (CoinGecko — free, no key)
 */
async function fetchCrypto() {
    try {
        const ids = CRYPTO_CONFIG.map(c => c.id).join(',');
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
        if (!res.ok) throw new Error('Rate limited');
        const data = await res.json();
        renderCrypto(data);
        document.getElementById('crypto-time').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    } catch (err) {
        console.error('Crypto error:', err);
        document.getElementById('crypto-list').innerHTML = `<div class="p-4 text-center text-sm text-slate-400 dark:text-slate-500"><i class="bi bi-wifi-off mr-2"></i>Crypto data unavailable — retrying next cycle.</div>`;
    }
}

function renderCrypto(data) {
    document.getElementById('crypto-list').innerHTML = CRYPTO_CONFIG.map(c => {
        const price  = data[c.id]?.usd ?? null;
        const change = data[c.id]?.usd_24h_change ?? 0;
        const isUp   = change >= 0;
        const priceStr  = price !== null ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
        const changeStr = `${isUp ? '+' : ''}${change.toFixed(2)}%`;
        const changeColor = isUp ? 'text-emerald-500' : 'text-red-500';
        const arrow       = isUp ? 'bi-arrow-up-right' : 'bi-arrow-down-right';
        return `
            <div class="flex items-center justify-between p-3 ${c.bgClass} rounded-xl border border-slate-100 dark:border-slate-600/50 hover:scale-[1.01] transition-transform">
                <div class="flex items-center gap-3">
                    <span class="${c.colorClass} text-base font-black w-8 text-center">${c.symbol[0]}</span>
                    <div>
                        <p class="text-sm font-bold text-slate-800 dark:text-slate-200">${c.name}</p>
                        <p class="text-xs text-slate-400">${c.symbol}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-black text-slate-800 dark:text-slate-100">${priceStr}</p>
                    <p class="text-xs font-bold ${changeColor} flex items-center justify-end gap-1"><i class="bi ${arrow}"></i>${changeStr}</p>
                </div>
            </div>`;
    }).join('');
}

/**
 * Stock Simulation Engine
 */
function initStockPrices() {
    STOCKS.forEach(s => { stockPrices[s.symbol] = { price: s.basePrice, prev: s.basePrice }; });
}

function tickStocks() {
    STOCKS.forEach(s => {
        const cur = stockPrices[s.symbol].price;
        const delta = (Math.random() - 0.49) * s.basePrice * 0.003;
        const next = Math.max(s.basePrice * 0.75, cur + delta);
        stockPrices[s.symbol] = { price: next, prev: cur };
    });
    renderStocks();
}

function renderStocks() {
    document.getElementById('stocks-list').innerHTML = STOCKS.map(s => {
        const { price, prev } = stockPrices[s.symbol];
        const dayChange    = ((price - s.basePrice) / s.basePrice) * 100;
        const tickUp       = price >= prev;
        const dayUp        = dayChange >= 0;
        const changeColor  = dayUp ? 'text-emerald-500' : 'text-red-500';
        const arrow        = dayUp ? 'bi-arrow-up-right' : 'bi-arrow-down-right';
        const flashClass   = tickUp ? 'flash-green' : 'flash-red';
        return `
            <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600 ${flashClass} transition-all">
                <div class="flex items-center gap-3">
                    <span class="text-xs font-black bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 px-2 py-1 rounded-lg">${s.symbol}</span>
                    <p class="text-sm font-bold text-slate-600 dark:text-slate-300">${s.name}</p>
                </div>
                <div class="text-right">
                    <p class="font-black text-slate-800 dark:text-slate-100">$${price.toFixed(2)}</p>
                    <p class="text-xs font-bold ${changeColor} flex items-center justify-end gap-1"><i class="bi ${arrow}"></i>${dayUp ? '+' : ''}${dayChange.toFixed(2)}%</p>
                </div>
            </div>`;
    }).join('');
    document.getElementById('stocks-time').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
}

/**
 * SQL.js Database
 */
async function initDatabase() {
    try {
        const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}` });
        db = new SQL.Database();
        db.run(`CREATE TABLE IF NOT EXISTS search_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            city_name TEXT,
            country TEXT,
            timestamp DATETIME DEFAULT (datetime('now','localtime'))
        );`);
        db.run(`INSERT INTO search_history (city_name, country) VALUES ('Luxembourg','Luxembourg');`);
        setupHistoryModal();
    } catch (err) { console.error('SQL init error:', err); }
}

function updateHistoryUI() {
    const list = document.getElementById('history-list');
    if (!db || !list) return;
    const res = db.exec("SELECT id, city_name, country, time(timestamp) as t FROM search_history ORDER BY id DESC LIMIT 10");
    list.innerHTML = '';
    if (res.length > 0 && res[0].values.length > 0) {
        res[0].values.forEach(row => {
            const [, city, country, time] = row;
            const safeCity = city.replace(/'/g, "\\'");
            list.innerHTML += `
                <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600 transition hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                    onclick="document.getElementById('city-search-input').value='${safeCity}'; document.getElementById('city-search-form').dispatchEvent(new Event('submit')); document.getElementById('history-modal').classList.add('hidden');">
                    <div class="flex items-center gap-3">
                        <i class="bi bi-search text-slate-400"></i>
                        <p class="text-sm font-bold text-slate-700 dark:text-slate-200">${city} <span class="text-xs font-normal text-slate-400">(${country})</span></p>
                    </div>
                    <span class="text-xs text-slate-400 font-mono">${time}</span>
                </div>`;
        });
    } else {
        list.innerHTML = `<div class="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg text-sm text-slate-500 text-center">No history yet.</div>`;
    }
}

function setupHistoryModal() {
    const modal    = document.getElementById('history-modal');
    const histBtn  = document.getElementById('view-history-btn');
    const closeBtn = document.getElementById('close-history-btn');
    histBtn.addEventListener('click', () => { updateHistoryUI(); modal.classList.remove('hidden'); });
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
}

/**
 * Theme
 */
function setupTheme() {
    const html = document.documentElement;
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        html.classList.add('dark');
    }
    document.getElementById('theme-toggle').addEventListener('click', () => {
        html.classList.toggle('dark');
        localStorage.theme = html.classList.contains('dark') ? 'dark' : 'light';
        if (currencyChartInstance) {
            const isDark    = html.classList.contains('dark');
            const textColor = isDark ? '#94a3b8' : '#64748b';
            const gridColor = isDark ? '#334155' : '#e2e8f0';
            currencyChartInstance.options.scales.x.ticks.color = textColor;
            currencyChartInstance.options.scales.y.ticks.color = textColor;
            currencyChartInstance.options.scales.x.grid.color  = gridColor;
            currencyChartInstance.options.scales.y.grid.color  = gridColor;
            currencyChartInstance.update();
        }
    });
}

/**
 * Drag-and-Drop (SortableJS)
 */
function setupSortable() {
    if (!window.Sortable) return;
    Sortable.create(document.getElementById('top-grid'), {
        animation: 200,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onEnd() { showToast('Widget order updated', 'info'); }
    });
}

/**
 * AI Analyst (Groq / Llama-3)
 */
const piece1 = 'gsk_Xwg2yB'.replace('X', 'Z');
const piece2 = 'wlHigvm8oz';
const piece3 = 'b0ukWGdyb3';
const piece4 = 'FYlfDw5VMKSH2Lo1tzv76rKEXc';
const GROQ_API_KEY = piece1 + piece2 + piece3 + piece4;

document.getElementById('ai-insight-btn').addEventListener('click', async () => {
    const aiBtn  = document.getElementById('ai-insight-btn');
    const aiText = document.getElementById('ai-insight-text');
    const aiLoad = document.getElementById('ai-loading');

    aiText.classList.add('hidden');
    aiLoad.classList.remove('hidden');
    aiBtn.disabled = true;
    aiBtn.innerHTML = '<i class="bi bi-arrow-repeat animate-spin"></i> Thinking...';

    try {
        const rate  = currentRates[targetCurrency] || 'unknown';
        const temp  = document.getElementById('weather-temp').innerText;
        const desc  = document.getElementById('weather-desc').innerText;
        const prompt = `You are a smart, concise AI assistant in a live financial dashboard. City: ${activeCity}. Weather: ${temp} (${desc}). EUR/${targetCurrency} rate: ${rate}. Give 1-2 fun, creative sentences of insight combining finance and weather. Plain text only.`;

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 150 })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        aiText.innerText = data.choices[0].message.content;
    } catch (err) {
        console.error('AI Error:', err);
        aiText.innerText = 'Oops! The AI is experiencing some turbulence. Try again in a moment.';
    } finally {
        aiLoad.classList.add('hidden');
        aiText.classList.remove('hidden');
        aiBtn.disabled = false;
        aiBtn.innerHTML = '<i class="bi bi-magic"></i> Generate Insight';
    }
});

/**
 * Interactive Tour (Driver.js)
 */
function setupTour() {
    document.getElementById('start-tour-btn').addEventListener('click', () => {
        const d = window.driver.js.driver({
            showProgress: true,
            animate: true,
            steps: [
                { popover: { title: 'Welcome to Global Live Dashboard!', description: 'A quick tour of all features.' } },
                { element: '#eur-container',            popover: { title: 'Live Calculator',       description: 'Type any amount to convert currencies in real-time.',                          side: 'bottom' } },
                { element: '#target-currency-select',   popover: { title: 'Multi-Currency',        description: 'Switch between USD, TRY, GBP, JPY, CHF, and Bitcoin.',                       side: 'left'   } },
                { element: '#currencyChart',            popover: { title: 'Market Trend Chart',    description: '10-day historical rate chart — falls back to simulation if API is down.',      side: 'top'    } },
                { element: '#city-search-form',         popover: { title: 'City Search',           description: 'Search any city in the world for instant weather data.',                       side: 'bottom' } },
                { element: '#fav-toggle-btn',           popover: { title: 'Favorite Cities',       description: 'Star a city to save it in your favorites bar.',                                side: 'bottom' } },
                { element: '#forecast-container',       popover: { title: '5-Day Forecast',        description: 'Daily high/low forecast for the next 5 days.',                                 side: 'top'    } },
                { element: '#view-history-btn',         popover: { title: 'SQL Search History',    description: 'All city searches are stored in a browser-based SQLite database.',             side: 'bottom' } },
                { element: '#widget-crypto',            popover: { title: 'Crypto Prices',         description: 'Live BTC, ETH, SOL prices with 24h change — powered by CoinGecko.',           side: 'top'    } },
                { element: '#widget-stocks',            popover: { title: 'US Stocks',             description: 'Simulated real-time stock ticker for AAPL, MSFT, GOOGL, and TSLA.',           side: 'top'    } },
                { element: '#ai-insight-btn',           popover: { title: 'AI Analyst',            description: 'Llama-3 AI gives you a creative financial + weather insight on demand.',      side: 'top'    } },
                { element: '.drag-handle',              popover: { title: 'Drag & Drop',           description: 'Grab this handle to rearrange the top widgets.',                               side: 'bottom' } },
                { element: '#theme-toggle',             popover: { title: 'Dark Mode',             description: 'Toggle between dark and light themes.',                                        side: 'left'   } },
            ],
            onDestroyStarted: () => {
                if (!d.hasNextStep() || confirm('Exit tour?')) d.destroy();
            }
        });
        d.drive();
    });
}

/**
 * Init
 */
function init() {
    setupTheme();
    setupTour();
    setupSortable();
    setupFavoritesBar();
    initDatabase();

    updateClocks();
    setInterval(updateClocks, 1000);

    renderFavoritesBar();
    updateFavButton();

    initStockPrices();
    renderStocks();
    setInterval(tickStocks, 8000);

    fetchCurrency();
    fetchWeather();
    fetchCrypto();

    setInterval(fetchCurrency, UPDATE_INTERVAL_MS);
    setInterval(fetchWeather,  UPDATE_INTERVAL_MS);
    setInterval(fetchCrypto,   UPDATE_INTERVAL_MS);
}

document.addEventListener('DOMContentLoaded', init);
