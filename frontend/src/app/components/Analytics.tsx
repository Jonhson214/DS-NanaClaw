import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';
import { Card, Breadcrumb, ApiNotReady } from './shared';
import { trend, agentDurations, regionShare } from './data';

const regionColors = ['#4F46E5', '#059669', '#D97706', '#6B7280'];

export function Analytics() {
  const [range, setRange] = useState('7');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Breadcrumb items={['仪表盘', '分析报表']} />
        <div className="flex items-center gap-1 rounded-md p-0.5 border" style={{ borderColor: '#E5E7EB', background: '#fff' }}>
          {['1', '7', '30'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 h-8 rounded"
              style={{
                background: range === r ? '#4F46E5' : 'transparent',
                color: range === r ? '#fff' : '#6B7280',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {r === '1' ? '今日' : `${r}日`}
            </button>
          ))}
          <button className="px-3 h-8 rounded" style={{ color: '#6B7280', fontSize: 13 }}>自定义</button>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-6">
        <h1 style={{ color: '#111827' }}>分析报表</h1>
        <ApiNotReady label="分析报表数据接口未开发" />
      </div>

      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ color: '#111827' }}>核心指标概览</h2>
          <ApiNotReady label="KPI 统计接口未开发" />
        </div>
        <div className="grid grid-cols-5">
          <KpiItem label="处理总量" value="1,248" delta="↑12%" up />
          <KpiItem label="自动通过率" value="87.3%" delta="↑2.1pp" up />
          <KpiItem label="平均处理时长" value="38s" delta="↓5s" up />
          <KpiItem label="人工介入率" value="8.2%" delta="↓1.8pp" up />
          <KpiItem label="Token 成本" value="$52.40" delta="↑8%" up={false} />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ color: '#111827' }}>处理量趋势</h2>
            <ApiNotReady />
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="day" stroke="#6B7280" style={{ fontSize: 12 }} />
                <YAxis stroke="#6B7280" style={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} dot={{ fill: '#4F46E5', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ color: '#111827' }}>终态分布</h2>
            <ApiNotReady />
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="day" stroke="#6B7280" style={{ fontSize: 12 }} />
                <YAxis stroke="#6B7280" style={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" stackId="a" fill="#059669" name="COMPLETED" />
                <Bar dataKey="tokens" stackId="a" fill="#7C3AED" name="SUSPENDED" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ color: '#111827' }}>Agent 耗时分布</h2>
          <ApiNotReady />
        </div>
        <div style={{ height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={agentDurations} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis type="number" stroke="#6B7280" style={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="agent" stroke="#6B7280" style={{ fontSize: 12 }} width={90} />
              <Tooltip />
              <Bar dataKey="avg" fill="#4F46E5" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ color: '#111827' }}>区域分布</h2>
            <ApiNotReady />
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={regionShare} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {regionShare.map((_, i) => <Cell key={i} fill={regionColors[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ color: '#111827' }}>Token 消耗趋势</h2>
            <ApiNotReady />
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="day" stroke="#6B7280" style={{ fontSize: 12 }} />
                <YAxis stroke="#6B7280" style={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="tokens" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function KpiItem({ label, value, delta, up }: { label: string; value: string; delta: string; up: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#6B7280' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: up ? '#059669' : '#DC2626', marginTop: 2 }}>{delta}</div>
    </div>
  );
}
