// Stripe's Android SDK (stripe-react-native 0.81+) depends on an optional Google Pay "tap and pay" artifact
// (com.google.android.gms:play-services-tapandpay) that is not published on public Maven, so Gradle fails with
// "Could not find play-services-tapandpay" while resolving the release classpath. The app never uses Stripe's
// in-app push provisioning, so the unresolvable artifact is excluded from every module's dependencies.
const { withProjectBuildGradle } = require('expo/config-plugins');

const MARK = '// forky: exclude tapandpay';

module.exports = function withStripeAndroidFix(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    if (cfg.modResults.contents.includes(MARK)) return cfg;
    cfg.modResults.contents += `
${MARK}
allprojects {
  configurations.configureEach {
    exclude group: 'com.google.android.gms', module: 'play-services-tapandpay'
  }
}
`;
    return cfg;
  });
};
