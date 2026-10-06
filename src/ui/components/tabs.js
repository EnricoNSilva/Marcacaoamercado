/**
 * Componente: Navegação por Abas
 * Gerencia a alternância de abas ativas e sincroniza com o hash da URL (#aba).
 */

import { $$, $ } from "../dom.js";

export function initTabs({ onTabChange } = {}) {
  const buttons = $$(".tab-button");
  const panes = $$(".tab-pane");

  function activateTab(tabId, updateHash = true) {
    buttons.forEach((btn) => {
      const isActive = btn.dataset.tab === tabId;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    panes.forEach((pane) => {
      const isActive = pane.id === tabId;
      pane.classList.toggle("active", isActive);
    });

    if (updateHash && window.location.hash !== `#${tabId}`) {
      window.history.replaceState(null, "", `#${tabId}`);
    }

    if (onTabChange) {
      onTabChange(tabId);
    }
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      activateTab(btn.dataset.tab);
    });
  });

  // Lê hash inicial da URL
  const initialHash = window.location.hash.replace("#", "");
  if (initialHash && $(`#${initialHash}`)) {
    activateTab(initialHash, false);
  }

  return {
    activateTab,
  };
}
