const envFiles = {
  production: '.env.production',
  windows: '.env.windows',
  mobile: '.env.mobile',
  default: '.env',
};

const APP_ENV = process.env.APP_ENV || 'default';
const envFile = envFiles[APP_ENV] || '.env';

console.log(`[babel] Using env file: ${envFile} (APP_ENV=${APP_ENV})`);

module.exports = {
    presets: ['module:metro-react-native-babel-preset'],
    plugins: [
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: envFile,
        blacklist: null,
        whitelist: null,
        safe: false,
        allowUndefined: true,
      }],
      ['module-resolver', {
        root: ['./src'],
        alias: {
          'src': './src',
        },
      }],
      ['@babel/plugin-proposal-class-properties', { 'loose': true }],
      ['@babel/plugin-transform-private-methods', { 'loose': true }],
      ['@babel/plugin-transform-private-property-in-object', { 'loose': true }],
      'react-native-reanimated/plugin',
    ],
  };