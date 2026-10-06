/**
 * View: Premissas, Custos & Metodologia (Aba 5)
 * Calibração de mercado e parâmetros tributários da B3.
 */

export function createSettingsView(store) {
  const fields = [
    { id: "cfgRefDate", key: "refDate" },
    { id: "cfgRefPrice", key: "refPrice" },
    { id: "cfgRefRate", key: "refRate" },
    { id: "cfgSpread", key: "spread" },
    { id: "cfgIpcaCal", key: "ipcaCal" },
    { id: "cfgCustMode", key: "custMode" },
    { id: "cfgCust1", key: "cust1" },
    { id: "cfgCust2", key: "cust2" },
    { id: "cfgCust3", key: "cust3" },
  ];

  fields.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", (e) => {
      store.setState({ [key]: e.target.value });
    });
  });

  function render(state, computed) {
    fields.forEach(({ id, key }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const val = state[key] ?? "";
      if (el.value !== String(val)) {
        el.value = val;
      }
    });
  }

  return { render };
}
