import { useState } from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { Card, Breadcrumb, ApiNotReady } from './shared';
import { tickets } from './data';

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'high', label: '高额优先' },
  { key: 'long', label: '等待最久' },
  { key: 'US', label: 'US' },
  { key: 'EU', label: 'EU' },
  { key: 'CN', label: 'CN' },
];

export function Reviews({ onOpen }: { onOpen: (id: string) => void }) {
  const pending = tickets.filter((t) => t.status === 'SUSPENDED');
  const [tab, setTab] = useState('all');

  let list = pending;
  if (tab === 'high') list = [...pending].sort((a, b) => b.amount - a.amount);
  else if (tab === 'long') list = [...pending].sort((a, b) => (a.waitTime! > b.waitTime! ? -1 : 1));
  else if (['US', 'EU', 'CN'].includes(tab)) list = pending.filter((t) => t.region === tab);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Breadcrumb items={['仪表盘', '审批中心']} />
        <span
          className="rounded-full px-3 py-1"
          style={{ background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 500 }}
        >
          待处理 {pending.length} 件
        </span>
      </div>
      <div className="flex items-center gap-3 mb-6">
        <h1 style={{ color: '#111827' }}>审批中心</h1>
        <ApiNotReady label="审批列表接口未开发" />
      </div>

      <div className="flex items-center gap-1 mb-5 border-b" style={{ borderColor: '#E5E7EB' }}>
        {tabs.map((t) => {
          const active = tab === t.key;
          const count = t.key === 'all' ? pending.length : t.key === 'high' ? pending.filter((p) => p.amount >= 300).length : t.key === 'long' ? 1 : pending.filter((p) => p.region === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-2.5 transition-colors"
              style={{
                color: active ? '#4F46E5' : '#6B7280',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                borderBottom: active ? '2px solid #4F46E5' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {list.map((t) => (
          <Card key={t.id} className="p-5" onClick={() => onOpen(t.id)}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#111827', fontWeight: 500 }}>{t.id}</span>
                <span style={{ fontSize: 13, color: '#6B7280' }}>{t.event} · {t.region} · {t.tier}</span>
              </div>
              <div className="flex items-center gap-1.5" style={{ color: '#D97706', fontSize: 12, fontWeight: 500 }}>
                <Clock size={13} />
                等待 {t.waitTime}
              </div>
            </div>
            <div className="space-y-1.5">
              <div style={{ fontSize: 13 }}>
                <span style={{ color: '#6B7280' }}>索赔金额：</span>
                <span style={{ color: '#111827', fontWeight: 600 }}>{t.currency} {t.amount.toFixed(2)}</span>
              </div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: '#6B7280' }}>AI 方案：</span>
                <span style={{ color: '#111827' }}>"{t.solution}"</span>
              </div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: '#6B7280' }}>升级原因：</span>
                <span style={{ color: '#7C3AED' }}>{t.reason}</span>
              </div>
            </div>
            <div className="flex justify-end mt-3 pt-3 border-t" style={{ borderColor: '#E5E7EB' }}>
              <span className="flex items-center gap-1" style={{ color: '#4F46E5', fontSize: 13, fontWeight: 500 }}>
                查看详情 <ChevronRight size={14} />
              </span>
            </div>
          </Card>
        ))}
        {list.length === 0 && (
          <Card className="p-12 text-center">
            <div style={{ fontSize: 40 }}>✓</div>
            <div className="mt-2" style={{ color: '#6B7280' }}>所有工单已审批完毕</div>
          </Card>
        )}
      </div>
    </div>
  );
}
