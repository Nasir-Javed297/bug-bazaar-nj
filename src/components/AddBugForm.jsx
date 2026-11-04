import { useState } from "react";

export const AddBugForm = ({onAddBug }) => {
    const [title, setTitle] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();

        if(!title.trim()){
            setError("Field can't be Empty!")
            return;
        }

        onAddBug (title)

        setTitle("")
        setError("")
    }

    return(
        <form onSubmit={handleSubmit}>
            <h2>Report a Bug</h2>
            <input 
            required
            type="text"
            placeholder="Enter Bug Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            />
            <button type="submit">
                Add Bug
            </button>

            {error && (<p>{error}</p>)}
        </form>
    )
}