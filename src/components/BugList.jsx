import { BugCard } from "../BugCard"


export const BugList = ({bugs}) => {
    if(bugs.length === 0) {
        return <h2>No Bugs Found!</h2>
    }

    return(
        <div>
            {bugs.map((bug) => (
                <BugCard key={bug.id} bug={bug}/>
            ))}
        </div>
    )
}