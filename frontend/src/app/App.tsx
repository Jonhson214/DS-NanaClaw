import { useState } from 'react';
import { Sidebar, PageKey } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './components/Dashboard';
import { Workflows } from './components/Workflows';
import { TicketDetail } from './components/TicketDetail';
import { Reviews } from './components/Reviews';
import { ReviewDetail } from './components/ReviewDetail';
import { Analytics } from './components/Analytics';
import { Policies } from './components/Policies';
import { SettingsPage } from './components/Settings';
import { tickets } from './components/data';

type View =
  | { type: 'page'; key: PageKey }
  | { type: 'ticket'; id: string }
  | { type: 'review'; id: string };

export default function App() {
  const [view, setView] = useState<View>({ type: 'page', key: 'dashboard' });
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const pendingReviews = tickets.filter((t) => t.status === 'SUSPENDED').length;

  const nav = (k: PageKey) => setView({ type: 'page', key: k });
  const openTicket = (id: string) => setView({ type: 'ticket', id });
  const openReview = (id: string) => setView({ type: 'review', id });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
    setTimeout(() => setView({ type: 'page', key: 'reviews' }), 1500);
  };

  const currentKey: PageKey =
    view.type === 'page' ? view.key : view.type === 'ticket' ? 'workflows' : 'reviews';

  return (
    <div className="flex h-screen" style={{ background: '#F9FAFB', fontFamily: '"Noto Sans SC","PingFang SC","Inter",sans-serif' }}>
      <Sidebar
        current={currentKey}
        onNav={nav}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        pendingReviews={pendingReviews}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar pendingReviews={pendingReviews} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto p-6" style={{ maxWidth: 1440 }}>
            {view.type === 'page' && view.key === 'dashboard' && <Dashboard onNav={nav} onOpenTicket={openTicket} />}
            {view.type === 'page' && view.key === 'workflows' && <Workflows onOpen={openTicket} />}
            {view.type === 'page' && view.key === 'reviews' && <Reviews onOpen={openReview} />}
            {view.type === 'page' && view.key === 'analytics' && <Analytics />}
            {view.type === 'page' && view.key === 'policies' && <Policies />}
            {view.type === 'page' && view.key === 'settings' && <SettingsPage />}
            {view.type === 'ticket' && <TicketDetail id={view.id} onBack={() => nav('workflows')} />}
            {view.type === 'review' && <ReviewDetail id={view.id} onBack={() => nav('reviews')} onDone={showToast} />}
          </div>
        </main>
      </div>

      {toast && (
        <div
          className="fixed rounded-lg px-4 py-3 bg-white border-l-4 shadow-lg"
          style={{
            top: 80,
            right: 24,
            width: 360,
            borderLeftColor: '#059669',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            animation: 'slideInRight 300ms ease',
            fontSize: 14,
            color: '#111827',
          }}
        >
          {toast}
        </div>
      )}
      <style>{`@keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
}
