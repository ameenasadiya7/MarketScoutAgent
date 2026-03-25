import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertCircle, Activity, Box, Search as SearchIcon, Users as UsersIcon, BarChart3 as BarChartIcon } from 'lucide-react';

// Static data removed - now fetching from API

const Dashboard = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "http://localhost:8000/api/dashboard"
      );
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError("Failed to load dashboard data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const hrs  = Math.floor(diff / 3600000);
    if (hrs < 1)  return "Just now";
    if (hrs < 24) return `${hrs} hours ago`;
    return `${Math.floor(diff/86400000)} days ago`;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 font-medium">Loading intelligence dashboard from Supabase...</p>
    </div>
  );

  if (error) return (
    <div className="p-8 text-center bg-red-50 rounded-xl border border-red-100">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-bold text-red-800">{error}</h3>
      <button onClick={fetchDashboard} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
        Try Again
      </button>
    </div>
  );

  // Prepare chart data from API
  const chartLabels = data?.technology_trends_chart?.labels || ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const updatesSeries = data?.technology_trends_chart?.updates_series || [0,0,0,0,0,0,0];
  const trendsSeries = data?.technology_trends_chart?.trends_series || [0,0,0,0,0,0,0];
  
  const techTrendsData = chartLabels.map((label, i) => ({
    name: label,
    updates: updatesSeries[i],
    trends: trendsSeries[i]
  }));

  const companyActivityData = (data?.company_activity_chart || []).map(d => ({
    name: d.company,
    updates: d.count
  }));

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Overview Dashboard</h2>
          <p className="text-slate-500 text-sm">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search competitors (e.g. TCS)"
            className="pl-10 pr-4 py-2 w-64 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.target.value.trim()) {
                window.location.href = `/scout?company=${encodeURIComponent(e.target.value)}`;
              }
            }}
          />
          <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard title="Competitors Tracked" value={data?.competitors_tracked ?? 0} icon={UsersIcon} color="text-blue-500" bg="bg-blue-50" />
        <MetricCard title="New Updates (7d)" value={data?.new_updates_7d ?? 0} icon={TrendingUp} color="text-green-500" bg="bg-green-50" />
        <MetricCard title="Trending Tech" value={data?.trending_tech ?? "N/A"} icon={Box} color="text-purple-500" bg="bg-purple-50" />
        <MetricCard title="Alerts Triggered" value={data?.alerts_triggered ?? 0} icon={AlertCircle} color="text-red-500" bg="bg-red-50" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-gradient p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Technology Trends
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={techTrendsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="updates" name="Updates" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="trends" name="Trends" stroke="#22C55E" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-gradient p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BarChartIcon className="w-5 h-5 text-primary" />
            Company Activity (Last 7 Days)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={companyActivityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="updates" fill="#2563EB" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Insights & Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 card-gradient p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">AI Insights</h3>
          <div className="space-y-4">
            {data?.ai_insights ? (
              <>
                <InsightItem title="TOP COMPETITOR" desc={data.ai_insights.top_competitor_msg} type="neutral" />
                <InsightItem title="TOP CATEGORY" desc={data.ai_insights.top_category_msg} type="positive" />
                <InsightItem title="MOST WATCHED" desc={data.ai_insights.most_scouted_msg} type="negative" />
              </>
            ) : (
              <p className="text-slate-400 text-sm text-center py-8">Run Market Scout searches to generate insights.</p>
            )}
          </div>
        </div>
        <div className="lg:col-span-2 card-gradient p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Updates Feed</h3>
          <div className="space-y-4">
            {(data?.recent_updates_feed || []).length > 0 ? (
              data.recent_updates_feed.map((item, i) => (
                <FeedItem 
                  key={i}
                  title={item.title}
                  tag={item.category}
                  time={timeAgo(item.created_at)}
                  company={item.company}
                  sourceUrl={item.source_url}
                />
              ))
            ) : (
              <p className="text-slate-400 text-sm text-center py-8">No updates yet. Run Market Scout to populate feed.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Icons now imported from lucide-react above

const MetricCard = ({ title, value, icon: Icon, color, bg }) => (
  <div className="card-gradient p-5 flex items-center justify-between group hover:shadow-md transition-shadow">
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h4 className="text-3xl font-bold text-slate-800">{value}</h4>
    </div>
    <div className={`w-12 h-12 rounded-xl ${bg} ${color} flex items-center justify-center`}>
      <Icon className="w-6 h-6" />
    </div>
  </div>
);

const InsightItem = ({ title, desc, type }) => {
  const colors = {
    positive: 'border-l-green-500 bg-green-50/50',
    negative: 'border-l-red-500 bg-red-50/50',
    neutral: 'border-l-blue-500 bg-blue-50/50'
  }
  return (
    <div className={`p-3 border-l-4 rounded-r-lg ${colors[type]}`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-sm text-slate-700">{desc}</p>
    </div>
  );
};

const FeedItem = ({ title, tag, time, company, sourceUrl }) => (
  <div className="flex gap-4 items-start p-3 hover:bg-slate-50 rounded-xl transition-colors">
    <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center font-bold text-slate-600 text-sm border border-slate-200">
      {company ? company[0].toUpperCase() : '?'}
    </div>
    <div className="flex-1">
      <h4 className="text-sm font-medium text-slate-800 mb-1 leading-snug">{title}</h4>
      <div className="flex items-center gap-3 text-xs">
        <span className="px-2 py-0.5 bg-blue-100 text-primary rounded-full font-medium">{tag}</span>
        <span className="text-slate-400">{time}</span>
        {sourceUrl && (
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
            Source →
          </a>
        )}
      </div>
    </div>
  </div>
);

export default Dashboard;
