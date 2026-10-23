import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import os from "node:os";
const base = process.env.AUDIT_URL || "http://127.0.0.1:4173";
const output = "reports/lighthouse";
await mkdir(output, { recursive: true });
const chromePath = process.env.CHROMIUM_PATH;
const chrome = await launch({
  chromePath,
  chromeFlags: ["--headless", "--no-sandbox", "--disable-dev-shm-usage"],
});
const results = [];
try {
  for (const path of ["/", "/nft/1"])
    for (const profile of ["mobile", "desktop"]) {
      const runs = [];
      for (let run = 1; run <= 3; run++) {
        const options = {
          port: chrome.port,
          output: ["html", "json"],
          logLevel: "error",
          onlyCategories: [
            "performance",
            "accessibility",
            "best-practices",
            "seo",
          ],
          formFactor: profile,
          screenEmulation:
            profile === "desktop"
              ? {
                  mobile: false,
                  width: 1440,
                  height: 1000,
                  deviceScaleFactor: 1,
                  disabled: false,
                }
              : {
                  mobile: true,
                  width: 390,
                  height: 844,
                  deviceScaleFactor: 1,
                  disabled: false,
                },
          throttlingMethod: "simulate",
          ...(profile === "desktop"
            ? {
                throttling: {
                  rttMs: 40,
                  throughputKbps: 10240,
                  cpuSlowdownMultiplier: 1,
                  requestLatencyMs: 0,
                  downloadThroughputKbps: 0,
                  uploadThroughputKbps: 0,
                },
              }
            : {}),
        };
        const result = await lighthouse(base + path, options);
        if (!result || result.lhr.runtimeError)
          throw new Error(
            result?.lhr.runtimeError?.message ||
              "Lighthouse não retornou resultado",
          );
        const name = `${path === "/" ? "inicio" : "detalhe"}-${profile}-${run}`;
        await writeFile(`${output}/${name}.html`, result.report[0]);
        await writeFile(`${output}/${name}.json`, result.report[1]);
        const metrics = {
          LCP: result.lhr.audits["largest-contentful-paint"].numericValue,
          CLS: result.lhr.audits["cumulative-layout-shift"].numericValue,
          TBT: result.lhr.audits["total-blocking-time"].numericValue,
        };
        const scores = Object.fromEntries(
          Object.entries(result.lhr.categories).map(([key, value]) => [
            key,
            Math.round(value.score * 100),
          ]),
        );
        runs.push({ ...scores, ...metrics });
        console.log(name, JSON.stringify(runs.at(-1)));
      }
      const median = Object.fromEntries(
        Object.keys(runs[0]).map((key) => [
          key,
          runs.map((r) => r[key]).sort((a, b) => a - b)[1],
        ]),
      );
      results.push({ path, profile, runs, median });
    }
  const metadata = {
    at: new Date().toISOString(),
    node: process.version,
    chrome: execFileSync(chromePath || "chromium", ["--version"], {
      encoding: "utf8",
    }).trim(),
    lighthouse: JSON.parse(
      execFileSync("npm", ["ls", "lighthouse", "--json"], { encoding: "utf8" }),
    ).dependencies.lighthouse.version,
    platform: `${os.type()} ${os.release()} ${os.arch()}`,
    cpu: os.cpus()[0]?.model,
    logicalCPUs: os.cpus().length,
    memoryGiB: Math.round(os.totalmem() / 1024 ** 3),
    conditions:
      "Build Vite otimizado; mocks padrão; assets locais; 3 execuções por página/perfil; throttling simulado; sem substituições de conteúdo para auditoria.",
  };
  await writeFile(
    `${output}/summary.json`,
    JSON.stringify({ metadata, results }, null, 2),
  );
  console.log("Relatórios em", output);
} finally {
  await chrome.kill();
}
