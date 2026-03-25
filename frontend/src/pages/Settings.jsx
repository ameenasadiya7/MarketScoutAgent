import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/settings/stats")
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Get real name from auth user object
  const fullName = user?.name || "Intelligence Operator";
  const email = user?.email || "";
  const photoURL = user?.avatar_url || null;
  const firstName = fullName.split(" ")[0] || fullName;
  const lastName = fullName.split(" ").slice(1).join(" ") || "";

  const formatDate = (d) => {
    if (!d) return "N/A";
    try {
      return new Date(d).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric"
      });
    } catch { return "N/A"; }
  };

  const StatusDot = ({ status }) => (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      padding: "4px 12px", borderRadius: "20px", fontSize: "12px",
      fontWeight: "700",
      background: status === "connected" ? "#dcfce7" : "#fee2e2",
      color: status === "connected" ? "#16a34a" : "#dc2626"
    }}>
      <span style={{
        width: "6px", height: "6px", borderRadius: "50%",
        background: status === "connected" ? "#16a34a" : "#dc2626"
      }} />
      {status === "connected" ? "CONNECTED" : "ERROR"}
    </span>
  );

  return (
    <div style={{ padding: "32px", maxWidth: "1100px" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "26px", fontWeight: "700" }}>
          ⚙️ System Preferences
        </h1>
        <p style={{
          color: "#6b7280", fontSize: "14px",
          marginTop: "4px"
        }}>
          Manage platform settings &amp; authenticated profile
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        gap: "24px", alignItems: "start"
      }}>

        {/* LEFT — User Profile Card */}
        <div style={{
          background: "white", borderRadius: "12px",
          padding: "32px", textAlign: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
        }}>

          {/* Avatar */}
          <div style={{
            position: "relative",
            display: "inline-block",
            marginBottom: "16px"
          }}>
            {photoURL ? (
              <img src={photoURL} alt="Profile"
                style={{
                  width: "80px", height: "80px",
                  borderRadius: "50%",
                  objectFit: "cover"
                }} />
            ) : (
              <div style={{
                width: "80px", height: "80px",
                borderRadius: "50%", background: "#1e3a8a",
                color: "white", display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: "32px", fontWeight: "700"
              }}>
                {firstName.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Online dot */}
            <div style={{
              position: "absolute", bottom: "4px", right: "4px",
              width: "14px", height: "14px", borderRadius: "50%",
              background: "#22c55e",
              border: "2px solid white"
            }} />
          </div>

          <h2 style={{
            fontSize: "20px", fontWeight: "700",
            marginBottom: "4px"
          }}>
            {fullName}
          </h2>
          <p style={{
            color: "#6b7280", fontSize: "14px",
            marginBottom: "16px"
          }}>
            {email}
          </p>

          {/* Google Auth badge */}
          <div style={{
            display: "inline-flex", alignItems: "center",
            gap: "6px", padding: "6px 14px",
            background: "#f0f4ff", borderRadius: "20px",
            fontSize: "12px", fontWeight: "600",
            color: "#1e3a8a", marginBottom: "16px"
          }}>
            🔐 GOOGLE AUTHENTICATED
          </div>
        </div>

        {/* RIGHT — Info panels */}
        <div style={{
          display: "flex",
          flexDirection: "column", gap: "20px"
        }}>

          {/* Account Identity */}
          <div style={{
            background: "white", borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
          }}>
            <h3 style={{
              fontSize: "16px", fontWeight: "700",
              marginBottom: "20px",
              display: "flex", alignItems: "center",
              gap: "8px"
            }}>
              👤 Account Identity
            </h3>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px"
            }}>
              {[
                { label: "FIRST NAME", value: firstName },
                { label: "LAST NAME", value: lastName || "—" },
                { label: "EMAIL", value: email || "—" },
                // { label: "ROLE", value: "Intelligence Operator" }
              ].map((item, i) => (
                <div key={i} style={{
                  padding: "12px 0",
                  borderBottom: "1px solid #f3f4f6"
                }}>
                  <p style={{
                    fontSize: "11px", color: "#9ca3af",
                    fontWeight: "600",
                    letterSpacing: "1px",
                    marginBottom: "4px"
                  }}>
                    {item.label}
                  </p>
                  <p style={{
                    fontSize: "15px", fontWeight: "600",
                    color: "#111827"
                  }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Stats from Supabase */}
          <div style={{
            background: "white", borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
          }}>
            <h3 style={{
              fontSize: "16px", fontWeight: "700",
              marginBottom: "20px",
              display: "flex", alignItems: "center",
              gap: "8px"
            }}>
              📊 Platform Intelligence Stats
            </h3>
            <div style={{
              display: "flex",
              flexDirection: "column", gap: "0"
            }}>
              {[
                {
                  label: "Database Access",
                  value: "GRANTED ✅"
                },
                {
                  label: "Total Scout Runs",
                  value: loading ? "..."
                    : stats?.total_runs ?? 0
                },
                {
                  label: "Companies Tracked",
                  value: loading ? "..."
                    : stats?.unique_companies ?? 0
                },
                {
                  label: "Total Updates Found",
                  value: loading ? "..."
                    : stats?.total_updates ?? 0
                },
                {
                  label: "Last Scout Run",
                  value: loading ? "..."
                    : stats?.last_run_display ?? "—"
                },
                {
                  label: "Notification Dispatch",
                  value: "10,000ms"
                },
              ].map((item, i) => (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 0",
                  borderBottom: "1px solid #f3f4f6"
                }}>
                  <div>
                    <p style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151", margin: 0
                    }}>
                      {item.label}
                    </p>
                  </div>
                  <span style={{
                    background: "#f0fdf4", color: "#16a34a",
                    padding: "4px 12px", borderRadius: "12px",
                    fontSize: "13px", fontWeight: "700"
                  }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* API Connection Status */}
          {/* <div style={{
            background: "white", borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
          }}>
            <h3 style={{
              fontSize: "16px", fontWeight: "700",
              marginBottom: "20px",
              display: "flex", alignItems: "center",
              gap: "8px"
            }}>
              🔌 API Connection Status
            </h3>
            <div style={{
              display: "flex",
              flexDirection: "column", gap: "0"
            }}>
              {[
                {
                  label: "Tavily Search API",
                  desc: "Web intelligence source",
                  status: stats?.tavily_status || "unknown"
                },
                {
                  label: "Gemini AI API",
                  desc: "Intelligence analysis engine",
                  status: stats?.gemini_status || "unknown"
                },
                {
                  label: "Supabase Database",
                  desc: "Persistent data store",
                  status: stats?.supabase_status || "connected"
                },
              ].map((item, i) => (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 0",
                  borderBottom: i < 2
                    ? "1px solid #f3f4f6" : "none"
                }}>
                  <div>
                    <p style={{
                      fontSize: "14px", fontWeight: "600",
                      color: "#111827", margin: "0 0 2px"
                    }}>
                      {item.label}
                    </p>
                    <p style={{
                      fontSize: "12px", color: "#9ca3af",
                      margin: 0
                    }}>
                      {item.desc}
                    </p>
                  </div>
                  <StatusDot status={item.status} />
                </div>
              ))}
            </div>
          </div> */}

        </div>
      </div>
    </div>
  );
}
