/**
 * Bootstrap da Aplicação - Tesouro RENDA+ 2065
 * Inicializa o Store, registra as Views e gerencia o ciclo de vida da UI.
 */

// Importa Camadas de Estilo
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/responsive.css";

// Importa Arquitetura de Estado e Componentes
import { createStore } from "./state/index.js";
import { initTabs } from "./ui/components/tabs.js";
import { fetchMacroData, fetchTreasuryData } from "./core/api.js";

// Importa Views Modulares
import { createHeaderView } from "./ui/views/headerView.js";
import { createPositionView } from "./ui/views/positionView.js";
import { createSimulatorView } from "./ui/views/simulatorView.js";
import { createProjectionView } from "./ui/views/projectionView.js";
import { createMatrixView } from "./ui/views/matrixView.js";
import { createSettingsView } from "./ui/views/settingsView.js";

document.addEventListener("DOMContentLoaded", () => {
  // 1. Instancia o Store Reativo com auto-persistência
  const store = createStore();

  // 2. Instancia as Views
  const views = [
    createHeaderView(store),
    createPositionView(store),
    createSimulatorView(store),
    createProjectionView(store),
    createMatrixView(store),
    createSettingsView(store),
  ];

  // 3. Inicializa Navegação por Abas
  const tabs = initTabs({
    onTabChange: (tabId) => {
      const state = store.getState();
      const computed = store.getComputed();
      if (tabId === "tab-grafico") {
        views[3].render(state, computed); // Re-renderiza o gráfico com dimensões corretas
      } else if (tabId === "tab-posicao") {
        views[1].render(state, computed); // Re-renderiza o gráfico de alocação com dimensões corretas
      } else if (tabId === "tab-simulador") {
        views[2].render(state, computed);
      }
    },
  });

  // 4. Inscreve todas as views no Store
  store.subscribe((state, computed) => {
    views.forEach((v) => v.render(state, computed));
  });

  // 5. Inicializa Alternância de Tema (Dark / Light Mode) com Persistência
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const themeToggleIcon = document.getElementById("themeToggleIcon");

  function getSavedTheme() {
    try {
      return localStorage.getItem("theme") || "dark";
    } catch {
      return "dark";
    }
  }

  let activeTheme = getSavedTheme();

  function applyTheme(theme) {
    activeTheme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    if (themeToggleIcon) {
      themeToggleIcon.textContent = theme === "light" ? "🌙" : "☀️";
    }
    if (themeToggleBtn) {
      themeToggleBtn.title = theme === "light" ? "Mudar para Modo Escuro" : "Mudar para Modo Claro";
      themeToggleBtn.setAttribute("aria-label", themeToggleBtn.title);
    }
    try {
      localStorage.setItem("theme", theme);
    } catch {}
    
    // Re-renderiza views para atualizar temas dos gráficos
    const state = store.getState();
    const computed = store.getComputed();
    views.forEach((v) => v.render(state, computed));
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      applyTheme(activeTheme === "light" ? "dark" : "light");
    });
  }

  // Aplica tema inicial
  document.documentElement.setAttribute("data-theme", activeTheme);
  if (themeToggleIcon) {
    themeToggleIcon.textContent = activeTheme === "light" ? "🌙" : "☀️";
  }

  // 6. Primeira Renderização Inicial
  const initialState = store.getState();
  const initialComputed = store.getComputed();
  views.forEach((v) => v.render(initialState, initialComputed));

  // 6. Busca Dados Macroeconômicos (IPCA e Selic) em Background
  fetchMacroData().then(data => {
    const syncStatus = document.getElementById("syncIpcaStatus");
    if (data.success && data.ipca !== null) {
      const updateData = { ipcaCal: data.ipca };
      if (data.selic !== null) {
        updateData.selic = data.selic;
      }
      store.setState(updateData);

      if (syncStatus) {
        const selicInfo = data.selic !== null ? ` · Selic ${data.selic}%` : '';
        syncStatus.innerHTML = `<span style="color:var(--pos-color);">✅ ${data.ipca}% (BCB SGS${selicInfo})</span>`;
      }
    } else {
      if (syncStatus) syncStatus.innerHTML = `<span style="color:var(--neg-color);">❌ Falha ao sincronizar</span>`;
    }
  });

  // 7. Busca Cotações de Títulos do Tesouro em Background
  fetchTreasuryData(initialState.brapiToken).then(res => {
    if (res.success && res.results.length > 0 && res.fromApi) {
      const currentBond = res.results.find(b => b.symbol === store.getState().selectedBond);
      if (currentBond) {
        store.setState({
          refPrice: currentBond.sellPrice,
          refRate: currentBond.sellRate,
          refDate: currentBond.baseDate || store.getState().refDate
        });
      }
    }
  });
});
