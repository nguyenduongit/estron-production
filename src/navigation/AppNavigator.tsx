// navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { TouchableOpacity, Platform } from 'react-native';

// Import các màn hình
import ProductScreen from '../screens/InputTab/ProductScreen';
import InputScreen from '../screens/InputTab/InputScreen';
import SettingScreen from '../screens/InputTab/SettingScreen';
import StatisticsScreen from '../screens/StatisticsTab/StatisticsScreen'; // Vẫn import StatisticsScreen

// Import types
import { InputStackNavigatorParamList, BottomTabNavigatorParamList } from './types';
// Nếu bạn muốn chặt chẽ hơn, có thể tạo StatisticsStackNavigatorParamList
// export type StatisticsStackNavigatorParamList = {
//   StatisticsDetail: undefined; // Hoặc tên màn hình bạn muốn cho StatisticsScreen trong stack này
// };

import { theme } from '../theme';

const InputTabStack = createStackNavigator<InputStackNavigatorParamList>(); // Đổi tên biến để rõ ràng hơn
const StatisticsTabStack = createStackNavigator(); // Stack mới cho tab Thống kê, có thể thêm ParamList nếu cần
const Tab = createBottomTabNavigator<BottomTabNavigatorParamList>();

// --- Header Style chung ---
const commonStackScreenOptions = {
  headerStyle: { backgroundColor: theme.colors.primary },
  headerTintColor: theme.colors.white,
  headerTitleStyle: { fontWeight: 'bold' as 'bold' },
};

// Stack Navigator cho Tab Nhập liệu
function InputStack() {
  return (
    <InputTabStack.Navigator
      initialRouteName="ProductList"
      screenOptions={commonStackScreenOptions}
    >
      <InputTabStack.Screen
        name="ProductList"
        component={ProductScreen}
        options={({ navigation }: { navigation: StackNavigationProp<InputStackNavigatorParamList, 'ProductList'> }) => ({
          title: 'Sản Lượng Estron',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={{
                marginRight: Platform.OS === 'ios' ? theme.spacing.sm : theme.spacing.md,
                padding: theme.spacing.xs,
              }}
            >
              <Ionicons name="settings-outline" size={24} color={theme.colors.white} />
            </TouchableOpacity>
          ),
        })}
      />
      <InputTabStack.Screen
        name="InputDetails"
        component={InputScreen}
      />
      <InputTabStack.Screen
        name="Settings"
        component={SettingScreen}
        options={{ title: 'Cài Đặt Định Mức' }}
      />
    </InputTabStack.Navigator>
  );
}

// --- Stack Navigator cho Tab Thống kê ---
// navigation.setOptions sẽ được gọi trong StatisticsScreen để set headerLeft
function StatisticsStack() {
  return (
    <StatisticsTabStack.Navigator
      screenOptions={commonStackScreenOptions}
    >
      <StatisticsTabStack.Screen
        name="StatisticsRoot"
        component={StatisticsScreen}
        options={{ title: 'Thống Kê Chung' }} // Title này sẽ bị override bởi StatisticsScreen
      />
      {/* Nếu sau này tab Thống kê có thêm màn hình con, bạn sẽ thêm vào đây */}
    </StatisticsTabStack.Navigator>
  );
}


// Bottom Tab Navigator chính
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'alert-circle-outline';

            if (route.name === 'InputTab') {
              iconName = focused ? 'create' : 'create-outline';
            } else if (route.name === 'StatisticsTab') {
              iconName = focused ? 'stats-chart' : 'stats-chart-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.secondary,
          headerShown: false, // QUAN TRỌNG: Stack con sẽ quản lý header của riêng nó
          tabBarStyle: {
            backgroundColor: theme.colors.white,
            borderTopColor: theme.colors.borderColor,
          }
        })}
      >
        <Tab.Screen
          name="InputTab"
          component={InputStack}
          options={{ title: 'Nhập liệu' }}
        />
        <Tab.Screen
          name="StatisticsTab"
          component={StatisticsStack}
          options={{ title: 'Thống kê' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}