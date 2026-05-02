import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, ApiNotReady } from './shared';
import { pipelineNodes, tickets, statusShare, statusMeta } from './data';
import { StatusBadge } from './shared';
import { PageKey } from './Sidebar';

const kpis = [
  { label: '今日处理', value: '156', sub: '较昨日 +12', color: '#111827' },
  { label: '自动通过率', value: '87.3%', sub: '↑ 2.1pp', color: '#059669' },
  { label: '平均耗时', value: '38s', sub: '↓ 5s', color: '#111827' },
  { label: '待审工单', value: '4', sub: '需关注', color: '#DC2626', alert: true },
];

export function Dashboard({ onNav, onOpenTicket }: { onNav: (k: PageKey) => void; onOpenTicket: (id: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-3">
          <h1 style={{ color: '#111827' }}>仪表盘</h1>
          <ApiNotReady label="仪表盘数据接口未开发" />
        </div>
        <span style={{ color: '#6B7280', fontSize: 13 }}>数据每 30 秒自动刷新 · 最近更新 12s 前</span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card
            key={k.label}
            className="p-5"
            onClick={k.alert ? () => onNav('reviews') : undefined}
          >
            <div className="flex items-center justify-between">
              <span style={{ color: '#6B7280', fontSize: 13 }}>{k.label}</span>
              {k.alert && <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#DC2626' }} />}
            </div>
            <div className="mt-2" style={{ color: k.color, fontSize: 32, fontWeight: 700, lineHeight: 1.1 }}>
              {k.value}
            </div>
            <div className="mt-1" style={{ color: '#6B7280', fontSize: 12 }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 style={{ color: '#111827' }}>实时管道可视化</h2>
            <ApiNotReady label="管道状态接口未开发" />
          </div>
          <span style={{ color: '#6B7280', fontSize: 13 }}>当前并行处理 · <span style={{ color: '#4F46E5', fontWeight: 600 }}>7</span> 条</span>
        </div>
        <div className="flex items-center justify-between px-4">
          {pipelineNodes.map((n, i) => {
            const active = i === 2;
            const done = i < 2;
            return (
              <div key={n.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center" style={{ minWidth: 80 }}>
                  <div
                    className="rounded-full flex items-center justify-center relative"
                    style={{
                      width: 48,
                      height: 48,
                      background: done ? '#059669' : active ? '#4F46E5' : '#fff',
                      border: active ? '2px solid #4F46E5' : done ? 'none' : '2px solid #E5E7EB',
                      color: done || active ? '#fff' : '#9CA3AF',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {i + 1}
                    {active && (
                      <span
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{ background: '#4F46E5', opacity: 0.3 }}
                      />
                    )}
                  </div>
                  <div className="mt-2 text-center" style={{ fontSize: 12, color: '#111827', fontWeight: 500 }}>{n.name}</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{n.duration}</div>
                </div>
                {i < pipelineNodes.length - 1 && (
                  <div
                    className="flex-1 h-px mx-2"
                    style={{ background: done ? '#059669' : '#E5E7EB' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 style={{ color: '#111827' }}>最近工单</h2>
              <ApiNotReady label="工单列表接口未开发" />
            </div>
            <button onClick={() => onNav('workflows')} style={{ color: '#4F46E5', fontSize: 13 }}>
              查看全部 →
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: '#E5E7EB' }}>
            {tickets.slice(0, 8).map((t) => (
              <div
                key={t.id}
                onClick={() => onOpenTicket(t.id)}
                className="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded"
              >
                <div className="flex items-center gap-3">
                  <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#111827' }}>{t.id}</span>
                  <StatusBadge status={t.status} />
                </div>
                <div className="flex items-center gap-4" style={{ fontSize: 13, color: '#6B7280' }}>
                  <span>{t.event}</span>
                  <span style={{ color: '#111827' }}>{t.currency} {t.amount}</span>
                  <span style={{ minWidth: 40, textAlign: 'right' }}>{t.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ color: '#111827' }}>状态分布 · 24h</h2>
            <ApiNotReady label="统计接口未开发" />
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusShare} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {statusShare.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {statusShare.map((s) => (
              <div key={s.name} className="flex items-center justify-between" style={{ fontSize: 12 }}>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  <span style={{ color: '#6B7280' }}>{statusMeta[s.name as keyof typeof statusMeta].label}</span>
                </div>
                <span style={{ color: '#111827', fontWeight: 500 }}>{s.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
