import { Link, useParams } from "react-router-dom";
import type { Bug } from "../api/mockApi";
import type { RequestState } from "../types/request";

type BugDetailsProps = {
  bugsState: RequestState<Bug[]>;
};

export const BugDetails = ({ bugsState }: BugDetailsProps) => {
  // useParams is typed: `id` is `string | undefined` (the URL might not have it).
  const { id } = useParams<{ id: string }>();

  if (bugsState.status === "idle" || bugsState.status === "loading") {
    return <h2>Loading bug details...</h2>;
  }

  if (bugsState.status === "error") {
    return <h2>Could not load bugs.</h2>;
  }

  // `.find` returns `Bug | undefined`, so we must handle "not found".
  const bug = bugsState.data.find((item) => item.id === Number(id));

  if (!bug) {
    return <h2>No Bug Found!</h2>;
  }

  return (
    <div className="bug-details">
      <div className="details-header">
        <span>BUG DETAILS · # {bug.id} </span>
        <span className="severity high">{bug.severity}</span>
      </div>

      <h2>{bug.title}</h2>

      <div className="details-info">
        <h3>Bug Information</h3>
        <p>Bug ID: {bug.id}</p>
        <p>Severity: {bug.severity}</p>
      </div>

      <p className="details-description">Detailed information about this bug.</p>

      <Link to="/">← Back to all bugs</Link>
    </div>
  );
};
