    // App.tsx
    import 'react-native-gesture-handler'; // Quan trọng: import ở dòng đầu tiên
    import React from 'react';
    import { StatusBar } from 'expo-status-bar';
    import { SafeAreaProvider } from 'react-native-safe-area-context';
    import AppNavigator from './navigation/AppNavigator'; // Đường dẫn đúng
    import { theme } from './theme'; // Import theme

    export default function App() {
      return (
        <SafeAreaProvider>
          <AppNavigator />
          <StatusBar style="light" backgroundColor={theme.colors.primary} />
        </SafeAreaProvider>
      );
    }
    