import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AddTransactionScreen, GiftedChatScreen, ProfileScreen, TransactionListScreen } from '../screens';
import { ReportScreen } from '../screens/ReportScreen';
import { Colors } from '../constants/theme.ts';
import { Icon } from '../components/common';

const Tab = createBottomTabNavigator();

export const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // 隐藏顶部导航栏
        tabBarActiveTintColor: Colors.primary, // 选中时的颜色
        tabBarInactiveTintColor: Colors.textSecondary, // 未选中时的颜色
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.divider,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      {/* 首页 记账列表 */}
      <Tab.Screen
        name="TransactionList"
        component={TransactionListScreen}
        options={{
          tabBarLabel: '账本',
          tabBarIcon: ({ color, size }) => (
            <Icon name="book" size={size} color={color} />
          ),
        }}
      />

      {/* 图表 */}
      <Tab.Screen
        name="Report"
        component={ReportScreen}
        options={{
          tabBarLabel: '图表',
          tabBarIcon: ({ color, size }) => (
            <Icon name="stats-chart" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Agent"
        component={GiftedChatScreen}
        options={{
          tabBarLabel: 'Agent',
          tabBarIcon: ({ color, size }) => (
            <Icon name="chatbubbles" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: '我的',
          tabBarIcon: ({ color, size }) => (
            <Icon name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
