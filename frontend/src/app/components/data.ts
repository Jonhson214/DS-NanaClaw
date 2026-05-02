export type TicketStatus = 'COMPLETED' | 'SUSPENDED' | 'FAILED' | 'CANCELLED' | 'PENDING';

export interface Ticket {
  id: string;
  event: string;
  region: 'US' | 'EU' | 'CN' | 'Other';
  tier: 'VIP' | 'Regular';
  amount: number;
  currency: string;
  status: TicketStatus;
  duration: string;
  createdAt: string;
  waitTime?: string;
  solution?: string;
  reason?: string;
  product?: string;
  complaint?: string;
}

export const tickets: Ticket[] = [
  { id: 'ORD-20260424-00123', event: '差评', region: 'US', tier: 'VIP', amount: 299, currency: 'USD', status: 'COMPLETED', duration: '38s', createdAt: '04-24 10:30', solution: '全额退款 $299 + 15% 折扣码', product: '无线耳机 Pro', complaint: '音质有杂音' },
  { id: 'ORD-20260424-00124', event: '退款请求', region: 'US', tier: 'VIP', amount: 520, currency: 'USD', status: 'SUSPENDED', duration: '—', createdAt: '04-24 10:32', waitTime: '2h 15m', solution: '全额退款 $520 + 20% 折扣码补偿', reason: '金额超过自动审批阈值 ($100)', product: '智能手表 Pro × 1', complaint: '手表屏幕有划痕，而且表带松动，非常失望...' },
  { id: 'ORD-20260424-00125', event: '投诉', region: 'EU', tier: 'Regular', amount: 89, currency: 'EUR', status: 'CANCELLED', duration: '45s', createdAt: '04-24 10:35' },
  { id: 'ORD-20260424-00126', event: '差评', region: 'US', tier: 'Regular', amount: 520, currency: 'USD', status: 'FAILED', duration: '12s', createdAt: '04-24 10:38' },
  { id: 'ORD-20260424-00127', event: '差评', region: 'EU', tier: 'Regular', amount: 189, currency: 'EUR', status: 'SUSPENDED', duration: '—', createdAt: '04-24 11:02', waitTime: '1h 03m', solution: '部分退款 50% + 重新发货', reason: '合规 Agent 无法确定适用的政策条款', product: '休闲夹克 M', complaint: '尺码偏小，面料起球' },
  { id: 'ORD-20260424-00128', event: '退款请求', region: 'CN', tier: 'VIP', amount: 1280, currency: 'CNY', status: 'SUSPENDED', duration: '—', createdAt: '04-24 11:20', waitTime: '42m', solution: '全额退款 ¥1280 + 补偿券', reason: '高价值订单触发人工复核', product: '空气净化器', complaint: '噪音过大影响睡眠' },
  { id: 'ORD-20260424-00129', event: '投诉', region: 'US', tier: 'VIP', amount: 450, currency: 'USD', status: 'SUSPENDED', duration: '—', createdAt: '04-24 11:45', waitTime: '18m', solution: '更换新品 + 50 美元补偿', reason: 'VIP 客户投诉升级通道', product: '智能音箱', complaint: '设备频繁重启' },
  { id: 'ORD-20260424-00130', event: '差评', region: 'US', tier: 'Regular', amount: 129, currency: 'USD', status: 'COMPLETED', duration: '42s', createdAt: '04-24 09:12' },
  { id: 'ORD-20260424-00131', event: '退款请求', region: 'EU', tier: 'VIP', amount: 780, currency: 'EUR', status: 'COMPLETED', duration: '51s', createdAt: '04-24 09:30' },
  { id: 'ORD-20260424-00132', event: '投诉', region: 'CN', tier: 'Regular', amount: 268, currency: 'CNY', status: 'COMPLETED', duration: '29s', createdAt: '04-24 09:45' },
  { id: 'ORD-20260424-00133', event: '差评', region: 'US', tier: 'Regular', amount: 75, currency: 'USD', status: 'COMPLETED', duration: '33s', createdAt: '04-24 09:58' },
  { id: 'ORD-20260424-00134', event: '投诉', region: 'EU', tier: 'VIP', amount: 612, currency: 'EUR', status: 'FAILED', duration: '8s', createdAt: '04-24 08:40' },
  { id: 'ORD-20260424-00135', event: '退款请求', region: 'US', tier: 'Regular', amount: 48, currency: 'USD', status: 'COMPLETED', duration: '22s', createdAt: '04-24 08:22' },
  { id: 'ORD-20260424-00136', event: '差评', region: 'CN', tier: 'VIP', amount: 3200, currency: 'CNY', status: 'COMPLETED', duration: '47s', createdAt: '04-24 08:05' },
  { id: 'ORD-20260424-00137', event: '投诉', region: 'US', tier: 'Regular', amount: 99, currency: 'USD', status: 'CANCELLED', duration: '36s', createdAt: '04-24 07:48' },
];

