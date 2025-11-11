/**
 * 应用主题配置
 * 统一管理颜色、字体、间距等设计规范
 * 配色方案：清新优雅 - 简洁、轻松、典雅
 */

export const Colors = {
  // 主色调 - 优雅蓝紫
  primary: '#6366F1',        // 优雅的靛蓝色
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',

  // 功能色
  secondary: '#8B5CF6',
  success: '#10B981',        // 收入绿 - 柔和的翠绿
  warning: '#F59E0B',
  error: '#F43F5E',          // 支出红 - 优雅的玫瑰红
  info: '#3B82F6',

  // 背景和表面 - 更柔和的色调
  background: '#FAFBFC',     // 极淡的蓝灰背景
  backgroundSecondary: '#EFEFF4', // 类Telegram设置页面的背景色
  surface: '#FFFFFF',        // 纯白卡片
  surfaceSecondary: '#F8F9FA', // 次要表面
  card: '#FFFFFF',

  // 文字颜色 - 更柔和的对比
  text: '#2D3748',           // 深灰主文字
  textSecondary: '#718096',  // 中灰次要文字
  textDisabled: '#CBD5E0',   // 浅灰禁用文字
  textLight: '#A0AEC0',      // 淡灰提示文字

  // 边框和分隔线 - 更轻柔
  border: '#E2E8F0',         // 浅灰边框
  divider: '#F7FAFC',        // 极浅分割线

  // 阴影
  shadow: '#000000',
  shadowSoft: '#8B92A8',     // 柔和阴影色

  // 特殊：记账相关
  income: '#10B981',         // 收入专用绿
  expense: '#F43F5E',        // 支出专用红
  incomeLight: '#D1FAE5',    // 收入浅色背景
  expenseLight: '#FFE4E8',   // 支出浅色背景
  backdrop: 'rgba(0, 0, 0, 0.3)',  // 遮罩层

  // 辅助色彩（用于分类等）
  accent: {
    purple: '#8B5CF6',
    blue: '#3B82F6',
    cyan: '#06B6D4',
    teal: '#14B8A6',
    emerald: '#10B981',
    green: '#22C55E',
    lime: '#84CC16',
    yellow: '#EAB308',
    amber: '#F59E0B',
    orange: '#F97316',
    red: '#EF4444',
    pink: '#EC4899',
    rose: '#F43F5E',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 999,
};

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  xl: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
};


/**
 * 账本类型配色
 */
export const LedgerColors = {
  personal: '#667eea',    // 个人账本 - 紫色
  shared: '#f6ad55',      // 共享账本 - 橙色
  business: '#48bb78',    // 企业账本 - 绿色
};

/**
 * 角色徽章配色
 */
export const RoleBadgeColors = {
  owner: '#e53e3e',       // 所有者 - 红色
  admin: '#dd6b20',       // 管理员 - 橙色
  editor: '#38a169',      // 记账员 - 绿色
  viewer: '#4299e1',      // 查看者 - 蓝色
};

/**
 * 账本类型图标映射
 */
export const LedgerIcons = {
  personal: '📖',
  shared: '👨‍👩‍👧‍👦',
  business: '🏢',
};