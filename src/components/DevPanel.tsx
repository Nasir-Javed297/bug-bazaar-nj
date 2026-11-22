// A small floating panel to trigger mock API errors (task D1-2) and unexpected app errors
// (task D4-7) on purpose.
// Only rendered when the mock API is on (see App.tsx).
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalStorage } from "../hooks/useLocalStorage";
import {
  DEFAULT_SCENARIOS,
  isMockScenarios,
  resetMockDatabase,
  SCENARIO_LABELS,
  SCENARIOS_STORAGE_KEY,
  type MockScenarios,
} from "../mocks/scenarios";
import {
  clearErrorLog,
  ERROR_LOGGED_EVENT,
  readErrorLog,
  type LoggedError,
} from "../monitoring/logger";

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
      <ErrorTools />
    </details>
  );
}

/** Task D4-7: trigger unexpected errors on purpose, and see what was logged. */
function ErrorTools() {
  const navigate = useNavigate();
  const [log, setLog] = useState<LoggedError[]>(readErrorLog);

  // Refresh the list whenever the logger records something (or the log is cleared).
  useEffect(() => {
    const refresh = () => setLog(readErrorLog());
    window.addEventListener(ERROR_LOGGED_EVENT, refresh);
    return () => window.removeEventListener(ERROR_LOGGED_EVENT, refresh);
  }, []);

  return (
    <fieldset>
      <legend>Unexpected errors (monitoring)</legend>
      <div className="dev-panel-buttons">
        {/* Caught by the error boundary: fallback screen + logged. */}
        <button type="button" onClick={() => navigate("/dev/crash")}>
          Crash a page (render error)
        </button>
        {/* NOT caught by a boundary (event handler): no fallback, but logged by window "error". */}
        <button
          type="button"
          onClick={() => {
            throw new Error("Test error thrown in a click handler (D4-7)");
          }}
        >
          Throw in an event handler
        </button>
        {/* NOT caught by a boundary (async): logged by window "unhandledrejection". */}
        <button
          type="button"
          onClick={() => void Promise.reject(new Error("Test unhandled promise rejection (D4-7)"))}
        >
          Unhandled promise rejection
        </button>
      </div>
      <p className="dev-panel-hint">Error log: {log.length} entries (newest first)</p>
      <ul className="dev-panel-log">
        {log.slice(0, 3).map((entry) => (
          <li key={entry.id}>
            <code>{entry.id}</code> {entry.source}: {entry.message}
          </li>
        ))}
      </ul>
      {log.length > 0 && (
        <button type="button" onClick={clearErrorLog}>
          Clear error log
        </button>
      )}
    </fieldset>
  );
}
