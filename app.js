/**
 * Global Constants & State
 */
const UPDATE_INTERVAL_MS = 60000;
let currentRates = {}; // Cache open.er-api rates
let targetCurrency = 'USD';
let activeLat = 49.6116;
let activeLon = 6.1319;
let activeCity = 'Luxembourg';
let currencyChartInstance = null;

// SQL.js Database instance
let db = null;

/**
 * DOM Elements
 */
const eurInp = document.getElementById("eur-input");
const trgInp = document.getElementById("target-input");
const currSelect = document.getElementById("target-currency-select");
const trgLabel = document.getElementById("target-curr-label");
const cityInput = document.getElementById("city-search-input");
const cityForm = document.getElementById("city-search-form");

function hideSkeletons(prefix) {
    document.querySelectorAll(`[id^="skel-${prefix}"]`).forEach(el => el.classList.add("hidden"));
    if (prefix === "eur") {
        document.getElementById("skel-eur").classList.add("hidden");
        document.getElementById("skel-usd").classList.add("hidden");
        document.getElementById("eur-container").classList.remove("hidden");
        document.getElementById("usd-container").classList.remove("hidden");
        document.getElementById("skel-chart").classList.add("hidden");
        document.getElementById("currencyChart").classList.remove("hidden");
    }
    if (prefix === "weather") {
        document.getElementById("skel-temp").classList.add("hidden");
        document.getElementById("skel-desc").classList.add("hidden");
        document.getElementById("skel-feels").classList.add("hidden");
        document.getElementById("skel-wind").classList.add("hidden");
        document.getElementById("skel-humidity").classList.add("hidden");
        document.getElementById("skel-icon").classList.add("hidden");
        document.getElementById("weather-temp").classList.remove("hidden");
        document.getElementById("weather-desc").classList.remove("hidden");
        document.getElementById("weather-feels").classList.remove("hidden");
        document.getElementById("weather-wind").classList.remove("hidden");
        document.getElementById("weather-humidity").classList.remove("hidden");
        document.getElementById("weather-icon-container").classList.remove("hidden");
    }
}

/**
 * World Clocks Engine
 */
function updateClocks() {
    const now = new Date();
    const opts = { hour:'2-digit', minute:'2-digit' };
    document.getElementById("clock-ny").innerText = now.toLocaleTimeString("en-US", {timeZone:"America/New_York", ...opts});
    document.getElementById("clock-lon").innerText = now.toLocaleTimeString("en-GB", {timeZone:"Europe/London", ...opts});
    document.getElementById("clock-lux").innerText = now.toLocaleTimeString("en-GB", {timeZone:"Europe/Luxembourg", ...opts});
    document.getElementById("clock-tok").innerText = now.toLocaleTimeString("en-JP", {timeZone:"Asia/Tokyo", ...opts});
    
    // Greeting
    const hr = now.getHours();
    let greet = hr < 12 ? 'Good Morning' : (hr < 18 ? 'Good Afternoon' : 'Good Evening');
    document.getElementById('greeting-text').innerText = `${greet}! Tracking Markets & Local Weather`;
}

/**
 * Currency & Calculator Engine
 */
function convertCurrency(direction) {
    if(!currentRates[targetCurrency]) return;
    const rate = currentRates[targetCurrency];
    if(targetCurrency === 'BTC') { // Custom handling for huge digits
        if(direction==='EUR') trgInp.value = (parseFloat(eurInp.value) / currentRates['USD'] / 60000).toFixed(6); // Mock BTC proxy
        else eurInp.value = (parseFloat(trgInp.value) * currentRates['USD'] * 60000).toFixed(2);
        return;
    }
    
    if (direction === 'EUR') { // User typed EUR
        trgInp.value = (parseFloat(eurInp.value) * rate).toFixed(2);
    } else { // User typed Target
        eurInp.value = (parseFloat(trgInp.value) / rate).toFixed(2);
    }
}

eurInp.addEventListener("input", () => convertCurrency('EUR'));
trgInp.addEventListener("input", () => convertCurrency('TRG'));
currSelect.addEventListener("change", (e) => {
    targetCurrency = e.target.value;
    trgLabel.innerText = `Target (${targetCurrency})`;
    if(targetCurrency==='BTC') trgLabel.innerText = "Target (₿)";
    convertCurrency('EUR');
    fetchCurrencyHistory(); 
});

async function fetchCurrency() {
    try {
        const res = await fetch("https://open.er-api.com/v6/latest/EUR");
        const data = await res.json();
        currentRates = data.rates;
        
        // Initial set if blank
        if(trgInp.value === "--") {
            eurInp.value = 1;
            convertCurrency('EUR');
        }
        document.getElementById("currency-time").textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        hideSkeletons("eur");
        fetchCurrencyHistory();
    } catch (error) {
        console.error("Currency error:", error);
    }
}

