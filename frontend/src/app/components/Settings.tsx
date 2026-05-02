import { useState, useEffect } from 'react';
import { Card, Button, Breadcrumb, ApiNotReady } from './shared';
import { checkHealth } from '../services/api';

type ServiceStatus = 'checking' | 'ok' | 'error' | 'not_implemented';

interface ServiceInfo {
  name: string;
  status: ServiceStatus;
  endpoint?: string;
}

export function SettingsPage() {
  const [services, setServices] = useState<ServiceInfo[]>([
    { name: 'FastAPI 网关', status: 'checking', endpoint: '/health' },
    { name: 'Redis', status: 'not_implemented' },
    { name: 'Celery Worker', status: 'not_implemented' },
    { name: 'PostgreSQL', status: 'not_implemented' },
    { name: 'Milvus 向量库', status: 'not_implemented' },
    { name: 'LangSmith', status: 'not_implemented' },
  ]);

  useEffect(() => {
    checkHealth()
      .then(() => {
        setServices((prev) =>
          prev.map((s) => (s.name === 'FastAPI 网关' ? { ...s, status: 'ok' as const } : s))
        );
      })
      .catch(() => {
        setServices((prev) =>
          prev.map((s) => (s.name === 'FastAPI 网关' ? { ...s, status: 'error' as const } : s))
        );
      });
  }, []);

  const statusDisplay = (s: ServiceInfo) => {
    if (s.status === 'checking') {
      return (
        <span className="flex items-center gap-1.5" style={{ fontSize: 13, color: '#6B7280' }}>
          <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#6B7280' }} />
          检测中...
        </span>
      );
    }
    if (s.status === 'ok') {
      return (
        <span className="flex items-center gap-1.5" style={{ fontSize: 13, color: '#059669' }}>
          <span className="h-2 w-2 rounded-full" style={{ background: '#059669' }} />
          正常
          <span
            className="ml-1 rounded px-1.5 py-0.5"
            style={{ background: '#ECFDF5', color: '#065F46', fontSize: 10, fontWeight: 600, border: '1px solid #A7F3D0' }}
          >
            GET /health 已对接
          </span>
        </span>
      );
    }
    if (s.status === 'error') {
      return (
        <span className="flex items-center gap-1.5" style={{ fontSize: 13, color: '#DC2626' }}>
          <span className="h-2 w-2 rounded-full" style={{ background: '#DC2626' }} />
          不可用
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5" style={{ fontSize: 13, color: '#6B7280' }}>
        <span className="h-2 w-2 rounded-full" style={{ background: '#D1D5DB' }} />
        <ApiNotReady label="健康检查接口未开发" />
      </span>
    );
  };

  return (
    <div>
      <Breadcrumb items={['仪表盘', '系统设置']} />
      <h1 className="mb-6" style={{ color: '#111827' }}>系统设置</h1>

      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ color: '#111827' }}>业务参数</h2>
          <ApiNotReady label="参数读取/保存接口未开发" />
        </div>
        <div className="space-y-3 max-w-lg">
          <Param label="自动审批金额上限" value="100.00" unit="USD" />
          <Param label="最大反思重写次数" value="3" />
          <Param label="最大并发 Worker 数" value="20" />
          <Param label="PII Vault 过期时间" value="7200" unit="秒" />
        </div>
        <div className="flex items-center justify-end gap-2 mt-4">
          <ApiNotReady label="PUT /api/settings 未开发" />
          <Button disabled>保存修改</Button>
        </div>
      </Card>

      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ color: '#111827' }}>模型配置</h2>
          <ApiNotReady label="模型配置接口未开发" />
        </div>
        <div className="space-y-3 max-w-lg">
          <ModelSelect label="客服 Agent 模型" value="gpt-4o-mini" />
          <ModelSelect label="合规 Agent 模型" value="gpt-4o" />
          <ModelSelect label="执行 Agent 模型" value="gpt-4o-mini" />
          <ModelSelect label="查询重写模型" value="gpt-4o-mini" />
        </div>
        <div className="flex items-center justify-end gap-2 mt-4">
          <ApiNotReady label="PUT /api/settings/model 未开发" />
          <Button disabled>保存修改</Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4" style={{ color: '#111827' }}>服务状态</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 max-w-xl">
          {services.map((s) => (
            <div key={s.name} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: '#F3F4F6' }}>
              <span style={{ fontSize: 14, color: '#111827' }}>{s.name}</span>
              {statusDisplay(s)}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Param({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span style={{ fontSize: 14, color: '#111827', minWidth: 180 }}>{label}</span>
      <div className="flex items-center gap-2 flex-1">
        <input
          defaultValue={value}
          disabled
          className="flex-1 rounded-md border px-3 outline-none opacity-60"
          style={{ height: 40, borderColor: '#D1D5DB', fontSize: 13, fontFamily: 'monospace' }}
        />
        {unit && <span style={{ fontSize: 13, color: '#6B7280' }}>{unit}</span>}
      </div>
    </div>
  );
}

function ModelSelect({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span style={{ fontSize: 14, color: '#111827', minWidth: 180 }}>{label}</span>
      <select
        defaultValue={value}
        disabled
        className="flex-1 rounded-md border px-3 outline-none opacity-60"
        style={{ height: 40, borderColor: '#D1D5DB', fontSize: 13 }}
      >
        <option>gpt-4o</option>
        <option>gpt-4o-mini</option>
        <option>claude-sonnet-4-6</option>
        <option>claude-opus-4-7</option>
      </select>
    </div>
  );
}
