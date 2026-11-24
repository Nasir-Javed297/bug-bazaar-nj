// Task D4-1: Lighthouse accessibility audit of the pages the evaluator named.
// Usage: npm run a11y   (builds first, then serves dist/ and audits it in headless Chrome)
// Prints each page's score and every failed check; exits with code 1 if any page is below 90.
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import { preview } from "vite";

const PAGES = ["/", "/cart", "/login"];
const MIN_SCORE = 90;
const PORT = 4174;

const server = await preview({ preview: { port: PORT, strictPort: true } });
const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless=new"] });
let lowest = 100;

try {
  for (const path of PAGES) {
    const { lhr } = await lighthouse(`http://localhost:${PORT}${path}`, {
      port: chrome.port,
      onlyCategories: ["accessibility"],
      logLevel: "error",
    });
    const score = Math.round(lhr.categories.accessibility.score * 100);
    lowest = Math.min(lowest, score);
    console.log(`${path.padEnd(8)} accessibility ${score}`);

    // Automated checks that ran and did not fully pass.
    const failed = Object.values(lhr.audits).filter(
      (audit) => audit.scoreDisplayMode === "binary" && audit.score !== 1,
    );
    for (const audit of failed) {
      const where = audit.details?.items?.[0]?.node?.snippet ?? "";
      console.log(`   ✗ ${audit.id}: ${audit.title}  ${where.slice(0, 90)}`);
    }
  }
} finally {
  await chrome.kill();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

console.log(lowest >= MIN_SCORE ? `\nAll pages ≥ ${MIN_SCORE}.` : `\nBelow ${MIN_SCORE}!`);
process.exitCode = lowest >= MIN_SCORE ? 0 : 1;
