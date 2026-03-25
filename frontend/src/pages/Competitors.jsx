import React, { useState, useEffect } from 'react';
import './Competitors.css';

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

const Competitors = () => {
  const [competitors, setCompetitors]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [searchTerm, setSearchTerm]       = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyHistory, setCompanyHistory]   = useState([]);
  const [historyLoading, setHistoryLoading]   = useState(false);
  const [activeTab, setActiveTab]         = useState("intelligence");

  const fetchCompetitors = async (search = "") => {
    setLoading(true);
    setError(null);
    try {
      const url = search
        ? `http://localhost:8000/api/competitors?search=${encodeURIComponent(search)}`
        : `http://localhost:8000/api/competitors`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCompetitors(data.competitors || []);
    } catch (err) {
      console.error("Competitors fetch failed:", err);
      setError("Failed to load competitors. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (company) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(
        `http://localhost:8000/api/competitors/${encodeURIComponent(company)}/history`
      );
      const data = await res.json();
      setCompanyHistory(data.history || []);
    } catch (err) {
      console.error("History fetch failed:", err);
      setCompanyHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => { fetchCompetitors(); }, []);

  const handleSelectCompany = (comp) => {
    setSelectedCompany(comp);
    setActiveTab("intelligence");
    fetchHistory(comp.company);
  };

  return (
    <div className="competitors-page animate-in fade-in duration-500">
      
      {/* Page header */}
      <div className="page-header">
        <h1>Tracked Entities</h1>
        <p>
          Live competitor intelligence — sourced from Supabase 
          scout_reports · {competitors.length} entities indexed
        </p>
      </div>

      {/* SECTION 1: Comparison Table */}
      {!loading && competitors.length > 0 && (
        <div className="table-wrapper">
          <table className="competitors-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Period</th>
                <th>Updates</th>
                <th>Trends</th>
                <th>Threat Level</th>
                <th>Last Scouted</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((comp, i) => {
                const threat = getThreatLevel(comp.updates);
                return (
                  <tr
                    key={i}
                    onClick={() => handleSelectCompany(comp)}
                    className={
                      selectedCompany?.company === comp.company
                      ? "row-active" : ""
                    }
                  >
                    <td>
                      <div className="company-cell">
                        <div className="avatar">
                          {comp.company?.charAt(0).toUpperCase()}
                        </div>
                        <strong>{comp.company}</strong>
                      </div>
                    </td>
                    <td style={{fontSize:"13px", color:"#6b7280"}}>
                      {comp.period || "—"}
                    </td>
                    <td>
                      <span className="badge-blue">
                        {comp.updates?.length || 0}
                      </span>
                    </td>
                    <td>
                      <span className="badge-green">
                        {comp.technical_trends?.length || 0}
                      </span>
                    </td>
                    <td>
                      <span className="threat-pill" style={{
                        color: threat.color,
                        background: threat.color + "18"
                      }}>
                        {threat.emoji} {threat.label}
                      </span>
                    </td>
                    <td style={{fontSize:"13px", color:"#9ca3af"}}>
                      {timeAgo(comp.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* SECTION 2+3: Split panel */}
      <div className="split-panel">

        {/* LEFT: Entity list */}
        <div className="left-panel">
          
          <input
            className="search-input"
            placeholder="🔍 Filter entities..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              fetchCompetitors(e.target.value);
            }}
          />

          {/* States */}
          {loading && (
            <div className="state-box">
              <p>⏳ Loading from Supabase...</p>
            </div>
          )}

          {error && (
            <div className="state-box error-box">
              <p>❌ {error}</p>
              <button onClick={() => fetchCompetitors()}>
                Retry
              </button>
            </div>
          )}

          {!loading && !error && competitors.length === 0 && (
            <div className="state-box empty-box">
              <p>📭 No entities indexed yet.</p>
              <p>Run Market Scout first to populate this page.</p>
              <a href="/scout">→ Go to Market Scout</a>
            </div>
          )}

          {!loading && competitors.map((comp, i) => {
            const threat = getThreatLevel(comp.updates);
            return (
              <div
                key={i}
                className={`entity-row ${
                  selectedCompany?.company === comp.company
                  ? "entity-row-active" : ""
                }`}
                onClick={() => handleSelectCompany(comp)}
              >
                <div className="avatar">
                  {comp.company?.charAt(0).toUpperCase()}
                </div>
                <div className="entity-row-info">
                  <div className="entity-row-top">
                    <strong>{comp.company}</strong>
                    <span className="threat-pill small" style={{
                      color: threat.color,
                      background: threat.color + "18"
                    }}>
                      {threat.emoji} {threat.label}
                    </span>
                  </div>
                  <p className="entity-period">{comp.period}</p>
                  <p className="entity-preview">
                    {comp.executive_summary?.slice(0, 80)}...
                  </p>
                </div>
                <span className="badge-blue" 
                      style={{alignSelf:"flex-start", flexShrink:0}}>
                  {comp.updates?.length || 0}
                </span>
              </div>
            );
          })}
        </div>

        {/* RIGHT: Detail panel */}
        <div className="right-panel">
          {!selectedCompany ? (
            <div className="no-selection">
              <div style={{fontSize:"48px"}}>🏢</div>
              <h3>Select an entity</h3>
              <p>Click any company to view stored intercepts, 
                 technical trends, and scout history.</p>
            </div>
          ) : (
            <div>
              {/* Tabs */}
              <div className="tab-bar">
                {[
                  {key:"intelligence", label:"🧠 Intelligence"},
                  {key:"trends",       label:"📈 Trends"},
                  {key:"history",      label:"🕐 History"}
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`tab-btn ${
                      activeTab === tab.key ? "tab-active" : ""
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB: Intelligence */}
              {activeTab === "intelligence" && (
                <div>
                  <div className="summary-card">
                    <h2>{selectedCompany.company}</h2>
                    <p style={{opacity:0.7, marginBottom:"12px",
                               fontSize:"14px"}}>
                      {selectedCompany.period}
                    </p>
                    <p style={{lineHeight:"1.7", fontSize:"15px"}}>
                      {selectedCompany.executive_summary}
                    </p>
                    <div className="takeaway-box">
                      <span className="takeaway-label">
                        COMPETITIVE TAKEAWAY
                      </span>
                      <p style={{fontWeight:"600", lineHeight:"1.6"}}>
                        {selectedCompany.competitive_takeaway}
                      </p>
                    </div>
                  </div>

                  <div className="section-title">
                    Intelligence Feed
                    <span className="badge-blue" 
                          style={{marginLeft:"8px"}}>
                      {selectedCompany.updates?.length || 0} intercepts
                    </span>
                  </div>

                  {[...(selectedCompany.updates || [])]
                    .sort((a,b) => {
                      const o = {High:0, Medium:1, Low:2};
                      return (o[a.significance]||2) - 
                             (o[b.significance]||2);
                    })
                    .map((u, i) => (
                      <div key={i} className="update-card">
                        <div className="update-meta">
                          <span className="badge-cat">
                            {u.category}
                          </span>
                          <span className={`badge-sig sig-${u.significance?.toLowerCase()}`}>
                            {u.significance} Priority
                          </span>
                          <span className="update-date">
                            {u.published_date}
                          </span>
                        </div>
                        <h4 className="update-title">{u.title}</h4>
                        <p className="update-summary">{u.summary}</p>
                        {u.source_url && (
                          <a
                            href={u.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="source-link"
                          >
                            View Intelligence Source →
                          </a>
                        )}
                      </div>
                    ))
                  }
                </div>
              )}

              {/* TAB: Trends */}
              {activeTab === "trends" && (
                <div>
                  <div className="section-title">
                    Technical Evolution
                  </div>
                  {(selectedCompany.technical_trends||[]).length===0?(
                    <p style={{color:"#9ca3af"}}>
                      No trends recorded for this company.
                    </p>
                  ) : (
                    (selectedCompany.technical_trends||[]).map((t,i)=>(
                      <div key={i} className="trend-card">
                        <div className="trend-header">
                          <h4>{t.trend}</h4>
                          <span className={`adoption-badge adopt-${t.adoption_signal?.toLowerCase()}`}>
                            {t.adoption_signal} Signal
                          </span>
                        </div>
                        <p style={{color:"#374151", lineHeight:"1.7",
                                   fontSize:"14px"}}>
                          {t.description}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB: History */}
              {activeTab === "history" && (
                <div>
                  <div className="section-title">
                    All Scout Runs — {selectedCompany.company}
                  </div>
                  <p style={{color:"#6b7280", fontSize:"13px",
                             marginBottom:"16px"}}>
                    Every time this company was searched via 
                    Market Scout — persisted in Supabase.
                  </p>
                  {historyLoading ? (
                    <p>⏳ Loading history from Supabase...</p>
                  ) : companyHistory.length === 0 ? (
                    <p style={{color:"#9ca3af"}}>
                      No history found.
                    </p>
                  ) : (
                    companyHistory.map((h, i) => {
                      const t = getThreatLevel(h.updates);
                      return (
                        <div key={i} className="history-row">
                          <div>
                            <span style={{fontWeight:"600",
                                         fontSize:"14px"}}>
                              {h.period || 
                               `${h.requested_from} – ${h.requested_to}`}
                            </span>
                            <div style={{display:"flex", gap:"6px",
                                        marginTop:"4px"}}>
                              <span className="badge-blue">
                                {h.updates?.length||0} updates
                              </span>
                              <span className="threat-pill small"
                                style={{
                                  color:t.color,
                                  background:t.color+"18"
                                }}>
                                {t.emoji} {t.label}
                              </span>
                            </div>
                          </div>
                          <span style={{color:"#9ca3af",
                                       fontSize:"13px"}}>
                            {timeAgo(h.created_at)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Competitors;
