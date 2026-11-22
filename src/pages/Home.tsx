import { useState, type FormEvent } from "react";
import { BugList } from "../components/BugList";
import type { Bug, Severity } from "../api/mockApi";
import type { RequestState } from "../types/request";

type HomeProps = {
  bugsState: RequestState<Bug[]>;
  onAddBug: (bug: Bug) => void;
  onRetry: () => void;
};

export const Home = ({ bugsState, onAddBug, onRetry }: HomeProps) => {
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<Severity>("Low");

  // Narrowing: after each check, TypeScript knows which variant is left.
  if (bugsState.status === "idle" || bugsState.status === "loading") {
    return <h2>Loading...</h2>;
  }

  if (bugsState.status === "error") {
    // Here TypeScript knows `bugsState.error` exists.
    return (
      <>
        <p>{bugsState.error}</p>
        <button onClick={onRetry}>Retry</button>
      </>
    );
  }

  // Only "success" is left, so `bugsState.data` is guaranteed to exist.
  const bugs = bugsState.data;

  const filteredBugs = bugs.filter((bug) => bug.title.toLowerCase().includes(search.toLowerCase()));

  // FormEvent<HTMLFormElement> is the type of a form's submit event.
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!title.trim()) {
      return;
    }

    onAddBug({ id: bugs.length + 1, title, severity });
    setTitle("");
  };

  return (
    <div className="main-wrapper">
      <form className="report-form" onSubmit={handleSubmit}>
        <h2>Report a Bug</h2>
        <p className="form-subtitle">Found an issue? Let us know.</p>

        <div className="form-group-container">
          <div className="form-group">
            <label htmlFor="bug-title">Bug Title</label>
            <input
              id="bug-title"
              type="text"
              required
              placeholder="Enter bug title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="bug-severity">Severity</label>
            <select
              id="bug-severity"
              value={severity}
              // e.target.value is a plain `string`; we tell TypeScript it is one of our options.
              onChange={(e) => setSeverity(e.target.value as Severity)}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>

        <button className="report-btn">Report Bug +</button>
      </form>

      <div className="search-container">
        <label htmlFor="bug-search">Search Bugs</label>

        <div className="search-box">
          <span className="search-icon">⌕</span>

          <input
            id="bug-search"
            type="text"
            placeholder="Search bugs by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <small>Search by bug title</small>
      </div>

      {filteredBugs.length === 0 ? <p>No Bugs Found!</p> : <BugList bugs={filteredBugs} />}
    </div>
  );
};
