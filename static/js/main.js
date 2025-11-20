// All dependencies (React, ReactDOM, Firebase V8, Recharts) are now loaded via script tags in index.html, 
// making them available as global variables.

// --- Global Aliases ---
const useState = React.useState;
const useEffect = React.useEffect;
const createElement = React.createElement;
const createRoot = ReactDOM.createRoot;

// --- FIREBASE SETUP: Check for global __firebase_config first ---
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');

// Initialize Firebase only if the config object is valid (prevents crash if config is empty)
let auth = null;
let db = null;
let app = null;

try {
    // CRITICAL FIX: Check if the global firebase object exists and config is non-empty
    if (typeof firebase !== 'undefined' && Object.keys(firebaseConfig).length > 0) {
        app = firebase.initializeApp(firebaseConfig); 
        auth = app.auth(); 
        db = app.firestore();
    } else {
        throw new Error("Firebase config or global object missing.");
    }
} catch (e) {
    console.error("Firebase initialization failed. Using Mock Data/Auth:", e);
    // MOCK FALLBACK for when the canvas environment fails to provide keys or Firebase loads improperly
    auth = { 
        onAuthStateChanged: (cb) => { console.log('Mock Auth: Signing in anonymous...'); cb({ uid: 'mock-user-id' }); return () => {}; }, 
        signInWithCustomToken: async (token) => ({ user: { uid: 'mock-user-id' } }),
        signInAnonymously: async () => ({ user: { uid: 'mock-user-id' } })
    };
    db = { 
        collection: (path) => ({ 
            doc: (id) => ({ 
                collection: (subpath) => ({ 
                    onSnapshot: (cb) => { cb({ docs: [] }); return () => {}; }, 
                    add: async (data) => ({ id: crypto.randomUUID() }),
                }),
                delete: async () => {},
                set: async () => {}
            })
        }),
        firestore: { FieldValue: { serverTimestamp: () => new Date() } }
    };
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'devx-stock-analyzer';

// --- ICON FALLBACK (Simplified to use EMOJI/Unicode for maximum compatibility) ---
// This prevents crashes from complex icon libraries.
const Icon = ({ name, className = "", size = 18 }) => {
    const iconMap = {
        LayoutDashboard: '🏠', Search: '🔍', PieChart: '💼', TrendingUp: '↗️', TrendingDown: '↘️',
        Activity: '⚡', Zap: '💡', Plus: '➕', Trash2: '🗑️', Menu: '☰', X: '✕',
        Calculator: '🧮', BrainCircuit: '🧠', DollarSign: '₹', Briefcase: '📁', CheckCircle: '✅', AlertCircle: '⚠️'
    };
    return createElement('span', { className: `${className} text-xl leading-none inline-block align-middle` }, iconMap[name] || '?');
};

const LayoutDashboard = (props) => createElement(Icon, { name: 'LayoutDashboard', ...props });
const Search = (props) => createElement(Icon, { name: 'Search', ...props });
const PieChart = (props) => createElement(Icon, { name: 'PieChart', ...props });
const TrendingUp = (props) => createElement(Icon, { name: 'TrendingUp', ...props });
const TrendingDown = (props) => createElement(Icon, { name: 'TrendingDown', ...props });
const Activity = (props) => createElement(Icon, { name: 'Activity', ...props });
const Zap = (props) => createElement(Icon, { name: 'Zap', ...props });
const Plus = (props) => createElement(Icon, { name: 'Plus', ...props });
const Trash2 = (props) => createElement(Icon, { name: 'Trash2', ...props });
const Menu = (props) => createElement(Icon, { name: 'Menu', ...props });
const X = (props) => createElement(Icon, { name: 'X', ...props });
const Calculator = (props) => createElement(Icon, { name: 'Calculator', ...props });
const BrainCircuit = (props) => createElement(Icon, { name: 'BrainCircuit', ...props });
const DollarSign = (props) => createElement(Icon, { name: 'DollarSign', ...props });
const Briefcase = (props) => createElement(Icon, { name: 'Briefcase', ...props });
const CheckCircle = (props) => createElement(Icon, { name: 'CheckCircle', ...props });
const AlertCircle = (props) => createElement(Icon, { name: 'AlertCircle', ...props });


// --- DEPENDENCY HOOKS (Recharts) ---
const ResponsiveContainer = Recharts.ResponsiveContainer;
const AreaChart = Recharts.AreaChart;
const Area = Recharts.Area;
const XAxis = Recharts.XAxis;
const YAxis = Recharts.YAxis;
const CartesianGrid = Recharts.CartesianGrid;
const Tooltip = Recharts.Tooltip;

// --- MOCK DATA ENGINE (Simulates your stock API) ---
const INDIAN_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy', price: 2450.50, change: 1.2 },
  { symbol: 'TCS', name: 'Tata Consultancy Svc', sector: 'IT', price: 3500.00, change: -0.5 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Finance', price: 1650.20, change: 0.8 },
  { symbol: 'INFY', name: 'Infosys', sector: 'IT', price: 1420.10, change: -1.2 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Finance', price: 950.00, change: 1.5 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', sector: 'Auto', price: 620.40, change: 2.1 },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Finance', price: 580.30, change: 0.3 },
  { symbol: 'ITC', name: 'ITC Limited', sector: 'FMCG', price: 450.00, change: -0.1 },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance', sector: 'Finance', price: 7200.00, change: 1.8 },
  { symbol: 'ADANIENT', name: 'Adani Enterprises', sector: 'Conglomerate', price: 2400.00, change: -2.5 },
  { symbol: 'WIPRO', name: 'Wipro Limited', sector: 'IT', price: 405.10, change: -0.8 },
  { symbol: 'ASIANPAINT', name: 'Asian Paints', sector: 'Materials', price: 3200.00, change: 0.4 },
  { symbol: 'MARUTI', name: 'Maruti Suzuki', sector: 'Auto', price: 9800.50, change: 1.1 },
  { symbol: 'TITAN', name: 'Titan Company', sector: 'Consumer', price: 2950.00, change: 0.6 },
  { symbol: 'AXISBANK', name: 'Axis Bank', sector: 'Finance', price: 980.00, change: -0.2 },
];

const generateChartData = (basePrice) => {
  const data = [];
  let currentPrice = basePrice * 0.9;
  for (let i = 0; i < 30; i++) {
    currentPrice = currentPrice * (1 + (Math.random() * 0.04 - 0.02));
    data.push({
      day: `Day ${i + 1}`,
      price: parseFloat(currentPrice.toFixed(2))
    });
  }
  return data;
};

// --- COMPONENTS ---

const Card = ({ children, className = "" }) => (
  createElement('div', { className: `bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6 shadow-xl ${className}` }, children)
);

const Badge = ({ children, type = 'neutral' }) => {
  const styles = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    neutral: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
  };
  return (
    createElement('span', { className: `px-3 py-1 rounded-full text-xs font-medium border ${styles[type]}` }, children)
  );
};

