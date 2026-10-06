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
      if (tabId === "tab-grafico") {
        const state = store.getState();
        const computed = store.getComputed();
        views[3].render(state, computed); // Re-renderiza o gráfico com dimensões corretas
      }
    },
  });

  // 4. Inscreve todas as views no Store
  store.subscribe((state, computed) => {
    views.forEach((v) => v.render(state, computed));
  });

  // 5. Primeira Renderização Inicial
  const initialState = store.getState();
  const initialComputed = store.getComputed();
  views.forEach((v) => v.render(initialState, initialComputed));
});
