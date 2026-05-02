import { useState } from 'react';
import { FileText, Plus, X, Upload, ArrowLeft, Calendar, User, TrendingUp, RefreshCw, Download } from 'lucide-react';
import { Card, Button, Breadcrumb, ApiNotReady } from './shared';
import { policies, Policy } from './data';

export function Policies() {
  const [showUpload, setShowUpload] = useState(false);
  const [selected, setSelected] = useState<Policy | null>(null);

  if (selected) return <PolicyDetail policy={selected} onBack={() => setSelected(null)} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Breadcrumb items={['仪表盘', '策略库']} />
        <div className="flex items-center gap-2">
          <ApiNotReady label="策略上传接口未开发" />
          <Button onClick={() => setShowUpload(true)} disabled>
            <Plus size={16} /> 上传新策略
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-6">
        <h1 style={{ color: '#111827' }}>策略库</h1>
        <ApiNotReady label="策略列表/搜索接口未开发" />
      </div>

      <Card className="p-4 mb-4">
        <div className="flex items-center gap-3">
          <select className="rounded-md border px-3 outline-none" style={{ height: 36, borderColor: '#D1D5DB', fontSize: 13 }}>
            <option>全部区域</option><option>US</option><option>EU</option><option>CN</option>
          </select>
          <select className="rounded-md border px-3 outline-none" style={{ height: 36, borderColor: '#D1D5DB', fontSize: 13 }}>
            <option>全部分类</option><option>电子</option><option>服装</option><option>通用</option><option>VIP</option>
          </select>
          <select className="rounded-md border px-3 outline-none" style={{ height: 36, borderColor: '#D1D5DB', fontSize: 13 }}>
            <option>全部类型</option><option>退款</option><option>换货</option><option>VIP</option>
          </select>
          <div className="flex-1" />
          <input
            placeholder="搜索策略名称"
            className="rounded-md border px-3 outline-none"
            style={{ height: 36, borderColor: '#D1D5DB', fontSize: 13, width: 240 }}
          />
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {policies.map((p) => (
          <Card key={p.id} className="p-5" onClick={() => setSelected(p)}>
            <div className="flex items-start justify-between mb-3">
              <div className="h-10 w-10 rounded-md flex items-center justify-center" style={{ background: '#EEF2FF' }}>
                <FileText size={18} style={{ color: '#4F46E5' }} />
              </div>
              <span className="rounded px-2 py-0.5" style={{ background: '#F3F4F6', color: '#6B7280', fontSize: 11, fontWeight: 500 }}>
                {p.version}
              </span>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#6B7280' }}>{p.id}</div>
            <div className="mt-1" style={{ fontSize: 15, color: '#111827', fontWeight: 500 }}>{p.title}</div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Tag>{p.region}</Tag>
              <Tag>{p.category}</Tag>
              <Tag>{p.applicableTier}</Tag>
            </div>
            <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: '#E5E7EB', fontSize: 12, color: '#6B7280' }}>
              <span>{p.updated}</span>
              <span>{p.chunks} chunks · 命中 {p.usage.hitRate}</span>
            </div>
          </Card>
        ))}
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </div>
  );
}

