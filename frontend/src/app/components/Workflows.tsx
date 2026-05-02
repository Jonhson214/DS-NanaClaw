import { useState, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { Card, StatusBadge, Breadcrumb, ApiNotReady } from './shared';
import { tickets, TicketStatus } from './data';

const STATUSES: (TicketStatus | 'ALL')[] = ['ALL', 'COMPLETED', 'SUSPENDED', 'FAILED', 'CANCELLED', 'PENDING'];

export function Workflows({ onOpen }: { onOpen: (id: string) => void }) {
  const [status, setStatus] = useState<TicketStatus | 'ALL'>('ALL');
  const [region, setRegion] = useState<string>('ALL');
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () =>
      tickets.filter(
        (t) =>
          (status === 'ALL' || t.status === status) &&
          (region === 'ALL' || t.region === region) &&
          (!query || t.id.toLowerCase().includes(query.toLowerCase()))
      ),
    [status, region, query]
  );

  return (
    <div>
      <Breadcrumb items={['仪表盘', '工单中心']} />
      <div className="flex items-center gap-3 mb-6">
        <h1 style={{ color: '#111827' }}>工单中心</h1>
        <ApiNotReady label="工单列表/搜索/分页接口未开发" />
      </div>

      <Card className="p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Select label="状态" value={status} options={STATUSES.map((s) => ({ v: s, l: s === 'ALL' ? '全部状态' : s }))} onChange={(v) => setStatus(v as any)} />
          <Select label="区域" value={region} options={[{ v: 'ALL', l: '全部区域' }, { v: 'US', l: 'US' }, { v: 'EU', l: 'EU' }, { v: 'CN', l: 'CN' }]} onChange={setRegion} />
          <Select label="事件类型" value="ALL" options={[{ v: 'ALL', l: '全部类型' }, { v: '差评', l: '差评' }, { v: '退款请求', l: '退款请求' }, { v: '投诉', l: '投诉' }]} onChange={() => {}} />
          <div className="flex-1" />
          <div
            className="flex items-center gap-2 px-3 rounded-md border"
            style={{ borderColor: '#D1D5DB', height: 36, width: 260 }}
          >
            <Search size={15} style={{ color: '#9CA3AF' }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索订单号"
              className="bg-transparent outline-none flex-1"
              style={{ fontSize: 13 }}
            />
          </div>
        </div>
      </Card>

      <Card>
        <table className="w-full">
          <thead>
            <tr style={{ background: '#F9FAFB' }}>
              {['订单号', '事件类型', '区域', '金额', '状态', '耗时', '创建时间'].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 border-b"
                  style={{ fontSize: 11, color: '#6B7280', fontWeight: 500, letterSpacing: 0.5, textTransform: 'uppercase', borderColor: '#E5E7EB' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr
                key={t.id}
                onClick={() => onOpen(t.id)}
                className="cursor-pointer border-b hover:bg-gray-50"
                style={{ borderColor: '#E5E7EB' }}
              >
                <td className="px-4 py-3.5" style={{ fontFamily: 'monospace', fontSize: 13, color: '#111827' }}>{t.id}</td>
                <td className="px-4 py-3.5" style={{ fontSize: 14, color: '#111827' }}>{t.event}</td>
                <td className="px-4 py-3.5" style={{ fontSize: 14, color: '#6B7280' }}>{t.region}</td>
                <td className="px-4 py-3.5 text-right" style={{ fontSize: 14, color: '#111827' }}>{t.currency} {t.amount}</td>
                <td className="px-4 py-3.5"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-3.5" style={{ fontSize: 14, color: '#6B7280' }}>{t.duration}</td>
                <td className="px-4 py-3.5" style={{ fontSize: 13, color: '#6B7280' }}>{t.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3" style={{ fontSize: 13, color: '#6B7280' }}>
          <span>共 {filtered.length} 条</span>
          <div className="flex items-center gap-1">
            <button className="px-2 h-7 rounded border" style={{ borderColor: '#E5E7EB' }}>←</button>
            <button className="px-2.5 h-7 rounded text-white" style={{ background: '#4F46E5' }}>1</button>
            <button className="px-2.5 h-7 rounded border" style={{ borderColor: '#E5E7EB' }}>2</button>
            <button className="px-2.5 h-7 rounded border" style={{ borderColor: '#E5E7EB' }}>3</button>
            <button className="px-2 h-7 rounded border" style={{ borderColor: '#E5E7EB' }}>→</button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Select({ value, options, onChange }: { label: string; value: string; options: { v: string; l: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-md border px-3 pr-8 outline-none"
        style={{ borderColor: '#D1D5DB', height: 36, fontSize: 13, color: '#111827', background: '#fff' }}
      >
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#6B7280' }} />
    </div>
  );
}
