"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { NavBar } from "@/components/nav-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import * as api from "@/lib/api"
import { 
  ArrowLeft, AlertCircle, Search, Users, 
  UserPlus, Loader2, RefreshCw, Info
} from "lucide-react"

interface Group {
  id: number
  name: string
  creator_id: number
  player_count: number
}

export default function FindGroupPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [groups, setGroups] = useState<Group[]>([])
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true)
        const response = await api.getAllGroups()
        setGroups(response.groups || [])
        setFilteredGroups(response.groups || [])
        setError(null)
      } catch (err) {
        console.error("Failed to fetch groups:", err)
        setError("Failed to load groups. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchGroups()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredGroups(groups)
    } else {
      const filtered = groups.filter(group => 
        group.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredGroups(filtered)
    }
  }, [searchQuery, groups])

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
        <p className="mb-6">Please log in to find and join poker groups.</p>
        <Button asChild>
          <Link href="/">Log In</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavBar />
      
      <main className="flex-1">
        <div className="container mx-auto p-4 max-w-4xl">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="outline" size="sm" asChild className="mr-2">
              <Link href="/home" className="flex items-center gap-1">
                <ArrowLeft size={16} />
                <span>Back to Home</span>
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Find a Group</h1>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Search Groups</CardTitle>
              <CardDescription>
                Find a poker group to join and start tracking your games
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by group name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSearchQuery("")}
                disabled={!searchQuery}
                className="flex items-center gap-1"
              >
                <RefreshCw size={14} />
                Clear
              </Button>
              <p className="text-sm text-muted-foreground">
                {filteredGroups.length} {filteredGroups.length === 1 ? 'group' : 'groups'} found
              </p>
            </CardFooter>
          </Card>

          {loading ? (
            <div className="space-y-4">
              {Array(3).fill(0).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : filteredGroups.length > 0 ? (
            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <Card key={group.id} className="overflow-hidden transition-all hover:shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle>{group.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Users size={14} />
                      <span>{group.player_count || 0} members</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-sm text-muted-foreground">
                      Group ID: {group.id}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      asChild
                      className="w-full flex items-center gap-2"
                    >
                      <Link href={`/join-group/${encodeURIComponent(group.name)}`}>
                        <UserPlus size={16} />
                        <span>Join Group</span>
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Info size={24} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No groups found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery ? 
                    `No groups matching "${searchQuery}" were found.` : 
                    "No available groups were found."}
                </p>
                <div className="flex gap-3">
                  {searchQuery && (
                    <Button variant="outline" onClick={() => setSearchQuery("")}>
                      Clear Search
                    </Button>
                  )}
                  <Button asChild>
                    <Link href="/create-group">Create a Group</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      <footer className="border-t border-border/40 mt-auto">
        <div className="container mx-auto p-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} PokerCount. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
