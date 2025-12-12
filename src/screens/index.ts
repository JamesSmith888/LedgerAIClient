/**
 * 导出所有页面
 */
export { BottomTabNavigator } from '../navigation/BottomTabNavigator';

// 新的自定义 Agent 聊天页面
export { AgentScreen } from './AgentScreen';

// 原有的 GiftedChat 实现（已停用，保留作为参考）
// export { GiftedChatScreen } from './GiftedChatScreen';

export { AddTransactionScreen } from './AddTransactionScreen';

export { LoginScreen } from './LoginScreen';

export { RegisterScreen } from './RegisterScreen';

export { ProfileScreen } from './ProfileScreen';

export { TransactionListScreen } from './TransactionListScreen';

// 账本相关页面
export { LedgerManagementScreen } from './LedgerManagementScreen';
export { LedgerDetailScreen } from './LedgerDetailScreen';
export { CreateLedgerScreen } from './CreateLedgerScreen';
export { InviteMemberScreen } from './InviteMemberScreen';
export { AcceptInviteScreen } from './AcceptInviteScreen';
export { JoinByCodeScreen } from './JoinByCodeScreen';

// 支付方式相关页面
export { PaymentMethodManagementScreen } from './PaymentMethodManagementScreen';

// 分类相关页面
export { CategoryManagementScreen } from './CategoryManagementScreen';

// 模板相关页面
export { TemplateManagementScreen } from './TemplateManagementScreen';

// 反馈相关页面
export { FeedbackScreen } from './FeedbackScreen';
export { FeedbackDetailScreen } from './FeedbackDetailScreen';
export { SubmitFeedbackScreen } from './SubmitFeedbackScreen';

// 设置相关页面
export { SettingsScreen } from './SettingsScreen';
export { DataExportScreen } from './DataExportScreen';
export { APIKeySettingsScreen } from './APIKeySettingsScreen';
export { DataStorageSettingsScreen } from './DataStorageSettingsScreen';
export { UserPreferenceMemoryScreen } from './UserPreferenceMemoryScreen';
