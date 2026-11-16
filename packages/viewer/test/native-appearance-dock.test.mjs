// Source: Cubistry efafcc1d97687eccea0cde87a230f447ce1b6c66 tests/appearance-dock.test.mjs (viewer-owned cases)
import test from "node:test";
import assert from "node:assert/strict";
import { installAppearanceControls } from "../dist/native-appearance.js";

// The Appearance section of the studio's right-hand pane (the dock): collapsed by default, opened from the header
// header Appearance button, closed by Escape with focus returned. Fake DOM; the layout itself is in tests/browser/shell-layout.spec.mjs.

class Node extends EventTarget {
  constructor(tagName, id = "") {
    super(); this.tagName = tagName; this.id = id; this.style = {}; this.children = []; this.attributes = {}; this.className = "";
    this.dataset = {}; this.hidden = false; this.focused = 0;
  }
  append(...children) { for (const child of children) { if (typeof child !== "string") child.parent = this; this.children.push(child); } }
  insertBefore(node, ref) { node.parent = this; const at = this.children.indexOf(ref); this.children.splice(at < 0 ? this.children.length : at, 0, node); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; }
  remove() { if (this.parent) { this.parent.children = this.parent.children.filter(child => child !== this); this.parent = null; } }
  focus() { this.focused++; globalThis.document.activeElement = this; }
  scrollIntoView() {}
  contains(node) { for (let n = node; n; n = n.parent) if (n === this) return true; return false; }
  querySelectorAll(selector) {
    const out = [], visit = n => { for (const c of n.children) if (typeof c !== "string") { if (c.className.split(" ").includes(selector.slice(1))) out.push(c); visit(c); } };
    visit(this); return out;
  }
}
const walk = (node, out = []) => { out.push(node); if (typeof node !== "string") for (const child of node.children) walk(child, out); return out; };

function withDocument(run) {
  const names = ["document", "location", "localStorage"];
  const originals = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
  const dock = new Node("div"); dock.hidden = true;
  const scene = new Node("div"); scene.dataset.appearanceDock = "view-controls";
  const doc = Object.assign(new EventTarget(), { createElement: tag => new Node(tag), activeElement: null,
    querySelector: selector => selector === '[data-region="view-controls"]' ? dock : null });
  const globals = { document: doc, location: { pathname: "/dock.html" }, localStorage: { getItem: () => null, setItem() {} } };
  for (const name of names) Object.defineProperty(globalThis, name, { value: globals[name], configurable: true });
  try { return run({ dock, scene, doc }); } finally {
    names.forEach((name, index) => { if (originals[index]) Object.defineProperty(globalThis, name, originals[index]); else delete globalThis[name]; });
  }
}
const key = name => Object.assign(new Event("keydown", { cancelable: true }), { key: name });

test("docked: the panel moves into the view-controls region, collapsed, with a disclosure button; the stage host stays empty", () => withDocument(({ dock, scene }) => {
  const controls = installAppearanceControls(scene, () => {});
  assert.equal(scene.children.length, 0, "no overlay on the stage");
  assert.deepEqual(dock.children, [controls.panel]); assert.equal(dock.hidden, false);
  assert.equal(controls.panel.style.position, undefined, "no absolute positioning");
  assert(controls.panel.className.split(" ").includes("is-docked"));
  assert(!controls.panel.className.includes("floating-hud"), "the translucent HUD classes are not used");
  const toggle = walk(controls.panel).find(n => n.className === "cube-appearance-disclosure");
  assert.equal(toggle.tagName, "button"); assert.equal(toggle.textContent, "Appearance");
  assert.equal(toggle.attributes["aria-expanded"], "false", "closed by default");
  const body = walk(controls.panel).find(n => n.id === toggle.attributes["aria-controls"]);
  assert(body && body.hidden === true);
  toggle.dispatchEvent(new Event("click"));
  assert.equal(toggle.attributes["aria-expanded"], "true"); assert.equal(body.hidden, false);
  toggle.dispatchEvent(new Event("click"));
  assert.equal(body.hidden, true);
  controls.dispose();
  assert.equal(dock.children.length, 0); assert.equal(dock.hidden, true, "an empty region hides again");
}));

test("docked: the open state is not remembered, a second install starts closed and replaces a stale panel", () => withDocument(({ dock, scene }) => {
  const first = installAppearanceControls(scene, () => {});
  first.panel.dispatchEvent(new CustomEvent("cube-appearance:open", { detail: {} }));
  const second = installAppearanceControls(scene, () => {});
  assert.deepEqual(dock.children, [second.panel], "the stale panel is gone");
  const toggle = walk(second.panel).find(n => n.className === "cube-appearance-disclosure");
  assert.equal(toggle.attributes["aria-expanded"], "false");
}));

test("Escape closes the open section and returns focus to the opener (the header Appearance button) or the section toggle", () => withDocument(({ scene }) => {
  const controls = installAppearanceControls(scene, () => {}), panel = controls.panel;
  const toggle = walk(panel).find(n => n.className === "cube-appearance-disclosure");
  const opener = new Node("button");
  panel.dispatchEvent(new CustomEvent("cube-appearance:open", { detail: { opener } }));
  assert.equal(toggle.attributes["aria-expanded"], "true"); assert.equal(toggle.focused, 1, "focus moves into the section");
  const escape = key("Escape"); panel.dispatchEvent(escape);
  assert.equal(toggle.attributes["aria-expanded"], "false"); assert.equal(opener.focused, 1); assert(escape.defaultPrevented);
  toggle.dispatchEvent(new Event("click"));
  panel.dispatchEvent(key("Escape"));
  assert.equal(toggle.focused, 2, "opened with the toggle: focus returns to the toggle");
  const other = key("Escape"); panel.dispatchEvent(other);
  assert.equal(other.defaultPrevented, false, "Escape while closed is left to others");
}));

test("floating mode is unchanged for pages without a dock", () => withDocument(({ dock }) => {
  const host = new Node("div"), controls = installAppearanceControls(host, () => {});
  assert.deepEqual(host.children, [controls.panel]); assert.equal(dock.children.length, 0);
  assert.equal(controls.panel.style.position, "absolute");
}));
