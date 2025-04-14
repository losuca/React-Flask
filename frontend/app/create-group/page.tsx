"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { NavBar } from "@/components/nav-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import * as api from "@/lib/api"
import { ArrowLeft, AlertCircle, Plus, Loader2, X, Users } from "lucide-react"

export default function CreateGroupPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [groupName, setGroupName] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [players, setPlayers] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddPlayer = () => {
    if (!playerName.trim()) return
    
    // Check for duplicates
    if (players.includes(playerName.trim())) {
      setError("Player name already added")
      return
    }
    
    setPlayers([...players, playerName.trim()])
    setPlayerName("")
    setError(null)
  }

  const handleRemovePlayer = (index: number) => {
    const newPlayers = [...players]
    newPlayers.splice(index, 1)
    setPlayers(newPlayers)
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim() || isSubmitting) return
    
    // Prevent creating a group without players
    if (players.length === 0) {
      setError("Please add at least one player to the group")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      
      // First create the group
      const groupResponse = await api.createGroup(groupName)
      
      // Then add all players
      for (const player of players) {
        await api.addPlayer(groupName, player)
      }
      
      // Redirect to the join group page
      router.push(`/join-group/${encodeURIComponent(groupName)}`)
    } catch (err: any) {
      console.error("Failed to create group:", err)
      setError(err.response?.data?.error || "Failed to create group. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Authentication loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <NavBar />
        <div className="container mx-auto p-4 flex justify-center items-center flex-1">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-10 w-full mt-4" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Not authenticated state
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <NavBar />
        <div className="container mx-auto p-4 flex justify-center items-center flex-1">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>Please log in to access this page</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => router.push('/?redirect=' + encodeURIComponent(window.location.pathname))}
                className="w-full"
              >
                Login
              </Button>
            </CardContent>
          </Card>
        </div>
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
            <h1 className="text-2xl font-bold">Create a New Group</h1>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="overflow-hidden transition-all hover:shadow-md border border-border/40">
            <form onSubmit={handleCreateGroup}>
              <CardHeader>
                <CardTitle>Group Details</CardTitle>
                <CardDescription>
                  Create a new poker group and add players
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="groupName">Group Name</Label>
                  <Input
                    id="groupName"
                    placeholder="Enter a name for your poker group"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="focus:ring-2 focus:ring-primary/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Choose a memorable name for your poker group. This will be visible to all members.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Players</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter player name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      disabled={isSubmitting}
                      className="focus:ring-2 focus:ring-primary/50"
                    />
                    <Button 
                      type="button" 
                      onClick={handleAddPlayer}
                      disabled={!playerName.trim() || isSubmitting}
                    >
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add the players who will participate in your poker games. At least one player is required.
                  </p>
                </div>
                
                {players.length > 0 && (
                  <div className="bg-muted/30 rounded-lg p-4 border border-border/40">
                    <div className="flex items-center gap-2 mb-3">
                      <Users size={16} />
                      <h3 className="font-medium">Added Players ({players.length})</h3>
                    </div>
                    <div className="space-y-2">
                      {players.map((player, index) => (
                        <div key={index} className="flex justify-between items-center bg-background p-2 rounded">
                          <span>{player}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemovePlayer(index)}
                            disabled={isSubmitting}
                            className="h-8 w-8 p-0"
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between gap-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => router.push('/home')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex items-center gap-2"
                  disabled={isSubmitting || !groupName.trim() || players.length === 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Create Group</span>
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
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