export const pipelineNodes = [
  { key: 'pii', name: 'PII 脱敏', duration: '0.2s' },
  { key: 'cs', name: '客服 Agent', duration: '11s' },
  { key: 'rag', name: 'RAG 检索', duration: '8s' },
  { key: 'compliance', name: '合规 Agent', duration: '6s' },
  { key: 'hitl', name: 'HITL', duration: '—' },
  { key: 'exec', name: '执行 Agent', duration: '13s' },
];

export interface PolicyChunk { idx: number; title: string; text: string }
export interface PolicyVersion { version: string; date: string; author: string; note: string }
export interface Policy {
  id: string;
  title: string;
  region: string;
  category: string;
  version: string;
  updated: string;
  chunks: number;
  author: string;
  effectiveDate: string;
  applicableTier: string;
  strategyType: string;
  summary: string;
  body: string;
  rules: { condition: string; action: string }[];
  autoApproveLimit: string;
  chunkList: PolicyChunk[];
  versionHistory: PolicyVersion[];
  usage: { last7d: number; hitRate: string };
}

export const policies: Policy[] = [
  {
    id: 'Policy-US-ELEC-001',
    title: '美国区·电子产品 30 日退货政策',
    region: 'US',
    category: '电子',
    version: 'v2.3',
    updated: '3 天前',
    chunks: 12,
    author: '策略运营 · Amanda Chen',
    effectiveDate: '2026-04-21',
    applicableTier: '全部',
    strategyType: 'refund',
    autoApproveLimit: '$100.00',
    summary:
      '适用于美国区销售的所有电子产品（手机、平板、可穿戴设备、音频设备等）。购买 30 日内支持无条件退货；若商品存在质量问题，平台承担往返运费并优先处理退款。',
    body:
      '第一条 适用范围：本政策适用于在美国区（含夏威夷、阿拉斯加）通过本平台销售的电子类商品。\n\n第二条 退货期限：自签收之日起 30 个自然日内可申请退货；质量问题可延长至 90 日。\n\n第三条 商品状态要求：外包装完好、配件齐全、无人为损坏。激活类商品（如 SIM 卡）除质量问题外不支持退货。\n\n第四条 退款时效：审批通过后 1-3 个工作日原路返还。\n\n第五条 VIP 客户可叠加 Policy-US-VIP-002 享受补偿上浮。',
    rules: [
      { condition: '签收 ≤ 30 天且无质量问题', action: '全额退款，运费客户承担' },
      { condition: '质量问题（任意时间 ≤ 90 天）', action: '全额退款 + 平台承担双向运费' },
      { condition: '单笔金额 ≤ $100', action: '自动审批' },
      { condition: '单笔金额 > $100 或 VIP 客户', action: 'HITL 人工复核' },
      { condition: '已激活且非质量问题', action: '驳回，建议协商补偿券' },
    ],
    chunkList: [
      { idx: 1, title: '适用范围与定义', text: '美国区电子类商品，含手机、平板、可穿戴、音频设备等。' },
      { idx: 2, title: '退货期限', text: '签收起 30 日内无理由；质量问题延长至 90 日。' },
      { idx: 3, title: '商品状态要求', text: '外包装完好、配件齐全、无人为损坏。' },
      { idx: 4, title: '退款时效', text: '审批通过后 1-3 个工作日原路返还。' },
      { idx: 5, title: '运费责任', text: '非质量问题客户承担；质量问题平台承担。' },
      { idx: 6, title: 'VIP 叠加规则', text: '可与 Policy-US-VIP-002 补偿上浮叠加执行。' },
    ],
    versionHistory: [
      { version: 'v2.3', date: '2026-04-21', author: 'Amanda Chen', note: '新增激活类商品条款，明确 SIM 卡例外' },
      { version: 'v2.2', date: '2026-03-10', author: 'Amanda Chen', note: '自动审批阈值从 $80 上调至 $100' },
      { version: 'v2.1', date: '2026-01-15', author: 'Leo Zhang', note: '质量问题期限从 60 日延长至 90 日' },
      { version: 'v2.0', date: '2025-11-02', author: 'Leo Zhang', note: '结构化重写，拆分 chunks 以支持 RAG' },
    ],
    usage: { last7d: 842, hitRate: '94.2%' },
  },
  {
    id: 'Policy-EU-CLTH-001',
    title: '欧洲区·服装换货与尺码调整政策',
    region: 'EU',
    category: '服装',
    version: 'v1.1',
    updated: '7 天前',
    chunks: 8,
    author: '策略运营 · Sophie Martin',
    effectiveDate: '2026-04-17',
    applicableTier: '全部',
    strategyType: 'exchange',
    autoApproveLimit: '€150.00',
    summary:
      '符合欧盟消费者权益指令（2011/83/EU）要求。服装类商品提供 14 日无理由换货 + 尺码不合免运费换货，并保留客户 14 日冷静期。',
    body:
      '第一条 冷静期：依据欧盟消费者权益指令，客户享有自签收起 14 个自然日的无理由退货权。\n\n第二条 换货规则：同款不同尺码免运费换货；跨款换货需补差价。\n\n第三条 商品状态：吊牌完整、无穿着痕迹、无异味、无污渍。\n\n第四条 贴身衣物：内衣、袜品因卫生原因不支持退换。\n\n第五条 运费：非质量问题首次换货免运费，第二次起客户承担。',
    rules: [
      { condition: '签收 ≤ 14 天且未穿着', action: '全额退款或免费换货' },
      { condition: '同款换尺码（首次）', action: '免运费换货，自动审批' },
      { condition: '跨款换货', action: '补差价后换货' },
      { condition: '贴身衣物（内衣、袜品）', action: '仅质量问题支持退换' },
      { condition: '单笔金额 > €150', action: 'HITL 人工复核' },
    ],
    chunkList: [
      { idx: 1, title: '欧盟冷静期条款', text: '依据 2011/83/EU 指令，14 日无理由退货。' },
      { idx: 2, title: '尺码换货', text: '同款不同尺码首次换货免运费。' },
      { idx: 3, title: '商品状态', text: '吊牌完整，无穿着、污渍、异味。' },
      { idx: 4, title: '贴身衣物例外', text: '内衣、袜品仅质量问题支持。' },
      { idx: 5, title: '运费规则', text: '首次换货免费，二次客户承担。' },
    ],
    versionHistory: [
      { version: 'v1.1', date: '2026-04-17', author: 'Sophie Martin', note: '新增二次换货运费规则' },
      { version: 'v1.0', date: '2026-02-01', author: 'Sophie Martin', note: '首次发布，覆盖 27 国欧盟市场' },
    ],
    usage: { last7d: 413, hitRate: '91.8%' },
  },
  {
    id: 'Policy-CN-ALL-001',
    title: '中国区·通用退款与赔付政策',
    region: 'CN',
    category: '通用',
    version: 'v3.0',
    updated: '1 天前',
    chunks: 15,
    author: '策略运营 · 王立',
    effectiveDate: '2026-04-23',
    applicableTier: '全部',
    strategyType: 'refund',
    autoApproveLimit: '¥500.00',
    summary:
      '符合《消费者权益保护法》《电子商务法》要求，覆盖七日无理由退货、假一赔三、延迟发货赔付等场景。本版本新增 88VIP 快速通道。',
    body:
      '第一条 七日无理由：签收起 7 个自然日内，非定制类商品支持无理由退货。\n\n第二条 假一赔三：若核实为假冒商品，赔付金额 = 3 倍订单金额，下限 500 元。\n\n第三条 延迟发货：承诺时效内未发货，每日赔付订单金额 5%，上限 30%。\n\n第四条 价保：购买 15 日内商品降价，差价全额返还。\n\n第五条 88VIP 通道：¥500 以内争议自动同意退款，¥500-¥2000 HITL 30 分钟内响应。',
    rules: [
      { condition: '签收 ≤ 7 天，非定制商品', action: '全额退款' },
      { condition: '假冒商品已核实', action: '赔付 3 倍金额（不低于 ¥500）' },
      { condition: '超时发货每日', action: '补偿 5%，上限 30%' },
      { condition: '15 日内降价', action: '差价返还' },
      { condition: '88VIP 且金额 ≤ ¥500', action: '自动同意退款' },
      { condition: '单笔金额 > ¥2000', action: 'HITL 人工复核' },
    ],
    chunkList: [
      { idx: 1, title: '七日无理由', text: '签收 7 日内非定制类支持无理由退货。' },
      { idx: 2, title: '假一赔三条款', text: '确认假冒赔付 3 倍金额，下限 500 元。' },
      { idx: 3, title: '延迟发货赔付', text: '每日补偿 5%，上限 30%。' },
      { idx: 4, title: '价保政策', text: '15 日内降价差价全额返还。' },
      { idx: 5, title: '88VIP 快速通道', text: '¥500 以内自动退款。' },
      { idx: 6, title: '定制商品例外', text: '定制/刻字商品不支持无理由退货。' },
    ],
    versionHistory: [
      { version: 'v3.0', date: '2026-04-23', author: '王立', note: '新增 88VIP 快速通道，自动审批阈值上调至 ¥500' },
      { version: 'v2.4', date: '2026-02-28', author: '王立', note: '补充假一赔三核实流程' },
      { version: 'v2.3', date: '2025-12-10', author: '李娜', note: '延迟发货赔付比例由 3% 调至 5%' },
      { version: 'v2.0', date: '2025-09-01', author: '李娜', note: '对齐新版《电子商务法》修订' },
    ],
    usage: { last7d: 1268, hitRate: '96.5%' },
  },
  {
    id: 'Policy-US-VIP-002',
    title: 'VIP 客户·优先赔偿与补偿上浮政策',
    region: 'US',
    category: 'VIP',
    version: 'v1.4',
    updated: '5 天前',
    chunks: 6,
    author: '策略运营 · Rachel Park',
    effectiveDate: '2026-04-19',
    applicableTier: 'VIP',
    strategyType: 'vip',
    autoApproveLimit: '$300.00',
    summary:
      '针对美国区 VIP 客户的增值赔付政策。在基础退款政策之上叠加 10-20% 补偿券，且自动审批额度上调至 $300，升级通道响应 SLA 15 分钟。',
    body:
      '第一条 适用条件：年累计消费 ≥ $5,000 或连续 12 个月订单 ≥ 20 笔的客户。\n\n第二条 补偿上浮：首次争议上浮 10%，二次及以上上浮 20%，最高不超过 $500。\n\n第三条 快速通道：HITL 响应 SLA 15 分钟（非 VIP 为 2 小时）。\n\n第四条 一次性礼遇：每年最多 1 次破格全额赔付（不受金额上限约束）。',
    rules: [
      { condition: 'VIP + 首次争议', action: '基础方案 + 10% 补偿券' },
      { condition: 'VIP + 二次及以上争议', action: '基础方案 + 20% 补偿券' },
      { condition: 'VIP + 金额 ≤ $300', action: '自动审批' },
      { condition: 'VIP + 破格请求（年度 1 次）', action: '全额赔付，CEO 礼遇' },
    ],
    chunkList: [
      { idx: 1, title: 'VIP 资格定义', text: '年累计 ≥ $5,000 或 12 月 ≥ 20 单。' },
      { idx: 2, title: '补偿上浮规则', text: '首次 10%，二次及以上 20%，上限 $500。' },
      { idx: 3, title: '响应 SLA', text: 'HITL 15 分钟响应承诺。' },
      { idx: 4, title: '年度破格礼遇', text: '每年 1 次无上限全额赔付。' },
    ],
    versionHistory: [
      { version: 'v1.4', date: '2026-04-19', author: 'Rachel Park', note: '自动审批阈值从 $200 上调至 $300' },
      { version: 'v1.3', date: '2026-02-12', author: 'Rachel Park', note: '新增年度破格礼遇条款' },
      { version: 'v1.0', date: '2025-10-01', author: 'Michael Liu', note: '首次发布' },
    ],
    usage: { last7d: 187, hitRate: '98.1%' },
  },
  {
    id: 'Policy-EU-ELEC-003',
    title: '欧洲区·电子产品 30 日退货（含 CE 合规）',
    region: 'EU',
    category: '电子',
    version: 'v2.0',
    updated: '12 天前',
    chunks: 10,
    author: '策略运营 · Tom Weber',
    effectiveDate: '2026-04-12',
    applicableTier: '全部',
    strategyType: 'refund',
    autoApproveLimit: '€120.00',
    summary:
      '对齐 CE 认证与 RoHS 指令要求，覆盖 EU 27 国。30 日无理由退货，质量问题触发厂商召回流程并联动 EPREL 登记检查。',
    body:
      '第一条 CE 合规前置：所有退换电子产品须通过 CE 合规复核，未通过自动升级至合规 Agent 人工审查。\n\n第二条 能效标签（EPREL）：大家电退货须核对 EPREL 注册号一致性。\n\n第三条 退货期限：签收起 30 日无理由；质量问题 2 年内免费维修/更换（欧盟法定保修期）。\n\n第四条 电池类产品：电池类商品因运输限制，仅支持上门回收。',
    rules: [
      { condition: '签收 ≤ 30 天', action: '全额退款' },
      { condition: '质量问题 ≤ 2 年', action: '免费维修/更换（法定保修）' },
      { condition: 'CE 标志缺失', action: '升级合规 Agent' },
      { condition: '大家电 EPREL 不匹配', action: '驳回并要求补充' },
      { condition: '电池类商品', action: '上门回收，不支持快递' },
    ],
    chunkList: [
      { idx: 1, title: 'CE 合规检查', text: '所有退换电子产品须通过 CE 合规复核。' },
      { idx: 2, title: 'EPREL 能效核对', text: '大家电核对能效注册号一致性。' },
      { idx: 3, title: '法定 2 年保修', text: '欧盟法定 2 年免费维修/更换。' },
      { idx: 4, title: '电池上门回收', text: '电池类商品运输受限，仅上门回收。' },
    ],
    versionHistory: [
      { version: 'v2.0', date: '2026-04-12', author: 'Tom Weber', note: '新增 EPREL 能效标签核对逻辑' },
      { version: 'v1.5', date: '2026-01-08', author: 'Tom Weber', note: '对齐 2 年法定保修条款' },
      { version: 'v1.0', date: '2025-08-15', author: 'Hans Müller', note: '首次发布' },
    ],
    usage: { last7d: 521, hitRate: '92.7%' },
  },
  {
    id: 'Policy-CN-CLTH-002',
    title: '中国区·服装 7 日无理由退货政策',
    region: 'CN',
    category: '服装',
    version: 'v1.2',
    updated: '9 天前',
    chunks: 9,
    author: '策略运营 · 陈敏',
    effectiveDate: '2026-04-15',
    applicableTier: '全部',
    strategyType: 'refund',
    autoApproveLimit: '¥300.00',
    summary:
      '覆盖服装、鞋靴、箱包类目。7 日无理由退货，不影响二次销售为前提。试穿不影响二次销售的判定以吊牌为准。',
    body:
      '第一条 退货期限：签收起 7 个自然日内无理由退货。\n\n第二条 不影响二次销售：吊牌完整、无污渍、无异味、无清洗；内衣袜品除质量问题外不支持。\n\n第三条 运费：首次无理由退货运费险可覆盖；质量问题运费由平台承担。\n\n第四条 定制款：印字、刺绣等定制商品不支持无理由退货。',
    rules: [
      { condition: '7 日内，吊牌完整', action: '全额退款' },
      { condition: '试穿后吊牌剪除', action: '协商处理，不适用无理由' },
      { condition: '质量问题（起球、开线、色差）', action: '全额退款 + 运费补偿' },
      { condition: '定制/印字商品', action: '驳回无理由申请' },
      { condition: '金额 > ¥300', action: 'HITL 复核' },
    ],
    chunkList: [
      { idx: 1, title: '七日期限', text: '签收起 7 日无理由退货。' },
      { idx: 2, title: '二次销售判定', text: '吊牌完整、无污渍、无异味、无清洗。' },
      { idx: 3, title: '贴身衣物例外', text: '内衣袜品仅质量问题支持。' },
      { idx: 4, title: '定制款不适用', text: '印字、刺绣定制商品不退。' },
    ],
    versionHistory: [
      { version: 'v1.2', date: '2026-04-15', author: '陈敏', note: '明确试穿后吊牌剪除的处理口径' },
      { version: 'v1.1', date: '2026-01-22', author: '陈敏', note: '补充运费险覆盖条款' },
      { version: 'v1.0', date: '2025-10-20', author: '周琳', note: '首次发布' },
    ],
    usage: { last7d: 678, hitRate: '93.4%' },
  },
];

