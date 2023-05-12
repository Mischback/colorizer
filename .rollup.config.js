import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/ts/colorizer.ts",
  output: {
    dir: "dist/assets",
    format: "es",
  },
  plugins: [typescript()],
};
