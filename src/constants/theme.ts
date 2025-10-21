/**
 * 应用主题配置
 * 统一管理颜色、字体、间距等设计规范
 * 配色方案：清新薄荷 - 简洁、轻松、舒适
 */

export const Colors = {
  // 主色调 - 清新薄荷绿
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#34D399',
  
  // 功能色
  secondary: '#8B5CF6',
  success: '#10B981',    // 收入绿
  warning: '#F59E0B',
  error: '#F43F5E',      // 支出红
  info: '#3B82F6',
  
  // 背景和表面
  background: '#F9FAFB',  // 极浅灰背景
  surface: '#FFFFFF',     // 纯白卡片
  card: '#FFFFFF',
  
  // 文字颜色
  text: '#1F2937',           // 深灰主文字
  textSecondary: '#6B7280',  // 中灰次要文字
  textDisabled: '#D1D5DB',   // 浅灰禁用文字
  textLight: '#9CA3AF',      // 淡灰提示文字
  
  // 边框和分隔线
  border: '#E5E7EB',      // 浅灰边框
  divider: '#F3F4F6',     // 极浅分割线
  
  // 阴影
  shadow: '#000000',
  
  // 特殊：记账相关
  income: '#10B981',      // 收入专用绿
  expense: '#F43F5E',     // 支出专用红
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
};
