import { useState } from "react"
import { BugList } from "../components/BugList";


export const Home = ({bugs, setBugs, loading, error, setRetry}) => {
    const [search, setSearch] = useState("")
    const [title, setTitle] = useState("")
    const [severity, setSeverity] = useState("Low")

    if(loading){
        return <h2>Loading...</h2>
    } 
    
    if(error){
        return (
            <>
            <p>{error}</p>
            <button onClick={() => setRetry(prev => prev + 1)}>
                Retry
            </button>
            </>
        )
        
        
    }

    const filterBugs = bugs.filter((bug) => (
        bug.title.toLowerCase().includes(search.toLowerCase())
    ))

    const handleSubmit = (e) => {
        e.preventDefault();

        if(!title.trim()){
            return;
        }

        const newBug = {
            id: bugs.length + 1,
            title: title,
            severity: severity
        }

        setBugs((prevBug) => [...prevBug, newBug])

        setTitle("")

    }

    return(
        <div className="main-wrapper">
            <form className="report-form" onSubmit={handleSubmit}>
                <h2>Report a Bug</h2>
                <p className="form-subtitle">Found an issue? Let us know.</p>

                <div className="form-group-container">
                    <div className="form-group">
                        <label>Bug Title</label>
                        <input
                        type="text"
                        required
                        placeholder="Enter bug title..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Severity</label>
                        <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value)}
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

            {filterBugs.length === 0 ? <p>No Bugs Found!</p> : <BugList bugs={filterBugs}/>} 

        </div>
    )
}