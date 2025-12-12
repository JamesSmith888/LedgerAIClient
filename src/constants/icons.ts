/**
 * 应用图标常量配置
 * 统一管理系统中使用的图标名称
 * 修改此处即可全局生效
 */

/**
 * 交易类型图标
 * 用于表示收入/支出的图标
 */
export const TransactionIcons = {
  /** 收入图标 - 箭头向上表示钱流入 */
  income: 'arrow-up-circle',
  /** 支出图标 - 箭头向下表示钱流出 */
  expense: 'arrow-down-circle',
} as const;

/**
 * 趋势指示图标
 * 用于表示数据趋势变化（如统计图表中的涨跌）
 */
export const TrendIcons = {
  /** 上涨趋势 */
  up: 'trending-up',
  /** 下跌趋势 */
  down: 'trending-down',
} as const;

/**
 * 通用操作图标
 * 常见的 CRUD 和交互操作
 */
export const ActionIcons = {
  /** 添加 */
  add: 'add',
  /** 添加（圆形） */
  addCircle: 'add-circle',
  /** 编辑 */
  edit: 'create-outline',
  /** 删除 */
  delete: 'trash-outline',
  /** 删除（实心） */
  deleteFilled: 'trash',
  /** 关闭 */
  close: 'close',
  /** 关闭（圆形） */
  closeCircle: 'close-circle',
  /** 确认/勾选 */
  check: 'checkmark',
  /** 确认（圆形） */
  checkCircle: 'checkmark-circle',
  /** 刷新 */
  refresh: 'refresh',
  /** 搜索 */
  search: 'search',
  /** 设置 */
  settings: 'settings-outline',
  /** 更多选项 */
  more: 'ellipsis-vertical',
  /** 菜单 */
  menu: 'menu',
  /** 展开 */
  expand: 'expand',
} as const;

/**
 * 导航图标
 */
export const NavigationIcons = {
  /** 返回 */
  back: 'arrow-back',
  /** 前进/右箭头 */
  forward: 'chevron-forward',
  /** 向下箭头 */
  down: 'chevron-down',
  /** 向上箭头 */
  up: 'chevron-up',
  /** 左箭头 */
  left: 'chevron-back',
} as const;

/**
 * 底部标签栏图标
 */
export const TabIcons = {
  /** 账本/记账列表 */
  ledger: 'book',
  /** 统计报表 */
  report: 'stats-chart',
  /** AI 助手 */
  agent: 'chatbubbles',
  /** 个人中心 */
  profile: 'person',
} as const;

/**
 * 记账相关图标
 */
export const LedgerIcons = {
  /** 分类 */
  category: 'pricetag',
  /** 分类（轮廓） */
  categoryOutline: 'pricetag-outline',
  /** 日历/日期 */
  calendar: 'calendar',
  /** 银行卡/账户 */
  card: 'card',
  /** 银行卡（轮廓） */
  cardOutline: 'card-outline',
  /** 备注 */
  note: 'create',
  /** 账本 */
  book: 'book',
  /** 账本（轮廓） */
  bookOutline: 'book-outline',
  /** 共享账本 */
  shared: 'people',
  /** 邀请链接 */
  link: 'link',
  /** 附件/图片 */
  images: 'images',
  /** 文件夹 */
  folder: 'folder',
  /** 列表 */
  list: 'list',
  /** 文档 */
  document: 'document-text-outline',
  /** 收藏/常用 */
  star: 'star',
} as const;

/**
 * 状态指示图标
 */
export const StatusIcons = {
  /** 成功 */
  success: 'checkmark-circle',
  /** 警告 */
  warning: 'warning',
  /** 错误 */
  error: 'close-circle',
  /** 信息 */
  info: 'information-circle-outline',
  /** 帮助 */
  help: 'help-circle-outline',
  /** 提示/灯泡 */
  tip: 'bulb-outline',
  /** AI/智能 */
  ai: 'sparkles',
  /** 工具 */
  tools: 'construct-outline',
  /** 禁止 */
  ban: 'ban',
} as const;

/**
 * 图表相关图标
 */
export const ChartIcons = {
  /** 柱状图 */
  bar: 'bar-chart-outline',
  /** 统计图表 */
  stats: 'stats-chart',
} as const;

/**
 * 用户相关图标
 */
export const UserIcons = {
  /** 用户 */
  person: 'person',
  /** 用户（圆形头像） */
  personCircle: 'person-circle',
  /** 多人/团队 */
  people: 'people',
} as const;

/**
 * 导出图标类型
 */
export type TransactionIconName = typeof TransactionIcons[keyof typeof TransactionIcons];
export type TrendIconName = typeof TrendIcons[keyof typeof TrendIcons];
export type ActionIconName = typeof ActionIcons[keyof typeof ActionIcons];
export type NavigationIconName = typeof NavigationIcons[keyof typeof NavigationIcons];
export type TabIconName = typeof TabIcons[keyof typeof TabIcons];
export type LedgerIconName = typeof LedgerIcons[keyof typeof LedgerIcons];
export type StatusIconName = typeof StatusIcons[keyof typeof StatusIcons];
export type ChartIconName = typeof ChartIcons[keyof typeof ChartIcons];
export type UserIconName = typeof UserIcons[keyof typeof UserIcons];
