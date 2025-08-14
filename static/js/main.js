// DOM Elements
const searchInput = document.getElementById('searchInput');
const suggestionsBox = document.getElementById('suggestions');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const stockDetails = document.getElementById('stockDetails');
const noResults = document.getElementById('noResults');

// Detail fields
const stockName = document.getElementById('stockName');
const stockSymbol = document.getElementById('stockSymbol');
const stockPrice = document.getElementById('stockPrice');
const stockChange = document.getElementById('stockChange');
const stockVolume = document.getElementById('stockVolume');
const recommendation = document.getElementById('recommendation');
const targetPrice = document.getElementById('targetPrice');
const peRatio = document.getElementById('peRatio');
const eps = document.getElementById('eps');
const divYield = document.getElementById('divYield');
const reasonText = document.getElementById('reasonText');

// Gainers & Losers
const gainersList = document.getElementById('gainersList');
const losersList = document.getElementById('losersList');

// Analyst Chart
const analystBuy = document.getElementById('analystBuy');
const analystHold = document.getElementById('analystHold');
const analystSell = document.getElementById('analystSell');

// Fair Value Calculator
const calcEPS = document.getElementById('calcEPS');
const calcGrowth = document.getElementById('calcGrowth');
const calcReturn = document.getElementById('calcReturn');
const calcButton = document.getElementById('calcButton');
const fairValueResult = document.getElementById('fairValueResult');

let currentSymbol = null;
let refreshInterval = null;

// ====== Load Gainers & Losers on Page Load ======
window.addEventListener('load', () => {
  fetch('/api/gainers')
    .then(res => res.json())
    .then(data => {
      gainersList.innerHTML = '';
      if (!data || data.length === 0) {
        const li = document.createElement('li');
        li.className = 'list-group-item text-muted';
        li.textContent = 'No data';
        gainersList.appendChild(li);
      } else {
        data.forEach(stock => {
          const li = document.createElement('li');
          li.className = 'list-group-item';
          li.innerHTML = `<strong>${stock.symbol}</strong>: ₹${stock.price} (+${stock.change}%)`;
          li.onclick = () => {
            searchInput.value = stock.symbol;
            fetchStockData(stock.symbol);
          };
          gainersList.appendChild(li);
        });
      }
    });

  fetch('/api/losers')
    .then(res => res.json())
    .then(data => {
      losersList.innerHTML = '';
      if (!data || data.length === 0) {
        const li = document.createElement('li');
        li.className = 'list-group-item text-muted';
        li.textContent = 'No data';
        losersList.appendChild(li);
      } else {
        data.forEach(stock => {
          const li = document.createElement('li');
          li.className = 'list-group-item';
          li.innerHTML = `<strong>${stock.symbol}</strong>: ₹${stock.price} (${stock.change}%)`;
          li.onclick = () => {
            searchInput.value = stock.symbol;
            fetchStockData(stock.symbol);
          };
          losersList.appendChild(li);
        });
      }
    });
});

// ====== Debounce Function ======
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// ====== Fetch Suggestions ======
const fetchSuggestions = debounce(async (query) => {
  if (query.length < 2) {
    suggestionsBox.classList.add('d-none');
    noResults.classList.add('d-none');
    return;
  }

  try {
    const res = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    suggestionsBox.innerHTML = '';
    if (!data || data.length === 0) {
      suggestionsBox.classList.add('d-none');
      noResults.classList.remove('d-none');
    } else {
      data.forEach(stock => {
        const item = document.createElement('li');
        item.className = 'list-group-item';
        item.innerHTML = `<strong>${stock.symbol}</strong> - ${stock.name}`;
        item.onclick = () => {
          searchInput.value = stock.symbol;
          suggestionsBox.classList.add('d-none');
          noResults.classList.add('d-none');
          fetchStockData(stock.symbol);
        };
        suggestionsBox.appendChild(item);
      });
      suggestionsBox.classList.remove('d-none');
      noResults.classList.add('d-none');
    }
  } catch (err) {
    console.error("Suggestion error:", err);
  }
}, 300);

// ====== Event Listeners ======
searchInput.addEventListener('input', e => fetchSuggestions(e.target.value));
searchInput.addEventListener('focus', () => {
  if (suggestionsBox.children.length > 0) suggestionsBox.classList.remove('d-none');
});
document.addEventListener('click', e => {
  if (!e.target.closest('.input-group')) suggestionsBox.classList.add('d-none');
});
searchBtn.addEventListener('click', () => {
  const val = searchInput.value.trim();
  if (val) fetchStockData(val);
});
searchInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    const val = searchInput.value.trim();
    if (val) fetchStockData(val);
  }
});

