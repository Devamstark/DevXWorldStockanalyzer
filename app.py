# app.py - DevXWorld Stock Analyzer
# A smart stock search engine for Indian investors

from flask import Flask, render_template, jsonify, request
import yfinance as yf
import requests
import pandas as pd
from io import StringIO
import os
import database
import time

app = Flask(__name__)

# Simple in-memory cache
CACHE = {}
CACHE_EXPIRY = {
    'quote': 120,      # 2 minutes for quotes
    'movers': 1800     # 30 minutes for gainers/losers
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

# --- Stock Data Source ---

# Fallback list of top Indian stocks to ensure search ALWAYS works
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

@app.route('/api/health')
def health():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)