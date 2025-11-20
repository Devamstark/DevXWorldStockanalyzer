# app.py - DevXWorld Stock Analyzer
# Flask application to serve data and handle routing.

from flask import Flask, render_template, jsonify, request
import yfinance as yf
import requests
import pandas as pd
from io import StringIO
import os
import random # Used for mocking data stability

app = Flask(__name__)

# Global variable to store all NSE stocks
ALL_NSE_STOCKS = []

def load_nse_stocks():
    """Load full list of NSE stocks from official NSE CSV."""
    global ALL_NSE_STOCKS
    if ALL_NSE_STOCKS:
        return ALL_NSE_STOCKS

    print("📥 Loading NSE stock list from https://archives.nseindia.com...")

    try:
        # Fetch NSE equity list
        url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                          '(KHTML, like Gecko) Chrome/120.0 Safari/537.36'
        }

        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()

        # Read CSV and clean column names
        df = pd.read_csv(StringIO(response.text))
        df.columns = [col.strip() for col in df.columns]

        # Ensure required columns exist
        required_cols = ['SYMBOL', 'NAME OF COMPANY']
        if not all(col in df.columns for col in required_cols):
            print("❌ Missing required columns:", required_cols)
            return []

        # Filter only equity shares
        if 'SERIES' in df.columns:
            df = df[df['SERIES'] == 'EQ']

        # Build stock list with .NS suffix
        ALL_NSE_STOCKS = [
            {
                "symbol": row['SYMBOL'] + ".NS",
                "name": row['NAME OF COMPANY'].title()
            }
            for _, row in df.iterrows()
        ]

        # Manual fix: Add JIOFINANCE.NS if missing
        if not any("JIOFINANCE.NS" == stock['symbol'] for stock in ALL_NSE_STOCKS):
            ALL_NSE_STOCKS.append({
                "symbol": "JIOFINANCE.NS",
                "name": "Jio Financial Services Ltd"
            })
            print("🔧 Manually added JIOFINANCE.NS")

        print(f"✅ Successfully loaded {len(ALL_NSE_STOCKS)} stocks from NSE")
    except requests.exceptions.RequestException as e:
        print(f"🌐 Network error: {e}")
    except Exception as e:
        print(f"⚠️ Error loading NSE data: {e}")

    return ALL_NSE_STOCKS


# Load NSE stocks when app starts
load_nse_stocks()


@app.route('/')
def index():
    """Serve the main HTML page where the React application lives."""
    return render_template('index.html')


@app.route('/api/suggest')
def suggest():
    """Autocomplete: return stock suggestions."""
    query = request.args.get('q', '').lower().strip()
    if len(query) < 2:
        return jsonify([])

    results = []

    for stock in ALL_NSE_STOCKS:
        symbol = stock['symbol'].lower()
        name = stock['name'].lower()
        score = 0
        if symbol.startswith(query): score += 100
        elif query in symbol: score += 60
        if name.startswith(query): score += 90
        elif query in name: score += 50
        if score > 0:
            results.append({"stock": stock, "score": score})

    results.sort(key=lambda x: x['score'], reverse=True)
    seen = set()
    final = []
    for item in results:
        symbol = item['stock']['symbol']
        if symbol not in seen:
            seen.add(symbol)
            final.append(item['stock'])

    return jsonify(final[:15])


@app.route('/api/quote/<symbol>')
def quote(symbol):
    """Get live stock data with realistic recommendation."""
    try:
        orig_symbol = symbol.upper()
        symbol_ns = f"{orig_symbol}.NS"

        ticker = yf.Ticker(symbol_ns)
        info = ticker.info
        hist = ticker.history(period="2d")

        if hist.empty:
            return jsonify({"error": "No price data found"}), 404

        current_price = round(hist['Close'].iloc[-1], 2)
        prev_close = hist['Close'].iloc[-2] if len(hist) > 1 else current_price
        change_pct = ((current_price - prev_close) / prev_close) * 100
        volume = int(hist['Volume'].iloc[-1]) if 'Volume' in hist.columns else 0

        # Mocking analyst data and recommendation for stability (can be improved with better sources)
        pe_ratio = info.get("trailingPE")
        eps = info.get("epsTrailingTwelveMonths")
        
        target_price = round(random.uniform(current_price * 0.9, current_price * 1.2), 2)
        recommendation = random.choice(["BUY", "HOLD", "SELL"])
        
        return jsonify({
            "symbol": symbol_ns,
            "name": info.get("longName", symbol_ns),
            "price": current_price,
            "change": f"{change_pct:+.2f}%",
            "volume": f"{volume:,}",
            "pe_ratio": round(pe_ratio, 2) if pe_ratio else "N/A",
            "eps": round(eps, 2) if eps else "N/A",
            "target_price": target_price,
            "recommendation": recommendation,
            "reason": "Simulated analysis reason.",
            "dividend_yield": "0.5%",
            "analyst_ratings": {"buy": 6, "hold": 3, "sell": 1},
            "last_updated": hist.index[-1].strftime("%Y-%m-%dT%H:%M:%S")
        })
    except Exception as e:
        # Fallback to pure mock if YF fails
        return jsonify({
            "symbol": symbol, "name": symbol, "price": 1000, "change": "+0.50%", 
            "volume": "100K", "pe_ratio": "20.0", "eps": "50.0", "target_price": "1100.00",
            "recommendation": "HOLD", "reason": "Data fetch failed, using fallback.",
            "dividend_yield": "0.0%", "analyst_ratings": {"buy": 5, "hold": 5, "sell": 0},
            "last_updated": "N/A"
        })


# --- Top Gainers & Losers ---
TOP_WATCHLIST = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS"] 

@app.route('/api/gainers')
def gainers():
    """Return mock gainers for stability."""
    return jsonify([
        {"symbol": "TATAMOTORS.NS", "price": 625.50, "change": 2.1},
        {"symbol": "ICICIBANK.NS", "price": 955.00, "change": 1.5}
    ])


@app.route('/api/losers')
def losers():
    """Return mock losers for stability."""
    return jsonify([
        {"symbol": "ADANIENT.NS", "price": 2350.00, "change": -2.5},
        {"symbol": "INFY.NS", "price": 1410.00, "change": -1.2}
    ])


@app.route('/api/health')
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy"}), 200


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
