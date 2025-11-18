# app.py - DevXWorld Stock Analyzer
# A smart stock search engine for Indian investors

from flask import Flask, render_template, jsonify, request
import yfinance as yf # Note: yfinance might cause rate limits, consider FMP API
import requests
import pandas as pd
from io import StringIO
import os

# Add Gemini imports
import google.generativeai as genai

# Configure Gemini (requires GEMINI_API_KEY environment variable on Render)
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
# Use the model name you confirmed works: gemini-2.0-flash
model = genai.GenerativeModel('gemini-2.0-flash') # <-- Updated line

app = Flask(__name__)

# Global variable to store all NSE stocks
ALL_NSE_STOCKS = []

def load_nse_stocks():
    """Load full list of NSE stocks from official NSE CSV (without relying on INDUSTRY)"""
    global ALL_NSE_STOCKS
    if ALL_NSE_STOCKS:
        return ALL_NSE_STOCKS  # Already loaded

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
        df.columns = [col.strip() for col in df.columns]  # Remove extra spaces

        # Ensure required columns exist
        required_cols = ['SYMBOL', 'NAME OF COMPANY']
        if not all(col in df.columns for col in required_cols):
            print("❌ Missing required columns:", required_cols)
            return []

        # Filter only equity shares (if SERIES column exists)
        if 'SERIES' in df.columns:
            df = df[df['SERIES'] == 'EQ']
        else:
            print("⚠️ SERIES column not found. Using all rows.")

        # Build stock list with .NS suffix
        ALL_NSE_STOCKS = [
            {
                "symbol": row['SYMBOL'] + ".NS",
                "name": row['NAME OF COMPANY'].title()
            }
            for _, row in df.iterrows()
        ]

        # ✅ Manual fix: Add JIOFINANCE.NS if missing
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
    """Serve the main HTML page"""
    return render_template('index.html')


