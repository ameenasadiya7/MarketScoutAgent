import React, { useState, useEffect } from 'react';
import './History.css';

const getThreatLevel = (updates = []) => {
  if (!updates || updates.length === 0)
    return { label:"UNKNOWN", emoji:"⚪", color:"#9ca3af" };
  const hasHigh = updates.some(u => u.significance === "High");
  const hasMed  = updates.some(u => u.significance === "Medium");
  if (hasHigh) 
    return { label:"HIGH",   emoji:"🔴", color:"#dc2626" };
  if (hasMed)  
    return { label:"MEDIUM", emoji:"🟡", color:"#d97706" };
  return       { label:"LOW",    emoji:"🟢", color:"#16a34a" };
};

const timeAgo = (dateStr) => {
  if (!dateStr) return "Unknown";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hrs < 1)  return "Just now";
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month:"short", day:"numeric", year:"numeric"
  });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
};

const History = () => {
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [expanded, setExpanded] = useState(null); 

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("http://localhost:8000/api/history");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err) {
      setError("Failed to load history. Is the backend running?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  return (
    <div className="history-page animate-in fade-in duration-500">

      {/* Header */}
      <div className="history-header">
        <div>
          <h1>🕐 Interaction Log</h1>
          <p>
            Every Market Scout execution — persisted in Supabase 
            scout_reports · {history.length} total runs
          </p>
        </div>
        <button 
          className="refresh-btn"
          onClick={fetchHistory}
          disabled={loading}
        >
          🔄 {loading ? "Loading..." : "Refresh Log"}
        </button>
      </div>

      {/* Stats bar */}
      {!loading && history.length > 0 && (
        <div className="stats-bar">
          <div className="stat-card">
            <span className="stat-number">{history.length}</span>
            <span className="stat-label">Total Searches</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {[...new Set(history.map(h => 
                h.company?.toLowerCase()
              ))].length}
            </span>
            <span className="stat-label">Unique Companies</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {history.filter(h => 
                h.result_mode === "in_range"
              ).length}
            </span>
            <span className="stat-label">Exact Range Hits</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {history.reduce((sum, h) => 
                sum + (h.updates?.length || 0), 0
              )}
            </span>
            <span className="stat-label">Total Updates Found</span>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="log-empty">
          <p>⏳ Loading from Supabase...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="log-error">
          <p>❌ {error}</p>
          <button onClick={fetchHistory}>Retry</button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && history.length === 0 && (
        <div className="log-empty">
          <div style={{fontSize:"40px"}}>📭</div>
          <h3>No searches logged yet</h3>
          <p>Run a Market Scout search to start tracking history.</p>
          <a href="/scout" className="go-scout-btn">
            → Go to Market Scout
          </a>
        </div>
      )}

      {/* Log table */}
      {!loading && history.length > 0 && (
        <div className="log-container">
          
          {/* Table header */}
          <div className="log-table-header">
            <span>#</span>
            <span>Company</span>
            <span>Period Searched</span>
            <span>Updates</span>
            <span>Trends</span>
            <span>Threat</span>
            <span>Mode</span>
            <span>Executed At</span>
            <span>Details</span>
          </div>

          {/* Log rows */}
          {history.map((entry, i) => {
            const threat    = getThreatLevel(entry.updates);
            const isOpen    = expanded === entry.id;

            return (
              <div key={entry.id || i} className="log-entry">
                
                {/* Main row */}
                <div className="log-row">
                  <span className="log-index">
                    {history.length - i}
                  </span>

                  <span className="log-company">
                    <div className="avatar-sm">
                      {entry.company?.charAt(0).toUpperCase()}
                    </div>
                    <strong>{entry.company}</strong>
                  </span>

                  <span className="log-period" 
                        style={{fontSize:"13px", color:"#6b7280"}}>
                    {entry.period || 
                     `${entry.requested_from} – ${entry.requested_to}`}
                  </span>

                  <span>
                    <span className="badge-blue">
                      {entry.updates?.length || 0}
                    </span>
                  </span>

                  <span>
                    <span className="badge-green">
                      {entry.technical_trends?.length || 0}
                    </span>
                  </span>

                  <span>
                    <span className="threat-pill" style={{
                      color: threat.color,
                      background: threat.color + "18",
                      fontSize:"11px", padding:"3px 8px",
                      borderRadius:"12px", fontWeight:"700"
                    }}>
                      {threat.emoji} {threat.label}
                    </span>
                  </span>

                  <span>
                    <span className={`mode-pill mode-${entry.result_mode}`}>
                      {entry.result_mode === "in_range" 
                        ? "✅ Exact" : "⚠️ Fallback"}
                    </span>
                  </span>

                  <span style={{fontSize:"12px", color:"#9ca3af"}}>
                    {formatDateTime(entry.created_at)}
                    <br/>
                    <span style={{fontSize:"11px"}}>
                      ({timeAgo(entry.created_at)})
                    </span>
                  </span>

                  <span>
                    <button
                      className="expand-btn"
                      onClick={() => 
                        setExpanded(isOpen ? null : entry.id)
                      }
                    >
                      {isOpen ? "▲ Hide" : "▼ View"}
                    </button>
                  </span>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="log-detail">
                    
                    {/* Executive summary */}
                    <div className="log-summary-card">
                      <h4>AI Strategic Insight</h4>
                      <p>{entry.executive_summary}</p>
                      <div className="log-takeaway">
                        <strong>COMPETITIVE TAKEAWAY</strong>
                        <p>{entry.competitive_takeaway}</p>
                      </div>
                    </div>

                    {/* Updates list */}
                    <div className="log-updates">
                      <h4>
                        Updates Found 
                        <span className="badge-blue" 
                              style={{marginLeft:"8px"}}>
                          {entry.updates?.length || 0}
                        </span>
                      </h4>
                      {(entry.updates || []).map((u, j) => (
                        <div key={j} className="log-update-row">
                          <span className={`badge-sig sig-${u.significance?.toLowerCase()}`}>
                            {u.significance}
                          </span>
                          <span className="badge-cat">
                            {u.category}
                          </span>
                          <span className="log-update-title">
                            {u.title}
                          </span>
                          <span className="log-update-date">
                            {u.published_date}
                          </span>
                          {u.source_url && (
                            <a
                              href={u.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="source-link"
                            >
                              Source →
                            </a>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Technical trends */}
                    {(entry.technical_trends||[]).length > 0 && (
                      <div className="log-trends">
                        <h4>Technical Trends</h4>
                        {entry.technical_trends.map((t, j) => (
                          <div key={j} className="log-trend-row">
                            <span className={`adoption-badge adopt-${t.adoption_signal?.toLowerCase()}`}>
                              {t.adoption_signal}
                            </span>
                            <strong>{t.trend}</strong>
                            <span style={{color:"#6b7280",
                                         fontSize:"13px"}}>
                              — {t.description?.slice(0,100)}...
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default History;
