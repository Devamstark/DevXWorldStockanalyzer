# app.py - DevXWorld Stock Analyzer
# A smart stock search engine for Indian investors

}

def get_cached_data(key):
    if key in CACHE:
        data, timestamp = CACHE[key]
        prefix = key.split(':')[0]
        expiry = CACHE_EXPIRY.get(prefix, 300)
        if time.time() - timestamp < expiry:
            return data
    return None

def set_cached_data(key, data):
    CACHE[key] = (data, time.time())

# --- Mock Data Generator ---
def get_mock_quote(symbol):
    """Generate realistic-looking mock data when API fails"""
    base_price = random.uniform(100, 3000)
    change_pct = random.uniform(-5, 5)
    current_price = base_price * (1 + change_pct / 100)
    
    return {
        "symbol": symbol,
        "name": f"{symbol.replace('.NS', '')} (Demo Data)",
        "price": round(current_price, 2),
        "change": f"{change_pct:+.2f}%",
        "volume": f"{random.randint(10000, 1000000):,}",
        "pe_ratio": round(random.uniform(10, 80), 2),
        "eps": round(random.uniform(5, 50), 2),
        "target_price": round(current_price * 1.1, 2),
        "recommendation": random.choice(["BUY", "HOLD", "SELL"]),
        "reason": "Demo Data (API Blocked)",
        "dividend_yield": f"{random.uniform(0, 3):.2f}%",
        "analyst_ratings": {
            "buy": random.randint(5, 20),
            "hold": random.randint(5, 15),
            "sell": random.randint(0, 5)
        },
        "last_updated": datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    }

# --- Stock Data Source ---

