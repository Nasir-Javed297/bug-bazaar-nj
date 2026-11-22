import { Link } from "react-router-dom";
import type { Bug, Severity } from "../api/mockApi";

// A props type: describes exactly what this component expects to receive.
type BugCardProps = {
  bug: Bug;
};

// Record<Severity, string> means "an object with a key for EVERY severity".
// If someone adds a new severity, TypeScript flags this object as incomplete.
const severityClass: Record<Severity, string> = {
  High: "high",
  Medium: "medium",
  Low: "low",
};

export const BugCard = ({ bug }: BugCardProps) => {
  return (
    <div className="bug-card">
      <div className="bug-card-header">
        <span className="bug-id">🐞 Bug # {bug.id}</span>
        <span className={`severity ${severityClass[bug.severity]}`}>{bug.severity}</span>
      </div>

      <h3>{bug.title}</h3>

      <p className="bug-description">
        The checkout page displays an incorrect total when applying discounts.
      </p>

      <div className="bug-card-footer">
        <span>BUG ID: {bug.id}</span>
        <Link to={`/bugs/${bug.id}`}>View Details →</Link>
      </div>
    </div>
  );
};

export default BugCard;
