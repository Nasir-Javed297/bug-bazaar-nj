import { Route, Routes } from "react-router-dom";

import { BugBoard } from "./components/BugBoard";
import { BugDetails } from "./components/BugDetails";
import { NotFound } from "./components/NotFound";
import { useState, useEffect } from "react";
import { fetchBugs } from "./mockApi";


export default function App() {

  const [bugs, setBugs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("");

  const loadBugs = async () => {
        setLoading(true)
        setError("")

        try{
            const data = await fetchBugs();
           // console.log(data)
           setBugs(data)

        } catch(err){
            setError(err.message)
        } finally{
            setLoading(false)
        }
    }

    useEffect(() => {
        loadBugs();
    }, [])
  
  return (
    <Routes>
      <Route 
      path="/" element={<BugBoard bugs={bugs} setBugs={setBugs} loading={loading} error={error} retry={loadBugs} />}/>
      <Route path="/bugs/:id" element={<BugDetails bugs={bugs}/>}/>
      <Route path="*" element={<NotFound/>}/>
    </Routes>
  )
}
