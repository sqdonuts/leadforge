import React, { useState, useEffect, useRef, useCallback } from "react";

// ── Mock data generator ────────────────────────────────────
const MOCK_NAMES = ["Sarah Chen","Marcus Johnson","Elena Rodriguez","David Park","Aisha Williams","James Liu","Sofia Patel","Ryan Torres","Maya Singh","Alex Thompson","Jordan Lee","Carmen Rivera","Nathan Kim","Priya Sharma","Tyler Brooks"];
const MOCK_TITLES = ["Owner & Founder","CEO / Managing Partner","Head of Operations","Director","General Manager","Principal","Proprietor"];
const MOCK_COMPANIES = ["Sunset Bistro","The Golden Fork","Azure Sky Wellness","Peak Performance Studio","Smile Dental Group","Pacific Law Associates","Harbor View Hotel","Luxe Beauty Studio","Urban Fitness Co.","Downtown Grill House"];
const INDUSTRIES = ["Restaurant & Food Service","Healthcare & Medical","Legal Services","Fitness & Wellness","Hospitality","Beauty & Grooming","Professional Services"];

function mockLead(i) {
  const rating = (2.8 + Math.random() * 2.2).toFixed(1) * 1;
  const reviews = Math.floor(20 + Math.random() * 480);
  const gap = Math.max(0, 4.7 - rating);
  const lossPct = Math.round(gap * 8 * 10) / 10;
  const lossAmt = Math.round((lossPct / 100) * 1_200_000);
  const score = rating < 4.0 && reviews > 50 ? "hot" : rating < 4.5 ? "warm" : "cold";
  const scoreVal = score === "hot" ? 75 + Math.floor(Math.random()*20) : score === "warm" ? 45 + Math.floor(Math.random()*20) : 15 + Math.floor(Math.random()*20);
  return {
    id: `lead_${i}`, full_name: MOCK_NAMES[i % MOCK_NAMES.length],
    title: MOCK_TITLES[i % MOCK_TITLES.length],
    company: MOCK_COMPANIES[i % MOCK_COMPANIES.length],
    linkedin_url: `https://linkedin.com/in/profile-${i}`,
    email_professional: Math.random() > 0.2 ? `contact@${MOCK_COMPANIES[i%MOCK_COMPANIES.length].toLowerCase().replace(/\s+/g,'')}${Math.random()>.5?'.com':'.biz'}` : "",
    phone: Math.random() > 0.4 ? `(${Math.floor(200+Math.random()*700)}) ${Math.floor(200+Math.random()*700)}-${Math.floor(1000+Math.random()*9000)}` : "",
    company_website: `https://${MOCK_COMPANIES[i%MOCK_COMPANIES.length].toLowerCase().replace(/[\s&]/g,'')}.com`,
    industry: INDUSTRIES[i % INDUSTRIES.length],
    company_size: ["1-10","11-50","51-200"][i % 3],
    location: "Los Angeles, CA",
    google_rating: rating,
    review_count: reviews,
    google_address: `${1000+i*7} Main St, Los Angeles, CA`,
    google_phone: Math.random() > 0.3 ? `(323) ${Math.floor(200+Math.random()*700)}-${Math.floor(1000+Math.random()*9000)}` : "",
    industry_avg_rating: 4.7,
    revenue_loss_pct: lossPct,
    revenue_loss_est: lossAmt >= 1000000 ? `$${(lossAmt/1000000).toFixed(1)}M` : `$${Math.round(lossAmt/1000)}K`,
    lead_score: score,
    score_value: scoreVal,
  };
}

// ── Icons ──────────────────────────────────────────────────
const Icon = ({ name, size=16 }) => {
  const icons = {
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    play: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>,
    stop: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>,
    download: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    filter: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
    star: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    mail: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    link: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    trend: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    users: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    bolt: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
    clock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    globe: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    phone: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 3h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 10.5a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.5 18z"/></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12H4M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41"/></svg>,
    campaign: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
    history: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>,
    building: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>,
  };
  return icons[name] || null;
};