FALLBACK_STOCKS = [
    {"symbol": "RELIANCE.NS", "name": "Reliance Industries Ltd"},
    {"symbol": "TCS.NS", "name": "Tata Consultancy Services Ltd"},
    {"symbol": "HDFCBANK.NS", "name": "HDFC Bank Ltd"},
    {"symbol": "ICICIBANK.NS", "name": "ICICI Bank Ltd"},
    {"symbol": "INFY.NS", "name": "Infosys Ltd"},
    {"symbol": "SBIN.NS", "name": "State Bank of India"},
    {"symbol": "BHARTIARTL.NS", "name": "Bharti Airtel Ltd"},
    {"symbol": "ITC.NS", "name": "ITC Ltd"},
    {"symbol": "KOTAKBANK.NS", "name": "Kotak Mahindra Bank Ltd"},
    {"symbol": "LICI.NS", "name": "Life Insurance Corporation of India"},
    {"symbol": "LT.NS", "name": "Larsen & Toubro Ltd"},
    {"symbol": "HINDUNILVR.NS", "name": "Hindustan Unilever Ltd"},
    {"symbol": "AXISBANK.NS", "name": "Axis Bank Ltd"},
    {"symbol": "HCLTECH.NS", "name": "HCL Technologies Ltd"},
    {"symbol": "MARUTI.NS", "name": "Maruti Suzuki India Ltd"},
    {"symbol": "SUNPHARMA.NS", "name": "Sun Pharmaceutical Industries Ltd"},
    {"symbol": "ASIANPAINT.NS", "name": "Asian Paints Ltd"},
    {"symbol": "TITAN.NS", "name": "Titan Company Ltd"},
    {"symbol": "ULTRACEMCO.NS", "name": "UltraTech Cement Ltd"},
    {"symbol": "TATASTEEL.NS", "name": "Tata Steel Ltd"},
    {"symbol": "BAJFINANCE.NS", "name": "Bajaj Finance Ltd"},
    {"symbol": "WIPRO.NS", "name": "Wipro Ltd"},
    {"symbol": "M&M.NS", "name": "Mahindra & Mahindra Ltd"},
    {"symbol": "ADANIENT.NS", "name": "Adani Enterprises Ltd"},
    {"symbol": "NTPC.NS", "name": "NTPC Ltd"},
    {"symbol": "POWERGRID.NS", "name": "Power Grid Corporation of India Ltd"},
    {"symbol": "JIOFINANCE.NS", "name": "Jio Financial Services Ltd"},
    {"symbol": "TATAMOTORS.NS", "name": "Tata Motors Ltd"},
    {"symbol": "ONGC.NS", "name": "Oil & Natural Gas Corporation Ltd"},
    {"symbol": "COALINDIA.NS", "name": "Coal India Ltd"},
    {"symbol": "ADANIPORTS.NS", "name": "Adani Ports and Special Economic Zone Ltd"},
    {"symbol": "BAJAJFINSV.NS", "name": "Bajaj Finserv Ltd"},
    {"symbol": "GRASIM.NS", "name": "Grasim Industries Ltd"},
    {"symbol": "JSWSTEEL.NS", "name": "JSW Steel Ltd"},
    {"symbol": "TECHM.NS", "name": "Tech Mahindra Ltd"},
    {"symbol": "HINDALCO.NS", "name": "Hindalco Industries Ltd"},
    {"symbol": "DIVISLAB.NS", "name": "Divi's Laboratories Ltd"},
    {"symbol": "DRREDDY.NS", "name": "Dr. Reddy's Laboratories Ltd"},
    {"symbol": "EICHERMOT.NS", "name": "Eicher Motors Ltd"},
    {"symbol": "CIPLA.NS", "name": "Cipla Ltd"},
    {"symbol": "SBILIFE.NS", "name": "SBI Life Insurance Company Ltd"},
    {"symbol": "BPCL.NS", "name": "Bharat Petroleum Corporation Ltd"},
    {"symbol": "BRITANNIA.NS", "name": "Britannia Industries Ltd"},
    {"symbol": "HEROMOTOCO.NS", "name": "Hero MotoCorp Ltd"},
    {"symbol": "TATACONSUM.NS", "name": "Tata Consumer Products Ltd"},
    {"symbol": "APOLLOHOSP.NS", "name": "Apollo Hospitals Enterprise Ltd"},
    {"symbol": "INDUSINDBK.NS", "name": "IndusInd Bank Ltd"},
    {"symbol": "UPL.NS", "name": "UPL Ltd"},
    {"symbol": "ZOMATO.NS", "name": "Zomato Ltd"},
    {"symbol": "PAYTM.NS", "name": "One 97 Communications Ltd"},
    {"symbol": "DMART.NS", "name": "Avenue Supermarts Ltd"},
    {"symbol": "HAL.NS", "name": "Hindustan Aeronautics Ltd"},
    {"symbol": "BEL.NS", "name": "Bharat Electronics Ltd"},
    {"symbol": "VBL.NS", "name": "Varun Beverages Ltd"},
    {"symbol": "TRENT.NS", "name": "Trent Ltd"},
    {"symbol": "SIEMENS.NS", "name": "Siemens Ltd"},
    {"symbol": "DLF.NS", "name": "DLF Ltd"},
    {"symbol": "PIDILITIND.NS", "name": "Pidilite Industries Ltd"},
    {"symbol": "INDIGO.NS", "name": "InterGlobe Aviation Ltd"},
    {"symbol": "CHOLAFIN.NS", "name": "Cholamandalam Investment and Finance Company Ltd"},
    {"symbol": "GAIL.NS", "name": "GAIL (India) Ltd"},
    {"symbol": "AMBUJACEM.NS", "name": "Ambuja Cements Ltd"},
    {"symbol": "BANKBARODA.NS", "name": "Bank of Baroda"},
    {"symbol": "CANBK.NS", "name": "Canara Bank"},
    {"symbol": "PNB.NS", "name": "Punjab National Bank"},
    {"symbol": "VEDL.NS", "name": "Vedanta Ltd"},
    {"symbol": "SHREECEM.NS", "name": "Shree Cement Ltd"},
    {"symbol": "TVSMOTOR.NS", "name": "TVS Motor Company Ltd"},
    {"symbol": "HAVELLS.NS", "name": "Havells India Ltd"},
    {"symbol": "DABUR.NS", "name": "Dabur India Ltd"},
    {"symbol": "ABB.NS", "name": "ABB India Ltd"},
    {"symbol": "GODREJCP.NS", "name": "Godrej Consumer Products Ltd"},
    {"symbol": "LODHA.NS", "name": "Macrotech Developers Ltd"},
    {"symbol": "SHRIRAMFIN.NS", "name": "Shriram Finance Ltd"},
    {"symbol": "BAJAJ-AUTO.NS", "name": "Bajaj Auto Ltd"},
    {"symbol": "BERGEPAINT.NS", "name": "Berger Paints India Ltd"},
    {"symbol": "ICICIPRULI.NS", "name": "ICICI Prudential Life Insurance Company Ltd"},
    {"symbol": "RECLTD.NS", "name": "REC Ltd"},
    {"symbol": "PFC.NS", "name": "Power Finance Corporation Ltd"},
    {"symbol": "MUTHOOTFIN.NS", "name": "Muthoot Finance Ltd"},
    {"symbol": "BOSCHLTD.NS", "name": "Bosch Ltd"},
    {"symbol": "PIIND.NS", "name": "PI Industries Ltd"},
    {"symbol": "MANKIND.NS", "name": "Mankind Pharma Ltd"},
    {"symbol": "IRCTC.NS", "name": "Indian Railway Catering and Tourism Corporation Ltd"},
    {"symbol": "NAUKRI.NS", "name": "Info Edge (India) Ltd"},
    {"symbol": "COLPAL.NS", "name": "Colgate-Palmolive (India) Ltd"},
    {"symbol": "HDFCLIFE.NS", "name": "HDFC Life Insurance Company Ltd"},
    {"symbol": "TORNTPHARM.NS", "name": "Torrent Pharmaceuticals Ltd"},
    {"symbol": "LUPIN.NS", "name": "Lupin Ltd"},
    {"symbol": "ZYDUSLIFE.NS", "name": "Zydus Lifesciences Ltd"},
    {"symbol": "TIINDIA.NS", "name": "Tube Investments of India Ltd"},
    {"symbol": "CUMMINSIND.NS", "name": "Cummins India Ltd"},
    {"symbol": "HINDPETRO.NS", "name": "Hindustan Petroleum Corporation Ltd"},
    {"symbol": "IOC.NS", "name": "Indian Oil Corporation Ltd"},
    {"symbol": "OBEROIRLTY.NS", "name": "Oberoi Realty Ltd"},
    {"symbol": "MARICO.NS", "name": "Marico Ltd"},
    {"symbol": "PERSISTENT.NS", "name": "Persistent Systems Ltd"},
    {"symbol": "APOLLOTYRE.NS", "name": "Apollo Tyres Ltd"},
    {"symbol": "ASHOKLEY.NS", "name": "Ashok Leyland Ltd"},
    {"symbol": "ASTRAL.NS", "name": "Astral Ltd"},
    {"symbol": "AUROPHARMA.NS", "name": "Aurobindo Pharma Ltd"},
    {"symbol": "BALKRISIND.NS", "name": "Balkrishna Industries Ltd"},
    {"symbol": "BANDHANBNK.NS", "name": "Bandhan Bank Ltd"},
    {"symbol": "BATAINDIA.NS", "name": "Bata India Ltd"},
    {"symbol": "BHARATFORG.NS", "name": "Bharat Forge Ltd"},
    {"symbol": "BHEL.NS", "name": "Bharat Heavy Electricals Ltd"},
    {"symbol": "BIOCON.NS", "name": "Biocon Ltd"},
    {"symbol": "CHAMBLFERT.NS", "name": "Chambal Fertilisers and Chemicals Ltd"},
    {"symbol": "COFORGE.NS", "name": "Coforge Ltd"},
    {"symbol": "CONCOR.NS", "name": "Container Corporation of India Ltd"},
    {"symbol": "COROMANDEL.NS", "name": "Coromandel International Ltd"},
    {"symbol": "CROMPTON.NS", "name": "Crompton Greaves Consumer Electricals Ltd"},
    {"symbol": "DEEPAKNTR.NS", "name": "Deepak Nitrite Ltd"},
    {"symbol": "DELTACORP.NS", "name": "Delta Corp Ltd"},
    {"symbol": "DIXON.NS", "name": "Dixon Technologies (India) Ltd"},
    {"symbol": "ESCORTS.NS", "name": "Escorts Kubota Ltd"},
    {"symbol": "EXIDEIND.NS", "name": "Exide Industries Ltd"},
    {"symbol": "FEDERALBNK.NS", "name": "The Federal Bank Ltd"},
    {"symbol": "GLENMARK.NS", "name": "Glenmark Pharmaceuticals Ltd"},
    {"symbol": "GMRINFRA.NS", "name": "GMR Airports Infrastructure Ltd"},
    {"symbol": "GNFC.NS", "name": "Gujarat Narmada Valley Fertilizers & Chemicals Ltd"},
    {"symbol": "GODREJPROP.NS", "name": "Godrej Properties Ltd"},
    {"symbol": "GRANULES.NS", "name": "Granules India Ltd"},
    {"symbol": "GUJGASLTD.NS", "name": "Gujarat Gas Ltd"},
    {"symbol": "HAL.NS", "name": "Hindustan Aeronautics Ltd"},
    {"symbol": "HDFCAMC.NS", "name": "HDFC Asset Management Company Ltd"},
    {"symbol": "IBULHSGFIN.NS", "name": "Indiabulls Housing Finance Ltd"},
    {"symbol": "IDFC.NS", "name": "IDFC Ltd"},
    {"symbol": "IDFCFIRSTB.NS", "name": "IDFC First Bank Ltd"},
    {"symbol": "IEX.NS", "name": "Indian Energy Exchange Ltd"},
    {"symbol": "IGL.NS", "name": "Indraprastha Gas Ltd"},
    {"symbol": "INDHOTEL.NS", "name": "The Indian Hotels Company Ltd"},
    {"symbol": "INDIACEM.NS", "name": "The India Cements Ltd"},
    {"symbol": "INDIAMART.NS", "name": "IndiaMART InterMESH Ltd"},
    {"symbol": "INDUSTOWER.NS", "name": "Indus Towers Ltd"},
    {"symbol": "IPCALAB.NS", "name": "Ipca Laboratories Ltd"},
    {"symbol": "JINDALSTEL.NS", "name": "Jindal Steel & Power Ltd"},
    {"symbol": "JKCEMENT.NS", "name": "JK Cement Ltd"},
    {"symbol": "JUBLFOOD.NS", "name": "Jubilant FoodWorks Ltd"},
    {"symbol": "LALPATHLAB.NS", "name": "Dr. Lal PathLabs Ltd"},
    {"symbol": "LAURUSLABS.NS", "name": "Laurus Labs Ltd"},
    {"symbol": "LICHSGFIN.NS", "name": "LIC Housing Finance Ltd"},
    {"symbol": "LTF.NS", "name": "L&T Finance Holdings Ltd"},
    {"symbol": "LTIM.NS", "name": "LTIMindtree Ltd"},
    {"symbol": "LTTS.NS", "name": "L&T Technology Services Ltd"},
    {"symbol": "MANAPPURAM.NS", "name": "Manappuram Finance Ltd"},
    {"symbol": "MCX.NS", "name": "Multi Commodity Exchange of India Ltd"},
    {"symbol": "METROPOLIS.NS", "name": "Metropolis Healthcare Ltd"},
    {"symbol": "MFSL.NS", "name": "Max Financial Services Ltd"},
    {"symbol": "MGL.NS", "name": "Mahanagar Gas Ltd"},
    {"symbol": "MOTHERSON.NS", "name": "Samvardhana Motherson International Ltd"},
    {"symbol": "MPHASIS.NS", "name": "Mphasis Ltd"},
    {"symbol": "MRF.NS", "name": "MRF Ltd"},
    {"symbol": "NAM-INDIA.NS", "name": "Nippon Life India Asset Management Ltd"},
    {"symbol": "NATIONALUM.NS", "name": "National Aluminium Company Ltd"},
    {"symbol": "NAVINFLUOR.NS", "name": "Navin Fluorine International Ltd"},
    {"symbol": "NESTLEIND.NS", "name": "Nestle India Ltd"},
    {"symbol": "NMDC.NS", "name": "NMDC Ltd"},
    {"symbol": "OFSS.NS", "name": "Oracle Financial Services Software Ltd"},
    {"symbol": "PAGEIND.NS", "name": "Page Industries Ltd"},
    {"symbol": "PEL.NS", "name": "Piramal Enterprises Ltd"},
    {"symbol": "PETRONET.NS", "name": "Petronet LNG Ltd"},
    {"symbol": "POLYCAB.NS", "name": "Polycab India Ltd"},
    {"symbol": "PVRINOX.NS", "name": "PVR INOX Ltd"},
    {"symbol": "RAMCOCEM.NS", "name": "The Ramco Cements Ltd"},
    {"symbol": "RBLBANK.NS", "name": "RBL Bank Ltd"},
    {"symbol": "RECLTD.NS", "name": "REC Ltd"},
    {"symbol": "SAIL.NS", "name": "Steel Authority of India Ltd"},
    {"symbol": "SBICARD.NS", "name": "SBI Cards and Payment Services Ltd"},
    {"symbol": "SRF.NS", "name": "SRF Ltd"},
    {"symbol": "SUNTV.NS", "name": "Sun TV Network Ltd"},
    {"symbol": "SYNGENE.NS", "name": "Syngene International Ltd"},
    {"symbol": "TATACHEM.NS", "name": "Tata Chemicals Ltd"},
    {"symbol": "TATACOMM.NS", "name": "Tata Communications Ltd"},
    {"symbol": "TATAPOWER.NS", "name": "Tata Power Company Ltd"},
    {"symbol": "TORNTPOWER.NS", "name": "Torrent Power Ltd"},
    {"symbol": "TVSMOTOR.NS", "name": "TVS Motor Company Ltd"},
    {"symbol": "UBL.NS", "name": "United Breweries Ltd"},
    {"symbol": "ULTRACEMCO.NS", "name": "UltraTech Cement Ltd"},
    {"symbol": "VOLTAS.NS", "name": "Voltas Ltd"},
    {"symbol": "WHIRLPOOL.NS", "name": "Whirlpool of India Ltd"},
    {"symbol": "ZEEL.NS", "name": "Zee Entertainment Enterprises Ltd"}
]

