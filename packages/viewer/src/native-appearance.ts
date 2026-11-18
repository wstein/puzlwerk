// SPDX-License-Identifier: AGPL-3.0-or-later
// Source: Cubistry efafcc1d97687eccea0cde87a230f447ce1b6c66 packages/cube-viewer/src/appearance.ts
// Adaptation: optional generic storage/environment and transactional sync/async render acceptance.
// ViewerAppearance is a rendering UI preference, separate from canonical appearance-v1.
// A callback must leave renderer state uncommitted when it returns false, throws or rejects.
function demand(condition: unknown, message: string): asserts condition { if (!condition) throw Error(message); }
export type RenderAssetManifest = Readonly<{images: readonly Readonly<{id:string;kind:string;color?:string;documentId?:string}>[];documents: readonly Readonly<{id:string;background?:string}>[]}>;
import { PICTURE_MODES, PROJECTED_HELP, DEFAULT_PICTURE_MODE, parsePictureMode, type PictureMode } from "./native-picture-mode.js";
export type Construction = "stickered" | "stickerless";
export interface ViewerAppearance {
  readonly construction: Construction;
  readonly frameColor: string | null;
  /** Explicit picture mapping choice; absent means no choice (the default, Projected, applies). */
  readonly pictureMode?: PictureMode;
}
export const DEFAULT_APPEARANCE: ViewerAppearance = Object.freeze({ construction: "stickered", frameColor: null });
export function validateAppearance(value: ViewerAppearance): ViewerAppearance {
  demand(value && ["stickered", "stickerless"].includes(value.construction), "Invalid cube construction");
  demand(value.frameColor === null || /^#[0-9a-f]{6}$/i.test(value.frameColor), "Invalid frame color");
  demand(value.pictureMode === undefined || PICTURE_MODES.includes(value.pictureMode), "Invalid picture mode");
  return Object.freeze({ construction: value.construction, frameColor: value.frameColor,
    ...(value.pictureMode === undefined ? {} : { pictureMode: value.pictureMode }) });
}
/** Explicit asset metadata only; never sample pixels, erase white or alter art. */
export function sourceFaceColor(assetId: string, manifest: RenderAssetManifest | undefined, fallback: string): string {
  const asset = manifest?.images.find(image => image.id === assetId);
  if (asset?.kind === "color") return asset.color ?? fallback;
  if (asset?.kind === "text")
    return manifest?.documents.find(document => document.id === asset.documentId)?.background ?? fallback;
  return fallback;
}
export function readAppearance(storage: Pick<Storage, "getItem">, key: string): ViewerAppearance {
  try {
    const saved = JSON.parse(storage.getItem(key) ?? "null");
    if (saved?.version !== 1) return DEFAULT_APPEARANCE;
    // An unknown stored picture mode is no choice; the setting stays valid.
    const { pictureMode, ...rest } = saved;
    const mode = parsePictureMode(pictureMode);
    return validateAppearance({ ...rest, ...(mode ? { pictureMode: mode } : {}) });
  } catch { return DEFAULT_APPEARANCE; }
}

/** One small presentation control per viewport; no application-state settings. */
export function installAppearanceControls(host: HTMLElement, change: (value: ViewerAppearance, info?: { readonly pictureChosen: boolean }) => void | boolean | Promise<void | boolean>, options: { readonly storageKey?: string; readonly environment?: { readonly document: Document; readonly storage?: Pick<Storage, "getItem" | "setItem"> } } = {}) {
  const document = options.environment?.document ?? globalThis.document, key = options.storageKey;
  let storage = options.environment?.storage;
  if (!options.environment) { try { storage = globalThis.localStorage; } catch { /* Storage may be unavailable. */ } }
  let initialValue = DEFAULT_APPEARANCE;
  if (key !== undefined && storage) initialValue = readAppearance(storage, key);
  let value = DEFAULT_APPEARANCE; let pending = false, disposed = false;
  let pendingChoice: { readonly available: boolean; readonly mode: PictureMode } | undefined;
  let defaultColor = "#202329",defaultMixed=false,pendingDefaultColor: {color:string;mixed:boolean} | undefined;
  // A host that names a dock region (`data-appearance-dock`) gets the panel as a collapsed section of that region
  // instead of an overlay on the stage. Pages without it keep the floating panel.
  const dockName = (host as { dataset?: DOMStringMap }).dataset?.appearanceDock;
  const dock = dockName ? document.querySelector?.(`[data-region="${dockName}"]`) as HTMLElement | null : null;
  const previousPosition = host.style.position;
  if (!dock) host.style.position = "relative";
  const panel = document.createElement("aside");
  if (dock) {
    for (const stale of Array.from(dock.querySelectorAll(".cube-appearance"))) stale.remove();
    panel.className = "cube-appearance is-docked";
  } else {
    panel.className = "cube-appearance floating-hud floating-hud-appearance";
    Object.assign(panel.style, { position: "absolute", top: "16px", left: "16px", zIndex: "30", textAlign: "left" });
  }

  const header = document.createElement("div");
  header.className = "hud-header";

  const title = document.createElement("h2");
  title.className = "hud-title";
  title.textContent = "Appearance";

  const actions = document.createElement("div");
  actions.className = "hud-actions";

  const toggleBtn = document.createElement("span");
  toggleBtn.setAttribute("role", "button");
  toggleBtn.setAttribute("tabindex", "0");
  toggleBtn.className = "hud-btn icon-only hud-toggle-btn";
  toggleBtn.title = "Minimize or expand appearance";
  toggleBtn.textContent = "─";
  actions.append(toggleBtn);

  toggleBtn.addEventListener("click", () => {
    if (panel.classList?.toggle) {
      panel.classList.toggle("is-minimized");
      toggleBtn.textContent = panel.classList.contains("is-minimized") ? "⚙" : "─";
    }
  });

  if (dock) header.append(title); else header.append(title, actions);

  const summary = document.createElement("summary");
  summary.className = "cube-appearance-summary";
  summary.setAttribute("aria-label", "Appearance settings");
  summary.textContent = "Appearance";
  summary.style.display = "none";

  const popover = document.createElement("div");
  popover.className = "cube-appearance-popover hud-content";

  const viewportSection = document.createElement("div");
  viewportSection.className = "cube-appearance-section cube-appearance-viewport";
  viewportSection.style.display = "flex";
  popover.append(viewportSection);

  const label = document.createElement("label"); label.className = "cube-appearance-check";
  const mode = document.createElement("input"); mode.type = "checkbox"; mode.setAttribute("aria-label", "Stickerless");
  const modeText = document.createElement("span"); modeText.textContent = " Stickerless";
  label.append(mode, modeText);
  const note = document.createElement("p"); note.className = "cube-appearance-hint"; note.textContent = "Artwork is kept in both.";
  // Rarely changed settings sit under a native disclosure (keyboard and screen reader support without script).
  const more = document.createElement("details"); more.className = "cube-appearance-more";
  const moreSummary = document.createElement("summary"); moreSummary.textContent = "More";
  const moreBody = document.createElement("div"); moreBody.className = "cube-appearance-more-body";
  const colorLabel = document.createElement("label"); colorLabel.textContent = " Frame color ";
  const color = document.createElement("input"); color.type = "color"; color.setAttribute("aria-label", "Plastic frame color");
  colorLabel.append(color);
  const reset = document.createElement("button"); reset.type = "button"; reset.textContent = "Style default";
  moreBody.append(colorLabel, reset);
  more.append(moreSummary, moreBody);
  // Projected: how a picture cube maps its images. Only picture cubes (faces with whole images) show it.
  const picturesWrap = document.createElement("div"); picturesWrap.className = "cube-appearance-pictures"; picturesWrap.style.display = "none";
  const picturesLabel = document.createElement("label"); picturesLabel.className = "cube-appearance-check";
  const pictures = document.createElement("input"); pictures.type = "checkbox"; pictures.setAttribute("aria-label", "Projected");
  const picturesText = document.createElement("span"); picturesText.textContent = " Projected";
  picturesLabel.append(pictures, picturesText);
  const picturesHelp = document.createElement("p"); picturesHelp.className = "cube-appearance-picture-hint";
  picturesWrap.append(picturesLabel, picturesHelp);
  viewportSection.append(label, note, picturesWrap, more);

  panel.append(header, summary, popover);
  let setOpen = (_open: boolean) => {};
  if (dock) {
    // Disclosure: collapsed on every install (the open state is deliberately not remembered).
    popover.id = "cube-appearance-body"; popover.hidden = true;
    const disclosure = document.createElement("button"); disclosure.type = "button"; disclosure.className = "cube-appearance-disclosure";
    disclosure.textContent = "Appearance"; disclosure.setAttribute("aria-expanded", "false"); disclosure.setAttribute("aria-controls", popover.id);
    title.textContent = ""; title.append(disclosure);
    let opener: HTMLElement | null = null;
    setOpen = (open: boolean) => {
      popover.hidden = !open; disclosure.setAttribute("aria-expanded", String(open));
      document.dispatchEvent?.(new CustomEvent("cube-appearance:state", { detail: { open, present: true } }));
    };
    disclosure.addEventListener("click", () => { opener = null; setOpen(Boolean(popover.hidden)); });
    panel.addEventListener("cube-appearance:open", (event) => {
      opener = (event as CustomEvent).detail?.opener ?? null; setOpen(true); disclosure.focus(); panel.scrollIntoView?.({ block: "nearest" });
    });
    panel.addEventListener("cube-appearance:close", () => setOpen(false));
    panel.addEventListener("keydown", (event) => {
      if ((event as KeyboardEvent).key !== "Escape" || popover.hidden) return;
      event.preventDefault(); setOpen(false); (opener ?? disclosure).focus();
    });
    dock.hidden = false; dock.append(panel); setOpen(false);
  } else host.append(panel);

  const originalAppend = panel.append.bind(panel);
  panel.append = (...nodes: any[]) => {
    for (const node of nodes) {
      if (node === header || node === summary || node === popover) {
        originalAppend(node);
      } else {
        const text = String(node.textContent ?? "").toLowerCase();
        const id = String(node.id ?? "").toLowerCase();
        const isSticker =
          id.includes("display") ||
          id.includes("letter") ||
          id.includes("marker") ||
          text.includes("display") ||
          text.includes("letter") ||
          text.includes("marker");
        if (isSticker || node.className === "cube-appearance-more-item") {
          moreBody.append(node); // Sticker fonts and lighting rows are rarely changed: under "More", no tabs.
        } else if (viewportSection.insertBefore) {
          viewportSection.insertBefore(node, more); // Primary controls stay ahead of "More" in DOM order.
        } else {
          viewportSection.append(node);
        }
      }
    }
  };

  const refresh = () => {
    mode.checked = value.construction === "stickerless"; color.value = value.frameColor ?? defaultColor;
    color.disabled = reset.disabled = value.construction === "stickerless";
    color.setAttribute("aria-description", value.frameColor === null && defaultMixed ? "Multiple style defaults" : "");
    showPictureMode(shownMode);
  };
  // Resolves true when the change was accepted and committed, false otherwise (rejected, refused, pending or disposed).
  const update = (next: ViewerAppearance, pictureChosen = false, persist = true): Promise<boolean> => {
    if (disposed || pending) { refresh(); return Promise.resolve(false); }
    const candidate = validateAppearance(next);
    let result: void | boolean | Promise<void | boolean>;
    pending = true;
    try { result = change(candidate, pictureChosen ? { pictureChosen } : undefined); }
    catch { pending = false; pendingChoice = undefined; pendingDefaultColor = undefined; refresh(); return Promise.resolve(false); }
    return new Promise<boolean>((resolve) => {
    const finish = (accepted: void | boolean) => {
      if (disposed) { resolve(false); return; }
      pending = false;
      if (accepted === false) { pendingChoice = undefined; pendingDefaultColor = undefined; refresh(); resolve(false); return; }
      value = candidate;
      if (pendingDefaultColor !== undefined) { defaultColor = pendingDefaultColor.color;defaultMixed=pendingDefaultColor.mixed; pendingDefaultColor = undefined; }
      if (pendingChoice) { picturesWrap.style.display = pendingChoice.available ? "" : "none"; shownMode = pendingChoice.mode; pendingChoice = undefined; }
      refresh();
      try { if (persist && key !== undefined) storage?.setItem(key, JSON.stringify({ version: 1, ...value })); } catch { /* Presentation remains usable. */ }
      resolve(true);
    };
    if (result && typeof (result as Promise<void | boolean>).then === "function") {
      pending = true; refresh();
      Promise.resolve(result).then(finish, () => { if (!disposed) { pending = false; pendingChoice = undefined; pendingDefaultColor = undefined; refresh(); } resolve(false); });
    } else finish(result as void | boolean);
    });
  };
  // Stickerless is always projected: the checkbox shows it checked and disabled.
  let shownMode: PictureMode = DEFAULT_PICTURE_MODE;
  function showPictureMode(id: PictureMode) {
    shownMode = id; const locked = value.construction === "stickerless";
    pictures.checked = locked || id === "projected"; pictures.disabled = locked; picturesHelp.textContent = PROJECTED_HELP;
  }
  pictures.addEventListener("change", () => update({ ...value, pictureMode: pictures.checked ? "projected" : "per-sticker" }, true));
  mode.addEventListener("change", () => update({ ...value, construction: mode.checked ? "stickerless" : "stickered" }));
  color.addEventListener("input", () => update({ ...value, frameColor: color.value }));
  reset.addEventListener("click", () => update({ ...value, frameColor: null }));
  refresh(); update(initialValue, false, false);
  return {
    panel,
    /** Applies an appearance chosen outside the panel through the same acceptance path as its controls. Nothing is stored: the caller owns that choice. */
    request(next: ViewerAppearance): Promise<boolean> {
      let candidate: ViewerAppearance;
      try { candidate = validateAppearance(next); } catch { return Promise.resolve(false); }
      return update(candidate, false, false);
    },
    setDefaultColor(color: string,mixed=false) { if (disposed) return; if (pending) { pendingDefaultColor = {color,mixed}; return; } defaultColor = color;defaultMixed=mixed;refresh(); },
    /** Shows or hides the Pictures choice and shows the mode in effect; never a user choice, nothing is stored. */
    setPictureChoice(choice: { readonly available: boolean; readonly mode: PictureMode }) {
      if (disposed) return;
      if (pending) { pendingChoice = choice; return; }
      picturesWrap.style.display = choice.available ? "" : "none";
      showPictureMode(choice.mode);
    },
    dispose() {
      disposed = true;
      // A superseded mode can dispose late, after a newer mode docked its own panel (which removed this one): then the
      // dock and the header button belong to the newer panel and stay as they are.
      const wasDocked = !!dock?.contains(panel);
      panel.remove();
      if (dock) {
        if (wasDocked) {
          if (!dock.children.length) dock.hidden = true;
          document.dispatchEvent?.(new CustomEvent("cube-appearance:state", { detail: { open: false, present: false } }));
        }
      } else host.style.position = previousPosition;
    },
  };
}
