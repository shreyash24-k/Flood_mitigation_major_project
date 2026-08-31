import { Waves, Github, Mail, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-ink-950 text-ink-300">
      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700">
                <Waves className="h-5 w-5 text-white" strokeWidth={2.4} />
              </span>
              <span className="font-display text-lg font-extrabold tracking-tight text-white">
                Flood<span className="text-aqua-400">mate</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-400">
              A flood prediction and risk-assessment platform that blends satellite
              imagery, rainfall telemetry, elevation models and machine learning to
              keep communities one step ahead of the water.
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs text-ink-400">
              <ShieldCheck className="h-4 w-4 text-brand-400" />
              Built for disaster preparedness & early warning.
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-200">
              Platform
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><a href="#how" className="hover:text-white transition-colors">How it works</a></li>
              <li><a href="#sources" className="hover:text-white transition-colors">Data sources</a></li>
              <li><a href="#about" className="hover:text-white transition-colors">About the model</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-200">
              Emergency
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li className="flex items-center gap-2"><span className="text-brand-400">Fire</span> — 101</li>
              <li className="flex items-center gap-2"><span className="text-brand-400">Ambulance</span> — 102</li>
              <li className="flex items-center gap-2"><span className="text-brand-400">Disaster</span> — 1070</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-ink-400 sm:flex-row">
          <p>© {new Date().getFullYear()} Floodmate. For demonstration & preparedness use.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Github className="h-4 w-4" /> Source
            </a>
            <a href="#" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Mail className="h-4 w-4" /> Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
