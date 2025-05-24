// theme/index.ts
const palette = {
  primary: '#007bff', // Xanh dương làm màu chính
  secondary: '#6c757d', // Xám cho màu phụ
  success: '#28a745', // Xanh lá cho thành công
  danger: '#dc3545', // Đỏ cho nguy hiểm, xóa
  warning: '#ffc107', // Vàng cho cảnh báo
  info: '#17a2b8', // Xanh lơ cho thông tin
  light: '#f8f9fa', // Rất nhạt
  dark: '#343a40', // Rất đậm
  white: '#ffffff',
  black: '#000000',
  grey: '#adb5bd', // Xám vừa
  lightGrey: '#e9ecef', // Xám rất nhạt
  background: '#ffffff', // Màu nền chính
  cardBackground: '#f9f9f9', // Màu nền cho card
  text: '#212529', // Màu chữ chính
  textSecondary: '#6c757d', // Màu chữ phụ
  borderColor: '#ced4da', // Màu viền
  transparent: 'transparent',
};

export const theme = {
  colors: {
    ...palette,
    // Bạn có thể thêm các màu ngữ nghĩa ở đây nếu cần
    // Ví dụ: buttonBackground: palette.primary,
    // headerBackground: palette.primary,
    // headerTintColor: palette.white,
    // tabActive: palette.primary,
    // tabInactive: palette.secondary,
  },
  spacing: {
  xs: 4,
  sm: 8,
  smd: 10,
  ms: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
},
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: 'bold' as 'bold', // Explicitly type fontWeight
    },
    h2: {
      fontSize: 24,
      fontWeight: 'bold' as 'bold',
    },
    h3: {
      fontSize: 20,
      fontWeight: 'bold' as 'bold',
    },
    h4: {
        fontSize: 18,
        fontWeight: '600' as '600',
    },
    body: {
      fontSize: 16,
    },
    bodySmall: {
      fontSize: 14,
    },
    caption: {
      fontSize: 12,
      color: palette.textSecondary,
    },
    button: {
      fontSize: 16,
      fontWeight: '500' as '500',
    }
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    round: 999,
  },
  shadow: {
    sm: {
      shadowColor: palette.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.00,
      elevation: 1,
    },
    md: {
      shadowColor: palette.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.22,
      shadowRadius: 2.22,
      elevation: 3,
    },
    lg: {
      shadowColor: palette.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    }
  }
};

export type Theme = typeof theme;

// Helper function to use theme in StyleSheet (optional, but can be handy)
// import { useColorScheme } from 'react-native';
// export const useAppTheme = () => {
//   const colorScheme = useColorScheme();
//   // You can extend this to support dark mode later
//   return theme;
// };
