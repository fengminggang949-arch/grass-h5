import Link from "next/link";

export function MobileShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <main className={`mobile-shell ${className}`}>{children}</main>;
}

export function PageHeader({ title, backHref }: { title?: string; backHref: string }) {
  return <header className="topbar"><Link className="back" href={backHref} aria-label="返回">‹</Link>{title && <h2>{title}</h2>}</header>;
}

export function BottomDock({ children }: { children: React.ReactNode }) { return <div className="dock">{children}</div>; }