ALL_NSE_STOCKS = []

def load_nse_stocks():
    """Load NSE stocks with a robust fallback mechanism"""
    global ALL_NSE_STOCKS
    if ALL_NSE_STOCKS:
        return ALL_NSE_STOCKS

    print("📥 Loading NSE stock list...")
    
    # 1. Try fetching from NSE website
    try:
        url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()

        df = pd.read_csv(StringIO(response.text))
        df.columns = [col.strip() for col in df.columns]

        if 'SERIES' in df.columns:
            df = df[df['SERIES'] == 'EQ']

        ALL_NSE_STOCKS = [
            {"symbol": row['SYMBOL'] + ".NS", "name": row['NAME OF COMPANY'].title()}
            for _, row in df.iterrows()
        ]
        print(f"✅ Successfully loaded {len(ALL_NSE_STOCKS)} stocks from NSE website")

    except Exception as e:
        print(f"⚠️ Could not load from NSE website ({e}). Using fallback list.")
        ALL_NSE_STOCKS = FALLBACK_STOCKS
        print(f"✅ Loaded {len(ALL_NSE_STOCKS)} stocks from fallback list")

    # Ensure Jio Finance is present if not already
    if not any("JIOFINANCE.NS" == stock['symbol'] for stock in ALL_NSE_STOCKS):
        ALL_NSE_STOCKS.append({"symbol": "JIOFINANCE.NS", "name": "Jio Financial Services Ltd"})

    return ALL_NSE_STOCKS