const MetricBox = ({ label, value, subtext, icon: IconComponent }) => (
  createElement('div', { className: "bg-gray-800/40 rounded-lg p-4 border border-gray-700/50 hover:border-blue-500/30 transition-colors" },
    createElement('div', { className: "flex items-start justify-between mb-2" },
      createElement('span', { className: "text-gray-400 text-sm" }, label),
      IconComponent && createElement(IconComponent, { size: 16, className: "text-blue-400" })
    ),
    createElement('div', { className: "text-xl font-bold text-white" }, value),
    subtext && createElement('div', { className: "text-xs text-gray-500 mt-1" }, subtext)
  )
);

// Notification Toast - Used for successful adds/removals
const Toast = ({ message, type, onClose }) => (
  createElement('div', { className: `fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border z-50 animate-bounce-in ${
    type === 'success' ? 'bg-emerald-900/90 border-emerald-500 text-emerald-100' : 'bg-rose-900/90 border-rose-500 text-rose-100'
  }` },
    type === 'success' ? createElement(CheckCircle, { size: 18 }) : createElement(AlertCircle, { size: 18 }),
    createElement('span', { className: "font-medium text-sm" }, message),
    createElement('button', { onClick: onClose, className: "ml-2 opacity-60 hover:opacity-100" }, createElement(X, { size: 14 }))
  )
);

