export * from './ledger';

/**
 * 通用类型定义
 */

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface ListItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
}