@app.route('/api/suggest')
def suggest():
    """Autocomplete: return stock suggestions with strong name & keyword support"""
    query = request.args.get('q', '').lower().strip()
    if len(query) < 2:
        return jsonify([])

    results = []

    for stock in ALL_NSE_STOCKS:
        symbol = stock['symbol'].lower()
        name = stock['name'].lower()

        score = 0

        # 1. Symbol starts with query → highest priority (e.g., "tcs" → TCS.NS)
        if symbol.startswith(query):
            score += 100
        elif query in symbol:
            score += 60

        # 2. Name starts with query (e.g., "tata" → Tata Motors)
        if name.startswith(query):
            score += 90
        elif query in name:
            score += 50

        # 3. Word-based partial match (e.g., "motor" in "Tata Motors")
        if any(query in word for word in name.split()):
            score += 30

        # 4. Multi-word query match (e.g., "tata mot" → Tata Motors)
        query_words = query.split()
        if len(query_words) > 1:
            if all(any(qw in word for word in name.split()) for qw in query_words):
                score += 40

        # 5. Keyword boost for sectors
        keyword_boost = {
            'bank': ['bank', 'finance', 'financial', 'hdfc', 'icici', 'sbin', 'kotak', 'axis'],
            'it': ['software', 'services', 'tcs', 'infosys', 'tech', 'hcl', 'wipro'],
            'auto': ['motor', 'vehicle', 'automobile', 'car', 'maruti', 'tata', 'bajaj', 'eicher'],
            'pharma': ['pharma', 'laboratory', 'drug', 'medicine', 'sun', 'dr reddy', 'divis', 'cipla'],
            'cement': ['cement', 'ultratech', 'shree', 'acc'],
            'steel': ['steel', 'tatasteel', 'jsw', 'sail'],
            'power': ['power', 'energy', 'ntpc', 'gail', 'nhpc', 'powergrid'],
            'sugar': ['sugar', 'balrampur', 'dhampur', 'dharani'],
            'jio': ['jio', 'jiofinance', 'reliance jio', 'rel jio'],
            'adani': ['adani', 'adanipower', 'adaniport', 'green'],
            'insurance': ['insurance', 'life', 'hdfclife', 'sbilife'],
            'metal': ['metal', 'mining', 'coal', 'coallndia', 'hindalco']
        }
        for key, keywords in keyword_boost.items():
            if query == key or any(q in name for q in keywords if query in q):
                score += 35

        # 6. Bonus: exact word match
        if any(query == word for word in name.split()) or any(query == word for word in symbol.split('.')):
            score += 25

        if score > 0:
            results.append({
                "stock": stock,
                "score": score
            })

    # Sort by score (highest first)
    results.sort(key=lambda x: x['score'], reverse=True)

    # Deduplicate by symbol
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
    """Get live stock data with realistic BUY/SELL/HOLD recommendation"""
    try:
        # Normalize symbol
        orig_symbol = symbol.upper()
        if not orig_symbol.endswith('.NS'):
            symbol = f"{orig_symbol}.NS"
        else:
            symbol = orig_symbol

        ticker = yf.Ticker(symbol)
        info = ticker.info
        hist = ticker.history(period="2d")

        if hist.empty:
            return jsonify({"error": "No price data found"}), 404

        current_price = round(hist['Close'].iloc[-1], 2)

        # Safely get previous close
        if len(hist) > 1:
            prev_close = hist['Close'].iloc[-2]
        else:
            prev_close = current_price

        change_pct = ((current_price - prev_close) / prev_close) * 100
        volume = int(hist['Volume'].iloc[-1]) if 'Volume' in hist.columns and len(hist) > 0 else 0

        # Get fundamentals
        target_price = info.get("targetMeanPrice")
        pe_ratio = info.get("trailingPE")
        eps = info.get("epsTrailingTwelveMonths")
        dividend_yield = info.get("dividendYield")

        analyst_buy = info.get("buyCount", 0)
        analyst_hold = info.get("holdCount", 0)
        analyst_sell = info.get("sellCount", 0)

        # Default recommendation
        recommendation = "HOLD"
        reason = "Fairly valued"

        # Only proceed if we have target price
        if target_price:
            target_price = round(target_price, 2)
            diff_from_target = ((current_price - target_price) / target_price) * 100

            # 🔴 Strong SELL: 20%+ above target
            if diff_from_target > 20:
                recommendation = "SELL"
                reason = "Overvalued (20%+ above target)"
            # 🟡 Moderate SELL: 10-20% above
            elif diff_from_target > 10:
                recommendation = "SELL"
                reason = "Overvalued (10-20% above target)"
            # 🟢 BUY: 15%+ below target
            elif diff_from_target < -15:
                recommendation = "BUY"
                reason = "Undervalued (15%+ below target)"
            # 🟡 Hold: within -15% to +10%
            else:
                recommendation = "HOLD"
                reason = "Near fair value"
        else:
            # No target price → use P/E and analyst sentiment
            if pe_ratio and pe_ratio > 50:
                recommendation = "SELL"
                reason = "Very high P/E ratio"
            elif analyst_sell > analyst_buy:
                recommendation = "SELL"
                reason = "More analysts recommend Sell"
            else:
                recommendation = "HOLD"
                reason = "Insufficient data for strong call"

        return jsonify({
            "symbol": symbol,
            "name": info.get("longName", symbol),
            "price": current_price,
            "change": f"{change_pct:+.2f}%",
            "volume": f"{volume:,}",
            "pe_ratio": round(pe_ratio, 2) if pe_ratio else "N/A",
            "eps": round(eps, 2) if eps else "N/A",
            "target_price": target_price if target_price else "N/A",
            "recommendation": recommendation,
            "reason": reason,
            "dividend_yield": f"{dividend_yield * 100:.2f}%" if dividend_yield else "N/A",
            "analyst_ratings": {
                "buy": analyst_buy,
                "hold": analyst_hold,
                "sell": analyst_sell
            },
            "last_updated": hist.index[-1].strftime("%Y-%m-%dT%H:%M:%S")
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- Top Gainers & Losers ---
TOP_WATCHLIST = [
    "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "SBIN.NS",
    "LT.NS", "AXISBANK.NS", "KOTAKBANK.NS", "ITC.NS", "BHARTIARTL.NS",
    "HINDUNILVR.NS", "ICICIBANK.NS", "MARUTI.NS", "TITAN.NS", "ASIANPAINT.NS",
    "SUNPHARMA.NS", "BAJFINANCE.NS", "BAJAJFINSV.NS", "WIPRO.NS", "TECHM.NS",
    "POWERGRID.NS", "NTPC.NS", "COALINDIA.NS", "ULTRACEMCO.NS", "HCLTECH.NS",
    "ADANIENT.NS", "ADANIPORTS.NS", "APOLLOHOSP.NS", "JIOFINANCE.NS", "TATASTEEL.NS"
]

@app.route('/api/gainers')
def gainers():
    """Return top 5 gainers from watchlist"""
    data = []
    for symbol in TOP_WATCHLIST:
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="2d")
            if hist.empty or len(hist) < 2:
                continue
            prev = hist['Close'].iloc[-2]
            curr = hist['Close'].iloc[-1]
            change = ((curr - prev) / prev) * 100
            if change > 0:
                data.append({
                    "symbol": symbol,
                    "price": round(curr, 2),
                    "change": round(change, 2)
                })
        except:
            continue

    data.sort(key=lambda x: x['change'], reverse=True)
    return jsonify(data[:5])


@app.route('/api/losers')
def losers():
    """Return top 5 losers from watchlist"""
    data = []
    for symbol in TOP_WATCHLIST:
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="2d")
            if hist.empty or len(hist) < 2:
                continue
            prev = hist['Close'].iloc[-2]
            curr = hist['Close'].iloc[-1]
            change = ((curr - prev) / prev) * 100
            if change < 0:
                data.append({
                    "symbol": symbol,
                    "price": round(curr, 2),
                    "change": round(change, 2)
                })
        except:
            continue

    data.sort(key=lambda x: x['change'])
    return jsonify(data[:5])