# Initialize
load_nse_stocks()
database.init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/suggest')
def suggest():
    query = request.args.get('q', '').lower().strip()
    if len(query) < 2:
        return jsonify([])

    # Ensure stocks are loaded
    if not ALL_NSE_STOCKS:
        load_nse_stocks()

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
        if item['stock']['symbol'] not in seen:
            seen.add(item['stock']['symbol'])
            final.append(item['stock'])

    return jsonify(final[:15])

@app.route('/api/quote/<symbol>')
def quote(symbol):
    cache_key = f"quote:{symbol}"
    cached = get_cached_data(cache_key)
    if cached: return jsonify(cached)

    try:
        orig_symbol = symbol.upper()
        if not orig_symbol.endswith('.NS'):
            symbol = f"{orig_symbol}.NS"
        else:
            symbol = orig_symbol

        ticker = yf.Ticker(symbol)
        
        # Try to fetch fast info first to check connectivity
        try:
            fast_info = ticker.fast_info
            current_price = fast_info.last_price
        except:
            # If fast_info fails, likely blocked or invalid
            raise Exception("API Connection Failed")

        info = ticker.info
        hist = ticker.history(period="2d")

        if hist.empty:
            raise Exception("No price data")

        current_price = round(hist['Close'].iloc[-1], 2)
        prev_close = hist['Close'].iloc[-2] if len(hist) > 1 else current_price
        change_pct = ((current_price - prev_close) / prev_close) * 100
        volume = int(hist['Volume'].iloc[-1]) if 'Volume' in hist.columns and len(hist) > 0 else 0

        target_price = info.get("targetMeanPrice")
        pe_ratio = info.get("trailingPE")
        
        recommendation = "HOLD"
        reason = "Fairly valued"
        
        if target_price:
            target_price = round(target_price, 2)
            diff = ((current_price - target_price) / target_price) * 100
            if diff > 20: recommendation, reason = "SELL", "Overvalued (20%+ above target)"
            elif diff > 10: recommendation, reason = "SELL", "Overvalued (10-20% above target)"
            elif diff < -15: recommendation, reason = "BUY", "Undervalued (15%+ below target)"
        elif pe_ratio and pe_ratio > 50:
            recommendation, reason = "SELL", "Very high P/E ratio"

        result = {
            "symbol": symbol,
            "name": info.get("longName", symbol),
            "price": current_price,
            "change": f"{change_pct:+.2f}%",
            "volume": f"{volume:,}",
            "pe_ratio": round(pe_ratio, 2) if pe_ratio else "N/A",
            "eps": round(info.get("epsTrailingTwelveMonths", 0), 2) if info.get("epsTrailingTwelveMonths") else "N/A",
            "target_price": target_price if target_price else "N/A",
            "recommendation": recommendation,
            "reason": reason,
            "dividend_yield": f"{info.get('dividendYield', 0) * 100:.2f}%" if info.get('dividendYield') else "N/A",
            "analyst_ratings": {
                "buy": info.get("buyCount", 0),
                "hold": info.get("holdCount", 0),
                "sell": info.get("sellCount", 0)
            },
            "last_updated": hist.index[-1].strftime("%Y-%m-%dT%H:%M:%S")
        }
        
        set_cached_data(cache_key, result)
        return jsonify(result)
    except Exception as e:
        print(f"⚠️ API Error for {symbol}: {e}. Using Mock Data.")
        mock_result = get_mock_quote(symbol)
        set_cached_data(cache_key, mock_result)
        return jsonify(mock_result)

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
    cached = get_cached_data('movers:gainers')
    if cached: return jsonify(cached)

    data = []
    # Try real data first
    try:
        for symbol in TOP_WATCHLIST[:10]: # Limit to 10 to save time
            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="2d")
                if len(hist) < 2: continue
                curr = hist['Close'].iloc[-1]
                prev = hist['Close'].iloc[-2]
                change = ((curr - prev) / prev) * 100
                if change > 0:
                    data.append({"symbol": symbol, "price": round(curr, 2), "change": round(change, 2)})
            except: continue
    except: pass

    # If real data failed or is empty, use mock
    if not data:
        for symbol in TOP_WATCHLIST[:5]:
            mock = get_mock_quote(symbol)
            if float(mock['change'].strip('%')) > 0:
                data.append({"symbol": symbol, "price": mock['price'], "change": float(mock['change'].strip('%'))})
            else:
                # Force positive for gainers
                data.append({"symbol": symbol, "price": mock['price'], "change": abs(float(mock['change'].strip('%')))})

    data.sort(key=lambda x: x['change'], reverse=True)
    result = data[:5]
    set_cached_data('movers:gainers', result)
    return jsonify(result)

