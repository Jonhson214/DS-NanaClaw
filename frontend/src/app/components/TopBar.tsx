import { Search, Bell } from 'lucide-react';

export function TopBar({ pendingReviews }: { pendingReviews: number }) {
  return (
    <header
      className="flex items-center justify-between px-6 border-b bg-white flex-shrink-0"
      style={{ height: 64, borderColor: '#E5E7EB' }}
    >
      <div className="flex items-center gap-3" style={{ color: '#6B7280', fontSize: 13 }}>
        <span>电商 AI 智能工单运营平台</span>
      </div>
      <div className="flex items-center gap-4">
        <div
          className="flex items-center gap-2 px-3 rounded-md border"
          style={{ borderColor: '#D1D5DB', height: 36, background: '#F9FAFB', width: 280 }}
        >
          <Search size={16} style={{ color: '#9CA3AF' }} />
          <input
            placeholder="搜索订单号、客户 ID..."
            className="bg-transparent outline-none flex-1"
            style={{ fontSize: 13, color: '#111827' }}
          />
        </div>
        <button className="relative p-2 rounded-md hover:bg-gray-50">
          <Bell size={18} style={{ color: '#6B7280' }} />
          {pendingReviews > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full" style={{ background: '#DC2626' }} />
          )}
        </button>
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-white"
          style={{ background: '#4F46E5', fontSize: 12, fontWeight: 500 }}
        >
          YW
        </div>
      </div>
    </header>
  );
}
