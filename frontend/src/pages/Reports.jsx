import React, { useState, useEffect } from 'react';
import { Search, Calendar, ChevronRight, FileText, Download, X, TrendingUp, Info } from 'lucide-react';

const ReportDetailDrawer = ({ report, onClose }) => {
  if (!report) return null;

  const handleDownloadPDF = (report) => {
    // Build full HTML string for the report
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>MarketScout Report - ${report.company}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Georgia, serif; 
            color: #111; 
            background: white;
            padding: 48px;
            max-width: 900px;
            margin: 0 auto;
          }
          .header { 
            border-bottom: 3px solid #1e3a8a; 
            padding-bottom: 20px; 
            margin-bottom: 28px;
          }
          .header h1 { 
            font-size: 28px; 
            color: #1e3a8a; 
            margin-bottom: 4px; 
          }
          .header p { color: #6b7280; font-size: 13px; }
          .meta { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 28px;
            font-size: 14px;
          }
          .summary-card { 
            background: #1e3a8a; 
            color: white; 
            border-radius: 10px; 
            padding: 28px; 
            margin-bottom: 32px; 
          }
          .summary-card h2 { 
            font-size: 20px; 
            margin-bottom: 12px; 
          }
          .summary-card p { 
            line-height: 1.7; 
            font-size: 15px; 
          }
          .takeaway { 
            background: rgba(255,255,255,0.12); 
            border-radius: 8px; 
            padding: 16px; 
            margin-top: 20px; 
          }
          .takeaway-label { 
            font-size: 10px; 
            letter-spacing: 2px; 
            opacity: 0.7; 
            margin-bottom: 8px; 
          }
          .takeaway p { 
            font-weight: 600; 
            font-size: 14px; 
            line-height: 1.6; 
          }
          .section-title { 
            font-size: 20px; 
            font-weight: bold; 
            color: #1e3a8a; 
            margin: 32px 0 16px; 
            border-left: 4px solid #1e3a8a;
            padding-left: 12px;
          }
          .update-card { 
            border: 1px solid #e5e7eb; 
            border-radius: 8px; 
            padding: 20px; 
            margin-bottom: 16px; 
            page-break-inside: avoid;
          }
          .badges { 
            display: flex; 
            gap: 8px; 
            margin-bottom: 10px; 
            flex-wrap: wrap;
            align-items: center;
          }
          .badge { 
            padding: 3px 12px; 
            border-radius: 20px; 
            font-size: 11px; 
            font-weight: 600; 
          }
          .badge-cat { background: #dbeafe; color: #1e40af; }
          .badge-high { background: #fee2e2; color: #dc2626; }
          .badge-medium { background: #fef9c3; color: #ca8a04; }
          .badge-low { background: #f3f4f6; color: #6b7280; }
          .update-date { 
            margin-left: auto; 
            font-size: 12px; 
            color: #9ca3af; 
          }
          .update-title { 
            font-size: 16px; 
            font-weight: 700; 
            margin-bottom: 8px; 
          }
          .update-summary { 
            color: #374151; 
            line-height: 1.7; 
            font-size: 14px;
            margin-bottom: 10px;
          }
          .source-link { 
            font-size: 12px; 
            color: #3b82f6; 
            word-break: break-all;
          }
          .trend-card { 
            border: 1px solid #e5e7eb; 
            border-radius: 8px; 
            padding: 20px; 
            margin-bottom: 12px;
            page-break-inside: avoid;
          }
          .trend-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            margin-bottom: 8px;
          }
          .trend-title { font-size: 15px; font-weight: 700; }
          .badge-growing { background: #fef3c7; color: #d97706; }
          .badge-mainstream { background: #dcfce7; color: #16a34a; }
          .badge-early { background: #dbeafe; color: #2563eb; }
          .trend-desc { 
            color: #374151; 
            line-height: 1.7; 
            font-size: 14px; 
          }
          .footer { 
            border-top: 1px solid #e5e7eb; 
            margin-top: 40px; 
            padding-top: 16px; 
            display: flex; 
            justify-content: space-between;
            font-size: 12px; 
            color: #9ca3af; 
          }
          @media print {
            body { padding: 32px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MarketScout Intelligence Report</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        <div class="meta">
          <span><strong>Target Entity:</strong> ${report.company}</span>
          <span><strong>Period:</strong> ${report.period || (report.requested_from + ' to ' + report.requested_to)}</span>
        </div>
        <div class="summary-card">
          <h2>Executive Summary</h2>
          <p>${report.executive_summary || 'No summary available.'}</p>
          <div class="takeaway">
            <div class="takeaway-label">COMPETITIVE TAKEAWAY</div>
            <p>${report.competitive_takeaway || 'No takeaway available.'}</p>
          </div>
        </div>
        <div class="section-title">Intelligence Feed</div>
        ${(report.updates || []).map(u => `
          <div class="update-card">
            <div class="badges">
              <span class="badge badge-cat">${u.category || 'Update'}</span>
              <span class="badge badge-${(u.significance || 'low').toLowerCase()}">
                ${u.significance || 'Low'} Priority
              </span>
              <span class="update-date">${u.published_date || ''}</span>
            </div>
            <div class="update-title">${u.title || ''}</div>
            <div class="update-summary">${u.summary || ''}</div>
            ${u.source_url ? `
              <div class="source-link">
                Source: ${u.source_name || ''} — ${u.source_url}
              </div>
            ` : ''}
          </div>
        `).join('')}
        <div class="section-title">Technical Evolution</div>
        ${(report.technical_trends || []).map(t => `
          <div class="trend-card">
            <div class="trend-header">
              <span class="trend-title">${t.trend || ''}</span>
              <span class="badge badge-${(t.adoption_signal || 'early').toLowerCase()}">
                ${t.adoption_signal || 'Early'}
              </span>
            </div>
            <div class="trend-desc">${t.description || ''}</div>
          </div>
        `).join('')}
        <div class="footer">
          <span>MarketScout Intelligence Platform</span>
          <span>Confidential — Internal Use Only</span>
          <span>${new Date().toLocaleDateString()}</span>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); }
          }
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="absolute inset-0 z-50 flex justify-end overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div 
        className="relative w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 z-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{report.company}</h2>
            <p className="text-slate-500 text-sm mt-1">{report.period}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          <section className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Executive Summary</h3>
            <p className="text-slate-700 leading-relaxed text-lg italic">
              "{report.executive_summary}"
            </p>
            <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
               <strong className="text-indigo-900 text-xs uppercase tracking-wider block mb-2">Competitive Takeaway</strong>
               <p className="text-indigo-800 text-sm font-medium">{report.competitive_takeaway}</p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
              Intelligence Feed
            </h3>
            <div className="space-y-4">
              {report.updates?.map((u, i) => (
                <div key={i} className="border border-slate-100 rounded-xl p-5 hover:border-slate-200 transition-all bg-white shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded tracking-wider">
                      {u.category}
                    </span>
                    <span className="text-slate-400 text-[10px] font-medium">{u.published_date}</span>
                  </div>
                  <h4 className="text-base font-bold text-slate-800 mb-2">{u.title}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">{u.summary}</p>
                  {u.source_url && (
                    <a href={u.source_url} target="_blank" rel="noopener noreferrer" 
                       className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                      View Intelligence Source <ChevronRight className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              Technical Evolution
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.technical_trends?.map((t, i) => (
                <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-slate-800">{t.trend}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full uppercase">
                      {t.adoption_signal}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{t.description}</p>
                </div>
              ))}
            </div>
          </section>

          <button 
            onClick={() => handleDownloadPDF(report)}
            style={{
              width: "100%",
              padding: "16px",
              background: "#1e3a8a",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            ⬇ Download PDF Report
          </button>
        </div>
      </div>
    </div>
  );
};

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filterCompany, setFilterCompany] = useState("");
  const [companies, setCompanies] = useState([]);

  const fetchReports = async (company = "") => {
    setLoading(true);
    try {
      const url = company
        ? `http://localhost:8000/api/reports?company=${encodeURIComponent(company)}`
        : `http://localhost:8000/api/reports`;
      const res = await fetch(url);
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    fetch("http://localhost:8000/api/reports")
      .then(r => r.json())
      .then(data => {
        const unique = [
          ...new Set((data.reports || []).map((r) => r.company))
        ];
        setCompanies(unique);
      });
  }, []);

  const handleSearch = (e) => {
    if (e.key === "Enter") {
      fetchReports(filterCompany);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Intelligence Archive</h1>
        <p className="text-slate-500 mt-2">Every strategic run is automatically persisted to the Supabase vector store.</p>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 mb-8 items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search company mission..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>
        <select 
          className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 w-full md:w-auto"
          value={filterCompany}
          onChange={(e) => {
            setFilterCompany(e.target.value);
            fetchReports(e.target.value);
          }}
        >
          <option value="">All Companies</option>
          {companies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button 
          onClick={() => fetchReports(filterCompany)}
          className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 w-full md:w-auto"
        >
          Query
        </button>
        <button 
          onClick={() => { setFilterCompany(""); fetchReports(""); }}
          className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all w-full md:w-auto"
        >
          Reset
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-20 text-center">
          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
             <FileText className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">No Intelligence Logged</h2>
          <p className="text-slate-500 mt-2 max-w-sm mx-auto">Results from the Market Scout are automatically indexed here. Run your first mission to start building the archive.</p>
          <a href="/scout" className="inline-block mt-8 px-8 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-all shadow-lg">
            Initialize Scout Run
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div 
              key={report.id} 
              className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden flex flex-col"
              onClick={() => setSelectedReport(report)}
            >
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                     <TrendingUp className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    report.result_mode === 'in_range' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {report.result_mode === 'in_range' ? 'Precision' : 'Fallback'}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">{report.company}</h3>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-4">
                  <Calendar className="w-3 h-3" />
                  {new Date(report.requested_from).toLocaleDateString()} – {new Date(report.requested_to).toLocaleDateString()}
                </div>
                <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                  {report.executive_summary}
                </p>
              </div>
              
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-50 flex justify-between items-center group-hover:bg-blue-50/30 transition-colors">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Info className="w-4 h-4" />
                    <span className="text-xs font-bold">{report.updates?.length || 0}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-300">{new Date(report.created_at).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedReport && (
        <ReportDetailDrawer 
          report={selectedReport} 
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
};

export default Reports;
