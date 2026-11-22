// A small floating panel to trigger mock API errors on purpose (task D1-2).
// Only rendered when the mock API is on (see App.tsx).
import { useLocalStorage } from "../hooks/useLocalStorage";
import {
  DEFAULT_SCENARIOS,
  isMockScenarios,
  resetMockDatabase,
  SCENARIO_LABELS,
  SCENARIOS_STORAGE_KEY,
  type MockScenarios,
} from "../mocks/scenarios";

export function DevPanel() {
  // State saved in localStorage, where the mock handlers read it on every request.
  // It also stays in sync if the switches are changed in another tab.
  const [scenarios, setScenarios] = useLocalStorage(
    SCENARIOS_STORAGE_KEY,
    DEFAULT_SCENARIOS,
    isMockScenarios,
  );

  const toggle = (key: keyof MockScenarios) => {
    setScenarios({ ...scenarios, [key]: !scenarios[key] });
  };

  const activeCount = Object.values(scenarios).filter(Boolean).length;
  const keys = Object.keys(SCENARIO_LABELS) as (keyof MockScenarios)[];

  return (
    <details className="dev-panel">
      <summary>🛠 Dev tools{activeCount > 0 ? ` (${activeCount} on)` : ""}</summary>
      <fieldset>
        <legend>Mock API: force errors</legend>
        {keys.map((key) => (
          <label key={key} className="dev-panel-option">
            <input type="checkbox" checked={scenarios[key]} onChange={() => toggle(key)} />
            {SCENARIO_LABELS[key]}
          </label>
        ))}
      </fieldset>
      <p className="dev-panel-hint">
        Switches apply to the next request (retry or refresh). Other errors happen naturally: wrong
        password → 401, empty login field → 400, unknown product URL → 404, ordering more than the
        stock → 409.
      </p>
      <button
        type="button"
        onClick={() => {
          resetMockDatabase();
          window.location.reload();
        }}
      >
        Reset orders and stock
      </button>
    </details>
  );
}