export const trend = [
  { day: '04-18', count: 168, tokens: 42 },
  { day: '04-19', count: 202, tokens: 51 },
  { day: '04-20', count: 184, tokens: 48 },
  { day: '04-21', count: 231, tokens: 58 },
  { day: '04-22', count: 196, tokens: 52 },
  { day: '04-23', count: 213, tokens: 55 },
  { day: '04-24', count: 248, tokens: 60 },
];

export const agentDurations = [
  { agent: '客服 Agent', avg: 11.2 },
  { agent: 'RAG 检索', avg: 7.8 },
  { agent: '合规 Agent', avg: 6.1 },
  { agent: '执行 Agent', avg: 14.5 },
];

export const regionShare = [
  { name: 'US', value: 45 },
  { name: 'EU', value: 28 },
  { name: 'CN', value: 20 },
  { name: 'Other', value: 7 },
];

export const statusShare = [
  { name: 'COMPLETED', value: 72, color: '#059669' },
  { name: 'PENDING', value: 12, color: '#D97706' },
  { name: 'SUSPENDED', value: 8, color: '#7C3AED' },
  { name: 'FAILED', value: 5, color: '#DC2626' },
  { name: 'CANCELLED', value: 3, color: '#6B7280' },
];

export const statusMeta: Record<TicketStatus, { label: string; bg: string; fg: string; dot: string }> = {
  COMPLETED: { label: '已完成', bg: '#ECFDF5', fg: '#059669', dot: '#059669' },
  SUSPENDED: { label: '待审批', bg: '#F5F3FF', fg: '#7C3AED', dot: '#7C3AED' },
  PENDING: { label: '处理中', bg: '#FFFBEB', fg: '#D97706', dot: '#D97706' },
  FAILED: { label: '失败', bg: '#FEF2F2', fg: '#DC2626', dot: '#DC2626' },
  CANCELLED: { label: '已取消', bg: '#F3F4F6', fg: '#6B7280', dot: '#6B7280' },
};