@app.route('/api/losers')
def losers():
    cached = get_cached_data('movers:losers')
    if cached: return jsonify(cached)

    data = []
    try:
        for symbol in TOP_WATCHLIST[:10]:
            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="2d")
                if len(hist) < 2: continue
                curr = hist['Close'].iloc[-1]
                prev = hist['Close'].iloc[-2]
                change = ((curr - prev) / prev) * 100
                if change < 0:
                    data.append({"symbol": symbol, "price": round(curr, 2), "change": round(change, 2)})
            except: continue
    except: pass

    if not data:
        for symbol in TOP_WATCHLIST[5:10]:
            mock = get_mock_quote(symbol)
            change_val = float(mock['change'].strip('%'))
            if change_val < 0:
                data.append({"symbol": symbol, "price": mock['price'], "change": change_val})
            else:
                # Force negative for losers
                data.append({"symbol": symbol, "price": mock['price'], "change": -abs(change_val)})

    data.sort(key=lambda x: x['change'])
    result = data[:5]
    set_cached_data('movers:losers', result)
    return jsonify(result)

@app.route('/api/portfolio', methods=['GET'])
def get_portfolio():
    portfolio = database.get_portfolio()
    results = []
    for item in portfolio:
        symbol = item['symbol']
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="2d")
            if not hist.empty:
                curr = round(hist['Close'].iloc[-1], 2)
                prev = hist['Close'].iloc[-2] if len(hist) > 1 else curr
                change = ((curr - prev) / prev) * 100
                results.append({"symbol": symbol, "name": item['name'], "price": curr, "change": round(change, 2)})
            else:
                results.append({"symbol": symbol, "name": item['name'], "price": "N/A", "change": "N/A"})
        except:
            results.append({"symbol": symbol, "name": item['name'], "price": "Error", "change": "Error"})
    return jsonify(results)

