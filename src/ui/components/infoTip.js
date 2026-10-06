/**
 * Componente: Balão Informativo / Tooltip (?)
 * Renderiza ícone circular com animação de popup e suporte a hover, foco e toque.
 */

import { GLOSSARY } from '../../content/glossary.js';

/**
 * Retorna o HTML do ícone '?' com o balão explicativo embutido.
 * @param {string} glossaryKeyOrText - Chave do glossário ou texto direto
 * @returns {string}
 */
export function renderInfoTip(glossaryKeyOrText) {
  const text = GLOSSARY[glossaryKeyOrText] || glossaryKeyOrText || '';
  if (!text) return '';

  return `
    <span class="infotip-container">
      <button type="button" class="infotip-trigger" aria-label="Informações e conceito da métrica" tabindex="0">?</button>
      <span class="infotip-popup" role="tooltip">${text}</span>
    </span>
  `;
}

/**
 * Inicializa interatividade para telas de toque e acessibilidade por teclado.
 */
export function initInfoTipInteractions() {
  document.addEventListener('click', e => {
    const trigger = e.target.closest('.infotip-trigger');
    const allContainers = document.querySelectorAll('.infotip-container.open');

    if (trigger) {
      e.stopPropagation();
      const container = trigger.closest('.infotip-container');
      const isOpen = container.classList.contains('open');

      // Fecha os outros
      allContainers.forEach(c => {
        if (c !== container) c.classList.remove('open');
      });

      // Alterna o atual
      container.classList.toggle('open', !isOpen);
    } else {
      // Clicou fora
      allContainers.forEach(c => c.classList.remove('open'));
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.infotip-container.open').forEach(c => c.classList.remove('open'));
    }
  });
}

