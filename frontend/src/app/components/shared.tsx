import { statusMeta, TicketStatus } from './data';

export function ApiNotReady({ label = '接口未开发' }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-2 py-0.5"
      style={{
        background: '#FEF3C7',
        color: '#92400E',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.3,
        border: '1px solid #FDE68A',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 13, lineHeight: 1 }}>!</span>
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  const m = statusMeta[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5"
      style={{ background: m.bg, color: m.fg, fontSize: 12, fontWeight: 500 }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

export function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-lg ${onClick ? 'cursor-pointer transition-shadow hover:shadow-md' : ''} ${className}`}
      style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {children}
    </div>
  );
}

export function Breadcrumb({ items }: { items: string[] }) {
  return (
    <div style={{ color: '#6B7280', fontSize: 13 }} className="mb-4">
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-2">/</span>}
          <span style={{ color: i === items.length - 1 ? '#111827' : '#6B7280' }}>{it}</span>
        </span>
      ))}
    </div>
  );
}

export function Button({
  children,
  variant = 'primary',
  onClick,
  disabled,
  className = '',
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'danger' | 'secondary' | 'ghost';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: '#4F46E5', color: '#fff' },
    success: { background: '#059669', color: '#fff' },
    danger: { background: '#DC2626', color: '#fff' },
    secondary: { background: '#fff', color: '#4F46E5', border: '1px solid #4F46E5' },
    ghost: { background: 'transparent', color: '#6B7280' },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-md px-4 h-10 transition-opacity ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'} ${className}`}
      style={{ ...styles[variant], fontSize: 14 }}
    >
      {children}
    </button>
  );
}
