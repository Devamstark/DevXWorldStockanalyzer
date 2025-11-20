// State
let currentSymbol = null;
let currentStockName = null;
let portfolioData = [];

// DOM Elements
const views = {
    search: document.getElementById('searchView'),
    portfolio: document.getElementById('portfolioView')
};
const navBtns = document.querySelectorAll('.nav-btn');
const searchInput = document.getElementById('searchInput');
const suggestionsBox = document.getElementById('suggestions');
const loading = document.getElementById('loading');
const stockDetails = document.getElementById('stockDetails');
const portfolioGrid = document.getElementById('portfolioGrid');
const portfolioLoading = document.getElementById('portfolioLoading');
const emptyPortfolio = document.getElementById('emptyPortfolio');
const addToPortfolioBtn = document.getElementById('addToPortfolioBtn');
const gainersList = document.getElementById('gainersList');
const losersList = document.getElementById('losersList');

// Navigation
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const viewName = btn.dataset.view;
        Object.values(views).forEach(el => el.classList.add('hidden'));
        views[viewName].classList.remove('hidden');

        if (viewName === 'portfolio') {
            loadPortfolio();
        }
    });
});

// Load Top Movers
window.addEventListener('load', () => {
    fetchMovers('/api/gainers', gainersList);
    fetchMovers('/api/losers', losersList);
});

async function fetchMovers(endpoint, element) {
    try {
        const res = await fetch(endpoint);
        const data = await res.json();

        element.innerHTML = '';
        if (!data || data.length === 0) {
            element.innerHTML = '<li class="mover-item text-muted">No data</li>';
            return;
        }

        data.forEach(stock => {
            const li = document.createElement('li');
            li.className = 'mover-item';
            li.innerHTML = `
                <span class="mover-symbol">${stock.symbol}</span>
                <span class="mover-price">₹${stock.price}</span>
                <span class="mover-change ${stock.change > 0 ? 'text-success' : 'text-danger'}">
                    ${stock.change > 0 ? '+' : ''}${stock.change}%
                </span>
            `;
            li.onclick = () => {
                searchInput.value = stock.symbol;
                fetchStockDetails(stock.symbol);
            };
            element.appendChild(li);
        });
    } catch (err) {
        element.innerHTML = '<li class="mover-item text-danger">Failed to load</li>';
    }
}

// Search Logic
let debounceTimer;
searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();

    if (query.length < 2) {
        suggestionsBox.classList.add('hidden');
        return;
    }

    debounceTimer = setTimeout(() => fetchSuggestions(query), 300);
});

async function fetchSuggestions(query) {
    try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        suggestionsBox.innerHTML = '';
        if (data.length > 0) {
            data.forEach(item => {
                const li = document.createElement('li');
                li.className = 'suggestion-item';
                li.innerHTML = `
                    <span class="suggestion-symbol">${item.symbol}</span>
                    <span class="suggestion-name">${item.name}</span>
                `;
                li.onclick = () => {
                    searchInput.value = item.symbol;
                    suggestionsBox.classList.add('hidden');
                    fetchStockDetails(item.symbol);
                };
                suggestionsBox.appendChild(li);
            });
            suggestionsBox.classList.remove('hidden');
        } else {
            suggestionsBox.classList.add('hidden');
        }
    } catch (err) {
        console.error('Error fetching suggestions:', err);
    }
}

// Stock Details
async function fetchStockDetails(symbol) {
    loading.classList.remove('hidden');
    stockDetails.classList.add('hidden');

    try {
        const res = await fetch(`/api/quote/${symbol}`);
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        currentSymbol = data.symbol;
        currentStockName = data.name;

        // Update DOM
        document.getElementById('stockName').textContent = data.name;
        document.getElementById('stockSymbol').textContent = data.symbol;
        document.getElementById('stockPrice').textContent = `₹${data.price.toLocaleString('en-IN')}`;

        const changeEl = document.getElementById('stockChange');
        changeEl.textContent = data.change;
        changeEl.className = 'price-change ' + (data.change.includes('+') ? 'change-up' : 'change-down');

        document.getElementById('peRatio').textContent = data.pe_ratio;
        document.getElementById('eps').textContent = data.eps;
        document.getElementById('divYield').textContent = data.dividend_yield;
        document.getElementById('stockVolume').textContent = data.volume;
        document.getElementById('targetPrice').textContent = data.target_price;
        document.getElementById('reasonText').textContent = data.reason;

        const recEl = document.getElementById('recommendation');
        recEl.textContent = data.recommendation;
        recEl.className = '';
        recEl.style.backgroundColor =
            data.recommendation === 'BUY' ? 'var(--success)' :
                data.recommendation === 'SELL' ? 'var(--danger)' : 'var(--warning)';
        recEl.style.color = 'white';

        // Chart
        renderChart(data.analyst_ratings);

        stockDetails.classList.remove('hidden');
    } catch (err) {
        alert('Error fetching stock details: ' + err.message);
    } finally {
        loading.classList.add('hidden');
    }
}

function renderChart(ratings) {
    const ctx = document.getElementById('analystChart').getContext('2d');
    if (window.myChart) window.myChart.destroy();

    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Buy', 'Hold', 'Sell'],
            datasets: [{
                label: 'Analyst Ratings',
                data: [ratings.buy, ratings.hold, ratings.sell],
                backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// Portfolio Logic
addToPortfolioBtn.addEventListener('click', async () => {
    if (!currentSymbol) return;

    try {
        const res = await fetch('/api/portfolio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: currentSymbol, name: currentStockName })
        });
        const data = await res.json();

        if (res.ok) {
            alert('Added to portfolio!');
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error('Error adding to portfolio:', err);
    }
});

async function loadPortfolio() {
    portfolioLoading.classList.remove('hidden');
    portfolioGrid.innerHTML = '';
    emptyPortfolio.classList.add('hidden');

    try {
        const res = await fetch('/api/portfolio');
        const data = await res.json();

        if (data.length === 0) {
            emptyPortfolio.classList.remove('hidden');
        } else {
            data.forEach(stock => {
                const card = document.createElement('div');
                card.className = 'card portfolio-item';

                const isUp = stock.change.toString().includes('+') || stock.change > 0;
                const changeClass = isUp ? 'change-up' : 'change-down';
                const changeSign = stock.change > 0 ? '+' : '';

                card.innerHTML = `
                    <button class="delete-btn" onclick="removeFromPortfolio('${stock.symbol}')">×</button>
                    <div style="margin-bottom: 1rem;">
                        <h3 style="margin: 0; font-size: 1.2rem;">${stock.symbol}</h3>
                        <div style="color: var(--text-secondary); font-size: 0.9rem;">${stock.name}</div>
                    </div>
                    <div class="text-right">
                        <div style="font-size: 1.5rem; font-weight: 700;">₹${stock.price}</div>
                        <span class="price-change ${changeClass}">${changeSign}${stock.change}%</span>
                    </div>
                `;
                portfolioGrid.appendChild(card);
            });
        }
    } catch (err) {
        console.error('Error loading portfolio:', err);
    } finally {
        portfolioLoading.classList.add('hidden');
    }
}

window.removeFromPortfolio = async (symbol) => {
    if (!confirm(`Remove ${symbol} from portfolio?`)) return;

    try {
        await fetch(`/api/portfolio/${symbol}`, { method: 'DELETE' });
        loadPortfolio(); // Reload
    } catch (err) {
        console.error('Error removing from portfolio:', err);
    }
};

// Close suggestions on click outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) {
        suggestionsBox.classList.add('hidden');
    }
});