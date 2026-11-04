import { useParams, Link } from "react-router-dom";

export const BugDetails = ({bugs}) => {
    const { id } = useParams();

    const bug = bugs.find((item) => String(item.id) === id)

    if(!bug){
        return(
            <div>
                <h2>Bug not found</h2>
                <Link to="/">Back to Board</Link>
            </div>
        )
    }

    return(
        <div>
            <h1>Bug Details</h1>

            <h3>{bug.title}</h3>

            <p>Bug ID: {bug.id}</p>

            <p>Severity: {bug.severity}</p>

            <Link to="/">Back to Board</Link>
        </div>
    )
}