@app.route('/api/portfolio', methods=['POST'])
def add_to_portfolio():
    data = request.json
    if database.add_stock(data.get('symbol'), data.get('name')):
        return jsonify({"message": "Added"}), 201
    return jsonify({"message": "Exists"}), 400

    results.sort(key=lambda x: x['score'], reverse=True)
    
    seen = set()
    final = []
    for item in results:
        if item['stock']['symbol'] not in seen:
            seen.add(item['stock']['symbol'])
            final.append(item['stock'])

    return jsonify(final[:15])

@app.route('/api/quote/<symbol>')
def quote(symbol):
    cache_key = f"quote:{symbol}"
    cached = get_cached_data(cache_key)
    if cached: return jsonify(cached)

    try:
        orig_symbol = symbol.upper()
        if not orig_symbol.endswith('.NS'):
            symbol = f"{orig_symbol}.NS"
        else:
            symbol = orig_symbol

        ticker = yf.Ticker(symbol)
        
        # Try to fetch fast info first to check connectivity
        try:
            fast_info = ticker.fast_info
            current_price = fast_info.last_price
        except:
            # If fast_info fails, likely blocked or invalid
            raise Exception("API Connection Failed")

        info = ticker.info
        hist = ticker.history(period="2d")

        if hist.empty:
            raise Exception("No price data")

        current_price = round(hist['Close'].iloc[-1], 2)
        prev_close = hist['Close'].iloc[-2] if len(hist) > 1 else current_price
        change_pct = ((current_price - prev_close) / prev_close) * 100
        volume = int(hist['Volume'].iloc[-1]) if 'Volume' in hist.columns and len(hist) > 0 else 0

        target_price = info.get("targetMeanPrice")
        pe_ratio = info.get("trailingPE")
        
        recommendation = "HOLD"
        reason = "Fairly valued"
        
        if target_price:
            target_price = round(target_price, 2)
            diff = ((current_price - target_price) / target_price) * 100
            if diff > 20: recommendation, reason = "SELL", "Overvalued (20%+ above target)"
            elif diff > 10: recommendation, reason = "SELL", "Overvalued (10-20% above target)"
            elif diff < -15: recommendation, reason = "BUY", "Undervalued (15%+ below target)"
        elif pe_ratio and pe_ratio > 50:
            recommendation, reason = "SELL", "Very high P/E ratio"

        result = {
            "symbol": symbol,
            "name": info.get("longName", symbol),
            "price": current_price,
            "change": f"{change_pct:+.2f}%",
            "volume": f"{volume:,}",
            "pe_ratio": round(pe_ratio, 2) if pe_ratio else "N/A",
            "eps": round(info.get("epsTrailingTwelveMonths", 0), 2) if info.get("epsTrailingTwelveMonths") else "N/A",
            "target_price": target_price if target_price else "N/A",
            "recommendation": recommendation,
            "reason": reason,
            "dividend_yield": f"{info.get('dividendYield', 0) * 100:.2f}%" if info.get('dividendYield') else "N/A",
            "analyst_ratings": {
                "buy": info.get("buyCount", 0),
                "hold": info.get("holdCount", 0),
                "sell": info.get("sellCount", 0)
            },
            "last_updated": hist.index[-1].strftime("%Y-%m-%dT%H:%M:%S")
        }
        
        set_cached_data(cache_key, result)
        return jsonify(result)
    except Exception as e:
        print(f"⚠️ API Error for {symbol}: {e}. Using Mock Data.")
        mock_result = get_mock_quote(symbol)
        set_cached_data(cache_key, mock_result)
        return jsonify(mock_result)

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
    cached = get_cached_data('movers:gainers')
    if cached: return jsonify(cached)

    data = []
    # Try real data first
    try:
        for symbol in TOP_WATCHLIST[:10]: # Limit to 10 to save time
            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="2d")
                if len(hist) < 2: continue
                curr = hist['Close'].iloc[-1]
                prev = hist['Close'].iloc[-2]
                change = ((curr - prev) / prev) * 100
                if change > 0:
                    data.append({"symbol": symbol, "price": round(curr, 2), "change": round(change, 2)})
            except: continue
    except: pass

    # If real data failed or is empty, use mock
    if not data:
        for symbol in TOP_WATCHLIST[:5]:
            mock = get_mock_quote(symbol)
            if float(mock['change'].strip('%')) > 0:
                data.append({"symbol": symbol, "price": mock['price'], "change": float(mock['change'].strip('%'))})
            else:
                # Force positive for gainers
                data.append({"symbol": symbol, "price": mock['price'], "change": abs(float(mock['change'].strip('%')))})

    data.sort(key=lambda x: x['change'], reverse=True)
    result = data[:5]
    set_cached_data('movers:gainers', result)
    return jsonify(result)

