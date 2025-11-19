/**
 * 支付方式类型定义
 */

export type PaymentMethodType = 'CASH' | 'ALIPAY' | 'WECHAT' | 'BANK_CARD' | 'OTHER';

export interface PaymentMethod {
  id: number;
  name: string;
  icon: string;
  type: PaymentMethodType;
  isDefault: boolean;
  sortOrder: number;
}

export interface PaymentMethodReq {
  name: string;
  icon: string;
  type: PaymentMethodType;
  isDefault?: boolean;
  sortOrder?: number;
}
