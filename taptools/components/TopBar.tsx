import Link from "next/link";

export default function TopBar({ title, admin }: { title?: string; admin?: boolean }) {
  return (
    <header className="topbar">
      <div className="wrap">
        <Link href={admin ? "/admin" : "/dashboard"} className="logo">
          tap<span>tools</span>
        </Link>
        {admin && <span className="pill">Admin</span>}
        <span className="spacer" />
        {title && <span className="who">{title}</span>}
      </div>
    </header>
  );
}