// ====== Fetch Stock Data ======
async function fetchStockData(symbol) {
  if (!symbol) return;

  currentSymbol = symbol;
  loading.classList.remove('d-none');
  stockDetails.classList.add('d-none');
  noResults.classList.add('d-none');
  suggestionsBox.classList.add('d-none');

  try {
    const res = await fetch(`/api/quote/${symbol}`);
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    // Populate UI
    stockName.textContent = data.name || symbol;
    stockSymbol.textContent = data.symbol;
    stockPrice.textContent = data.price.toLocaleString('en-IN');
    stockChange.textContent = data.change;
    stockChange.className = data.change.includes('+') ? 'text-success' : 'text-danger';
    stockVolume.textContent = data.volume;

    targetPrice.textContent = typeof data.target_price === 'number'
      ? data.target_price.toLocaleString('en-IN')
      : 'N/A';

    peRatio.textContent = data.pe_ratio !== "N/A" ? data.pe_ratio : "N/A";
    eps.textContent = data.eps !== "N/A" ? data.eps : "N/A";
    divYield.textContent = data.dividend_yield || "N/A";

    // Recommendation
    recommendation.textContent = data.recommendation;
    recommendation.className = 'badge px-3 py-2';
    if (data.recommendation === 'BUY') {
      recommendation.classList.add('bg-buy');
    } else if (data.recommendation === 'SELL') {
      recommendation.classList.add('bg-sell');
    } else {
      recommendation.classList.add('bg-hold');
    }

    reasonText.textContent = data.reason || '';

    // ====== Analyst Chart ======
    const ctx = document.getElementById('analystChart').getContext('2d');
    if (window.analystChart instanceof Chart) window.analystChart.destroy();

    const buy = data.analyst_ratings?.buy || 0;
    const hold = data.analyst_ratings?.hold || 0;
    const sell = data.analyst_ratings?.sell || 0;

    window.analystChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Ratings'],
        datasets: [
          { label: 'Buy', data: [buy], backgroundColor: '#22c55e', stack: 'a' },
          { label: 'Hold', data: [hold], backgroundColor: '#f59e0b', stack: 'a' },
          { label: 'Sell', data: [sell], backgroundColor: '#ef4444', stack: 'a' }
        ]
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { position: 'top' }, tooltip: { enabled: true } },
        scales: { x: { beginAtZero: true }, y: { display: false } },
        responsive: true,
        maintainAspectRatio: false
      }
    });

    analystBuy.textContent = buy;
    analystHold.textContent = hold;
    analystSell.textContent = sell;

    // Pre-fill EPS
    if (data.eps) calcEPS.value = data.eps;

    // ====== Fair Value Calculator ======
    calcButton.onclick = () => {
      const eps = parseFloat(calcEPS.value);
      const growth = parseFloat(calcGrowth.value) / 100;
      const requiredReturn = parseFloat(calcReturn.value) / 100;

      if (!eps || isNaN(growth) || isNaN(requiredReturn)) {
        fairValueResult.innerHTML = '<p class="text-danger">Please enter valid values</p>';
        return;
      }

      const fairValue = (eps * (1 + growth)) / (requiredReturn - growth);
      const rounded = Math.round(fairValue);
      const premium = ((data.price - rounded) / rounded * 100).toFixed(1);

      let verdict, color;
      if (premium < -20) { verdict = '🟢 Strong Buy'; color = 'text-success'; }
      else if (premium < 0) { verdict = '🟡 Buy'; color = 'text-warning'; }
      else if (premium < 20) { verdict = '🟠 Hold'; color = 'text-secondary'; }
      else { verdict = '🔴 Sell'; color = 'text-danger'; }

      fairValueResult.innerHTML = `
        <p class="mb-1"><strong>Fair Value:</strong> ₹${rounded.toLocaleString()}</p>
        <p class="mb-1 ${color}"><strong>Verdict:</strong> ${verdict}</p>
        <p class="text-muted small">Premium: ${premium}%</p>
      `;
    };

    // Show results
    stockDetails.classList.remove('d-none');
    loading.classList.add('d-none');

    // Auto-refresh
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => fetchStockData(currentSymbol), 60000);

  } catch (err) {
    alert('Failed to fetch stock data: ' + err.message);
    console.error(err);
  } finally {
    loading.classList.add('d-none');
  }
}