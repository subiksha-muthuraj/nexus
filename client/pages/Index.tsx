import {
  AlertTriangle,
  ArrowDownToLine,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileSearch,
  FileUp,
  Filter,
  Gauge,
  Landmark,
  ListFilter,
  MapPin,
  RefreshCcw,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import { ChangeEvent, useMemo, useRef, useState } from "react";

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
type Transaction = {
  id: string;
  account: string;
  timestamp: string;
  amount: number;
  merchant: string;
  location: string;
  device: string;
  type: string;
  currency: string;
  score: number;
  level: RiskLevel;
  rules: string[];
  reasons: string[];
};

const ruleMeta = {
  R01: { name: "High value transaction", points: 40, detail: "Amount exceeds the high-value threshold." },
  R02: { name: "Rapid multiple transactions", points: 30, detail: "Multiple transactions detected within a short time window." },
  R03: { name: "Unusual location", points: 25, detail: "Transactions originate from different locations within a short time window." },
  R04: { name: "Device change", points: 20, detail: "Account activity shows a device change within a short time window." },
  R05: { name: "High frequency activity", points: 25, detail: "Unusually high transaction frequency detected." },
} as const;

const demoTransactions: Transaction[] = [
  { id: "TXN-840291", account: "AC-20481", timestamp: "18 Jun 2024, 09:42", amount: 152000, merchant: "Atlas Jewelers", location: "Mumbai, IN", device: "DEV-98A2", type: "Purchase", currency: "INR", score: 40, level: "MEDIUM", rules: ["R01"], reasons: ["Transaction amount exceeds the high-value threshold."] },
  { id: "TXN-840292", account: "AC-77102", timestamp: "18 Jun 2024, 10:14", amount: 1800, merchant: "Metro Market", location: "Bengaluru, IN", device: "DEV-31C7", type: "Purchase", currency: "INR", score: 0, level: "LOW", rules: [], reasons: [] },
  { id: "TXN-840293", account: "AC-55209", timestamp: "18 Jun 2024, 10:33", amount: 45000, merchant: "Nova Electronics", location: "Delhi, IN", device: "DEV-44F1", type: "Purchase", currency: "INR", score: 55, level: "MEDIUM", rules: ["R02", "R03"], reasons: [ruleMeta.R02.detail, ruleMeta.R03.detail] },
  { id: "TXN-840294", account: "AC-55209", timestamp: "18 Jun 2024, 10:37", amount: 12000, merchant: "QuickFuel Station", location: "Mumbai, IN", device: "DEV-44F1", type: "Purchase", currency: "INR", score: 55, level: "MEDIUM", rules: ["R02", "R03"], reasons: [ruleMeta.R02.detail, ruleMeta.R03.detail] },
  { id: "TXN-840295", account: "AC-09812", timestamp: "18 Jun 2024, 11:02", amount: 8900, merchant: "Cloudline Travel", location: "Pune, IN", device: "DEV-71D9", type: "Payment", currency: "INR", score: 20, level: "LOW", rules: ["R04"], reasons: [ruleMeta.R04.detail] },
  { id: "TXN-840296", account: "AC-55209", timestamp: "18 Jun 2024, 10:41", amount: 26000, merchant: "Urban Living", location: "Delhi, IN", device: "DEV-9E20", type: "Purchase", currency: "INR", score: 100, level: "HIGH", rules: ["R02", "R03", "R04", "R05"], reasons: [ruleMeta.R02.detail, ruleMeta.R03.detail, ruleMeta.R04.detail, ruleMeta.R05.detail] },
  { id: "TXN-840297", account: "AC-66240", timestamp: "18 Jun 2024, 11:25", amount: 3200, merchant: "Green Basket", location: "Chennai, IN", device: "DEV-83B0", type: "Purchase", currency: "INR", score: 0, level: "LOW", rules: [], reasons: [] },
  { id: "TXN-840298", account: "AC-20481", timestamp: "18 Jun 2024, 11:48", amount: 73500, merchant: "Luxe Stays", location: "Mumbai, IN", device: "DEV-98A2", type: "Payment", currency: "INR", score: 0, level: "LOW", rules: [], reasons: [] },
];

const normalTransactions = demoTransactions.map((transaction, index) => ({ ...transaction, id: `NORMAL-${index + 1}`, score: 0, level: "LOW" as RiskLevel, rules: [], reasons: [], amount: Math.round(transaction.amount / 12) }));

function parseCsv(text: string): Transaction[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase().replace(/\s+/g, "_"));
  const indexOf = (names: string[]) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
  const idIndex = indexOf(["transaction_id", "id", "transaction"]);
  const amountIndex = indexOf(["amount", "value"]);
  const accountIndex = indexOf(["account_id", "account"]);
  const timestampIndex = indexOf(["timestamp", "date", "datetime"]);
  if (idIndex < 0 || amountIndex < 0) return [];
  return lines.slice(1).map((line, rowIndex) => {
    const values = line.split(",").map((value) => value.trim());
    const amount = Number(values[amountIndex].replace(/[^\d.-]/g, "")) || 0;
    return { id: values[idIndex] || `UPLOADED-${rowIndex + 1}`, account: accountIndex >= 0 ? values[accountIndex] || "Unknown account" : "Unknown account", timestamp: timestampIndex >= 0 ? values[timestampIndex] || "Timestamp unavailable" : "Timestamp unavailable", amount, merchant: "Uploaded merchant", location: "Uploaded location", device: "Uploaded device", type: "Transaction", currency: "INR", score: amount > 100000 ? 40 : 0, level: amount > 100000 ? "MEDIUM" : "LOW", rules: amount > 100000 ? ["R01"] : [], reasons: amount > 100000 ? [ruleMeta.R01.detail] : [] };
  });
}

