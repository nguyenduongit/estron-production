// metro.config.js
// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // true: Cho phép Metro bundle cho web (nếu bạn vẫn build PWA/web)
  // false: Chỉ bundle cho native (Android, iOS)
  // Mặc định là true nếu bạn có "web" trong "platforms" của app.json
  isCSSEnabled: true,
});

// (Tùy chọn) Bổ sung hỗ trợ cho file .svg
// Nếu bạn có ý định sử dụng file SVG trực tiếp làm component
// Cần cài đặt: yarn add --dev react-native-svg-transformer
// config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
// config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
// config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

// (Tùy chọn) Cấu hình thêm nếu cần, ví dụ: resolver, transformer, server, ...
// Ví dụ: nếu bạn có một monorepo và cần Metro theo dõi các file bên ngoài thư mục dự án:
// const path = require('path');
// config.watchFolders = [path.resolve(__dirname, '..', 'shared-library')];
// config.resolver.nodeModulesPaths = [
//   path.resolve(__dirname, 'node_modules'),
//   path.resolve(__dirname, '..', 'shared-library', 'node_modules'),
// ];

module.exports = config;