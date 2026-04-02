import deckyPlugin from "@decky/rollup";

const config = deckyPlugin();

delete config.output.dir;
config.output.file = "dist/index.js";
config.output.format = "iife";
export default config;
