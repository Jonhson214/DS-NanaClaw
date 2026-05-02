import { useState } from 'react';
import { Check, X, Lightbulb, FileText, AlertCircle } from 'lucide-react';
import { Card, Button, Breadcrumb, ApiNotReady } from './shared';
import { tickets } from './data';
import { resumeHITL } from '../services/api';

export function ReviewDetail({ id, onBack, onDone }: { id: string; onBack: () => void; onDone: (msg: string) => void }) {
  const t = tickets.find((x) => x.id === id) ?? tickets[1];
  const [mode, setMode] = useState<'idle' | 'rejecting' | 'confirming' | 'processing' | 'error'>('idle');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const submit = async (decision: 'APPROVED' | 'REJECTED') => {
    setMode('processing');
    setError('');
    try {
      await resumeHITL({
        thread_id: t.id,
        decision,
        notes: decision === 'REJECTED' ? notes : undefined,
      });
      onDone(decision === 'APPROVED' ? '已批准，工单正在执行' : '已驳回');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '请求失败';
      setError(msg);
      setMode('idle');
    }
  };

  return (
    <div>
      <Breadcrumb items={['审批中心', t.id]} />
      <button onClick={onBack} style={{ color: '#4F46E5', fontSize: 13 }} className="mb-4">← 返回审批中心</button>

      <Card className="p-5 mb-4" >
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: 13, color: '#6B7280' }}>订单基本信息</span>
          <ApiNotReady label="详情数据接口未开发" />
        </div>
        <div style={{ fontSize: 13, color: '#6B7280' }} className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span><span style={{ color: '#111827' }}>订单号：</span><span style={{ fontFamily: 'monospace', color: '#111827' }}>{t.id}</span></span>
          <span>·</span>
          <span>客户：<span style={{ fontFamily: 'monospace' }}>[PERSON_1]</span></span>
          <span>·</span>
          <span style={{ color: '#7C3AED', fontWeight: 500 }}>{t.tier}</span>
          <span>·</span>
          <span>{t.region}</span>
          <span>·</span>
          <span>订单金额 <span style={{ color: '#111827', fontWeight: 500 }}>{t.currency} {t.amount.toFixed(2)}</span></span>
        </div>
        <div className="mt-3 pt-3 border-t" style={{ borderColor: '#E5E7EB', fontSize: 13 }}>
          <div style={{ color: '#6B7280' }}>商品：<span style={{ color: '#111827' }}>{t.product}</span></div>
          <div className="mt-1.5" style={{ color: '#6B7280' }}>投诉内容：<span style={{ color: '#111827' }}>"{t.complaint}"</span></div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Lightbulb size={16} style={{ color: '#D97706' }} />
              <h3 style={{ color: '#111827' }}>客服 Agent 建议</h3>
            </div>
            <ApiNotReady />
          </div>
          <div className="space-y-3">
            <Field label="方案" value={t.solution!} highlight />
            <Field label="推理过程" value={`${t.tier} 客户，质量问题，上浮补偿以维持客户关系。`} />
            <div className="flex gap-6">
              <div><div style={{ fontSize: 12, color: '#6B7280' }}>置信度</div><div style={{ color: '#111827', fontWeight: 600 }}>0.85</div></div>
              <div><div style={{ fontSize: 12, color: '#6B7280' }}>索赔</div><div style={{ color: '#111827', fontWeight: 600 }}>{t.currency} {t.amount}</div></div>
            </div>
            <div className="pt-3 border-t" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={14} style={{ color: '#7C3AED' }} />
                <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>合规审查</span>
              </div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: '#6B7280' }}>结果：</span>
                <span
                  className="rounded px-1.5 py-0.5"
                  style={{ background: '#F5F3FF', color: '#7C3AED', fontWeight: 500 }}
                >
                  ESCALATE
                </span>
              </div>
              <div className="mt-1" style={{ fontSize: 13, color: '#6B7280' }}>原因：{t.reason}</div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={16} style={{ color: '#4F46E5' }} />
              <h3 style={{ color: '#111827' }}>检索到的政策条款</h3>
            </div>
            <ApiNotReady />
          </div>
          <div className="space-y-4">
            <PolicyBlock id="Policy-US-ELEC-001" title="美国区 > 电子产品 > 30 天退货" score="0.95" text="购买 30 日内，电子产品支持无条件退货退款。若商品存在质量问题，运费由平台承担..." />
            <PolicyBlock id="Policy-US-VIP-002" title="VIP 客户 > 优先赔偿政策" score="0.88" text="VIP 客户可享受额外 10-20% 的补偿上浮，用于维护长期客户关系..." />
          </div>
        </Card>
      </div>

      <Card className="p-4 mb-4" >
        <details>
          <summary className="cursor-pointer" style={{ fontSize: 13, color: '#6B7280' }}>反思历史 · 本工单无反思重写记录</summary>
        </details>
      </Card>

      {error && (
        <div
          className="mb-4 rounded-md border-l-4 px-4 py-3"
          style={{ background: '#FEF2F2', borderColor: '#DC2626', color: '#991B1B', fontSize: 13 }}
        >
          请求失败：{error}
        </div>
      )}

      <div
        className="sticky bottom-0 -mx-6 px-6 py-4 border-t flex items-center justify-between"
        style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded px-2 py-0.5"
            style={{ background: '#ECFDF5', color: '#065F46', fontSize: 11, fontWeight: 600, border: '1px solid #A7F3D0' }}
          >
            POST /api/hitl/resume — 已对接
          </span>
        </div>
        <div className="flex items-center gap-3">
          {mode === 'rejecting' && (
            <div className="flex-1" style={{ minWidth: 300 }}>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="请输入驳回理由（必填，至少 10 字）"
                className="w-full rounded-md border px-3 py-2 outline-none resize-none"
                rows={2}
                style={{ borderColor: '#D1D5DB', fontSize: 13 }}
              />
              <div style={{ fontSize: 11, color: '#6B7280' }}>{notes.length}/500</div>
            </div>
          )}
          {mode === 'rejecting' ? (
            <>
              <Button variant="secondary" onClick={() => { setMode('idle'); setNotes(''); }}>取消</Button>
              <Button variant="danger" disabled={notes.length < 10} onClick={() => submit('REJECTED')}>
                <X size={16} /> 确认驳回
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setMode('rejecting')} disabled={mode === 'processing'}>
                <X size={16} /> 驳回
              </Button>
              <Button variant="success" disabled={mode === 'processing'} onClick={() => submit('APPROVED')}>
                <Check size={16} /> {mode === 'processing' ? '处理中...' : '批准'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#6B7280' }}>{label}</div>
      <div style={{ fontSize: 14, color: '#111827', fontWeight: highlight ? 600 : 400, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function PolicyBlock({ id, title, score, text }: { id: string; title: string; score: string; text: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#4F46E5', fontWeight: 500 }}>{id}</span>
        <span style={{ fontSize: 11, color: '#6B7280' }}>相关度 {score}</span>
      </div>
      <div style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{title}</div>
      <div
        className="mt-1.5 p-2.5 rounded border-l-2"
        style={{ background: '#F9FAFB', borderColor: '#4F46E5', fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}
      >
        "{text}"
      </div>
    </div>
  );
}
