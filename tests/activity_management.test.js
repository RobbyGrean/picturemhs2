const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "activity_management.browser.html"), "utf8");
const inlineScripts = Array.from(html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))
  .filter((match) => !match[0].includes(" src="))
  .map((match) => match[1]);

assert.equal(inlineScripts.length, 2, "unexpected browser test harness structure");

const context = { console, document: { body: { textContent: "" } } };
context.window = context;
vm.createContext(context);
vm.runInContext(inlineScripts[0], context, { filename: "activity_management.mocks.js" });
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "starter", "Code.gs"), "utf8"), context, { filename: "starter/Code.gs" });
vm.runInContext(inlineScripts[1], context, { filename: "activity_management.assertions.js" });

assert.match(context.document.body.textContent, /^PASS:/, context.document.body.textContent);
console.log(context.document.body.textContent);
