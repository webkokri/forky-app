const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Stripe's SDK is native-only. On web (used only for browser previews) it is replaced by an empty module;
// the app already handles a missing Stripe module (card payments simply report "not available").
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName.startsWith('@stripe/stripe-react-native')) return { type: 'empty' };
  return (upstream ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