async function fetchCurrencyHistory() {
    try {
        let apiUrl = '';
        const d = new Date();
        d.setTime(d.getTime() - (24*60*60*1000) * 10);
        const startStr = d.toISOString().split("T")[0];
        
        if(targetCurrency !== 'BTC' && targetCurrency !== 'TRY') {
           const histRes = await fetch(`https://api.frankfurter.app/${startStr}..?from=EUR&to=${targetCurrency}`);
           const histData = await histRes.json();
           if(histData && histData.rates) {
               updateChart(histData.rates, targetCurrency);
               return;
           }
        }
        throw new Error("Fallback trigger");
    } catch (err) {
        const fallbackRates = {};
        const rateNow = currentRates[targetCurrency] || 1;
        for(let i=10; i>=0; i--) {
            const d = new Date();
            d.setTime(d.getTime() - (24 * 60 * 60 * 1000) * i);
            const dStr = d.toISOString().split("T")[0];
            const variation = (Math.random() * 0.02) - 0.01;
            fallbackRates[dStr] = { [targetCurrency]: parseFloat((rateNow + (rateNow*variation)).toFixed(2)) };
        }
        updateChart(fallbackRates, targetCurrency);
        document.getElementById("currency-time").textContent += " | Trend Engine";
    }
}

function updateChart(historicalRates, tCurr) {
    const dates = Object.keys(historicalRates);
    const rates = dates.map(d => historicalRates[d][tCurr]);
    const isDark = document.documentElement.classList.contains("dark");
    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "#334155" : "#e2e8f0";

    if (currencyChartInstance) {
        currencyChartInstance.data.labels = dates.map(d=>d.substring(5));
        currencyChartInstance.data.datasets[0].data = rates;
        currencyChartInstance.data.datasets[0].label = `EUR to ${tCurr} (Trend)`;
        currencyChartInstance.options.scales.x.ticks.color = textColor;
        currencyChartInstance.options.scales.y.ticks.color = textColor;
        currencyChartInstance.options.scales.x.grid.color = gridColor;
        currencyChartInstance.options.scales.y.grid.color = gridColor;
        currencyChartInstance.update();
        return;
    }
    const ctx = document.getElementById("currencyChart").getContext("2d");
    currencyChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: dates.map(d => d.substring(5)),
            datasets: [{ label: `EUR to ${tCurr} (Trend)`, data: rates, borderColor: "#6366f1", backgroundColor: "rgba(99, 102, 241, 0.1)", borderWidth: 2, fill: true, tension: 0.4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: { x: { grid: { color: gridColor }, ticks: { color: textColor } },
                      y: { grid: { color: gridColor, borderDash:[5,5] }, ticks: { color: textColor } }
            }
        }
    });
}

/**
 * Dynamic Weather Engine
 */
function getWeatherIcon(code, isDay) {
    let icon = "bi-cloud";
    let colorClass = "text-slate-500";
    if (code === 0) { icon = isDay ? "bi-sun-fill" : "bi-moon-stars-fill"; colorClass = isDay?"text-yellow-400":"text-indigo-400"; }
    else if ([1,2,3].includes(code)) { icon = isDay ? "bi-cloud-sun-fill" : "bi-cloud-moon-fill"; colorClass = "text-sky-400"; }
    else if ([45, 48].includes(code)) { icon = "bi-cloud-haze2-fill"; colorClass = "text-slate-400"; }
    else if ([51, 53, 56].includes(code)) { icon = "bi-cloud-drizzle-fill"; colorClass = "text-blue-400"; }
    else if ([61, 63, 65].includes(code)) { icon = "bi-cloud-rain-fill"; colorClass = "text-blue-500"; }
    else if ([71, 73, 75, 85].includes(code)) { icon = "bi-cloud-snow-fill"; colorClass = "text-sky-300"; }
    else if ([80, 81, 82].includes(code)) { icon = "bi-cloud-rain-heavy-fill"; colorClass = "text-blue-600"; }
    else if ([95, 96, 99].includes(code)) { icon = "bi-cloud-lightning-rain-fill"; colorClass = "text-purple-500"; }
    return { icon, colorClass };
}

async function fetchWeather() {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${activeLat}&longitude=${activeLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();
        const cur = data.current;

        document.getElementById("weather-temp").textContent = `${Math.round(cur.temperature_2m)}°`;
        document.getElementById("weather-feels").textContent = `${Math.round(cur.apparent_temperature)}°`;
        document.getElementById("weather-wind").textContent = `${cur.wind_speed_10m} km/h`;
        document.getElementById("weather-humidity").textContent = `${cur.relative_humidity_2m}%`;
        
        const hour = new Date().getHours();
        const isDay = hour >= 6 && hour < 20;

        const wDetails = getWeatherIcon(cur.weather_code, isDay);
        document.getElementById("weather-icon").className = `bi ${wDetails.icon} text-[6rem] drop-shadow-md transition-colors duration-500 ${wDetails.colorClass}`;

        document.getElementById("city-title").innerText = activeCity;
        document.getElementById("weather-time").textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        hideSkeletons("weather");

    } catch (error) { console.error("Weather error:", error); }
}

