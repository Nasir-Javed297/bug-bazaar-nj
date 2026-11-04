import { useState } from "react"
import { BugList } from "./BugList"
import { AddBugForm } from "./AddBugForm"

export const BugBoard = ({bugs, setBugs, loading, error, retry }) => {
    const [search, setSearch] = useState("")

    if(loading) {
       return <h2>Loading bugs...</h2>
    }

    if(error){
        return(
            <div>
                <p>Error: {error}</p>
                <button onClick={retry}>Retry</button>
            </div>
        )
    }
    
    const filterBugs = bugs.filter((bug) => (
        bug.title.toLowerCase().includes(search.toLowerCase())
    ))

    function addBug (title) {
        setBugs((prevBugs) => {
            const newBug = {
                id: prevBugs.length > 0 ? Math.max(...prevBugs.map((bug) => bug.id)) + 1 : 1,
                title: title.trim(),
                severity: "Low"
            }

            return [...prevBugs, newBug];
        })  
    }

    

    return(
        <div>
            <h1>Bug Tracker</h1>
            <AddBugForm onAddBug={addBug}/>
            <input
                type="text"
                placeholder="Search bugs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            <BugList bugs={filterBugs} />
        </div>
    )
}