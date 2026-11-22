import { useState, useEffect } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { fetchBugs, type Bug } from "./api/mockApi";
import type { RequestState } from "./types/request";
import { Home } from "./pages/Home";
import { BugDetails } from "./pages/BugDetailPage";
import { NotFound } from "./pages/NotFound";

export default function App() {
  // ONE state value instead of three (bugs, loading, error).
  // It can only ever be in one of the four shapes defined by RequestState.
  const [bugsState, setBugsState] = useState<RequestState<Bug[]>>({ status: "idle" });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const loadBugs = async () => {
      setBugsState({ status: "loading" });
      try {
        const data = await fetchBugs();
        setBugsState({ status: "success", data });
      } catch (err: unknown) {
        // `err` is `unknown`: it could be anything that was thrown.
        // We narrow it with `instanceof` before reading `.message`.
        const message = err instanceof Error ? err.message : "Something went wrong";
        setBugsState({ status: "error", error: message });
      }
    };

    void loadBugs();
  }, [retryCount]);

  const addBug = (bug: Bug) => {
    // Only possible when we already have data. TypeScript would not let us
    // read `prev.data` without checking `prev.status === "success"` first.
    setBugsState((prev) =>
      prev.status === "success" ? { status: "success", data: [...prev.data, bug] } : prev,
    );
  };

  const retry = () => setRetryCount((count) => count + 1);

  return (
    <>
      <header className="site-header">
        <Link to="/" className="site-title">
          🦆 The Bug Bazaar
        </Link>
      </header>
      <Routes>
        <Route
          path="/"
          element={<Home bugsState={bugsState} onAddBug={addBug} onRetry={retry} />}
        />
        <Route path="/bugs/:id" element={<BugDetails bugsState={bugsState} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