// ── Score badge ────────────────────────────────────────────
const ScoreBadge = ({ score }) => {
  const cfg = {
    hot:  { bg: "#FF3B5C", text: "#fff", label: "🔥 HOT" },
    warm: { bg: "#FF8C00", text: "#fff", label: "⚡ WARM" },
    cold: { bg: "#2A7FFF", text: "#fff", label: "❄ COLD" },
  };
  const c = cfg[score] || cfg.cold;
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.05em", fontFamily: "monospace" }}>
      {c.label}
    </span>
  );
};

// ── Star rating ────────────────────────────────────────────
const StarRating = ({ rating }) => {
  if (!rating) return <span style={{ color: "#555", fontSize: 12 }}>—</span>;
  const color = rating >= 4.5 ? "#22C55E" : rating >= 4.0 ? "#F59E0B" : rating >= 3.5 ? "#F97316" : "#EF4444";
  return (
    <span style={{ color, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 3 }}>
      <span style={{ color: "#F59E0B" }}><Icon name="star" size={11} /></span>
      {rating.toFixed(1)}
    </span>
  );
};

// ── Pipeline step indicator ────────────────────────────────
const PipelineStep = ({ label, status, icon }) => {
  const colors = { pending: "#333", running: "#00D4FF", done: "#22C55E", error: "#EF4444" };
  const bg     = { pending: "#111", running: "#001B2E", done: "#0A2010", error: "#200A0A" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: bg[status], borderRadius: 8, border: `1px solid ${colors[status]}22`, marginBottom: 6 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: colors[status] + "20", border: `1.5px solid ${colors[status]}`, display: "flex", alignItems: "center", justifyContent: "center", color: colors[status], flexShrink: 0 }}>
        {status === "running" ? <SpinnerMini /> : status === "done" ? <Icon name="check" size={13} /> : status === "error" ? <Icon name="x" size={13} /> : icon}
      </div>
      <div>
        <div style={{ color: colors[status], fontSize: 12, fontWeight: 600 }}>{label}</div>
        <div style={{ color: "#555", fontSize: 10, marginTop: 1 }}>
          {status === "running" ? "In progress..." : status === "done" ? "Complete" : status === "error" ? "Failed" : "Waiting"}
        </div>
      </div>
    </div>
  );
};

