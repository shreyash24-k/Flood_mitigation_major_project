import { Flame, HeartPulse, Shield, Siren, LifeBuoy, Phone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { EmergencyContact } from '@/lib/types';

const CATEGORY_META: Record<EmergencyContact['category'], { icon: LucideIcon; color: string }> = {
  fire: { icon: Flame, color: '#DC2626' },
  ambulance: { icon: HeartPulse, color: '#E11D48' },
  police: { icon: Shield, color: '#2563EB' },
  disaster: { icon: Siren, color: '#F59E0B' },
  rescue: { icon: LifeBuoy, color: '#0891B2' },
};

interface EmergencyContactsProps {
  contacts: EmergencyContact[];
  dark?: boolean;
}

export default function EmergencyContacts({ contacts, dark = false }: EmergencyContactsProps) {
  return (
    <div className={dark ? 'card-dark overflow-hidden' : 'card overflow-hidden'}>
      <div className={`flex items-center gap-3 border-b px-5 py-4 ${dark ? 'border-white/10 bg-risk-severe/10' : 'border-ink-100 bg-risk-severe/5'}`}>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-risk-severe/10 text-risk-severe">
          <Siren className="h-5 w-5" />
        </span>
        <div>
          <h3 className={`font-display text-base font-bold ${dark ? 'text-white' : 'text-ink-900'}`}>Emergency & Help</h3>
          <p className={`text-xs ${dark ? 'text-ink-400' : 'text-ink-500'}`}>Tap to call — available 24/7</p>
        </div>
      </div>

      <ul className={dark ? 'divide-y divide-white/10' : 'divide-y divide-ink-100'}>
        {contacts.map((c) => {
          const meta = CATEGORY_META[c.category];
          const Icon = meta.icon;
          return (
            <li key={c.id}>
              <a
                href={`tel:${c.phone}`}
                className={`group flex items-center gap-4 px-5 py-3.5 transition-colors ${dark ? 'hover:bg-white/5' : 'hover:bg-ink-50'}`}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${dark ? 'text-white' : 'text-ink-900'}`}>{c.name}</p>
                  <p className={`text-xs ${dark ? 'text-ink-400' : 'text-ink-500'}`}>{c.available} · disaster-grade response</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-display text-lg font-bold tabular-nums ${dark ? 'text-white' : 'text-ink-900'}`}>
                    {c.phone}
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white transition-transform group-hover:scale-110">
                    <Phone className="h-4 w-4" />
                  </span>
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
