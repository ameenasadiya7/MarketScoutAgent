import { useState, useEffect } from "react";

export default function Notifications() {
  const [alerts,  setAlerts]  = useState([]);
  const [counts,  setCounts]  = useState(
    {critical:0, warning:0, info:0, total:0}
  );
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filter,  setFilter]  = useState("all");

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(
        "http://localhost:8000/api/notifications"
      );
      const data = await res.json();
      const list = Array.isArray(data.alerts) 
                   ? data.alerts : [];
      setAlerts(list);
      setCounts({
        critical: data.critical || 0,
        warning:  data.warning  || 0,
        info:     data.info     || 0,
        total:    data.total    || list.length
      });
    } catch (e) {
      setError("Cannot connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const timeAgo = (d) => {
    if (!d) return "";
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff/3600000);
    const dy = Math.floor(diff/86400000);
    if (h < 1)  return "Just now";
    if (h < 24) return `${h}h ago`;
    return `${dy}d ago`;
  };

  const displayed = filter === "all"
    ? alerts
    : alerts.filter(a => a.severity === filter);

  const sevColor = {
    critical:"#dc2626", warning:"#d97706", info:"#2563eb"
  };
  const sevBg = {
    critical:"#fee2e2", warning:"#fef9c3", info:"#dbeafe"
  };

  return (
    <div style={{padding:"32px", maxWidth:"900px"}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",
                   alignItems:"flex-start",marginBottom:"24px"}}>
        <div>
          <h1 style={{fontSize:"26px",fontWeight:"700",
                      display:"flex",alignItems:"center",
                      gap:"10px"}}>
            🔔 Alert Center
          </h1>
          <p style={{color:"#6b7280",fontSize:"14px",
                     marginTop:"4px"}}>
            Automated intelligence alerts from Supabase 
            scout_reports · {counts.total} total alerts
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          style={{padding:"8px 16px",border:"1px solid #e5e7eb",
                  borderRadius:"8px",background:"white",
                  cursor:"pointer",fontSize:"14px",
                  fontWeight:"500"}}>
          🔄 Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{textAlign:"center",padding:"60px",
                     background:"white",borderRadius:"12px",
                     color:"#6b7280"}}>
          ⏳ Loading alerts from Supabase...
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{textAlign:"center",padding:"32px",
                     background:"#fee2e2",borderRadius:"12px",
                     color:"#dc2626"}}>
          <p>❌ {error}</p>
          <button onClick={fetchAlerts}
            style={{marginTop:"12px",padding:"8px 16px",
                    background:"#dc2626",color:"white",
                    border:"none",borderRadius:"8px",
                    cursor:"pointer"}}>
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && alerts.length === 0 && (
        <div style={{textAlign:"center",padding:"60px",
                     background:"white",borderRadius:"12px",
                     color:"#6b7280"}}>
          <div style={{fontSize:"48px",marginBottom:"16px"}}>
            🔕
          </div>
          <h3 style={{fontSize:"18px",color:"#374151",
                      marginBottom:"8px"}}>
            No alerts generated yet
          </h3>
          <p style={{marginBottom:"16px"}}>
            Alerts are auto-created from HIGH priority updates,
            funding events, product launches, or 2+ searches.
          </p>
          <a href="/scout"
             style={{display:"inline-block",padding:"10px 20px",
                     background:"#1e3a8a",color:"white",
                     borderRadius:"8px",textDecoration:"none",
                     fontWeight:"500"}}>
            → Run Market Scout to generate alerts
          </a>
        </div>
      )}

      {/* Severity filter cards */}
      {!loading && !error && alerts.length > 0 && (
        <>
          <div style={{display:"grid",
                       gridTemplateColumns:"repeat(4,1fr)",
                       gap:"16px",marginBottom:"24px"}}>
            {[
              {key:"all",     label:"⚪ All",
               count:counts.total,   color:"#374151"},
              {key:"critical",label:"🔴 Critical",
               count:counts.critical,color:"#dc2626"},
              {key:"warning", label:"🟡 Warning",
               count:counts.warning, color:"#d97706"},
              {key:"info",    label:"🔵 Info",
               count:counts.info,    color:"#2563eb"},
            ].map(s => (
              <div key={s.key}
                onClick={() => setFilter(s.key)}
                style={{
                  background:"white",
                  borderRadius:"10px",
                  padding:"16px 20px",
                  boxShadow:"0 1px 3px rgba(0,0,0,0.08)",
                  cursor:"pointer",
                  border: filter===s.key
                    ? `2px solid ${s.color}`
                    : "2px solid transparent",
                  transition:"all 0.2s"
                }}>
                <div style={{fontSize:"28px",fontWeight:"700",
                             color:s.color}}>
                  {s.count}
                </div>
                <div style={{fontSize:"13px",color:"#6b7280",
                             marginTop:"4px"}}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Alert feed */}
          <div style={{display:"flex",flexDirection:"column",
                       gap:"12px"}}>
            {displayed.length === 0 ? (
              <div style={{textAlign:"center",padding:"32px",
                           color:"#9ca3af",background:"white",
                           borderRadius:"10px"}}>
                No {filter} alerts.
                <button onClick={() => setFilter("all")}
                  style={{marginLeft:"8px",background:"none",
                          border:"none",color:"#3b82f6",
                          cursor:"pointer"}}>
                  Show all
                </button>
              </div>
            ) : (
              displayed.map((alert, i) => (
                <div key={alert.id || i}
                  style={{
                    background:"white",
                    borderRadius:"10px",
                    boxShadow:"0 1px 3px rgba(0,0,0,0.06)",
                    display:"flex",
                    overflow:"hidden"
                  }}>
                  {/* Color bar */}
                  <div style={{
                    width:"4px",flexShrink:0,
                    background: sevColor[alert.severity]
                                || "#9ca3af"
                  }}/>

                  {/* Content */}
                  <div style={{padding:"16px 20px",flex:1}}>
                    <div style={{display:"flex",
                                 justifyContent:"space-between",
                                 alignItems:"center",
                                 marginBottom:"8px"}}>
                      <div style={{display:"flex",
                                   alignItems:"center",
                                   gap:"8px"}}>
                        <span style={{fontSize:"18px"}}>
                          {alert.emoji}
                        </span>
                        <span style={{
                          padding:"3px 10px",
                          borderRadius:"12px",
                          fontSize:"11px",
                          fontWeight:"700",
                          background: sevBg[alert.severity],
                          color: sevColor[alert.severity]
                        }}>
                          {alert.type}
                        </span>
                        <div style={{
                          width:"24px",height:"24px",
                          background:"#1e3a8a",color:"white",
                          borderRadius:"50%",display:"flex",
                          alignItems:"center",
                          justifyContent:"center",
                          fontSize:"11px",fontWeight:"700"
                        }}>
                          {alert.company?.charAt(0).toUpperCase()}
                        </div>
                        <strong style={{fontSize:"14px"}}>
                          {alert.company}
                        </strong>
                      </div>
                      <span style={{fontSize:"12px",
                                    color:"#9ca3af",
                                    whiteSpace:"nowrap"}}>
                        {timeAgo(alert.created_at)}
                      </span>
                    </div>

                    <p style={{fontSize:"14px",color:"#374151",
                               lineHeight:"1.6",margin:0}}>
                      {alert.message}
                    </p>

                    {alert.detail && (
                      <p style={{fontSize:"13px",color:"#6b7280",
                                 marginTop:"8px",padding:"8px 12px",
                                 background:"#f9fafb",
                                 borderRadius:"6px",margin:"8px 0 0"}}>
                        📌 {alert.detail}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

    </div>
  );
}