const SpinnerMini = () => (
  <div style={{ width: 12, height: 12, border: "1.5px solid #00D4FF33", borderTopColor: "#00D4FF", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
);

export default function App() {
  const [view, setView] = useState("search"); // search | results | history | campaigns
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [limit, setLimit] = useState("100");
  const [linkedinEmail, setLinkedinEmail] = useState("");
  const [linkedinPass, setLinkedinPass] = useState("");
  const [showCreds, setShowCreds] = useState(false);
  const [running, setRunning] = useState(false);
  const [leads, setLeads] = useState([]);
  const [searchId, setSearchId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [expandedLead, setExpandedLead] = useState(null);
  const [progress, setProgress] = useState({ enriched: 0, total: 0 });
  const [stages, setStages] = useState({
    linkedin: "pending", company: "pending", email: "pending", google: "pending", scoring: "pending",
  });
  const [stats, setStats] = useState({ total: 0, hot: 0, warm: 0, cold: 0, withEmail: 0 });
  const [searchHistory, setSearchHistory] = useState([
    { id: "h1", category: "dentist owners", location: "miami, fl", status: "done", total: 248, hot: 62, created: "2024-12-10" },
    { id: "h2", category: "restaurant owners", location: "los angeles, ca", status: "done", total: 312, hot: 89, created: "2024-12-08" },
    { id: "h3", category: "spa owners", location: "new york, ny", status: "done", total: 176, hot: 44, created: "2024-12-05" },
  ]);
  const runRef = useRef(false);

  const updateStats = useCallback((ls) => {
    setStats({
      total:     ls.length,
      hot:       ls.filter(l => l.lead_score === "hot").length,
      warm:      ls.filter(l => l.lead_score === "warm").length,
      cold:      ls.filter(l => l.lead_score === "cold").length,
      withEmail: ls.filter(l => l.email_professional).length,
    });
  }, []);

  const runPipeline = async () => {
    if (!category || !location) return;
    setRunning(true);
    setLeads([]);
    setSearchId(`search_${Date.now()}`);
    setProgress({ enriched: 0, total: parseInt(limit) || 100 });
    setStages({ linkedin: "running", company: "pending", email: "pending", google: "pending", scoring: "pending" });
    setView("results");
    runRef.current = true;

    const total = Math.min(parseInt(limit) || 100, 100); // demo: cap at 100

    // ── Simulate stage 1: LinkedIn ──────────────────────────
    await new Promise(r => setTimeout(r, 1500));
    const rawLeads = Array.from({ length: total }, (_, i) => ({ ...mockLead(i), search_id: `search_${Date.now()}`, linkedin_done: 1, enrichment_done: 0, email_done: 0, google_done: 0 }));
    setLeads([...rawLeads]);
    setStages(s => ({ ...s, linkedin: "done", company: "running" }));

    // ── Simulate enrichment in batches ──────────────────────
    await new Promise(r => setTimeout(r, 800));
    setStages(s => ({ ...s, company: "done", email: "running" }));
    await new Promise(r => setTimeout(r, 900));
    setStages(s => ({ ...s, email: "done", google: "running" }));

    const batchSize = 5;
    for (let i = 0; i < rawLeads.length; i += batchSize) {
      if (!runRef.current) break;
      await new Promise(r => setTimeout(r, 400));
      const updated = [...rawLeads];
      for (let j = i; j < Math.min(i + batchSize, rawLeads.length); j++) {
        updated[j] = { ...updated[j], enrichment_done: 1, email_done: 1, google_done: 1 };
      }
      const enrichedCount = Math.min(i + batchSize, rawLeads.length);
      setProgress({ enriched: enrichedCount, total });
      setLeads([...updated]);
      updateStats(updated);
    }

    setStages(s => ({ ...s, google: "done", scoring: "done" }));
    setRunning(false);
    runRef.current = false;
    updateStats(rawLeads);
    setSearchHistory(h => [{ id: `h${h.length+1}`, category, location, status: "done", total, hot: rawLeads.filter(l=>l.lead_score==="hot").length, created: new Date().toISOString().split("T")[0] }, ...h]);
  };

  const stopPipeline = () => { runRef.current = false; setRunning(false); };

  const filteredLeads = filter === "all" ? leads : leads.filter(l => l.lead_score === filter);

  const downloadCSV = () => {
    const cols = ["full_name","title","company","email_professional","phone","company_website","google_rating","review_count","revenue_loss_est","lead_score"];
    const header = cols.join(",");
    const rows = filteredLeads.map(l => cols.map(c => `"${l[c] || ""}"`).join(","));
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `leads_${category}_${Date.now()}.csv`; a.click();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#E8E8E8", fontFamily: "'DM Mono', 'Courier New', monospace", display: "flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes glowPulse { 0%,100% { box-shadow: 0 0 0 rgba(0,212,255,0); } 50% { box-shadow: 0 0 20px rgba(0,212,255,0.15); } }
        * { box-sizing: border-box; margin: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0A0A0A; } ::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
        input, select { outline: none; color: #E8E8E8; font-family: inherit; }
        input::placeholder { color: #3A3A3A; }
        button { cursor: pointer; font-family: inherit; }
        a { color: #00D4FF; text-decoration: none; }
        .nav-btn:hover { background: #141414 !important; }
        .lead-row:hover { background: #0F0F0F !important; }
        .action-btn:hover { opacity: 0.85; }
      `}</style>

      {/* ── Sidebar Nav ─────────────────────────────────────── */}
      <nav style={{ width: 220, background: "#050505", borderRight: "1px solid #141414", display: "flex", flexDirection: "column", padding: "20px 12px", gap: 4, flexShrink: 0 }}>
        <div style={{ padding: "0 8px 20px", borderBottom: "1px solid #141414", marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#00D4FF", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>LeadForge</div>
          <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>AUTOMATED PROSPECTING</div>
        </div>
        {[
          { id: "search", label: "New Search", icon: "search" },
          { id: "results", label: "Results", icon: "users" },
          { id: "history", label: "History", icon: "history" },
          { id: "campaigns", label: "Campaigns", icon: "campaign" },
        ].map(n => (
          <button key={n.id} className="nav-btn" onClick={() => setView(n.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, border: "none", background: view === n.id ? "#0F1A20" : "transparent", color: view === n.id ? "#00D4FF" : "#555", fontSize: 12, fontWeight: view === n.id ? 500 : 400, transition: "all 0.15s" }}>
            <Icon name={n.icon} size={15} />{n.label}
          </button>
        ))}

        <div style={{ marginTop: "auto", padding: "12px 8px", borderTop: "1px solid #141414" }}>
          {running && (
            <div style={{ padding: "8px 10px", background: "#001B2E", borderRadius: 8, border: "1px solid #00D4FF22", marginBottom: 12 }}>
              <div style={{ color: "#00D4FF", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>PIPELINE RUNNING</div>
              <div style={{ height: 3, background: "#0A0A0A", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "#00D4FF", width: `${(progress.enriched / Math.max(progress.total, 1)) * 100}%`, transition: "width 0.4s", borderRadius: 2 }} />
              </div>
              <div style={{ color: "#555", fontSize: 10, marginTop: 4 }}>{progress.enriched}/{progress.total} enriched</div>
            </div>
          )}
          <div style={{ color: "#333", fontSize: 10 }}>v1.0.0 · production</div>
        </div>
      </nav>

      {/* ── Main content ─────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: "auto", padding: "28px 32px" }}>

        {/* ═══ SEARCH VIEW ══════════════════════════════════ */}
        {view === "search" && (
          <div style={{ maxWidth: 680, animation: "fadeIn 0.3s ease" }}>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.03em", color: "#E8E8E8", marginBottom: 6 }}>Launch Lead Pipeline</h1>
              <p style={{ color: "#555", fontSize: 13 }}>Type a business category and location to generate enriched, scored leads automatically.</p>
            </div>

            {/* Search form */}
            <div style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 14, padding: 28, marginBottom: 20, animation: "glowPulse 3s ease infinite" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={{ color: "#555", fontSize: 10, letterSpacing: "0.08em", fontWeight: 600 }}>SEARCH CATEGORY</span>
                  <input value={category} onChange={e => setCategory(e.target.value)}
                    placeholder="restaurant owners"
                    style={{ background: "#060606", border: "1px solid #1E1E1E", borderRadius: 8, padding: "11px 14px", fontSize: 13, transition: "border 0.2s" }}
                    onFocus={e => e.target.style.borderColor = "#00D4FF44"}
                    onBlur={e => e.target.style.borderColor = "#1E1E1E"}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={{ color: "#555", fontSize: 10, letterSpacing: "0.08em", fontWeight: 600 }}>LOCATION</span>
                  <input value={location} onChange={e => setLocation(e.target.value)}
                    placeholder="los angeles, ca"
                    style={{ background: "#060606", border: "1px solid #1E1E1E", borderRadius: 8, padding: "11px 14px", fontSize: 13, transition: "border 0.2s" }}
                    onFocus={e => e.target.style.borderColor = "#00D4FF44"}
                    onBlur={e => e.target.style.borderColor = "#1E1E1E"}
                  />
                </label>
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 20 }}>
                <span style={{ color: "#555", fontSize: 10, letterSpacing: "0.08em", fontWeight: 600 }}>LEAD LIMIT — {limit}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input type="range" min="10" max="500" step="10" value={limit} onChange={e => setLimit(e.target.value)}
                    style={{ flex: 1, accentColor: "#00D4FF", height: 4 }} />
                  <span style={{ color: "#00D4FF", fontSize: 14, fontWeight: 600, minWidth: 40 }}>{limit}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#333", fontSize: 10 }}>
                  <span>10</span><span>100</span><span>250</span><span>500</span>
                </div>
              </label>

              {/* LinkedIn creds collapsible */}
              <div style={{ marginBottom: 20 }}>
                <button onClick={() => setShowCreds(!showCreds)} style={{ background: "none", border: "1px solid #1A1A1A", borderRadius: 7, padding: "7px 12px", color: "#555", fontSize: 11, display: "flex", alignItems: "center", gap: 7 }}>
                  <Icon name="settings" size={12} />
                  {showCreds ? "Hide" : "Set"} LinkedIn Credentials
                </button>
                {showCreds && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12, padding: 14, background: "#060606", borderRadius: 8, border: "1px solid #1A1A1A" }}>
                    <input value={linkedinEmail} onChange={e => setLinkedinEmail(e.target.value)} placeholder="LinkedIn email" type="email"
                      style={{ background: "#0A0A0A", border: "1px solid #1E1E1E", borderRadius: 7, padding: "9px 12px", fontSize: 12 }} />
                    <input value={linkedinPass} onChange={e => setLinkedinPass(e.target.value)} placeholder="LinkedIn password" type="password"
                      style={{ background: "#0A0A0A", border: "1px solid #1E1E1E", borderRadius: 7, padding: "9px 12px", fontSize: 12 }} />
                  </div>
                )}
              </div>

              <button
                onClick={running ? stopPipeline : runPipeline}
                disabled={!category || !location}
                style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: running ? "#1A0808" : (!category || !location) ? "#0D0D0D" : "linear-gradient(135deg, #00D4FF, #0088CC)", color: running ? "#EF4444" : (!category || !location) ? "#333" : "#000", fontSize: 14, fontWeight: 700, letterSpacing: "0.02em", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "all 0.2s", fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {running ? <><SpinnerMini /><span style={{ color: "#EF4444" }}>STOP PIPELINE</span></> : <><Icon name="play" size={14} />RUN PIPELINE</>}
              </button>
            </div>

            {/* Pipeline preview */}
            <div style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 14, padding: 24 }}>
              <div style={{ color: "#444", fontSize: 10, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 14 }}>PIPELINE STAGES</div>
              {[
                { key: "linkedin", label: "LinkedIn Scraper (Playwright)", icon: <Icon name="users" size={12} /> },
                { key: "company", label: "Company Data Enrichment (Clearbit)", icon: <Icon name="building" size={12} /> },
                { key: "email", label: "Email Finder (Apollo + Hunter + Snov)", icon: <Icon name="mail" size={12} /> },
                { key: "google", label: "Google Business Scraper", icon: <Icon name="star" size={12} /> },
                { key: "scoring", label: "Revenue Loss Calculator + Lead Scoring", icon: <Icon name="trend" size={12} /> },
              ].map(s => <PipelineStep key={s.key} label={s.label} status={stages[s.key]} icon={s.icon} />)}
            </div>
          </div>
        )}

        {/* ═══ RESULTS VIEW ══════════════════════════════════ */}
        {view === "results" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em", marginBottom: 4 }}>
                  {category ? `"${category}" · ${location}` : "Lead Results"}
                </h1>
                <div style={{ color: "#555", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  {running && <><SpinnerMini /><span style={{ color: "#00D4FF" }}>Pipeline running · {progress.enriched}/{progress.total} enriched</span></>}
                  {!running && leads.length > 0 && <span>{leads.length} leads generated</span>}
                </div>
              </div>
              {leads.length > 0 && (
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={downloadCSV} className="action-btn" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#0A2010", border: "1px solid #22C55E33", borderRadius: 8, color: "#22C55E", fontSize: 12, fontWeight: 600 }}>
                    <Icon name="download" size={13} />CSV
                  </button>
                  <button onClick={downloadCSV} className="action-btn" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#001B2E", border: "1px solid #00D4FF33", borderRadius: 8, color: "#00D4FF", fontSize: 12, fontWeight: 600 }}>
                    <Icon name="download" size={13} />Excel
                  </button>
                </div>
              )}
            </div>

            {/* Stats bar */}
            {leads.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "TOTAL LEADS", val: stats.total, color: "#E8E8E8" },
                  { label: "🔥 HOT", val: stats.hot, color: "#FF3B5C" },
                  { label: "⚡ WARM", val: stats.warm, color: "#FF8C00" },
                  { label: "❄ COLD", val: stats.cold, color: "#2A7FFF" },
                  { label: "📧 WITH EMAIL", val: stats.withEmail, color: "#22C55E" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ color: "#444", fontSize: 9, letterSpacing: "0.06em", fontWeight: 700, marginBottom: 6 }}>{s.label}</div>
                    <div style={{ color: s.color, fontSize: 24, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>{s.val}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Filter pills */}
            {leads.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {["all","hot","warm","cold"].map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${filter === f ? "#00D4FF44" : "#1A1A1A"}`, background: filter === f ? "#001B2E" : "transparent", color: filter === f ? "#00D4FF" : "#444", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" }}>
                    {f.toUpperCase()}
                  </button>
                ))}
                <div style={{ marginLeft: "auto", color: "#444", fontSize: 11, display: "flex", alignItems: "center" }}>
                  {filteredLeads.length} leads
                </div>
              </div>
            )}

            {/* Leads table */}
            {leads.length === 0 && !running && (
              <div style={{ textAlign: "center", padding: "80px 40px", color: "#333" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <div style={{ fontSize: 14, marginBottom: 8 }}>No results yet</div>
                <div style={{ fontSize: 12 }}>Run a search to generate leads</div>
              </div>
            )}

            {filteredLeads.length > 0 && (
              <div style={{ background: "#070707", border: "1px solid #141414", borderRadius: 12, overflow: "hidden" }}>
                {/* Table header */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1.5fr 1fr 1fr 1fr 1.2fr", gap: 0, padding: "10px 16px", borderBottom: "1px solid #141414", color: "#333", fontSize: 9, letterSpacing: "0.08em", fontWeight: 700 }}>
                  <span>CONTACT</span><span>COMPANY</span><span>EMAIL</span><span>RATING</span><span>REVIEWS</span><span>REV. LOSS</span><span>SCORE</span>
                </div>

                {filteredLeads.map((lead, i) => (
                  <div key={lead.id}>
                    <div className="lead-row" onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}
                      style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1.5fr 1fr 1fr 1fr 1.2fr", gap: 0, padding: "12px 16px", borderBottom: "1px solid #0D0D0D", cursor: "pointer", transition: "background 0.15s", animation: `fadeIn 0.3s ease ${Math.min(i * 0.03, 0.5)}s both` }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12, color: "#E8E8E8", marginBottom: 2 }}>{lead.full_name}</div>
                        <div style={{ color: "#555", fontSize: 11 }}>{lead.title}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: "#CCC", marginBottom: 2 }}>{lead.company}</div>
                        <div style={{ color: "#444", fontSize: 10 }}>{lead.industry?.split("&")[0].trim()}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {lead.email_professional
                          ? <span style={{ fontSize: 11, color: "#22C55E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "95%" }}>{lead.email_professional}</span>
                          : <span style={{ fontSize: 10, color: "#333" }}>—</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center" }}><StarRating rating={lead.google_rating} /></div>
                      <div style={{ fontSize: 12, color: "#888", display: "flex", alignItems: "center" }}>{lead.review_count || "—"}</div>
                      <div style={{ fontSize: 12, color: lead.revenue_loss_pct > 0 ? "#FF3B5C" : "#555", fontWeight: lead.revenue_loss_pct > 0 ? 700 : 400, display: "flex", alignItems: "center" }}>
                        {lead.revenue_loss_est || "—"}
                      </div>
                      <div style={{ display: "flex", alignItems: "center" }}><ScoreBadge score={lead.lead_score} /></div>
                    </div>

                    {/* Expanded detail */}
                    {expandedLead === lead.id && (
                      <div style={{ background: "#0A0A0A", borderBottom: "1px solid #141414", padding: "16px 20px", animation: "fadeIn 0.2s ease" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                          {[
                            { icon: "link", label: "LinkedIn", val: lead.linkedin_url, link: true },
                            { icon: "globe", label: "Website", val: lead.company_website, link: true },
                            { icon: "phone", label: "Phone", val: lead.phone || lead.google_phone },
                            { icon: "building", label: "Size", val: lead.company_size },
                            { icon: "mail", label: "Email", val: lead.email_professional || lead.email_generic },
                            { icon: "star", label: "Google Addr", val: lead.google_address },
                            { icon: "trend", label: "Loss %", val: lead.revenue_loss_pct ? `${lead.revenue_loss_pct}%` : "—" },
                            { icon: "bolt", label: "Score", val: `${lead.score_value}/100` },
                          ].map(f => (
                            <div key={f.label}>
                              <div style={{ color: "#333", fontSize: 9, letterSpacing: "0.07em", marginBottom: 4, fontWeight: 700 }}>{f.label}</div>
                              {f.link && f.val
                                ? <a href={f.val} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: "90%" }} onClick={e => e.stopPropagation()}>{f.val}</a>
                                : <div style={{ fontSize: 11, color: "#888" }}>{f.val || "—"}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ HISTORY VIEW ══════════════════════════════════ */}
        {view === "history" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em", marginBottom: 6 }}>Search History</h1>
            <p style={{ color: "#555", fontSize: 13, marginBottom: 24 }}>Previous pipeline runs and their results.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {searchHistory.map(h => (
                <div key={h.id} style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 12, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>"{h.category}" · {h.location}</div>
                    <div style={{ color: "#444", fontSize: 11, display: "flex", gap: 16 }}>
                      <span><Icon name="users" size={11} /> {h.total} leads</span>
                      <span style={{ color: "#FF3B5C" }}>🔥 {h.hot} hot</span>
                      <span><Icon name="clock" size={11} /> {h.created}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setCategory(h.category); setLocation(h.location); setView("search"); }} style={{ padding: "7px 14px", background: "#001B2E", border: "1px solid #00D4FF33", borderRadius: 7, color: "#00D4FF", fontSize: 11, fontWeight: 600 }}>
                      Re-run
                    </button>
                    <button style={{ padding: "7px 14px", background: "#0A2010", border: "1px solid #22C55E33", borderRadius: 7, color: "#22C55E", fontSize: 11, fontWeight: 600 }}>
                      <Icon name="download" size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ CAMPAIGNS VIEW ══════════════════════════════ */}
        {view === "campaigns" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em", marginBottom: 6 }}>Campaigns</h1>
            <p style={{ color: "#555", fontSize: 13, marginBottom: 24 }}>Organize leads into outreach campaigns.</p>

            <div style={{ background: "#0A0A0A", border: "1px dashed #1A1A1A", borderRadius: 12, padding: "48px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
              <div style={{ fontSize: 14, color: "#555", marginBottom: 6 }}>No campaigns yet</div>
              <div style={{ fontSize: 12, color: "#333", marginBottom: 20 }}>Generate leads first, then create a campaign to organize outreach</div>
              <button onClick={() => setView("search")} style={{ padding: "10px 20px", background: "#001B2E", border: "1px solid #00D4FF33", borderRadius: 8, color: "#00D4FF", fontSize: 12, fontWeight: 600 }}>
                Run a Search First
              </button>
            </div>

            <div style={{ marginTop: 24, background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 12, padding: 20 }}>
              <div style={{ color: "#444", fontSize: 10, letterSpacing: "0.07em", fontWeight: 700, marginBottom: 14 }}>CAMPAIGN FEATURES (INCLUDED)</div>
              {["Bulk email outreach via SMTP/SendGrid","Lead status tracking (contacted/replied/converted)","Sequence automation (follow-up scheduling)","Campaign analytics (open rate, reply rate)","CSV import/export per campaign","A/B subject line testing"].map(f => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid #111", color: "#666", fontSize: 12 }}>
                  <span style={{ color: "#22C55E" }}><Icon name="check" size={12} /></span>{f}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
