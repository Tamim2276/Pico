module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["."],
          alias: {
            "@domain": "./src/domain",
            "@data": "./src/data",
            "@presentation": "./src/presentation",
            "@di": "./src/di",
            "@shared": "./src/shared",
          },
        },
      ],

      // // Required for Reanimated 4 / Expo SDK 54.
      // // This MUST be the last item in the plugins array.
      // "react-native-worklets/plugin",
      // 'react-native-reanimated/plugin'
      "react-native-reanimated/plugin",
    ],
  };
};
