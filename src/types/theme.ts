/**
 * 主题相关的类型定义
 */

// 主题模式类型
export type ThemeMode = 'light' | 'dark';

// 颜色配置接口
export interface ThemeColors {
  // 主色调
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // 功能色
  success: string;
  error: string;
  warning: string;
  info: string;
  
  // 背景和表面
  background: string;
  surface: string;
  card: string;
  
  // 文字
  text: string;
  textSecondary: string;
  textDisabled: string;
  
  // 边框
  border: string;
  divider: string;
  
  // 阴影
  shadow: string;
  
  // 特殊：记账相关
  income: string;      // 收入颜色
  expense: string;     // 支出颜色
  backdrop: string;    // 遮罩层
}
