import BugCard from "./BugCard"

export const BugList = ({bugs}) => {
    
    return(
        
     <div className="bug-list">
        {bugs.map((bug) => (
           <BugCard key={bug.id} bug={bug} />
        ))}
     </div>   
        
    )
}