function RiskBadge({ level }: { level: RiskLevel }) {
  return <span className={`risk-badge risk-${level.toLowerCase()}`}><span className="risk-dot" />{level}</span>;
}

function AppLogo() {
  return <div className="brand-mark"><ShieldCheck size={21} strokeWidth={2.5} /></div>;
}

export default function Index() {
  const [transactions, setTransactions] = useState(demoTransactions);
  const [selectedId, setSelectedId] = useState("TXN-840296");
  const [activeNav, setActiveNav] = useState("Overview");
  const [filter, setFilter] = useState("All transactions");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const suspicious = transactions.filter((transaction) => transaction.rules.length > 0);
  const selected = transactions.find((transaction) => transaction.id === selectedId) ?? suspicious[0] ?? transactions[0];
  const visible = useMemo(() => transactions.filter((transaction) => {
    const matchesSearch = `${transaction.id} ${transaction.account} ${transaction.merchant}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "All transactions" || (filter === "Flagged only" ? transaction.rules.length > 0 : transaction.level === filter.toUpperCase());
    return matchesSearch && matchesFilter;
  }), [filter, search, transactions]);
  const counts = { low: transactions.filter((t) => t.level === "LOW").length, medium: transactions.filter((t) => t.level === "MEDIUM").length, high: transactions.filter((t) => t.level === "HIGH").length };
  const totalAmount = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const loadDemo = (nullCase = false) => { setTransactions(nullCase ? normalTransactions : demoTransactions); setSelectedId(nullCase ? normalTransactions[0].id : "TXN-840296"); notify(nullCase ? "Normal dataset loaded" : "Demo investigation loaded"); };
  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const parsed = parseCsv(String(reader.result)); if (parsed.length) { setTransactions(parsed); setSelectedId(parsed[0].id); notify(`${parsed.length} transactions analyzed`); } else notify("Please upload a valid CSV with transaction_id and amount columns"); };
    reader.readAsText(file);
  };
  const download = (type: "csv" | "json") => {
    const rows = suspicious.map((transaction) => ({ transaction_id: transaction.id, account_id: transaction.account, timestamp: transaction.timestamp, amount: transaction.amount, risk_score: transaction.score, risk_level: transaction.level, triggered_rules: transaction.rules.join(" | "), explanation: transaction.reasons.join(" "), recommended_action: transaction.level === "HIGH" ? "Prioritize for manual investigation." : transaction.level === "MEDIUM" ? "Review transaction context and account activity." : "Continue routine monitoring." }));
    const content = type === "json" ? JSON.stringify({ report: "NexusRisk Investigation Report", generated_at: new Date().toISOString(), total_transactions: transactions.length, transactions_flagged: suspicious.length, findings: rows }, null, 2) : [Object.keys(rows[0] ?? { transaction_id: "" }).join(","), ...rows.map((row) => Object.values(row).map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([content], { type: type === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `nexusrisk-investigation.${type}`; link.click(); URL.revokeObjectURL(url); notify("Investigation report downloaded");
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><AppLogo /><div><div className="brand-name">Nexus<span>Risk</span></div><div className="brand-sub">INVESTIGATION ASSISTANT</div></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="main-nav">{[[BarChart3, "Overview"], [FileSearch, "Investigations"], [ShieldCheck, "Risk rules"]].map(([Icon, label]) => <button key={label as string} className={activeNav === label ? "nav-item active" : "nav-item"} onClick={() => setActiveNav(label as string)}><Icon size={17} />{label as string}{label === "Investigations" && <span className="nav-count">{suspicious.length}</span>}</button>)}</nav>
      <div className="sidebar-divider" />
      <div className="workspace-label">DATA SOURCE</div>
      <button className="upload-box" onClick={() => fileInput.current?.click()}><div className="upload-icon"><UploadCloud size={18} /></div><div><strong>Upload CSV</strong><span>Drop your transaction file</span></div><input ref={fileInput} type="file" accept=".csv" onChange={handleUpload} /></button>
      <button className="demo-button" onClick={() => loadDemo()}><Sparkles size={16} />Load demo transactions</button>
      <button className="normal-button" onClick={() => loadDemo(true)}><CheckCircle2 size={16} />Test null case</button>
      <div className="sidebar-bottom"><div className="policy-card"><div className="policy-title"><CircleHelp size={15} />Transparent policy</div><p>Every decision is deterministic, explainable, and easy to inspect.</p><div className="policy-line"><span>Rules active</span><strong>05</strong></div><div className="policy-line"><span>API dependency</span><strong className="green-text">None</strong></div></div><div className="user-row"><div className="avatar">AR</div><div><strong>Alex Rivera</strong><span>Risk investigator</span></div><ChevronDown size={15} className="user-chevron" /></div></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="breadcrumb"><span>Workspace</span><span>/</span><strong>{activeNav}</strong></div><div className="top-actions"><span className="live-status"><span />Engine online</span><button className="icon-button" aria-label="Refresh" onClick={() => notify("Analysis is up to date")}><RefreshCcw size={17} /></button><div className="top-avatar">AR</div></div></header>
      <div className="content-wrap">
        <section className="hero"><div><div className="eyebrow"><span className="eyebrow-line" />TRANSACTION INTELLIGENCE</div><h1>Good morning, Alex<span>.</span></h1><p>From raw transactions to explainable risk decisions.</p></div><div className="hero-meta"><div className="meta-label">LAST ANALYSIS</div><strong>18 Jun 2024 <span>·</span> 11:52 AM</strong><div className="meta-source"><span className="source-dot" />Demo transactions.csv</div></div></section>
        <section className="kpi-grid"><div className="kpi-card"><div className="kpi-top"><span>Total transactions</span><div className="kpi-icon blue"><ListFilter size={17} /></div></div><div className="kpi-value">{transactions.length.toLocaleString()}</div><div className="kpi-foot"><span className="trend up">↑ 12.4%</span> vs. previous analysis</div></div><div className="kpi-card"><div className="kpi-top"><span>Transactions investigated</span><div className="kpi-icon purple"><FileSearch size={17} /></div></div><div className="kpi-value">{transactions.length.toLocaleString()}</div><div className="kpi-foot"><span className="neutral">100%</span> coverage completed</div></div><div className="kpi-card highlight"><div className="kpi-top"><span>Potentially suspicious</span><div className="kpi-icon amber"><AlertTriangle size={17} /></div></div><div className="kpi-value">{suspicious.length}</div><div className="kpi-foot"><span className="trend warn">{transactions.length ? Math.round((suspicious.length / transactions.length) * 100) : 0}%</span> of total volume</div></div><div className="kpi-card"><div className="kpi-top"><span>High risk</span><div className="kpi-icon red"><Zap size={17} /></div></div><div className="kpi-value">{counts.high}</div><div className="kpi-foot"><span className="trend danger">Requires attention</span></div></div></section>

        <section className="overview-grid"><div className="panel chart-panel"><div className="panel-heading"><div><h2>Risk distribution</h2><p>Transactions by evaluated risk level</p></div><button className="more-button">Last 30 days <ChevronDown size={14} /></button></div><div className="chart-area"><div className="donut" style={{ background: `conic-gradient(#ef626d 0 ${counts.high / Math.max(transactions.length, 1) * 100}%, #f5b94c ${counts.high / Math.max(transactions.length, 1) * 100}% ${(counts.high + counts.medium) / Math.max(transactions.length, 1) * 100}%, #36b58b ${(counts.high + counts.medium) / Math.max(transactions.length, 1) * 100}% 100%)` }}><div className="donut-hole"><strong>{transactions.length}</strong><span>transactions</span></div></div><div className="chart-legend"><div><span className="legend-color green" /><span>Low risk</span><strong>{counts.low}<small>{transactions.length ? Math.round(counts.low / transactions.length * 100) : 0}%</small></strong></div><div><span className="legend-color orange" /><span>Medium risk</span><strong>{counts.medium}<small>{transactions.length ? Math.round(counts.medium / transactions.length * 100) : 0}%</small></strong></div><div><span className="legend-color red" /><span>High risk</span><strong>{counts.high}<small>{transactions.length ? Math.round(counts.high / transactions.length * 100) : 0}%</small></strong></div></div></div></div><div className="panel signal-panel"><div className="panel-heading"><div><h2>Rule signals</h2><p>Most frequently triggered policies</p></div><Gauge size={18} className="heading-icon" /></div>{Object.entries(ruleMeta).map(([id, rule], index) => <div className="signal-row" key={id}><div className={`signal-number n${index + 1}`}>{id.replace("R", "")}</div><div className="signal-info"><strong>{rule.name}</strong><span>{id} · +{rule.points} points</span></div><div className="signal-bar"><span style={{ width: `${[68, 46, 31, 23, 18][index]}%` }} /></div><strong className="signal-count">{[3, 2, 2, 1, 1][index]}</strong></div>)}</div></section>

        <section className="panel transactions-panel"><div className="panel-heading transactions-heading"><div><h2>Transaction investigation</h2><p>Review evaluated activity and inspect individual findings</p></div><div className="table-actions"><div className="search-box"><Search size={15} /><input placeholder="Search transactions" value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="filter-wrap"><Filter size={15} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>All transactions</option><option>Flagged only</option><option>High</option><option>Medium</option><option>Low</option></select></div></div></div>{suspicious.length === 0 ? <div className="null-case"><div className="null-icon"><CheckCircle2 size={30} /></div><h3>Nothing suspicious detected</h3><p>Analyzed {transactions.length} transactions. No configured risk indicators were triggered.</p><button onClick={() => loadDemo()}>Load demo dataset</button></div> : <div className="table-scroll"><table><thead><tr><th>TRANSACTION</th><th>ACCOUNT</th><th>AMOUNT</th><th>TIMESTAMP</th><th>RISK SCORE</th><th>LEVEL</th><th>TRIGGERED RULES</th><th>STATUS</th></tr></thead><tbody>{visible.map((transaction) => <tr key={transaction.id} className={selectedId === transaction.id ? "selected-row" : ""} onClick={() => setSelectedId(transaction.id)}><td><strong>{transaction.id}</strong><span className="merchant-cell">{transaction.merchant}</span></td><td>{transaction.account}</td><td><strong>₹{transaction.amount.toLocaleString("en-IN")}</strong></td><td>{transaction.timestamp}</td><td><span className="score-pill">{transaction.score}</span></td><td><RiskBadge level={transaction.level} /></td><td><div className="rule-pills">{transaction.rules.length ? transaction.rules.map((rule) => <span key={rule}>{rule}</span>) : <span className="no-signal">No indicators</span>}</div></td><td><span className={transaction.rules.length ? "status-review" : "status-clear"}>{transaction.rules.length ? "Review" : "Clear"}</span></td></tr>)}</tbody></table></div>}</section>

        <section className="lower-grid"><div className="panel report-panel"><div className="report-header"><div className="report-icon"><FileSearch size={20} /></div><div><h2>Investigation report</h2><p>Structured findings ready to share with your team.</p></div><span className="report-ready"><span />Ready</span></div><div className="report-stats"><div><span>Flagged</span><strong>{suspicious.length}</strong></div><div><span>High risk</span><strong>{counts.high}</strong></div><div><span>Review time</span><strong>~2m</strong></div></div><div className="download-actions"><button className="primary-action" onClick={() => download("csv")}><ArrowDownToLine size={16} />Download report <span>CSV</span></button><button className="secondary-action" onClick={() => download("json")}>JSON</button></div></div><div className="panel methodology-panel"><div className="panel-heading"><div><h2>How it works</h2><p>Simple, transparent, deterministic</p></div><Sparkles size={18} className="heading-icon" /></div><div className="method-step"><div className="step-icon"><UploadCloud size={16} /></div><div><strong>Upload & analyze</strong><span>CSV data is processed locally</span></div><div className="step-number">01</div></div><div className="method-step"><div className="step-icon"><Gauge size={16} /></div><div><strong>Score & explain</strong><span>5 transparent rules are evaluated</span></div><div className="step-number">02</div></div><div className="method-step"><div className="step-icon"><ShieldCheck size={16} /></div><div><strong>Investigate & report</strong><span>Prioritized findings, ready to act</span></div><div className="step-number">03</div></div></div></section>
      </div>
      <footer className="footer"><span><AppLogo /> NexusRisk <i>·</i> Built for explainable banking intelligence</span><span>Policy engine v1.0 <i>·</i> All analysis runs locally</span></footer>
    </main>
    {selected && suspicious.length > 0 && <aside className="detail-drawer"><div className="drawer-top"><div><span className="drawer-eyebrow">INVESTIGATION DETAIL</span><h2>{selected.id}</h2></div><button className="close-button" onClick={() => setSelectedId("")}><X size={17} /></button></div><div className="drawer-risk"><div><span>Risk assessment</span><strong>{selected.score}<small>/ 100</small></strong></div><RiskBadge level={selected.level} /></div><div className="drawer-section"><div className="drawer-section-title"><span>Transaction details</span><span className="verified"><CheckCircle2 size={13} /> Verified</span></div><div className="detail-grid"><div><span>Account ID</span><strong>{selected.account}</strong></div><div><span>Timestamp</span><strong>{selected.timestamp}</strong></div><div><span>Amount</span><strong>₹{selected.amount.toLocaleString("en-IN")}</strong></div><div><span>Merchant</span><strong>{selected.merchant}</strong></div><div><span>Location</span><strong><MapPin size={12} /> {selected.location}</strong></div><div><span>Device ID</span><strong><Smartphone size={12} /> {selected.device}</strong></div></div></div><div className="drawer-section"><div className="drawer-section-title"><span>Triggered rules <em>{selected.rules.length}</em></span><span className="explainable"><Sparkles size={12} /> Explainable</span></div>{selected.rules.map((rule, index) => <div className="rule-detail" key={rule}><div className="rule-detail-top"><span className="rule-id">{rule}</span><strong>{ruleMeta[rule as keyof typeof ruleMeta].name}</strong><span className="rule-points">+{ruleMeta[rule as keyof typeof ruleMeta].points}</span></div><p>{selected.reasons[index]}</p></div>)}</div><div className="recommendation"><div className="recommendation-icon"><AlertTriangle size={16} /></div><div><span>RECOMMENDED ACTION</span><strong>{selected.level === "HIGH" ? "Prioritize for manual investigation." : "Review transaction context and account activity."}</strong></div></div><button className="drawer-action" onClick={() => notify("Marked for review")}>Mark as under review <ArrowDownToLine size={15} /></button></aside>}
    {toast && <div className="toast"><CheckCircle2 size={16} />{toast}</div>}
  </div>;
}
