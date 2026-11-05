import { Link } from "react-router-dom";

export const BugCard = ({bug}) => {
  return (
    <div className="bug-card">
      <div className="bug-card-header">
        <span className="bug-id">🐞 Bug # {bug.id}</span>
        <span className={`severity ${
            bug.severity === 'High' ? 'high' :
            bug.severity === 'Medium' ? 'medium' :
            'low'
        }`}>
            {bug.severity}
        </span>
      </div>

      <h3>{bug.title}</h3>

      <p className="bug-description">
        The checkout page displays an incorrect
        total when applying discounts.
      </p>

      <div className="bug-card-footer">
        <span>BUG ID: {bug.id}</span>
        <Link to={`/bugs/${bug.id}`}>View Details →</Link>
      </div>
    </div>
  );
};

export default BugCard;
