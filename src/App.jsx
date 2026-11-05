import { useState, useEffect } from "react"
import { fetchBugs } from "../src/api/mockApi";
import { Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { BugDetails } from "./pages/BugDetailPage";
import { NotFound } from "./pages/NotFound";

export default function App() {
  
  const [bugs, setBugs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null);

  useEffect(() => {
       
        const loadBugs = async () => {
            
            try{
                const data = await fetchBugs() 
                setBugs(data)
                    
            } catch(err){

                setError(err.message)

            } finally{
                setLoading(false)
            }
        
        }

        loadBugs();
       
    }, [])

  return (
    <Routes>
      <Route path="/" element={<Home bugs={bugs} setBugs={setBugs} loading={loading} error={error}/>} />
      <Route path="/bugs/:id" element={<BugDetails bugs={bugs} loading={loading} />}/>
      <Route path="*" element={<NotFound />} />    
    </Routes>
  )
}
