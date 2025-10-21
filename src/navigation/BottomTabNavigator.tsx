import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AddTransactionScreen, GiftedChatScreen } from '../screens';
import { Text } from 'react-native';
import { Colors } from '../constants/theme.ts';

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
      <Tab.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{
          tabBarLabel: '记账',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>➕</Text>
          ),
        }}
      />

      <Tab.Screen
        name="Agent"
        component={GiftedChatScreen}
        options={{
          tabBarLabel: 'Agent',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🤖</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};