@app.route('/api/losers')
def losers():
    cached = get_cached_data('movers:losers')
    if cached: return jsonify(cached)

    data = []
    try:
        for symbol in TOP_WATCHLIST[:10]:
            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="2d")
                if len(hist) < 2: continue
                curr = hist['Close'].iloc[-1]
                prev = hist['Close'].iloc[-2]
                change = ((curr - prev) / prev) * 100
                if change < 0:
                    data.append({"symbol": symbol, "price": round(curr, 2), "change": round(change, 2)})
            except: continue
    except: pass

    if not data:
        for symbol in TOP_WATCHLIST[5:10]:
            mock = get_mock_quote(symbol)
            change_val = float(mock['change'].strip('%'))
            if change_val < 0:
                data.append({"symbol": symbol, "price": mock['price'], "change": change_val})
            else:
                # Force negative for losers
                data.append({"symbol": symbol, "price": mock['price'], "change": -abs(change_val)})

    data.sort(key=lambda x: x['change'])
    result = data[:5]
    set_cached_data('movers:losers', result)
    return jsonify(result)

@app.route('/api/portfolio', methods=['GET'])
def get_portfolio():
    portfolio = database.get_portfolio()
    results = []
    for item in portfolio:
        symbol = item['symbol']
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="2d")
            if not hist.empty:
                curr = round(hist['Close'].iloc[-1], 2)
                prev = hist['Close'].iloc[-2] if len(hist) > 1 else curr
                change = ((curr - prev) / prev) * 100
                results.append({"symbol": symbol, "name": item['name'], "price": curr, "change": round(change, 2)})
            else:
                results.append({"symbol": symbol, "name": item['name'], "price": "N/A", "change": "N/A"})
        except:
            results.append({"symbol": symbol, "name": item['name'], "price": "Error", "change": "Error"})
    return jsonify(results)

