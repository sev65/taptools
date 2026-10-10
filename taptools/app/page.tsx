import Link from "next/link";

// Placeholder. The Phase 1 marketing site goes here; analytics lives at /dashboard.
export default function Home() {
  return (
    <main className="center">
      <div className="narrow" style={{ textAlign: "center" }}>
        <p className="logo" style={{ fontSize: 28, margin: 0 }}>tap<span>tools</span></p>
        <p className="sub" style={{ margin: "8px 0 20px" }}>Tap-to-review cards for local businesses.</p>
        <Link className="btn" href="/dashboard">View dashboards</Link>
      </div>
    </main>
  );
}
