import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Search, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  Plus, 
  Trash2, 
  Menu, 
  X, 
  Calculator, 
  BrainCircuit,
  DollarSign,
  Briefcase,
  ArrowRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';

// --- FIREBASE SETUP ---
// These variables are provided by the canvas environment
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'devx-stock-analyzer';

// --- MOCK DATA ENGINE ---
// This array simulates your backend providing a list of Indian stocks
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
  <div className={`bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6 shadow-xl ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, type = 'neutral' }) => {
  const styles = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    neutral: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[type]}`}>
      {children}
    </span>
  );
};

const MetricBox = ({ label, value, subtext, icon: Icon }) => (
  <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/50 hover:border-blue-500/30 transition-colors">
    <div className="flex items-start justify-between mb-2">
      <span className="text-gray-400 text-sm">{label}</span>
      {Icon && <Icon size={16} className="text-blue-400" />}
    </div>
    <div className="text-xl font-bold text-white">{value}</div>
    {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
  </div>
);

// Notification Toast - Used for successful adds/removals
const Toast = ({ message, type, onClose }) => (
  <div className={`fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border z-50 animate-bounce-in ${
    type === 'success' ? 'bg-emerald-900/90 border-emerald-500 text-emerald-100' : 'bg-rose-900/90 border-rose-500 text-rose-100'
  }`}>
    {type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
    <span className="font-medium text-sm">{message}</span>
    <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
  </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">Add Stock to Portfolio</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search stock (e.g., RELIANCE, TCS)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white focus:border-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto space-y-2">
            {searchTerm.length > 0 && filteredStocks.length === 0 && (
               <div className="text-center py-4 text-gray-500">No stocks found</div>
            )}
            {filteredStocks.map(stock => (
              <div key={stock.symbol} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700 transition-colors">
                <div>
                  <div className="font-bold text-white">{stock.symbol}</div>
                  <div className="text-xs text-gray-400">{stock.name}</div>
                </div>
                <button 
                  onClick={() => { onAdd(stock); setSearchTerm(''); }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            ))}
            {searchTerm.length === 0 && (
              <div className="text-center py-8 text-gray-600 text-sm">
                Type to search for Indian stocks
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // New UI State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Auth Init: Signs in using the provided token or anonymously
  useEffect(() => {
    const initAuth = async () => {
      // Authenticate with custom token if available, otherwise sign in anonymously
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    // Set up auth state observer
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Portfolio Sync: Listen for real-time updates to the user's portfolio in Firestore
  useEffect(() => {
    if (!user) return; // Wait for user to be authenticated
    const q = query(
      collection(db, 'artifacts', appId, 'users', user.uid, 'portfolio'),
      orderBy('createdAt', 'desc')
    );
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPortfolio(items);
      },
      (error) => console.error("Portfolio sync error:", error)
    );
    return () => unsubscribe(); // Cleanup listener on unmount
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
          // Mock Metrics
          metrics: {
            pe: (Math.random() * 20 + 15).toFixed(2),
            eps: (Math.random() * 50 + 10).toFixed(2),
            divYield: (Math.random() * 2).toFixed(2) + '%',
            volume: (Math.random() * 10 + 1).toFixed(2) + 'M'
          },
          aiAnalysis: generateAIAnalysis(found)
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
    if (!user) {
      showToast("Please wait for login...", "error");
      return;
    }
    try {
      // Check if already exists before adding
      const exists = portfolio.find(p => p.symbol === stock.symbol);
      if (exists) {
        showToast(`${stock.symbol} is already in your portfolio`, 'error');
        return;
      }

      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'portfolio'), {
        symbol: stock.symbol,
        name: stock.name,
        avgPrice: stock.price,
        quantity: 1, // Default quantity
        currentPrice: stock.price,
        createdAt: serverTimestamp()
      });
      showToast(`Successfully added ${stock.symbol}`);
      setIsAddModalOpen(false); // Close modal on successful add
    } catch (err) {
      console.error("Error adding stock", err);
      showToast("Failed to add stock", 'error');
    }
  };

  // Remove stock from Firestore portfolio
  const removeFromPortfolio = async (id, symbol) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'portfolio', id));
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
    const dayChange = portfolio.reduce((acc, item) => acc + (item.currentPrice - item.avgPrice) * item.quantity, 0);
    
    const topGainers = INDIAN_STOCKS.filter(s => s.change > 0).slice(0, 3);
    const topLosers = INDIAN_STOCKS.filter(s => s.change < 0).slice(0, 3);

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Portfolio Summary Hero */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
             <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 shadow-2xl">
                <div className="relative z-10">
                  <h3 className="text-blue-100 font-medium mb-1">Total Portfolio Value</h3>
                  <div className="flex items-baseline gap-3">
                    <h1 className="text-4xl font-bold text-white">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h1>
                    <span className={`text-sm font-bold px-2 py-1 rounded-lg ${dayChange >= 0 ? 'bg-emerald-500/20 text-emerald-100' : 'bg-rose-500/20 text-rose-100'}`}>
                      {dayChange >= 0 ? '+' : ''}{dayChange.toFixed(2)} Today
                    </span>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button onClick={() => setActiveTab('portfolio')} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm transition-all">
                      View Holdings
                    </button>
                    <button onClick={() => setIsAddModalOpen(true)} className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-medium shadow-lg hover:bg-blue-50 transition-all">
                      + Add Stock
                    </button>
                  </div>
                </div>
                {/* Decorative Circle */}
                <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-blue-500/30 rounded-full blur-3xl"></div>
             </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 flex flex-col justify-center">
            <h3 className="text-gray-400 font-medium mb-4 flex items-center gap-2">
              <Activity size={16} /> Market Pulse
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">NIFTY 50</span>
                <span className="text-emerald-400 font-medium">+0.45%</span>
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 w-[65%] h-full"></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">SENSEX</span>
                <span className="text-emerald-400 font-medium">+0.32%</span>
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 w-[58%] h-full"></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">BANK NIFTY</span>
                <span className="text-rose-400 font-medium">-0.12%</span>
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500 w-[45%] h-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Movers Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="text-emerald-500" /> Top Gainers
              </h3>
            </div>
            <div className="space-y-3">
              {topGainers.map(stock => (
                <div key={stock.symbol} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => { setSelectedStock({...stock, chartData: generateChartData(stock.price), metrics: { pe: 20, eps: 50, divYield: '1%', volume: '1M' }, aiAnalysis: generateAIAnalysis(stock) }); setActiveTab('analyzer'); }}>
                  <div>
                    <div className="font-bold text-white">{stock.symbol}</div>
                    <div className="text-xs text-gray-500">{stock.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white">₹{stock.price}</div>
                    <div className="text-xs text-emerald-400">+{stock.change}%</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingDown className="text-rose-500" /> Top Losers
              </h3>
            </div>
            <div className="space-y-3">
              {topLosers.map(stock => (
                <div key={stock.symbol} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => { setSelectedStock({...stock, chartData: generateChartData(stock.price), metrics: { pe: 20, eps: 50, divYield: '1%', volume: '1M' }, aiAnalysis: generateAIAnalysis(stock) }); setActiveTab('analyzer'); }}>
                  <div>
                    <div className="font-bold text-white">{stock.symbol}</div>
                    <div className="text-xs text-gray-500">{stock.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white">₹{stock.price}</div>
                    <div className="text-xs text-rose-400">{stock.change}%</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const AnalyzerView = () => {
    // Calculator State (for Fair Value)
    const [calcGrowth, setCalcGrowth] = useState(10);
    const [calcEPS, setCalcEPS] = useState(selectedStock?.metrics?.eps || 50);
    const [fairValue, setFairValue] = useState(0);

    useEffect(() => {
      // Simple Fair Value Logic: EPS * (8.5 + 2 * Growth)
      const val = parseFloat(calcEPS) * (8.5 + 2 * parseFloat(calcGrowth));
      setFairValue(val);
    }, [calcGrowth, calcEPS]);

    if (!selectedStock) return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-fade-in">
        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center">
          <Search size={40} className="text-blue-500" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Search for a Stock</h2>
          <p className="text-gray-400 max-w-md mx-auto">Enter a symbol (e.g., RELIANCE) or company name to get deep insights, AI analysis, and fair value estimates.</p>
        </div>
        <div className="w-full max-w-md">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-3.5 text-gray-500" size={20} />
            <input 
              type="text" 
              placeholder="Search symbol..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            <button type="submit" className="absolute right-2 top-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
              {loading ? '...' : 'Analyze'}
            </button>
          </form>
        </div>
        <div className="flex gap-2 text-sm text-gray-500">
          <span>Trending:</span>
          <button onClick={() => { setSearchQuery("RELIANCE"); handleSearch({ preventDefault: () => {} }); }} className="hover:text-blue-400 transition-colors">RELIANCE</button>
          <button onClick={() => { setSearchQuery("TCS"); handleSearch({ preventDefault: () => {} }); }} className="hover:text-blue-400 transition-colors">TCS</button>
          <button onClick={() => { setSearchQuery("TATAMOTORS"); handleSearch({ preventDefault: () => {} }); }} className="hover:text-blue-400 transition-colors">TATAMOTORS</button>
        </div>
      </div>
    );

    return (
      <div className="space-y-6 animate-fade-in pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-white">{selectedStock.symbol}</h1>
              <Badge type={selectedStock.change > 0 ? 'success' : 'danger'}>
                {selectedStock.change > 0 ? '+' : ''}{selectedStock.change}%
              </Badge>
            </div>
            <h2 className="text-gray-400 text-lg">{selectedStock.name} | {selectedStock.sector}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-3xl font-bold text-white">₹{selectedStock.price.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Current Price</div>
            </div>
            <button 
              onClick={() => addToPortfolio(selectedStock)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-2"
            >
              <Plus size={20} /> <span className="hidden md:inline">Add to Portfolio</span>
            </button>
          </div>
        </div>

        {/* Chart */}
        <Card className="h-[350px] p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={selectedStock.chartData}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={selectedStock.change > 0 ? "#10b981" : "#f43f5e"} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={selectedStock.change > 0 ? "#10b981" : "#f43f5e"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="day" hide />
              <YAxis domain={['auto', 'auto']} orientation="right" tick={{fill: '#9ca3af'}} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke={selectedStock.change > 0 ? "#10b981" : "#f43f5e"} 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorPrice)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricBox label="P/E Ratio" value={selectedStock.metrics.pe} icon={Calculator} />
          <MetricBox label="EPS (TTM)" value={`₹${selectedStock.metrics.eps}`} icon={DollarSign} />
          <MetricBox label="Div Yield" value={selectedStock.metrics.divYield} icon={PieChart} />
          <MetricBox label="Volume" value={selectedStock.metrics.volume} icon={Activity} />
        </div>

        {/* Analysis & Calculator */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Analysis */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <div className="flex items-center gap-2 mb-4">
                <BrainCircuit className="text-purple-400" />
                <h3 className="text-xl font-bold text-white">AI Analysis</h3>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg border-l-4 border-purple-500">
                <p className="text-gray-300 leading-relaxed">
                  {selectedStock.aiAnalysis}
                </p>
              </div>
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-400 mb-3">ANALYST RATINGS</h4>
                <div className="flex items-center gap-1 h-4 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 w-[60%]" title="Buy 60%"></div>
                  <div className="bg-yellow-500 w-[30%]" title="Hold 30%"></div>
                  <div className="bg-rose-500 w-[10%]" title="Sell 10%"></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Strong Buy</span>
                  <span>Hold</span>
                  <span>Sell</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Fair Value Calculator */}
          <div>
            <Card className="h-full bg-gradient-to-b from-gray-900 to-gray-900">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="text-blue-400" />
                <h3 className="text-xl font-bold text-white">Fair Value</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold">Expected Growth (%)</label>
                  <input 
                    type="number" 
                    value={calcGrowth}
                    onChange={(e) => setCalcGrowth(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg mt-1 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold">EPS (₹)</label>
                  <input 
                    type="number" 
                    value={calcEPS}
                    onChange={(e) => setCalcEPS(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg mt-1 focus:border-blue-500 outline-none"
                  />
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-800">
                   <div className="text-center">
                      <div className="text-sm text-gray-500 mb-1">Intrinsic Value</div>
                      <div className="text-3xl font-bold text-emerald-400">₹{fairValue.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                      <div className="text-xs mt-2 text-gray-400">
                        Margin of Safety: <span className={`${fairValue > selectedStock.price ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {((fairValue - selectedStock.price) / selectedStock.price * 100).toFixed(1)}%
                        </span>
                      </div>
                   </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const PortfolioView = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-end">
         <div>
           <h1 className="text-3xl font-bold text-white">My Portfolio</h1>
           <p className="text-gray-400 mt-1">Manage your holdings and track performance.</p>
         </div>
         {/* This button now opens the modal (AddStockModal) instead of redirecting */}
         <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-colors shadow-lg shadow-blue-600/20">
           <Plus size={18} /> Add Stock
         </button>
      </div>

      {portfolio.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-900/50 border border-gray-800 border-dashed rounded-2xl">
          <Briefcase size={48} className="text-gray-600 mb-4" />
          <h3 className="text-xl font-medium text-white">Your portfolio is empty</h3>
          <p className="text-gray-500 mb-6">Start adding stocks to track your wealth.</p>
          <button onClick={() => setIsAddModalOpen(true)} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium">
            <Plus size={16} /> Add your first stock
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {portfolio.map((stock) => (
            <div key={stock.id} className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between hover:border-gray-700 transition-all group">
              <div className="flex items-center gap-4 w-full md:w-auto mb-4 md:mb-0">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 font-bold text-lg">
                  {stock.symbol[0]}
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{stock.symbol}</h3>
                  <div className="text-sm text-gray-500">{stock.name}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-8 w-full md:w-auto text-center md:text-left">
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold">Qty</div>
                  <div className="text-white font-medium">{stock.quantity}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold">Avg Price</div>
                  <div className="text-white font-medium">₹{stock.avgPrice}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold">Value</div>
                  <div className="text-emerald-400 font-medium">₹{stock.currentPrice * stock.quantity}</div>
                </div>
              </div>

              <div className="flex gap-2 ml-0 md:ml-6 mt-4 md:mt-0 w-full md:w-auto">
                <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                   <Activity size={18} />
                </button>
                <button 
                  onClick={() => removeFromPortfolio(stock.id, stock.symbol)}
                  className="p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                   <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // --- RENDER ---

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      
      {/* Components Overlays (Modal and Toast) */}
      <AddStockModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={addToPortfolio} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center font-bold text-white">D</div>
          <span className="font-bold text-lg tracking-tight">DevXWorld</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-400 hover:text-white">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-gray-900/95 backdrop-blur-lg pt-20 px-6 md:hidden">
          <nav className="flex flex-col gap-2">
            <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-lg font-medium ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
              <LayoutDashboard size={20} /> Dashboard
            </button>
            <button onClick={() => { setActiveTab('analyzer'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-lg font-medium ${activeTab === 'analyzer' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
              <Search size={20} /> Stock Analyzer
            </button>
            <button onClick={() => { setActiveTab('portfolio'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-lg font-medium ${activeTab === 'portfolio' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
              <PieChart size={20} /> Portfolio
            </button>
          </nav>
        </div>
      )}

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar Desktop */}
        <aside className="hidden md:flex w-64 flex-col border-r border-gray-800 bg-gray-950/50 backdrop-blur-sm">
          <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/20">D</div>
            <span className="font-bold text-xl tracking-tight">DevXWorld</span>
          </div>
          
          <nav className="flex-1 px-4 py-4 space-y-2">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:bg-gray-900 hover:text-white'}`}>
              <LayoutDashboard size={18} /> Dashboard
            </button>
            <button onClick={() => setActiveTab('analyzer')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'analyzer' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:bg-gray-900 hover:text-white'}`}>
              <Search size={18} /> Analyzer
            </button>
            <button onClick={() => setActiveTab('portfolio')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'portfolio' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:bg-gray-900 hover:text-white'}`}>
              <PieChart size={18} /> Portfolio
            </button>
          </nav>

          <div className="p-6">
             <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
               <div className="flex items-center gap-2 mb-2">
                 <Zap size={16} className="text-yellow-400" />
                 <span className="text-xs font-bold text-gray-300 uppercase">Pro Tip</span>
               </div>
               <p className="text-xs text-gray-500 leading-relaxed">
                 Use the Fair Value calculator in the Analyzer tab to find undervalued stocks before buying.
               </p>
             </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative">
          {/* Header Background Glow */}
          <div className="absolute top-0 left-0 w-full h-64 bg-blue-900/10 blur-3xl -z-10"></div>

          <div className="p-6 md:p-10 max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'analyzer' && <AnalyzerView />}
            {activeTab === 'portfolio' && <PortfolioView />}
          </div>
        </main>
      </div>
    </div>
  );
}
