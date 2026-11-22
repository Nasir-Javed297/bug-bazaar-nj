import { useState, useEffect } from "react"
import { fetchBugs } from "../src/api/mockApi";
import { Routes, Route, Link } from "react-router-dom";
import { Home } from "./pages/Home";
import { BugDetails } from "./pages/BugDetailPage";
import { NotFound } from "./pages/NotFound";

export default function App() {
  
  const [bugs, setBugs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0)

  useEffect(() => {
       
        const loadBugs = async () => {
            setLoading(true);
            setError(null);
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
       
    }, [retry])

  return (
    <>
    <header className="site-header">
      <Link to="/" className="site-title">🦆 The Bug Bazaar</Link>
    </header>
    <Routes>
      <Route path="/" element={<Home bugs={bugs} setBugs={setBugs} loading={loading} error={error} setRetry={setRetry}/>} />
      <Route path="/bugs/:id" element={<BugDetails bugs={bugs} loading={loading} />}/>
      <Route path="*" element={<NotFound />} />    
    </Routes>
    </>
  )
}