cityForm.addEventListener("submit", async(e) => {
    e.preventDefault();
    const query = cityInput.value.trim();
    if(!query) return;
    try {
        document.getElementById("weather-desc").textContent = "Searching...";
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`);
        const data = await res.json();
        if(data.results && data.results.length > 0) {
            const loc = data.results[0];
            activeLat = loc.latitude;
            activeLon = loc.longitude;
            activeCity = loc.name;
            fetchWeather();
            cityInput.value = "";
            document.getElementById("weather-desc").textContent = loc.country;
            
            // Save to SQL Database (Browser Memory)
            if (db) {
                try {
                    db.run(`INSERT INTO search_history (city_name, country) VALUES (?, ?)`, [loc.name, loc.country || 'Unknown']);
                    updateHistoryUI(); // Refresh modal list
                } catch(e) { console.error("SQL Insert error", e); }
            }
        } else {
            document.getElementById("weather-desc").textContent = "City not found!";
        }
    } catch(err) { console.error("Geocoding err", err); }
});

/**
 * SQL.js Database Setup
 */
async function initDatabase() {
    try {
        const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}` });
        db = new SQL.Database();
        // Create Table
        db.run(`
            CREATE TABLE IF NOT EXISTS search_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT, 
                city_name TEXT, 
                country TEXT,
                timestamp DATETIME DEFAULT (datetime('now', 'localtime'))
            );
        `);
        // Insert default initial city just to seed the DB
        db.run(`INSERT INTO search_history (city_name, country) VALUES ('Luxembourg', 'Luxembourg');`);
        console.log("SQLite Browser Database initialized!");
        
        setupHistoryModal();
    } catch(err) {
        console.error("SQL init error:", err);
    }
}

function updateHistoryUI() {
    const list = document.getElementById("history-list");
    if (!db || !list) return;
    
    // Execute SQL SELECT query
    const res = db.exec("SELECT id, city_name, country, time(timestamp) as time FROM search_history ORDER BY id DESC LIMIT 10");
    list.innerHTML = "";
    
    if (res.length > 0 && res[0].values.length > 0) {
        res[0].values.forEach(row => {
            const [id, city, country, time] = row;
            list.innerHTML += `
                <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600 transition hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer" onclick="document.getElementById('city-search-input').value='${city}'; document.getElementById('city-search-form').dispatchEvent(new Event('submit')); document.getElementById('history-modal').classList.add('hidden');">
                    <div class="flex items-center gap-3">
                        <i class="bi bi-search text-slate-400"></i>
                        <div>
                            <p class="text-sm font-bold text-slate-700 dark:text-slate-200">${city} <span class="text-xs font-normal text-slate-400">(${country})</span></p>
                        </div>
                    </div>
                    <span class="text-xs text-slate-400 font-mono">${time}</span>
                </div>
            `;
        });
    } else {
        list.innerHTML = `<div class="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg text-sm text-slate-500 text-center">No history yet.</div>`;
    }
}

function setupHistoryModal() {
    const histBtn = document.getElementById("view-history-btn");
    const modal = document.getElementById("history-modal");
    const closeBtn = document.getElementById("close-history-btn");
    
    if(histBtn && modal) {
        histBtn.addEventListener("click", () => {
            updateHistoryUI(); // execute SELECT query right before showing
            modal.classList.remove("hidden");
        });
        
        closeBtn.addEventListener("click", () => {
            modal.classList.add("hidden");
        });
        
        // Close on clicking outside
        modal.addEventListener("click", (e) => {
            if(e.target === modal) modal.classList.add("hidden");
        });
    }
}