@app.route('/api/portfolio', methods=['POST'])
def add_to_portfolio():
    data = request.json
    if database.add_stock(data.get('symbol'), data.get('name')):
        return jsonify({"message": "Added"}), 201
    return jsonify({"message": "Exists"}), 400

@app.route('/api/portfolio/<symbol>', methods=['DELETE'])
def remove_from_portfolio(symbol):
    database.remove_stock(symbol)
    return jsonify({"message": "Removed"}), 200

@app.route('/api/analyze', methods=['POST'])
def analyze_stock():
    if not GEMINI_API_KEY:
        return jsonify({"error": "AI service unavailable (Missing API Key)"}), 503

    data = request.json
    symbol = data.get('symbol')
    price = data.get('price')
    change = data.get('change')
    
    if not symbol:
        return jsonify({"error": "Symbol required"}), 400

    try:
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"""
        Analyze the stock {symbol} (Price: {price}, Change: {change}). 
        Provide a concise 3-bullet point summary covering:
        1. Recent market sentiment.
        2. Key risks or growth drivers.
        3. A short-term outlook (Bullish/Bearish/Neutral).
        Keep it under 100 words. Use professional financial tone.
        """
        
        response = model.generate_content(prompt)
        return jsonify({"analysis": response.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/health')
def health():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)