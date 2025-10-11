import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Colors } from '../constants/theme.ts';
import { DiscoverScreen } from '../screens';
import { Text } from 'react-native';

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
        name="Discover"
        component={DiscoverScreen}
        options={{
          tabBarLabel: '发现',
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon={'🔍'} color={color} size={size} />
          ),
        }}
      ></Tab.Screen>
    </Tab.Navigator>
  );
};

const TabIcon = ({
  icon,
  color,
  size,
}: {
  icon: string;
  color: string;
  size: number;
}) => {
  return <Text style={{ fontSize: size, color }}>{icon}</Text>;
};
