import { Waves } from 'lucide-react';

interface HeaderProps {
  onHome: () => void;
  compact?: boolean;
}

export default function Header({ onHome, compact = false }: HeaderProps) {
  return (
    <header
      className={`sticky top-0 z-40 border-b border-white/10 bg-ink-950/80 backdrop-blur-xl transition-all ${
        compact ? 'py-3' : 'py-4'
      }`}
    >
      <div className="container-page flex items-center justify-between">
        <button
          onClick={onHome}
          className="group flex items-center gap-2.5 focus:outline-none"
          aria-label="Floodmate home"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-glow transition-transform group-hover:scale-105">
            <Waves className="h-5 w-5 text-white" strokeWidth={2.4} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg font-extrabold tracking-tight text-white">
              Flood<span className="text-aqua-400">mate</span>
            </span>
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-300">
              Predict · Assess · Act
            </span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {[
            { label: 'How it works', href: '#how' },
            { label: 'Data sources', href: '#sources' },
            { label: 'About', href: '#about' },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-200 transition-colors hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <button
          onClick={onHome}
          className="btn-primary !px-4 !py-2 !text-xs"
        >
          Assess a location
        </button>
      </div>
    </header>
  );
}
