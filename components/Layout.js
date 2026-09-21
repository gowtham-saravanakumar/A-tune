import Link from "next/link";
import { useRouter } from "next/router";
import PlayerBar from "./PlayerBar";

const HomeI = (p) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 11l9-8 9 8" />
    <path d="M5 10v10h14V10" />
  </svg>
);
const LibraryI = (p) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="4" width="7" height="16" rx="1" />
    <rect x="14" y="4" width="7" height="16" rx="1" />
  </svg>
);

const NAV = [
  { href: "/", label: "Home", Icon: HomeI },
  { href: "/library", label: "Library", Icon: LibraryI },
];

export default function Layout({ children }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-base text-ptext flex">
      {/* Desktop sidebar */}
      <aside className="hidden sm:flex w-56 shrink-0 flex-col border-r border-border bg-elevated p-4 pb-24">
        <Link href="/" className="flex items-center gap-2 mb-8 px-1">
          <span className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-black font-bold">A</span>
          <span className="font-semibold tracking-tight">A-tune</span>
        </Link>
        <nav className="space-y-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = router.pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  active ? "bg-cardhover text-ptext" : "text-muted hover:text-ptext"
                }`}
              >
                <Icon />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="sm:hidden flex items-center gap-2 px-4 py-3 border-b border-border bg-elevated">
          <span className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-black font-bold text-sm">A</span>
          <span className="font-semibold">A-tune</span>
        </div>

        <main className="flex-1 min-w-0 pb-24 px-4 sm:px-6 pt-5">{children}</main>

        {/* Mobile bottom nav, sits just above the player bar */}
        <nav className="sm:hidden fixed bottom-16 left-0 right-0 flex justify-around bg-elevated border-t border-border z-30">
          {NAV.map(({ href, label, Icon }) => {
            const active = router.pathname === href;
            return (
              <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-1.5 text-[10px] ${active ? "text-accent" : "text-muted"}`}>
                <Icon />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <PlayerBar />
    </div>
  );
}