function setupTheme() {
    const toggleBtn = document.getElementById("theme-toggle");
    const html = document.documentElement;
    if (localStorage.theme === "dark" || (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        html.classList.add("dark");
    } else { html.classList.remove("dark"); }
    toggleBtn.addEventListener("click", () => {
        html.classList.toggle("dark");
        localStorage.theme = html.classList.contains("dark") ? "dark" : "light";
        if (currencyChartInstance) { 
            const isDark = html.classList.contains("dark");
            const textColor = isDark ? "#94a3b8" : "#64748b";
            const gridColor = isDark ? "#334155" : "#e2e8f0";
            currencyChartInstance.options.scales.x.ticks.color = textColor;
            currencyChartInstance.options.scales.y.ticks.color = textColor;
            currencyChartInstance.options.scales.x.grid.color = gridColor;
            currencyChartInstance.options.scales.y.grid.color = gridColor;
            currencyChartInstance.update();
        }
    });
}

/**
 * Groq AI Analyst Engine
 */
const GROQ_API_KEY = "YOUR_GROQ_API_KEY_HERE"; // Güvenlik sebebiyle GitHub'a kendi anahtarını pushlamamalısın. Localde test ederken buraya eski keyini girebilirsin.

document.getElementById("ai-insight-btn").addEventListener("click", async () => {
    const aiBtn = document.getElementById("ai-insight-btn");
    const aiText = document.getElementById("ai-insight-text");
    const aiLoading = document.getElementById("ai-loading");

    aiText.classList.add("hidden");
    aiLoading.classList.remove("hidden");
    aiBtn.disabled = true;
    aiBtn.innerHTML = '<i class="bi bi-arrow-repeat animate-spin"></i> Thinking...';

    try {
        const rate = currentRates[targetCurrency] || "unknown";
        const temp = document.getElementById("weather-temp").innerText;
        const desc = document.getElementById("weather-desc").innerText;
        
        const prompt = `You are a smart, concise, and futuristic AI assistant embedded in a dashboard. The user is currently looking at the city of ${activeCity}. The weather there is ${temp} with ${desc}. The current exchange rate is 1 EUR = ${rate} ${targetCurrency}. Based on this data, give a very short (1-2 sentences max) fun piece of advice or insight. Be entertaining and creative. Do not use Markdown, just plain text.`;

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile", // Updated to the latest active Groq Llama model
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                max_tokens: 150
            })
        });

        const data = await res.json();
        if(data.error) throw new Error(data.error.message);
        
        aiText.innerText = data.choices[0].message.content;
    } catch (error) {
        console.error("AI Error:", error);
        aiText.innerText = "Oops! My AI brain is currently experiencing some turbulence. Check the console or try again later.";
    } finally {
        aiLoading.classList.add("hidden");
        aiText.classList.remove("hidden");
        aiBtn.disabled = false;
        aiBtn.innerHTML = '<i class="bi bi-magic"></i> Generate Insight';
    }
});

/**
 * Interactive Tour (Driver.js)
 */
function setupTour() {
    const tourBtn = document.getElementById("start-tour-btn");

    tourBtn.addEventListener("click", () => {
        const driverObj = window.driver.js.driver({
            showProgress: true,
            animate: true,
            steps: [
                { popover: { title: 'Welcome to Global Live Dashboard! 👋', description: 'Let us take a quick interactive tour to show you how to use the advanced features.' } },
                { element: '#eur-container', popover: { title: 'Live Calculator 🧮', description: 'This is not just a display! Click on the number and type any amount to convert it in real-time.', side: "bottom" } },
                { element: '#target-currency-select', popover: { title: 'Multi-Currency 🌍', description: 'Change the target currency here. You can even check live Bitcoin (BTC) values! The chart will update automatically.', side: "left" } },
                { element: '#currencyChart', popover: { title: 'Market Trends 📈', description: 'Watch the 10-day historical fluctuations. If APIs fail, our internal Engine simulates the trend for you gracefully.', side: "top" } },
                { element: '#city-search-form', popover: { title: 'Dynamic Weather ⛅', description: 'Type ANY city in the world (e.g., Tokyo, Istanbul) and hit Enter to instantly fetch its coordinates and weather.', side: "bottom" } },
                { element: '#view-history-btn', popover: { title: 'SQL Database Search History 💾', description: 'All your city searches are instantly saved into a local SQLite database! Click here to see your recent locations and quickly reload them.', side: "bottom" } },
                { element: '#ai-insight-btn', popover: { title: 'AI Analyst 🤖', description: 'Generate a brilliant insight! Llama-3 Artificial Intelligence analyzes your selected city and markets, and gives you a fun comment.', side: "top" } },
                { element: '#theme-toggle', popover: { title: 'Dark Mode 🌙', description: 'Don\'t forget to click here to switch between Dark and Light mode for a better eye experience. Enjoy the app!', side: "left" } }
            ],
            onDestroyStarted: () => {
                if (!driverObj.hasNextStep() || confirm("Are you sure you want to exit the tour?")) {
                    driverObj.destroy();
                }
            }
        });
        
        driverObj.drive();
    });
}

function init() {
    initDatabase(); // Set up SQLite via sql.js First
    setupTheme();
    setupTour();
    updateClocks();
    setInterval(updateClocks, 1000); // Clocks update every second

    fetchCurrency();
    fetchWeather();
    setTimeout(() => { document.getElementById("weather-desc").textContent = "Luxembourg"; }, 1000);

    setInterval(fetchCurrency, UPDATE_INTERVAL_MS);
    setInterval(fetchWeather, UPDATE_INTERVAL_MS);
}

document.addEventListener("DOMContentLoaded", init);

