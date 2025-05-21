const globals = require("globals");
const pluginJs = require("@eslint/js");

module.exports = [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        TweenLite: "readonly",
        gsap: "readonly",
        jQuery: "readonly",
        $: "readonly",
      },
      sourceType: "commonjs",
    },
  },
  pluginJs.configs.recommended,
];
