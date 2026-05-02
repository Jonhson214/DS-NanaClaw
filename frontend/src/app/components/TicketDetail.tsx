import { useState } from 'react';
import { Card, StatusBadge, Breadcrumb, ApiNotReady } from './shared';
import { tickets, pipelineNodes } from './data';

const nodeDetails: Record<string, { input: { label: string; v: string }[]; output: { label: string; v: string }[]; meta: string }> = {
  pii: {
    input: [{ label: '原始订单数据', v: '含客户姓名、邮箱、地址' }, { label: 'PII 字段', v: 'name, email, phone' }],
    output: [{ label: '脱敏后数据', v: '[PERSON_1], [EMAIL_1]' }, { label: 'Vault ID', v: 'vault-8a7f2c' }],
    meta: '耗时 0.2s · 识别 4 个 PII 字段',
  },
  cs: {
    input: [{ label: '事件类型', v: '差评' }, { label: '客户等级', v: 'VIP' }, { label: '订单金额', v: '$299' }],
    output: [{ label: '客服方案', v: '全额退款 $299 + 15% 折扣码' }, { label: '置信度', v: '0.87' }, { label: '推理摘要', v: 'VIP 客户质量问题优先处理' }],
    meta: '模型 gpt-4o-mini · Token 820/340 · 11s',
  },
  rag: {
    input: [{ label: '查询', v: '电子产品退货政策 US' }, { label: '向量库', v: 'Milvus · policies-v3' }],
    output: [{ label: '检索条数', v: '3 条' }, { label: 'Top-1', v: 'Policy-US-ELEC-001 (0.95)' }, { label: 'Top-2', v: 'Policy-US-VIP-002 (0.88)' }],
    meta: '耗时 7.8s · Reranker: bge-reranker-v2',
  },
  compliance: {
    input: [{ label: '客服方案', v: '全额退款 $299 + 15% 折扣码' }, { label: '检索政策', v: '3 条' }],
    output: [{ label: '审查结果', v: 'APPROVED' }, { label: '理由', v: '符合 Policy-US-ELEC-001 退货政策' }, { label: '置信度', v: '0.95' }],
    meta: '模型 gpt-4o · Token 1200/450 · 6.2s',
  },
  hitl: {
    input: [{ label: '触发条件', v: 'claim_amount < $100 阈值' }],
    output: [{ label: '状态', v: '自动跳过 (未触发人工审批)' }],
    meta: '耗时 0s',
  },
  exec: {
    input: [{ label: '执行方案', v: '退款 $299 + 发送折扣码' }, { label: '目标系统', v: 'Shopify, Klaviyo' }],
    output: [{ label: 'Shopify 退款', v: '✓ refund_id=rf_x8a2' }, { label: 'Klaviyo 邮件', v: '✓ 已发送' }],
    meta: '耗时 13s · 2 次 API 调用',
  },
};

export function TicketDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const t = tickets.find((x) => x.id === id) ?? tickets[0];
  const [active, setActive] = useState(3);

  return (
    <div>
      <Breadcrumb items={['工单中心', t.id]} />
      <button onClick={onBack} style={{ color: '#4F46E5', fontSize: 13 }} className="mb-4">← 返回工单中心</button>

      <Card className="p-5 mb-4" >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span style={{ fontFamily: 'monospace', fontSize: 16, color: '#111827', fontWeight: 500 }}>{t.id}</span>
              <ApiNotReady label="工单详情/Trace 接口未开发" />
            </div>
            <div className="mt-1.5 flex items-center gap-3" style={{ fontSize: 13, color: '#6B7280' }}>
              <span>{t.event}事件</span>
              <span>·</span>
              <span>{t.region}</span>
              <span>·</span>
              <span>{t.tier}</span>
              <span>·</span>
              <span style={{ color: '#111827' }}>{t.currency} {t.amount}</span>
              <span>·</span>
              <span>总耗时 {t.duration}</span>
            </div>
          </div>
          <StatusBadge status={t.status} />
        </div>
      </Card>

      <Card className="p-6 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <h2 style={{ color: '#111827' }}>节点时间线</h2>
          <ApiNotReady label="Trace 时间线接口未开发" />
        </div>
        <div className="flex items-center justify-between px-2">
          {pipelineNodes.map((n, i) => {
            const isActive = i === active;
            const done = i <= 4;
            return (
              <div key={n.key} className="flex items-center flex-1">
                <button onClick={() => setActive(i)} className="flex flex-col items-center" style={{ minWidth: 80 }}>
                  <div
                    className="rounded-full flex items-center justify-center transition-all"
                    style={{
                      width: 44,
                      height: 44,
                      background: done ? '#059669' : '#fff',
                      border: isActive ? '3px solid #4F46E5' : done ? 'none' : '2px solid #E5E7EB',
                      color: done ? '#fff' : '#9CA3AF',
                      fontSize: 14,
                      fontWeight: 600,
                      boxShadow: isActive ? '0 0 0 4px rgba(79,70,229,0.15)' : 'none',
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="mt-2 text-center" style={{ fontSize: 12, color: isActive ? '#4F46E5' : '#111827', fontWeight: isActive ? 600 : 500 }}>
                    {n.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{n.duration}</div>
                </button>
                {i < pipelineNodes.length - 1 && <div className="flex-1 h-px mx-2" style={{ background: i < 4 ? '#059669' : '#E5E7EB' }} />}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4" style={{ color: '#111827' }}>节点详情 · {pipelineNodes[active].name}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-md p-4" style={{ background: '#F9FAFB' }}>
            <div className="mb-3" style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              输入
            </div>
            <div className="space-y-2">
              {nodeDetails[pipelineNodes[active].key].input.map((r, i) => (
                <div key={i}>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{r.label}</div>
                  <div style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{r.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-md p-4" style={{ background: '#F0FDF4' }}>
            <div className="mb-3" style={{ fontSize: 12, color: '#059669', fontWeight: 500, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              输出
            </div>
            <div className="space-y-2">
              {nodeDetails[pipelineNodes[active].key].output.map((r, i) => (
                <div key={i}>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{r.label}</div>
                  <div style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{r.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t" style={{ borderColor: '#E5E7EB', fontSize: 12, color: '#6B7280' }}>
          {nodeDetails[pipelineNodes[active].key].meta}
        </div>
      </Card>
    </div>
  );
}
