module.exports = function(api) {
  api.cache(true);
  
  return {
    presets: [
      'babel-preset-expo',
      '@babel/preset-typescript'
    ],
    plugins: [
      // Add React Native polyfills
      ['module-resolver', {
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          // Path alias to match tsconfig.json
          '@': './',
          
          // For the Node.js standard library polyfills
          'stream': 'stream-browserify',
          'events': 'eventemitter3',
          'crypto': 'crypto-browserify',
          'buffer': '@craftzdog/react-native-buffer',
          'http': '@tradle/react-native-http',
          'https': 'https-browserify',
          'os': 'os-browserify/browser',
          'fs': 'react-native-fs',
          'path': 'path-browserify',
        },
      }],
      'react-native-reanimated/plugin',
    ],
  };
};
