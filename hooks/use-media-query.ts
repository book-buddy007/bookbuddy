import { useState, useEffect } from "react"

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    
    // Set initial state
    if (media.matches !== matches) {
      setMatches(media.matches)
    }
    
    // Create listener function
    const listener = () => {
      setMatches(media.matches)
    }
    
    // Add listener for changes
    media.addEventListener("change", listener)
    
    // Remove listener when component unmounts
    return () => {
      media.removeEventListener("change", listener)
    }
  }, [matches, query])

  return matches
} 