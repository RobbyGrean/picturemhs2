const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "allowed_users.browser.html"), "utf8");
const scripts = Array.from(html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g));
const context = { console, document: { body: { textContent: "" } } };
context.window = context;
vm.createContext(context);
vm.runInContext(scripts[0][1], context, { filename: "allowed_users.mocks.js" });
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "starter", "Code.gs"), "utf8"), context, { filename: "starter/Code.gs" });
vm.runInContext(scripts[2][1], context, { filename: "allowed_users.assertions.js" });
assert.match(context.document.body.textContent, /^PASS:/, context.document.body.textContent);
console.log(context.document.body.textContent);