// Modal Component for Quick Add (The fix for your issue)
const AddStockModal = ({ isOpen, onClose, onAdd }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStocks, setFilteredStocks] = useState([]);

  useEffect(() => {
    if (searchTerm.length > 1) {
      const matches = INDIAN_STOCKS.filter(s => 
        s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStocks(matches);
    } else {
      setFilteredStocks([]);
    }
  }, [searchTerm]);

  if (!isOpen) return null;

  return (
    createElement('div', { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" },
      createElement('div', { className: "bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in" },
        createElement('div', { className: "p-4 border-b border-gray-800 flex justify-between items-center" },
          createElement('h3', { className: "text-lg font-bold text-white" }, "Add Stock to Portfolio"),
          createElement('button', { onClick: onClose, className: "text-gray-400 hover:text-white" }, createElement(X, { size: 20 }))
        ),
        createElement('div', { className: "p-6" },
          createElement('div', { className: "relative mb-4" },
            createElement(Search, { className: "absolute left-3 top-3 text-gray-500", size: 18 }),
            createElement('input', {
              type: "text",
              placeholder: "Search stock (e.g., RELIANCE, TCS)",
              className: "w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white focus:border-blue-500 outline-none",
              value: searchTerm,
              onChange: (e) => setSearchTerm(e.target.value),
              autoFocus: true
            })
          ),
          
          createElement('div', { className: "max-h-60 overflow-y-auto space-y-2" },
            searchTerm.length > 0 && filteredStocks.length === 0 && (
               createElement('div', { className: "text-center py-4 text-gray-500" }, "No stocks found")
            ),
            filteredStocks.map(stock => (
              createElement('div', { key: stock.symbol, className: "flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700 transition-colors" },
                createElement('div', null,
                  createElement('div', { className: "font-bold text-white" }, stock.symbol),
                  createElement('div', { className: "text-xs text-gray-400" }, stock.name)
                ),
                createElement('button', { 
                  onClick: () => { onAdd(stock); setSearchTerm(''); },
                  className: "bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1"
                },
                  createElement(Plus, { size: 14 }), " Add"
                )
              )
            )),
            searchTerm.length === 0 && (
              createElement('div', { className: "text-center py-8 text-gray-600 text-sm" }, "Type to search for Indian stocks")
            )
          )
        )
      )
    )
  );
};

// --- MAIN APP ---

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuMenuOpen] = useState(false);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Auth Init: Signs in using the provided token or anonymously
  useEffect(() => {
    const initAuth = async () => {
      // Check if auth object is usable 
      if (auth && auth.signInWithCustomToken) { 
          const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
          if (token) {
            await auth.signInWithCustomToken(token); // V8 syntax
          } else {
            await auth.signInAnonymously(); // V8 syntax
          }
      }
    };
    initAuth();
    // Use the potentially mocked/real auth object for listeners
    if (auth && auth.onAuthStateChanged) {
        const unsubscribe = auth.onAuthStateChanged(setUser); // V8 syntax
        return () => unsubscribe();
    }
  }, []);

  // Portfolio Sync: Listen for real-time updates to the user's portfolio in Firestore
  useEffect(() => {
    if (!user || !db || !db.collection) return; // Guard against uninitialized DB/User
    const q = db.collection('artifacts').doc(appId).collection('users').doc(user.uid).collection('portfolio');
    
    const unsubscribe = q.onSnapshot( // V8 syntax
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPortfolio(items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      },
      (error) => console.error("Portfolio sync error:", error)
    );
    return () => unsubscribe(); 
  }, [user]);

  // Auto-hide toast notifications
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);


  // --- ACTIONS ---

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      const found = INDIAN_STOCKS.find(s => 
        s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (found) {
        setSelectedStock({
          ...found,
          chartData: generateChartData(found.price),
          metrics: {
            pe: (Math.random() * 20 + 15).toFixed(2),
            eps: (Math.random() * 50 + 10).toFixed(2),
            divYield: (Math.random() * 2).toFixed(2) + '%',
            volume: (Math.random() * 10 + 1).toFixed(2) + 'M'
          },
          aiAnalysis: generateAIAnalysis(found) // Keep existing mock analysis
        });
        setActiveTab('analyzer');
      } else {
        showToast("Stock not found. Try 'RELIANCE'", 'error');
      }
      setLoading(false);
    }, 800);
  };

  // Add stock to Firestore portfolio
  const addToPortfolio = async (stock) => {
    if (!user || !db || !db.collection) {
      showToast("Database not ready or user not logged in.", "error");
      return;
    }
    try {
      const exists = portfolio.find(p => p.symbol === stock.symbol);
      if (exists) {
        showToast(`${stock.symbol} is already in your portfolio`, 'error');
        return;
      }

      await db.collection('artifacts').doc(appId).collection('users').doc(user.uid).collection('portfolio').add({
        symbol: stock.symbol,
        name: stock.name,
        avgPrice: stock.price,
        quantity: 1, 
        currentPrice: stock.price,
        createdAt: firebase.firestore.FieldValue.serverTimestamp() // V8 syntax
      });
      showToast(`Successfully added ${stock.symbol}`);
      setIsAddModalOpen(false); 
    } catch (err) {
      console.error("Error adding stock", err);
      showToast("Failed to add stock", 'error');
    }
  };

  // Remove stock from Firestore portfolio
  const removeFromPortfolio = async (id, symbol) => {
    if (!user || !db || !db.collection) return;
    try {
      await db.collection('artifacts').doc(appId).collection('users').doc(user.uid).collection('portfolio').doc(id).delete(); // V8 syntax
      showToast(`Removed ${symbol}`);
    } catch (e) {
      showToast("Could not remove stock", 'error');
    }
  };

  const generateAIAnalysis = (stock) => {
    const sentiment = stock.change > 0 ? "Positive" : "Cautious";
    return `Based on technical indicators, ${stock.symbol} is showing ${sentiment.toLowerCase()} momentum. The RSI indicates it is ${stock.change > 1.5 ? 'overbought' : stock.change < -1.5 ? 'oversold' : 'stable'}. Sector performance in ${stock.sector} remains robust for the coming quarter.`;
  };

  // --- VIEWS ---

  const DashboardView = () => {
    const totalValue = portfolio.reduce((acc, item) => acc + (item.currentPrice * item.quantity), 0);
    const dayChange = portfolio.reduce((acc, item) => {
        const priceDifference = item.currentPrice - item.avgPrice;
        return acc + priceDifference * item.quantity;
    }, 0);
    
    const topGainers = INDIAN_STOCKS.filter(s => s.change > 0).slice(0, 3);
    const topLosers = INDIAN_STOCKS.filter(s => s.change < 0).slice(0, 3);

    return (
      createElement('div', { className: "space-y-6 animate-fade-in" },
        // Portfolio Summary Hero
        createElement('div', { className: "grid grid-cols-1 md:grid-cols-3 gap-6" },
          createElement('div', { className: "md:col-span-2" },
            createElement('div', { className: "relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 shadow-2xl" },
              createElement('div', { className: "relative z-10" },
                createElement('h3', { className: "text-blue-100 font-medium mb-1" }, "Total Portfolio Value"),
                createElement('div', { className: "flex items-baseline gap-3" },
                  createElement('h1', { className: "text-4xl font-bold text-white" }, "₹", totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })),
                  createElement('span', { className: `text-sm font-bold px-2 py-1 rounded-lg ${dayChange >= 0 ? 'bg-emerald-500/20 text-emerald-100' : 'bg-rose-500/20 text-rose-100'}` },
                    dayChange >= 0 ? '+' : '', dayChange.toFixed(2), " Today"
                  )
                ),
                createElement('div', { className: "mt-6 flex gap-3" },
                  createElement('button', { onClick: () => setActiveTab('portfolio'), className: "bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm transition-all" }, "View Holdings"),
                  createElement('button', { onClick: () => setIsAddModalOpen(true), className: "bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-medium shadow-lg hover:bg-blue-50 transition-all" }, "+ Add Stock")
                )
              ),
              createElement('div', { className: "absolute -right-10 -bottom-20 w-64 h-64 bg-blue-500/30 rounded-full blur-3xl" })
            )
          ),

          createElement('div', { className: "bg-gray-900/50 border border-gray-800 rounded-2xl p-6 flex flex-col justify-center" },
            createElement('h3', { className: "text-gray-400 font-medium mb-4 flex items-center gap-2" },
              createElement(Activity, { size: 16 }), " Market Pulse"
            ),
            createElement('div', { className: "space-y-4" },
              createElement('div', { className: "flex justify-between items-center" },
                createElement('span', { className: "text-gray-300" }, "NIFTY 50"),
                createElement('span', { className: "text-emerald-400 font-medium" }, "+0.45%")
              ),
              createElement('div', { className: "w-full bg-gray-800 h-2 rounded-full overflow-hidden" }, createElement('div', { className: "bg-emerald-500 w-[65%] h-full" })),
              createElement('div', { className: "flex justify-between items-center" },
                createElement('span', { className: "text-gray-300" }, "SENSEX"),
                createElement('span', { className: "text-emerald-400 font-medium" }, "+0.32%")
              ),
              createElement('div', { className: "w-full bg-gray-800 h-2 rounded-full overflow-hidden" }, createElement('div', { className: "bg-emerald-500 w-[58%] h-full" })),
              createElement('div', { className: "flex justify-between items-center" },
                createElement('span', { className: "text-gray-300" }, "BANK NIFTY"),
                createElement('span', { className: "text-rose-400 font-medium" }, "-0.12%")
              ),
              createElement('div', { className: "w-full bg-gray-800 h-2 rounded-full overflow-hidden" }, createElement('div', { className: "bg-rose-500 w-[45%] h-full" }))
            )
          )
        ),

        // Movers Section
        createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-6" },
          createElement(Card, null,
            createElement('div', { className: "flex items-center justify-between mb-4" },
              createElement('h3', { className: "text-lg font-semibold text-white flex items-center gap-2" },
                createElement(TrendingUp, { className: "text-emerald-500" }), " Top Gainers"
              )
            ),
            createElement('div', { className: "space-y-3" },
              topGainers.map(stock => (
                createElement('div', { 
                  key: stock.symbol, 
                  className: "flex items-center justify-between p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors cursor-pointer",
                  onClick: () => { setSelectedStock({...stock, chartData: generateChartData(stock.price), metrics: { pe: 20, eps: 50, divYield: '1%', volume: '1M' }, aiAnalysis: generateAIAnalysis(stock) }); setActiveTab('analyzer'); }
                },
                  createElement('div', null,
                    createElement('div', { className: "font-bold text-white" }, stock.symbol),
                    createElement('div', { className: "text-xs text-gray-500" }, stock.name)
                  ),
                  createElement('div', { className: "text-right" },
                    createElement('div', { className: "text-white" }, "₹", stock.price),
                    createElement('div', { className: "text-xs text-emerald-400" }, "+", stock.change, "%")
                  )
                )
              ))
            )
          ),

          createElement(Card, null,
            createElement('div', { className: "flex items-center justify-between mb-4" },
              createElement('h3', { className: "text-lg font-semibold text-white flex items-center gap-2" },
                createElement(TrendingDown, { className: "text-rose-500" }), " Top Losers"
              )
            ),
            createElement('div', { className: "space-y-3" },
              topLosers.map(stock => (
                createElement('div', { 
                  key: stock.symbol, 
                  className: "flex items-center justify-between p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors cursor-pointer",
                  onClick: () => { setSelectedStock({...stock, chartData: generateChartData(stock.price), metrics: { pe: 20, eps: 50, divYield: '1%', volume: '1M' }, aiAnalysis: generateAIAnalysis(stock) }); setActiveTab('analyzer'); }
                },
                  createElement('div', null,
                    createElement('div', { className: "font-bold text-white" }, stock.symbol),
                    createElement('div', { className: "text-xs text-gray-500" }, stock.name)
                  ),
                  createElement('div', { className: "text-right" },
                    createElement('div', { className: "text-white" }, "₹", stock.price),
                    createElement('div', { className: "text-xs text-rose-400" }, stock.change, "%")
                  )
                )
              ))
            )
          )
        )
      )
    );
  };

  const AnalyzerView = () => {
    const [calcGrowth, setCalcGrowth] = useState(10);
    const [calcEPS, setCalcEPS] = useState(selectedStock?.metrics?.eps || 50);
    const [fairValue, setFairValue] = useState(0);

    useEffect(() => {
      const val = parseFloat(calcEPS) * (8.5 + 2 * parseFloat(calcGrowth));
      setFairValue(val);
    }, [calcGrowth, calcEPS]);

    if (!selectedStock) return (
      createElement('div', { className: "flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-fade-in" },
        createElement('div', { className: "w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center" },
          createElement(Search, { size: 40, className: "text-blue-500" })
        ),
        createElement('div', null,
          createElement('h2', { className: "text-3xl font-bold text-white mb-2" }, "Search for a Stock"),
          createElement('p', { className: "text-gray-400 max-w-md mx-auto" }, "Enter a symbol (e.g., RELIANCE) or company name to get deep insights, AI analysis, and fair value estimates.")
        ),
        createElement('div', { className: "w-full max-w-md" },
          createElement('form', { onSubmit: handleSearch, className: "relative" },
            createElement(Search, { className: "absolute left-4 top-3.5 text-gray-500", size: 20 }),
            createElement('input', { 
              type: "text", 
              placeholder: "Search symbol...", 
              value: searchQuery,
              onChange: (e) => setSearchQuery(e.target.value),
              className: "w-full bg-gray-900 border border-gray-700 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            }),
            createElement('button', { type: "submit", className: "absolute right-2 top-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors" },
              loading ? '...' : 'Analyze'
            )
          )
        ),
        createElement('div', { className: "flex gap-2 text-sm text-gray-500" },
          createElement('span', null, "Trending:"),
          createElement('button', { onClick: () => { setSearchQuery("RELIANCE"); handleSearch({ preventDefault: () => {} }); }, className: "hover:text-blue-400 transition-colors" }, "RELIANCE"),
          createElement('button', { onClick: () => { setSearchQuery("TCS"); handleSearch({ preventDefault: () => {} }); }, className: "hover:text-blue-400 transition-colors" }, "TCS"),
          createElement('button', { onClick: () => { setSearchQuery("TATAMOTORS"); handleSearch({ preventDefault: () => {} }); }, className: "hover:text-blue-400 transition-colors" }, "TATAMOTORS")
        )
      )
    );

    return (
      createElement('div', { className: "space-y-6 animate-fade-in pb-20" },
        // Header
        createElement('div', { className: "flex flex-col md:flex-row justify-between items-start md:items-center gap-4" },
          createElement('div', null,
            createElement('div', { className: "flex items-center gap-3 mb-1" },
              createElement('h1', { className: "text-3xl font-bold text-white" }, selectedStock.symbol),
              createElement(Badge, { type: selectedStock.change > 0 ? 'success' : 'danger' }, selectedStock.change > 0 ? '+' : '', selectedStock.change, "%")
            ),
            createElement('h2', { className: "text-gray-400 text-lg" }, selectedStock.name, " | ", selectedStock.sector)
          ),
          createElement('div', { className: "flex items-center gap-4" },
            createElement('div', { className: "text-right" },
              createElement('div', { className: "text-3xl font-bold text-white" }, "₹", selectedStock.price.toLocaleString()),
              createElement('div', { className: "text-sm text-gray-500" }, "Current Price")
            ),
            createElement('button', { 
              onClick: () => addToPortfolio(selectedStock),
              className: "bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-2"
            },
              createElement(Plus, { size: 20 }), " ", createElement('span', { className: "hidden md:inline" }, "Add to Portfolio")
            )
          )
        ),

        // Chart (Recharts Placeholder)
        createElement(Card, { className: "h-[350px] p-4" },
          createElement(ResponsiveContainer, { width: "100%", height: "100%" },
            createElement(AreaChart, { data: selectedStock.chartData },
              createElement('defs', null,
                createElement('linearGradient', { id: "colorPrice", x1: "0", y1: "0", x2: "0", y2: "1" },
                  createElement('stop', { offset: "5%", stopColor: selectedStock.change > 0 ? "#10b981" : "#f43f5e", stopOpacity: 0.3}),
                  createElement('stop', { offset: "95%", stopColor: selectedStock.change > 0 ? "#10b981" : "#f43f5e", stopOpacity: 0})
                )
              ),
              createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "#374151", vertical: false }),
              createElement(XAxis, { dataKey: "day", hide: true }),
              createElement(YAxis, { domain: ['auto', 'auto'], orientation: "right", tick: {fill: '#9ca3af'}, axisLine: false, tickLine: false }),
              createElement(Tooltip, { 
                contentStyle: { backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' },
                itemStyle: { color: '#fff' }
              }),
              createElement(Area, { 
                type: "monotone", 
                dataKey: "price", 
                stroke: selectedStock.change > 0 ? "#10b981" : "#f43f5e", 
                strokeWidth: 3,
                fillOpacity: 1, 
                fill: "url(#colorPrice)" 
              })
            )
          )
        ),

        // Metrics Grid
        createElement('div', { className: "grid grid-cols-2 md:grid-cols-4 gap-4" },
          createElement(MetricBox, { label: "P/E Ratio", value: selectedStock.metrics.pe, icon: Calculator }),
          createElement(MetricBox, { label: "EPS (TTM)", value: `₹${selectedStock.metrics.eps}`, icon: DollarSign }),
          createElement(MetricBox, { label: "Div Yield", value: selectedStock.metrics.divYield, icon: PieChart }),
          createElement(MetricBox, { label: "Volume", value: selectedStock.metrics.volume, icon: Activity })
        ),

        // Analysis & Calculator
        createElement('div', { className: "grid grid-cols-1 lg:grid-cols-3 gap-6" },
          // AI Analysis (Now takes up 2/3rds space, no Gemini card)
          createElement('div', { className: "lg:col-span-2 space-y-6" },
            // Existing AI Analysis (Placeholder/Mock)
            createElement(Card, { className: "h-full" },
              createElement('div', { className: "flex items-center gap-2 mb-4" },
                createElement(BrainCircuit, { className: "text-purple-400" }),
                createElement('h3', { className: "text-xl font-bold text-white" }, "AI Technical Summary")
              ),
              createElement('div', { className: "bg-gray-800/50 p-4 rounded-lg border-l-4 border-purple-500" },
                createElement('p', { className: "text-gray-300 leading-relaxed" }, selectedStock.aiAnalysis)
              ),
              createElement('div', { className: "mt-6 pt-6 border-t border-gray-800" },
                createElement('h4', { className: "text-sm font-medium text-gray-400 mb-3" }, "ANALYST RATINGS"),
                createElement('div', { className: "flex items-center gap-1 h-4 rounded-full overflow-hidden" },
                  createElement('div', { className: "bg-emerald-500 w-[60%]", title: "Buy 60%" }),
                  createElement('div', { className: "bg-yellow-500 w-[30%]", title: "Hold 30%" }),
                  createElement('div', { className: "bg-rose-500 w-[10%]", title: "Sell 10%" })
                ),
                createElement('div', { className: "flex justify-between text-xs text-gray-500 mt-2" },
                  createElement('span', null, "Strong Buy"),
                  createElement('span', null, "Hold"),
                  createElement('span', null, "Sell")
                )
              )
            )
          ),

          // Fair Value Calculator
          createElement('div', null,
            createElement(Card, { className: "h-full bg-gradient-to-b from-gray-900 to-gray-900" },
              createElement('div', { className: "flex items-center gap-2 mb-4" },
                createElement(Calculator, { className: "text-blue-400" }),
                createElement('h3', { className: "text-xl font-bold text-white" }, "Fair Value")
              ),
              
              createElement('div', { className: "space-y-4" },
                createElement('div', null,
                  createElement('label', { className: "text-xs text-gray-400 uppercase font-bold" }, "Expected Growth (%)"),
                  createElement('input', { 
                    type: "number", 
                    value: calcGrowth,
                    onChange: (e) => setCalcGrowth(e.target.value),
                    className: "w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg mt-1 focus:border-blue-500 outline-none"
                  })
                ),
                createElement('div', null,
                  createElement('label', { className: "text-xs text-gray-400 uppercase font-bold" }, "EPS (₹)"),
                  createElement('input', { 
                    type: "number", 
                    value: calcEPS,
                    onChange: (e) => setCalcEPS(e.target.value),
                    className: "w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg mt-1 focus:border-blue-500 outline-none"
                  })
                ),
                
                createElement('div', { className: "mt-6 pt-6 border-t border-gray-800" },
                   createElement('div', { className: "text-center" },
                      createElement('div', { className: "text-sm text-gray-500 mb-1" }, "Intrinsic Value"),
                      createElement('div', { className: "text-3xl font-bold text-emerald-400" }, "₹", fairValue.toLocaleString(undefined, {maximumFractionDigits: 2})),
                      createElement('div', { className: "text-xs mt-2 text-gray-400" },
                        "Margin of Safety: ", createElement('span', { className: `${fairValue > selectedStock.price ? 'text-emerald-400' : 'text-rose-400'}` }, ((fairValue - selectedStock.price) / selectedStock.price * 100).toFixed(1), "%")
                      )
                   )
                )
              )
            )
          )
        )
      )
    );
  };

  const PortfolioView = () => (
    createElement('div', { className: "space-y-6 animate-fade-in" },
      createElement('div', { className: "flex justify-between items-end" },
         createElement('div', null,
           createElement('h1', { className: "text-3xl font-bold text-white" }, "My Portfolio"),
           createElement('p', { className: "text-gray-400 mt-1" }, "Manage your holdings and track performance.")
         ),
         createElement('button', { onClick: () => setIsAddModalOpen(true), className: "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-colors shadow-lg shadow-blue-600/20" },
           createElement(Plus, { size: 18 }), " Add Stock"
         )
      ),

      portfolio.length === 0 ? (
        createElement('div', { className: "flex flex-col items-center justify-center py-20 bg-gray-900/50 border border-gray-800 border-dashed rounded-2xl" },
          createElement(Briefcase, { size: 48, className: "text-gray-600 mb-4" }),
          createElement('h3', { className: "text-xl font-medium text-white" }, "Your portfolio is empty"),
          createElement('p', { className: "text-gray-500 mb-6" }, "Start adding stocks to track your wealth."),
          createElement('button', { onClick: () => setIsAddModalOpen(true), className: "text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium" },
            createElement(Plus, { size: 16 }), " Add your first stock"
          )
        )
      ) : (
        createElement('div', { className: "grid grid-cols-1 gap-4" },
          portfolio.map((stock) => (
            createElement('div', { key: stock.id, className: "bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between hover:border-gray-700 transition-all group" },
              createElement('div', { className: "flex items-center gap-4 w-full md:w-auto mb-4 md:mb-0" },
                createElement('div', { className: "w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 font-bold text-lg" }, stock.symbol[0]),
                createElement('div', null,
                  createElement('h3', { className: "font-bold text-white text-lg" }, stock.symbol),
                  createElement('div', { className: "text-sm text-gray-500" }, stock.name)
                )
              ),

              createElement('div', { className: "grid grid-cols-3 gap-8 w-full md:w-auto text-center md:text-left" },
                createElement('div', null,
                  createElement('div', { className: "text-xs text-gray-500 uppercase font-bold" }, "Qty"),
                  createElement('div', { className: "text-white font-medium" }, stock.quantity)
                ),
                createElement('div', null,
                  createElement('div', { className: "text-xs text-gray-500 uppercase font-bold" }, "Avg Price"),
                  createElement('div', { className: "text-white font-medium" }, "₹", stock.avgPrice)
                ),
                createElement('div', null,
                  createElement('div', { className: "text-xs text-gray-500 uppercase font-bold" }, "Value"),
                  createElement('div', { className: "text-emerald-400 font-medium" }, "₹", stock.currentPrice * stock.quantity)
                )
              ),

              createElement('div', { className: "flex gap-2 ml-0 md:ml-6 mt-4 md:mt-0 w-full md:w-auto" },
                createElement('button', { className: "p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" }, createElement(Activity, { size: 18 })),
                createElement('button', { 
                  onClick: () => removeFromPortfolio(stock.id, stock.symbol),
                  className: "p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                }, createElement(Trash2, { size: 18 }))
              )
            )
          ))
        )
      )
    )
  );

  // --- RENDER ---

  return (
    createElement('div', { className: "min-h-screen bg-black text-white font-sans selection:bg-blue-500/30" },
      
      // Components Overlays (Modal and Toast)
      createElement(AddStockModal, { isOpen: isAddModalOpen, onClose: () => setIsAddModalOpen(false), onAdd: addToPortfolio }),
      toast && createElement(Toast, { message: toast.message, type: toast.type, onClose: () => setToast(null) }),

      // Mobile Header
      createElement('div', { className: "md:hidden flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md sticky top-0 z-40" },
        createElement('div', { className: "flex items-center gap-2" },
          createElement('div', { className: "w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center font-bold text-white" }, "D"),
          createElement('span', { className: "font-bold text-lg tracking-tight" }, "DevXWorld")
        ),
        createElement('button', { onClick: () => setIsMobileMenuOpen(!isMobileMenuOpen), className: "text-gray-400 hover:text-white" },
          isMobileMenuOpen ? createElement(X, null) : createElement(Menu, null)
        )
      ),

      // Mobile Menu Overlay
      isMobileMenuOpen && (
        createElement('div', { className: "fixed inset-0 z-30 bg-gray-900/95 backdrop-blur-lg pt-20 px-6 md:hidden" },
          createElement('nav', { className: "flex flex-col gap-2" },
            createElement('button', { onClick: () => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }, className: `flex items-center gap-3 px-4 py-3 rounded-xl text-lg font-medium ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}` },
              createElement(LayoutDashboard, { size: 20 }), " Dashboard"
            ),
            createElement('button', { onClick: () => { setActiveTab('analyzer'); setIsMobileMenuOpen(false); }, className: `flex items-center gap-3 px-4 py-3 rounded-xl text-lg font-medium ${activeTab === 'analyzer' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}` },
              createElement(Search, { size: 20 }), " Stock Analyzer"
            ),
            createElement('button', { onClick: () => { setActiveTab('portfolio'); setIsMobileMenuOpen(false); }, className: `flex items-center gap-3 px-4 py-3 rounded-xl text-lg font-medium ${activeTab === 'portfolio' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}` },
              createElement(PieChart, { size: 20 }), " Portfolio"
            )
          )
        )
      ),

      createElement('div', { className: "flex h-screen overflow-hidden" },
        // Sidebar Desktop
        createElement('aside', { className: "hidden md:flex w-64 flex-col border-r border-gray-800 bg-gray-950/50 backdrop-blur-sm" },
          createElement('div', { className: "p-6 flex items-center gap-3" },
            createElement('div', { className: "w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center font-bold text-white" }, "D"),
            createElement('span', { className: "font-bold text-xl tracking-tight" }, "DevXWorld")
          ),
          
          createElement('nav', { className: "flex-1 px-4 py-4 space-y-2" },
            createElement('button', { onClick: () => setActiveTab('dashboard'), className: `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:bg-gray-900 hover:text-white'}` },
              createElement(LayoutDashboard, { size: 18 }), " Dashboard"
            ),
            createElement('button', { onClick: () => setActiveTab('analyzer'), className: `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'analyzer' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:bg-gray-900 hover:text-white'}` },
              createElement(Search, { size: 18 }), " Analyzer"
            ),
            createElement('button', { onClick: () => setActiveTab('portfolio'), className: `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'portfolio' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:bg-gray-900 hover:text-white'}` },
              createElement(PieChart, { size: 18 }), " Portfolio"
            )
          ),

          createElement('div', { className: "p-6" },
             createElement('div', { className: "bg-gray-900 rounded-xl p-4 border border-gray-800" },
               createElement('div', { className: "flex items-center gap-2 mb-2" },
                 createElement(Zap, { size: 16, className: "text-yellow-400" }),
                 createElement('span', { className: "text-xs font-bold text-gray-300 uppercase" }, "Pro Tip")
               ),
               createElement('p', { className: "text-xs text-gray-500 leading-relaxed" }, "Use the Fair Value calculator in the Analyzer tab to find undervalued stocks before buying.")
             )
          )
        ),

        // Main Content
        createElement('main', { className: "flex-1 overflow-y-auto relative" },
          // Header Background Glow
          createElement('div', { className: "absolute top-0 left-0 w-full h-64 bg-blue-900/10 blur-3xl -z-10" }),

          createElement('div', { className: "p-6 md:p-10 max-w-7xl mx-auto" },
            activeTab === 'dashboard' && createElement(DashboardView, null),
            activeTab === 'analyzer' && createElement(AnalyzerView, null),
            activeTab === 'portfolio' && createElement(PortfolioView, null)
          )
        )
      )
    );
  }

// --- Render the App ---
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('root');
    if (container) {
        createRoot(container).render(createElement(App, null));
    }
});
