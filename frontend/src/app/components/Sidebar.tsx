import { LayoutDashboard, Inbox, ShieldCheck, BarChart3, BookOpen, Settings, ChevronLeft } from 'lucide-react';

export type PageKey = 'dashboard' | 'workflows' | 'reviews' | 'analytics' | 'policies' | 'settings';

const items: { key: PageKey; label: string; Icon: any }[] = [
  { key: 'dashboard', label: '仪表盘', Icon: LayoutDashboard },
  { key: 'workflows', label: '工单中心', Icon: Inbox },
  { key: 'reviews', label: '审批中心', Icon: ShieldCheck },
  { key: 'analytics', label: '分析报表', Icon: BarChart3 },
  { key: 'policies', label: '策略库', Icon: BookOpen },
  { key: 'settings', label: '系统设置', Icon: Settings },
];

export function Sidebar({
  current,
  onNav,
  collapsed,
  onToggle,
  pendingReviews,
}: {
  current: PageKey;
  onNav: (k: PageKey) => void;
  collapsed: boolean;
  onToggle: () => void;
  pendingReviews: number;
}) {
  return (
    <aside
      className="flex-shrink-0 border-r bg-white flex flex-col transition-all"
      style={{ width: collapsed ? 80 : 240, borderColor: '#E5E7EB' }}
    >
      <div className="flex items-center gap-2 px-5 border-b" style={{ height: 64, borderColor: '#E5E7EB' }}>
        <div
          className="h-8 w-8 rounded-md flex items-center justify-center text-white flex-shrink-0"
          style={{ background: '#4F46E5', fontSize: 14, fontWeight: 600 }}
        >
          AI
        </div>
        {!collapsed && <span style={{ fontWeight: 600, color: '#111827' }}>电商智能体平台</span>}
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map(({ key, label, Icon }) => {
          const active = current === key;
          const showDot = key === 'reviews' && pendingReviews > 0;
          return (
            <button
              key={key}
              onClick={() => onNav(key)}
              className="w-full flex items-center gap-3 px-3 h-10 rounded-md transition-colors relative"
              style={{
                background: active ? '#EEF2FF' : 'transparent',
                color: active ? '#4F46E5' : '#6B7280',
                fontSize: 14,
                fontWeight: active ? 500 : 400,
              }}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="flex-1 text-left">{label}</span>}
              {!collapsed && showDot && (
                <span
                  className="rounded-full px-1.5"
                  style={{ background: '#DC2626', color: '#fff', fontSize: 11, minWidth: 20, textAlign: 'center' }}
                >
                  {pendingReviews}
                </span>
              )}
              {collapsed && showDot && (
                <span className="absolute top-1 right-2 h-2 w-2 rounded-full" style={{ background: '#DC2626' }} />
              )}
            </button>
          );
        })}
      </nav>
      <button
        onClick={onToggle}
        className="flex items-center justify-center border-t h-12 transition-colors hover:bg-gray-50"
        style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
      >
        <ChevronLeft size={16} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
      </button>
    </aside>
  );
}