function PolicyDetail({ policy: p, onBack }: { policy: Policy; onBack: () => void }) {
  return (
    <div>
      <Breadcrumb items={['仪表盘', '策略库', p.id]} />
      <button onClick={onBack} className="flex items-center gap-1 mb-4" style={{ color: '#4F46E5', fontSize: 13 }}>
        <ArrowLeft size={14} /> 返回策略库
      </button>

      <Card className="p-6 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EEF2FF' }}>
              <FileText size={22} style={{ color: '#4F46E5' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6B7280' }}>{p.id}</span>
                <ApiNotReady label="策略详情接口未开发" />
              </div>
              <h1 className="mt-1" style={{ color: '#111827' }}>{p.title}</h1>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <Tag>{p.region}</Tag>
                <Tag>{p.category}</Tag>
                <Tag>{p.applicableTier}</Tag>
                <Tag>{p.strategyType}</Tag>
                <span className="rounded px-2 py-0.5" style={{ background: '#EEF2FF', color: '#4F46E5', fontSize: 11, fontWeight: 500 }}>
                  {p.version}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex flex-col items-end gap-1">
              <div className="flex gap-2">
                <Button variant="secondary" disabled><Download size={14} /> 导出</Button>
                <Button variant="secondary" disabled><RefreshCw size={14} /> 重新索引</Button>
              </div>
              <div className="flex gap-1">
                <ApiNotReady label="导出接口未开发" />
                <ApiNotReady label="重新索引接口未开发" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t" style={{ borderColor: '#E5E7EB' }}>
          <MetaItem icon={<User size={14} />} label="维护人" value={p.author} />
          <MetaItem icon={<Calendar size={14} />} label="生效日期" value={p.effectiveDate} />
          <MetaItem icon={<TrendingUp size={14} />} label="近 7 日引用" value={`${p.usage.last7d} 次`} />
          <MetaItem label="自动审批上限" value={p.autoApproveLimit} highlight />
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <Card className="p-6">
            <h2 className="mb-3" style={{ color: '#111827' }}>策略摘要</h2>
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>{p.summary}</p>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4" style={{ color: '#111827' }}>判定规则</h2>
            <div className="overflow-hidden rounded-md border" style={{ borderColor: '#E5E7EB' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    <th className="text-left px-4 py-2.5" style={{ fontSize: 11, color: '#6B7280', fontWeight: 500, letterSpacing: 0.5, textTransform: 'uppercase' }}>条件</th>
                    <th className="text-left px-4 py-2.5" style={{ fontSize: 11, color: '#6B7280', fontWeight: 500, letterSpacing: 0.5, textTransform: 'uppercase' }}>动作</th>
                  </tr>
                </thead>
                <tbody>
                  {p.rules.map((r, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: '#E5E7EB' }}>
                      <td className="px-4 py-3" style={{ fontSize: 13, color: '#111827' }}>{r.condition}</td>
                      <td className="px-4 py-3" style={{ fontSize: 13, color: '#4F46E5', fontWeight: 500 }}>{r.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-3" style={{ color: '#111827' }}>策略原文</h2>
            <div
              className="rounded-md p-4 whitespace-pre-line"
              style={{ background: '#F9FAFB', fontSize: 13, color: '#374151', lineHeight: 1.8, borderLeft: '3px solid #4F46E5' }}
            >
              {p.body}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ color: '#111827' }}>切片预览</h2>
              <span style={{ fontSize: 12, color: '#6B7280' }}>共 {p.chunks} 个 chunks，展示前 {p.chunkList.length} 个</span>
            </div>
            <div className="space-y-2">
              {p.chunkList.map((c) => (
                <div key={c.idx} className="rounded-md border p-3" style={{ borderColor: '#E5E7EB' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="rounded px-1.5"
                      style={{ background: '#EEF2FF', color: '#4F46E5', fontSize: 11, fontFamily: 'monospace', fontWeight: 500 }}
                    >
                      #{c.idx}
                    </span>
                    <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{c.title}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginLeft: 2 }}>{c.text}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3" style={{ color: '#111827' }}>使用统计</h3>
            <div className="space-y-3">
              <StatRow label="近 7 日 RAG 引用" value={`${p.usage.last7d} 次`} />
              <StatRow label="命中率" value={p.usage.hitRate} success />
              <StatRow label="切片数量" value={`${p.chunks}`} />
              <StatRow label="向量库" value="Milvus / policies-v3" small />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3" style={{ color: '#111827' }}>版本历史</h3>
            <div className="space-y-3">
              {p.versionHistory.map((v, i) => (
                <div key={v.version} className="flex gap-3">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: i === 0 ? '#4F46E5' : '#D1D5DB' }}
                    />
                    {i < p.versionHistory.length - 1 && <div className="flex-1 w-px mt-1" style={{ background: '#E5E7EB' }} />}
                  </div>
                  <div className="pb-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>{v.version}</span>
                      <span style={{ fontSize: 11, color: '#6B7280' }}>{v.date}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{v.note}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{v.author}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ icon, label, value, highlight }: { icon?: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1.5" style={{ fontSize: 12, color: '#6B7280' }}>
        {icon}
        {label}
      </div>
      <div className="mt-1" style={{ fontSize: 14, color: highlight ? '#4F46E5' : '#111827', fontWeight: highlight ? 600 : 500 }}>
        {value}
      </div>
    </div>
  );
}

function StatRow({ label, value, success, small }: { label: string; value: string; success?: boolean; small?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 13, color: '#6B7280' }}>{label}</span>
      <span style={{ fontSize: small ? 12 : 14, fontWeight: 600, color: success ? '#059669' : '#111827', fontFamily: small ? 'monospace' : 'inherit' }}>
        {value}
      </span>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded px-1.5 py-0.5" style={{ background: '#F9FAFB', color: '#6B7280', fontSize: 11, border: '1px solid #E5E7EB' }}>{children}</span>;
}

function UploadModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="bg-white rounded-xl p-6" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ color: '#111827' }}>上传策略文档</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={18} style={{ color: '#6B7280' }} />
          </button>
        </div>
        <div className="border-2 border-dashed rounded-lg p-8 text-center mb-4" style={{ borderColor: '#D1D5DB' }}>
          <Upload size={28} style={{ color: '#9CA3AF' }} className="mx-auto" />
          <div className="mt-2" style={{ fontSize: 13, color: '#111827' }}>拖拽文件到此处，或点击选择</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>支持 .md / .txt / .json</div>
        </div>
        <div className="space-y-3">
          <FormField label="文档 ID" placeholder="Policy-XX-XXXX-001" />
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="适用区域" opts={['US', 'EU', 'CN']} />
            <SelectField label="商品分类" opts={['ALL', '电子', '服装']} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="客户等级" opts={['ALL', 'VIP', 'Regular']} />
            <SelectField label="策略类型" opts={['refund', 'exchange', 'vip']} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={onClose} disabled>确认上传</Button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>{label}</div>
      <input placeholder={placeholder} className="w-full rounded-md border px-3 outline-none" style={{ height: 40, borderColor: '#D1D5DB', fontSize: 13 }} />
    </div>
  );
}

function SelectField({ label, opts }: { label: string; opts: string[] }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>{label}</div>
      <select className="w-full rounded-md border px-3 outline-none" style={{ height: 40, borderColor: '#D1D5DB', fontSize: 13 }}>
        {opts.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}
