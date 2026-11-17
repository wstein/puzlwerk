// SPDX-License-Identifier: AGPL-3.0-or-later
// Source: Cubistry efafcc1d97687eccea0cde87a230f447ce1b6c66 packages/cube-viewer/src/rotation-binding.ts
// Adaptation: explicit optional storage key, caller-owned controller and additional interaction surfaces.
// Time is seconds; changed signals input/preference changes, not step(). The caller schedules frames and deadlines.
import type { Object3D } from "three";
import { SmartRotation, rotationModes, type RotationMode } from "./smart-rotation.js";
import { installPresentationDrag, type PointerRoute } from "./presentation-input.js";
export interface RotationEnvironment {
  now(): number;
  document: Pick<Document, "hidden" | "createElement" | "addEventListener" | "removeEventListener">;
  window?: Pick<Window, "addEventListener" | "removeEventListener">;
  media: Pick<MediaQueryList, "matches" | "addEventListener" | "removeEventListener">;
  storage?: Pick<Storage, "getItem" | "setItem">;
}
export function readRotationMode(storage: Pick<Storage, "getItem"> | undefined, key: string): RotationMode {
  try {
    const raw = storage?.getItem(key); if (!raw || raw.length > 256) return "smart";
    const value = JSON.parse(raw); return value?.version === 1 && rotationModes.includes(value.mode) ? value.mode : "smart";
  } catch { return "smart"; }
}
function browserEnvironment(): RotationEnvironment {
  let storage: RotationEnvironment["storage"]; try { storage = localStorage; } catch { /* Private mode can deny access. */ }
  return { now: () => performance.now() / 1000, document, window, media: matchMedia("(prefers-reduced-motion: reduce)"), storage };
}
let noteSerial = 0;
/** One binding per viewport, including one for the entire shared clock assembly. */
export function bindSmartRotation(element: HTMLElement, root: Object3D, options: {
  sensitivity: number; threshold?: number; panel: HTMLElement; changed?: () => void; environment?: RotationEnvironment; storageKey?: string; controller?: SmartRotation; requestMode?: (mode: RotationMode) => boolean; requestReducedMotion?: (value: boolean) => boolean; route?:PointerRoute;
}) {
  if (!Number.isFinite(options.sensitivity) || options.sensitivity <= 0) throw Error("Invalid rotation sensitivity");
  const env = options.environment ?? browserEnvironment(), key = options.storageKey;
  const controller = options.controller ?? new SmartRotation(root.quaternion, key === undefined ? "smart" : readRotationMode(env.storage, key), env.media.matches);
  if (options.controller) {
    if (key !== undefined) controller.setMode(readRotationMode(env.storage, key), env.now());
    controller.setReducedMotion(env.media.matches, env.now());
  }
  let disposed = false, canvasHeld = false, blockedOverlap = false, focused = true;
  const panelPointers = new Set<number>();
  const apply = () => root.quaternion.copy(controller.quaternion);
  const previousTouchAction = element.style.touchAction; element.style.touchAction = "none";
  const drag = installPresentationDrag(element, (dx, dy) => {
    if (panelPointers.size || blockedOverlap) return;
    controller.drag(dy * options.sensitivity, dx * options.sensitivity, env.now());
    apply(); if (dx || dy) options.changed?.();
  }, options.threshold ?? 0, {
    down() { canvasHeld = true; if (panelPointers.size) blockedOverlap = true; controller.down(env.now()); apply(); options.changed?.(); },
    up(_event, cancelled) {
      canvasHeld = false;
      if (!panelPointers.size) { controller.up(env.now(), cancelled || blockedOverlap); blockedOverlap = false; }
      apply(); options.changed?.();
    },
  }, options.route);
  const label = env.document.createElement("label"); label.textContent = " Rotation ";
  const select = env.document.createElement("select"); select.setAttribute("aria-label", "View rotation mode");
  for (const [value, text] of [["smart", "Smart Rubber Band"], ["free", "Free Rotation"], ["classic", "Classic"]]) {
    const option = env.document.createElement("option"); option.value = value; option.textContent = text; select.append(option);
  }
  const note = env.document.createElement("p"); note.id = `cube-rotation-note-${++noteSerial}`; note.style.margin = "6px 0 0";
  note.hidden = true; // The full text sits behind the visible "i" button; aria-describedby still reads it.
  select.setAttribute("aria-describedby", note.id); label.append(select);
  const hint = env.document.createElement("p"); hint.className = "cube-appearance-hint";
  const info = env.document.createElement("button") as HTMLButtonElement; info.type = "button"; info.className = "cube-appearance-info";
  info.textContent = "i"; info.title = "About view rotation"; info.setAttribute("aria-label", "About view rotation");
  info.setAttribute("aria-controls", note.id); info.setAttribute("aria-expanded", "false");
  const toggleInfo = () => { note.hidden = !note.hidden; info.setAttribute("aria-expanded", String(!note.hidden)); };
  info.addEventListener("click", toggleInfo);
  const row = env.document.createElement("div"); row.className = "cube-appearance-hint-row"; row.append(hint, info);
  options.panel.append(label, row, note); // DOM order = reading order: control, hint with button, details
  const refresh = () => {
    select.value = controller.mode;
    hint.textContent = controller.reducedMotion ? "Reduced motion: no inertia."
      : controller.mode === "smart" ? "Returns to your last view." : controller.mode === "free" ? "No automatic return." : "No inertia, no return.";
    note.textContent = controller.reducedMotion ? "Reduced motion: inertia and automatic return are off; choosing an upright mode levels gently over 150 ms."
      : controller.mode === "smart" ? "Smart upright: views within 40° of the front stay; larger ones return to your last view after settling and a short wait that shrinks with distance."
      : controller.mode === "free" ? "Free Rotation: full rotation with inertia, without automatic return." : "Classic upright: direct rotation, without inertia or automatic return.";
  };
  const change = () => {
    if (disposed) return;
    // preference() ends in refresh(), which resets the select to the current
    // mode; read the user's choice first.
    const chosen = select.value;
    if (!rotationModes.includes(chosen as RotationMode)) { refresh(); return; }
    if (options.requestMode) {
      let accepted = false;
      try { accepted = options.requestMode(chosen as RotationMode); } catch { /* Treat a failed policy as a rejected request. */ }
      if (!accepted) { refresh(); return; }
    } else {
      if (env.media.matches !== controller.reducedMotion) preference();
      controller.setMode(chosen as RotationMode, env.now());
    }
    apply(); refresh(); options.changed?.();
    try { if (key !== undefined) env.storage?.setItem(key, JSON.stringify({ version: 1, mode: controller.mode })); } catch { /* Motion stays usable without persistence. */ }
  };
  const panelDown = (event: Event) => {
    if (disposed) return;
    const id = (event as PointerEvent).pointerId;
    panelPointers.add(id); if (canvasHeld) blockedOverlap = true;
    controller.down(env.now()); apply(); options.changed?.();
  };
  const panelRelease = (event: Event) => {
    if (disposed || !panelPointers.delete((event as PointerEvent).pointerId) || panelPointers.size) return;
    if (!canvasHeld) { controller.up(env.now(), true); blockedOverlap = false; apply(); options.changed?.(); }
  };
  const clearContacts = () => { panelPointers.clear(); drag(); canvasHeld = false; blockedOverlap = false; };
  const blur = () => { if (!disposed) { focused = false; controller.suspend(env.now()); clearContacts(); apply(); options.changed?.(); } };
  const focus = () => { if (!disposed) { focused = true; if (!env.document.hidden) controller.resume(env.now()); apply(); options.changed?.(); } };
  const panelActivity = () => { if (!disposed) { controller.interact(env.now()); apply(); options.changed?.(); } };
  const preference = () => {
    if (disposed) return;
    if (options.requestReducedMotion) {
      let accepted = false;
      try { accepted = options.requestReducedMotion(env.media.matches); } catch { /* A policy error rejects the request. */ }
      if (!accepted) { refresh(); return; }
    } else controller.setReducedMotion(env.media.matches, env.now());
    apply(); refresh(); options.changed?.();
  };
  const visibility = () => {
    if (disposed) return;
    if (env.document.hidden) { controller.suspend(env.now()); clearContacts(); }
    else if (focused) controller.resume(env.now());
    apply(); options.changed?.();
  };
  const registrations = new Set<() => void>();
  const seenDown = new WeakSet<Event>(), seenActivity = new WeakSet<Event>();
  const registerInteractionSurface = (surface: HTMLElement) => {
    if (disposed) throw Error("Rotation binding is disposed");
    const ids = new Set<number>();
    const down = (event: Event) => { if (seenDown.has(event)) return; seenDown.add(event); ids.add((event as PointerEvent).pointerId); panelDown(event); };
    const activity = (event: Event) => { if (seenActivity.has(event)) return; seenActivity.add(event); if (options.requestMode && event.target === select && (event.type === "change" || event.type === "input")) return; panelActivity(); };
    const release = (event: Event) => { ids.delete((event as PointerEvent).pointerId); };
    surface.addEventListener("pointerdown", down);
    for (const type of ["keydown", "input", "change"]) surface.addEventListener(type, activity);
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) env.document.addEventListener(type, release, true);
    let active = true;
    const unregister = () => {
      if (!active) return; active = false;
      surface.removeEventListener("pointerdown", down);
      for (const type of ["keydown", "input", "change"]) surface.removeEventListener(type, activity);
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) env.document.removeEventListener(type, release, true);
      for (const id of ids) panelRelease({pointerId:id} as PointerEvent);
      ids.clear(); registrations.delete(unregister);
    };
    registrations.add(unregister); return unregister;
  };
  registerInteractionSurface(options.panel);
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) env.document.addEventListener(type, panelRelease, true);
  env.window?.addEventListener("blur", blur); env.window?.addEventListener("focus", focus);
  select.addEventListener("change", change); env.media.addEventListener("change", preference); env.document.addEventListener("visibilitychange", visibility);
  refresh(); if (env.document.hidden) controller.suspend(env.now()); apply();
  return {
    controller,
    refresh() { if (!disposed) refresh(); },
    cancelContacts() { if (!disposed) clearContacts(); },
    registerInteractionSurface,
    step() { if (!disposed) { controller.step(env.now()); apply(); } },
    interact() { if (!disposed) { controller.interact(env.now()); apply(); options.changed?.(); } },
    reset() { if (!disposed) { controller.reset(env.now()); drag(); apply(); options.changed?.(); } },
    setMode(mode: RotationMode) { if (!disposed) { controller.setMode(mode, env.now()); apply(); refresh(); options.changed?.(); } },
    setReducedMotion(value: boolean) { if (!disposed) { controller.setReducedMotion(value, env.now()); apply(); refresh(); options.changed?.(); } },
    dispose() {
      if (disposed) return; drag(); for (const unregister of [...registrations]) unregister(); disposed = true; if (!options.controller) controller.dispose(); drag.dispose();
      select.removeEventListener("change", change); env.media.removeEventListener("change", preference); env.document.removeEventListener("visibilitychange", visibility);
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) env.document.removeEventListener(type, panelRelease, true);
      env.window?.removeEventListener("blur", blur); env.window?.removeEventListener("focus", focus); panelPointers.clear();
      info.removeEventListener("click", toggleInfo); label.remove(); note.remove(); row.remove(); element.style.touchAction = previousTouchAction;
    },
  };
}
export type SmartRotationBinding = ReturnType<typeof bindSmartRotation>;