# --- NEW: AI Analysis Endpoint ---
@app.route('/api/analyze-stock', methods=['POST'])
def analyze_stock():
    """Generate AI analysis for a stock using Gemini"""
    data = request.get_json()
    symbol = data.get('symbol')
    name = data.get('name')
    metrics = data.get('metrics') # e.g., {price: 3000, change: 50, ...}
    news = data.get('news', []) # e.g., ['News headline 1', 'News headline 2', ...]

    if not symbol or not metrics:
        return jsonify({"error": "Symbol and metrics are required"}), 400

    try:
        # Construct a prompt for the AI
        prompt = f"""
You are a financial analyst. Analyze the following data for the Indian stock: **{name} ({symbol})**.

Key Metrics:
- Current Price: ₹{metrics.get('price', 'N/A')}
- Change: {metrics.get('change', 'N/A')} ({metrics.get('change_pct', 'N/A')})
- PE Ratio: {metrics.get('pe_ratio', 'N/A')}
- EPS: ₹{metrics.get('eps', 'N/A')}
- 52W High: ₹{metrics.get('high52w', 'N/A')}
- 52W Low: ₹{metrics.get('low52w', 'N/A')}
- Market Cap: ₹{metrics.get('marketCap', 'N/A')}
- Dividend Yield: {metrics.get('dividend_yield', 'N/A')}
- Analyst Recommendation: {metrics.get('recommendation', 'N/A')} (Reason: {metrics.get('reason', 'N/A')})

Recent News Headlines:
{chr(10).join([f"- {n}" for n in news]) if news else 'No recent news available.'}

Based on this data and news, provide a concise, clear analysis in 2-3 sentences. Mention the stock's current performance, valuation (if relevant), and a brief outlook. Respond in the language of the user's interface (English or Hindi if specified, default to English).
        """

        # Call Gemini API with the confirmed working model
        response = model.generate_content(prompt)
        analysis_text = response.text

        return jsonify({"analysis": analysis_text})

    except Exception as e:
        print(f"Gemini API Error: {e}") # Log the error
        return jsonify({"error": "Error generating analysis"}), 500


@app.route('/api/health')
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy"}), 200


# Run the app
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))

    app.run(host='0.0.0.0', port=port, debug=True)
