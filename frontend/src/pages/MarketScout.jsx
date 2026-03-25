import React, { useState, useEffect } from 'react';
import { Search, Calendar, ChevronRight, Loader2, Sparkles, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';

const steps = [
  "Step 1: 🔍 Searching web sources...",
  "Step 2: 🧠 Analyzing with AI...",
  "Step 3: ✅ Structuring insights..."
];

const MarketScout = () => {
  const [competitorEntity, setCompetitorEntity] = useState('');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [results, setResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    let timer1, timer2;
    if (status === 'loading') {
      setLoadingStep(0);
      timer1 = setTimeout(() => setLoadingStep(1), 3000);
      timer2 = setTimeout(() => setLoadingStep(2), 7000);
    }
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [status]);

  const executeScout = async (e) => {
    e.preventDefault();
    if (!competitorEntity) return;

    setStatus("loading");
    setResults(null);
    setErrorMsg('');
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch("http://localhost:8000/api/execute-scout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          company_name: competitorEntity,
          target_date: targetDate   // format: YYYY-MM-DD
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      // Error from backend if any (e.g. Gemini parsing failed but returned 200)
      if (data.error) {
        throw new Error(data.error + ": " + (data.detail || ""));
      }

      setResults(data);
      setStatus("success");
    } catch (err) {
      let msg = err.message;
      if (err.message === "Failed to fetch") {
        msg = "Cannot connect to backend. Make sure the FastAPI " +
              "server is running on port 8000. " +
              "Run: uvicorn main:app --reload in the backend folder.";
      }
      setErrorMsg(msg);
      setStatus("error");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === "Date unknown" || dateStr === "Recent" || dateStr === "None") return 'Recent';
    const date = new Date(dateStr);
    if (isNaN(date)) return 'Recent';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getSignificanceColor = (sig) => {
    if (sig === 'High') return 'bg-red-100 text-red-800 border-red-200';
    if (sig === 'Medium') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getAdoptionColor = (sig) => {
    if (sig === 'Early') return 'bg-blue-100 text-blue-800';
    if (sig === 'Growing') return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  const sortedUpdates = results?.updates ? [...results.updates].sort((a, b) => {
    const order = { 'High': 1, 'Medium': 2, 'Low': 3 };
    return (order[a.significance] || 4) - (order[b.significance] || 4);
  }) : [];

  const shouldShowBanner = (data) => {
    if (!data) return false;
    if (data.result_mode === "in_range") return false;
    if (data.result_mode === "no_results") return false;
    // Only show for genuine fallback
    return data.result_mode === "fallback_all" || 
           data.result_mode === "fallback_30";
  };

  const subtitle = (status === 'success' && results)
    ? `Showing results for ${results.company} \u00B7 ${formatDate(results.requested_from)} \u2013 ${formatDate(results.requested_to)}`
    : "AI-powered competitor intelligence";

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Competitor Intelligence</h2>
        <p className="text-slate-500 text-sm">
          {subtitle}
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <form onSubmit={executeScout} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-700 mb-2">Competitor Entity</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="e.g. Stripe, SpaceX..."
                value={competitorEntity}
                onChange={(e) => setCompetitorEntity(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
            </div>
          </div>
          
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-slate-700 mb-2">Target Date Boundary</label>
            <div className="relative">
              <input 
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={status === 'loading'}
            className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Execute Sequence'}
          </button>
        </form>
      </div>

      {/* Loading State */}
      {status === 'loading' && (
        <div className="bg-white rounded-xl p-8 border border-slate-200 text-center space-y-4 shadow-sm">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
          <h3 className="text-lg font-medium text-slate-800">Processing Data Pipeline</h3>
          <div className="text-slate-500 text-sm font-mono bg-slate-50 p-4 rounded-lg inline-block w-80 text-left">
            {steps.map((step, idx) => (
              <div key={idx} className={`flex items-center gap-2 py-1 ${idx <= loadingStep ? 'text-blue-700 font-semibold' : 'text-slate-400'}`}>
                {idx < loadingStep ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : 
                 (idx === loadingStep ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <div className="w-4 h-4" />)}
                {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <span className="font-semibold text-lg">Execution Failed</span>
          <span className="text-sm">{errorMsg}</span>
          <button onClick={(e) => executeScout(e)} className="mt-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-medium transition-colors">
            Retry Sequence
          </button>
        </div>
      )}

      {/* Success View */}
      {status === 'success' && results && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {results.result_mode === "no_results" ? (
             <div className="empty-state bg-slate-50 rounded-xl p-10 text-center border border-slate-200">
                <span className="empty-icon text-4xl block mb-4">🔍</span>
                <h3 className="text-xl font-medium text-slate-800 mb-2">No updates found for "{results.company}"</h3>
                <p className="text-slate-500 mb-4 max-w-lg mx-auto">
                  We couldn't find any recent news for this company across 
                  our search sources. This may be a smaller or private company 
                  with limited press coverage.
                </p>
                <p className="text-slate-600 text-sm">
                  Try searching for: <strong className="font-semibold text-slate-800">OpenAI, Anthropic, Stripe, 
                  Virtusa, Microsoft</strong>
                </p>
             </div>
          ) : (
            <>
              {shouldShowBanner(results) && (
                <div className="banner banner-warning">
                  <span className="text-lg">⚠️</span>
                  <div>
                    No updates found for <strong>{results.company}</strong> in the last 7 days. 
                    Showing most recent available updates.
                  </div>
                </div>
              )}
              {/* Executive Summary Card */}
              <div className="bg-gradient-to-br from-indigo-900 to-blue-900 text-white rounded-2xl p-8 shadow-lg">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-3xl font-bold mb-1">{results.company}</h3>
                    <p className="text-blue-200 text-sm">{results.period}</p>
                  </div>
                  <Sparkles className="w-8 h-8 text-blue-300" />
                </div>
                <span className="text-blue-300 text-sm font-bold tracking-widest uppercase mb-3 block">AI Strategic Insight</span>
                <p className="text-lg text-blue-50 leading-relaxed mb-6">
                  {results.executive_summary}
                </p>
                <div className="bg-white/10 p-5 rounded-xl border border-white/20 backdrop-blur-sm">
                  <span className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-2 block">Competitive Takeaway</span>
                  <p className="font-medium">{results.competitive_takeaway}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Updates Feed */}
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span> Latest Updates
                  </h4>
                  {sortedUpdates.map((update, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md border border-slate-200">
                          {update.category}
                        </span>
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${getSignificanceColor(update.significance)}`}>
                          {update.significance} Priority
                        </span>
                        <span className="px-2.5 py-1 text-slate-500 text-xs ml-auto">
                          {formatDate(update.published_date)}
                        </span>
                      </div>
                      <h4 className="text-xl font-bold text-slate-900 mb-3">{update.title}</h4>
                      <p className="text-slate-600 text-sm leading-relaxed mb-4">{update.summary}</p>
                      
                      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                        <span className="text-xs font-medium text-slate-500">Source: {update.source_name}</span>
                        <a href={update.source_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
                          View Source <ChevronRight className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Technical Trends */}
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" /> Technical Trends
                  </h4>
                  {results.technical_trends && results.technical_trends.map((trend, idx) => (
                    <div key={idx} className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-start mb-2">
                         <h5 className="font-bold text-slate-800">{trend.trend}</h5>
                      </div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2 ${getAdoptionColor(trend.adoption_signal)}`}>
                        {trend.adoption_signal} Signal
                      </span>
                      <p className="text-slate-600 text-sm">{trend.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MarketScout;
