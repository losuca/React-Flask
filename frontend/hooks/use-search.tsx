import { useState, useEffect } from 'react'

export function useSearch<T>(items: T[], searchFn: (item: T, query: string) => boolean) {
  const [query, setQuery] = useState("")
  
  const filteredItems = items?.filter(item => 
    query.trim() === "" || searchFn(item, query.toLowerCase())
  ) || []
  
  return {
    query,
    setQuery,
    filteredItems
  }
}
