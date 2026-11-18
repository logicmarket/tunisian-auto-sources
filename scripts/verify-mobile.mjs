/**
 * File: scripts/verify-mobile.mjs
 * Purpose: Headless-Chrome layout checks at 375 px and 768 px.
 * Verifies no horizontal overflow and reports interactive controls smaller
 * than the 48 px touch target. Uses the Chrome DevTools Protocol directly so
 * the project needs no extra browser dependency.
 *
 * Usage: node scripts/verify-mobile.mjs [baseUrl]
 */

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3210";
const CHROME =
  process.env.CHROME_PATH ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9333;
const PROFILE = mkdtempSync(join(tmpdir(), "tas-mobile-"));

const PAGES = [
  { name: "الرئيسية", path: "/" },
  { name: "التشخيص", path: "/tools/diagnosis" },
  { name: "مساحتي", path: "/my-sources" },
  { name: "صفحة مصدر", path: "/sources/28" },
  { name: "أضف مصدراً", path: "/contribute" },
  { name: "أكواد OBD", path: "/obd-codes" },
];

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--hide-scrollbars",
    "about:blank",
  ],
  { stdio: "ignore" },
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson(path) {
  const response = await fetch(`http://127.0.0.1:${PORT}${path}`);
  if (!response.ok) throw new Error(`${path} → ${response.status}`);
  return response.json();
}

async function waitForChrome() {
  for (let i = 0; i < 80; i += 1) {
    try {
      await getJson("/json/version");
      return;
    } catch {
      await sleep(150);
    }
  }
  throw new Error("Chrome remote debugging did not start");
}

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.events = new Map();
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      const listeners = this.events.get(message.method) ?? [];
      listeners.forEach((listener) => listener(message.params));
    });
  }

  open() {
    return new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  once(method) {
    return new Promise((resolve) => {
      const listener = (params) => {
        const list = this.events.get(method) ?? [];
        this.events.set(
          method,
          list.filter((entry) => entry !== listener),
        );
        resolve(params);
      };
      const list = this.events.get(method) ?? [];
      this.events.set(method, [...list, listener]);
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text ?? "evaluate failed");
    }
    return result.result.value;
  }
}

const INSPECT = `(() => {
  const width = window.innerWidth;
  const doc = document.documentElement;
  const overflowing = [];
  const seen = new Set();
  const isClipped = (element) => {
    for (let node = element.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.overflowX === "auto" || style.overflowX === "scroll" || style.overflowX === "hidden") {
        return true;
      }
      if (node.getAttribute("aria-hidden") === "true" || node.classList.contains("pdf-sheet")) {
        return true;
      }
    }
    return false;
  };

  for (const element of document.querySelectorAll("body *")) {
    const style = getComputedStyle(element);
    if (style.position === "fixed" || style.visibility === "hidden" || style.display === "none") continue;
    if (isClipped(element)) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (rect.right > width + 1 || rect.left < -1) {
      const key = element.tagName + ":" + (element.className || "").toString().slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);
      overflowing.push({
        tag: element.tagName,
        cls: (element.className || "").toString().slice(0, 80),
        text: (element.innerText || "").trim().replace(/\\s+/g, " ").slice(0, 50),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      });
      if (overflowing.length >= 12) break;
    }
  }

  const small = [];
  const controls = document.querySelectorAll("main button, main a, main input, main select, main textarea, header button, header a, nav a");
  for (const element of controls) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const style = getComputedStyle(element);
    if (style.visibility === "hidden" || style.display === "none") continue;
    if (rect.height < 47.5 || rect.width < 47.5) {
      small.push({
        tag: element.tagName,
        text: (element.innerText || element.getAttribute("aria-label") || "").trim().replace(/\\s+/g, " ").slice(0, 40),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        inline: style.display === "inline",
      });
      if (small.length >= 20) break;
    }
  }

  return {
    viewport: width,
    scrollWidth: Math.max(doc.scrollWidth, document.body.scrollWidth),
    overflow: overflowing,
    small,
    bodyFont: getComputedStyle(document.body).fontFamily,
    dir: doc.dir,
  };
})()`;

async function main() {
  await waitForChrome();
  const target = await fetch(
    `http://127.0.0.1:${PORT}/json/new?about:blank`,
    { method: "PUT" },
  ).then((response) => response.json());
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  const report = [];
  for (const width of [375, 768]) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: width < 500,
    });

    for (const page of PAGES) {
      const loaded = cdp.once("Page.loadEventFired");
      await cdp.send("Page.navigate", { url: `${BASE}${page.path}` });
      await loaded;
      // Let hydration and client data settle.
      await sleep(900);
      const result = await cdp.evaluate(INSPECT);
      report.push({ width, name: page.name, path: page.path, ...result });
    }
  }

  console.log(JSON.stringify(report, null, 2));
  const failures = report.filter(
    (entry) => entry.scrollWidth > entry.viewport + 1 || entry.overflow.length > 0,
  );
  if (failures.length > 0) {
    console.error(`\n[FAIL] horizontal overflow on ${failures.length} page/viewport combination(s).`);
    process.exitCode = 1;
  } else {
    console.log("\n[OK] no horizontal overflow at 375 px or 768 px.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sleep(200);
    chrome.kill();
    try {
      rmSync(PROFILE, { recursive: true, force: true });
    } catch {
      // Profile cleanup is best-effort on Windows.
    }
  });
