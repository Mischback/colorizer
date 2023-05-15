import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/script/index.ts",
  output: {
    file: "dist/assets/colorizer.js",
    /* TODO: "es" or "iife"?!
     *
     * https://rollupjs.org/configuration-options/#output-format
     */
    format: "es",
  },
  plugins: [typescript()],
};
