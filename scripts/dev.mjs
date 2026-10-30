import { spawn } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [
  spawn(process.execPath, ["scripts/studio-server.mjs"], { stdio: "inherit", env: process.env }),
  spawn(npm, ["run", "dev:storefront", "--", ...process.argv.slice(2)], {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  }),
];
let exiting = false;
function stop(code = 0) {
  if (exiting) return;
  exiting = true;
  for (const child of children) if (child.exitCode === null) child.kill();
  process.exitCode = code;
}
for (const child of children)
  child.on("exit", (code) => {
    if (!exiting) stop(code || 0);
  });
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
