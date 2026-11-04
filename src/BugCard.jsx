import { Link } from "react-router-dom";

export const BugCard = ({bug}) => {
    return(
        <div>
        <h3>{bug.title}</h3>

        <p>Bug ID: {bug.id}</p>

        <p>Severity: {bug.severity}</p>

        <Link to={`/bugs/${bug.id}`}>
            View Details
        </Link>

        <hr />
        </div>
    )
}