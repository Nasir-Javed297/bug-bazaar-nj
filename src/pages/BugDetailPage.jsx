import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";

export const BugDetails = ({bugs, loading}) => {

    const { id } = useParams();

    const bug = bugs.find((item) => item.id === Number(id))

    if(loading){
        return <h2>Loading bug details...</h2>
    } 

    if(!bug){
        return <h2>No Bug Found!</h2>
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

      <p className="details-description">
        Detailed information about this bug.
      </p>

      <Link to="/">← Back to all bugs</Link>
    </div>
  );
};