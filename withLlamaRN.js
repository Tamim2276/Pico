const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withLlamaRN(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application?.[0];

    if (!application) {
      return config;
    }

    const existing = application['uses-native-library'] || [];
    const opencl = existing.find((lib) => lib.$['android:name'] === 'libOpenCL.so');
    const htp = existing.find((lib) => lib.$['android:name'] === 'libcdsprpc.so');

    if (!opencl) {
      existing.push({ $: { 'android:name': 'libOpenCL.so', 'android:required': 'false' } });
    }

    if (!htp) {
      existing.push({ $: { 'android:name': 'libcdsprpc.so', 'android:required': 'false' } });
    }

    application['uses-native-library'] = existing;
    return config;
  });
};
