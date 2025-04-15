"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useParams } from "next/navigation"
import { NavBar } from "@/components/nav-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import Link from "next/link"
import * as api from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, CheckCircle, ArrowLeft, UserPlus, Loader2 } from "lucide-react"

interface Player {
  id: number
  name: string
  group_id: number
  joined: boolean
}

export default function JoinGroupPage() {
  const params = useParams()
  const groupName = params.groupName as string
  const { user, loading: authLoading } = useAuth()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<string>("")
  const [joining, setJoining] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Authentication check
    if (!user && !authLoading) {
      const currentPath = window.location.pathname
      router.push('/?redirect=' + encodeURIComponent(currentPath))
      return
    }

    if (!user) return

    const fetchPlayers = async () => {
      
      try {
        setLoading(true)
        setError(null)
        // Get the code from the URL if available
        const code = typeof window !== 'undefined' 
          ? new URLSearchParams(window.location.search).get('code') || undefined
          : undefined;
        const response = await api.joinGroup(groupName, undefined, code);
        setPlayers(response.players || [])
      } catch (err) {
        console.error("Error fetching players:", err)
        setError("Failed to load players. Please try again later.")
      } finally {
        setLoading(false)
      }
    }
    if (user) {
      fetchPlayers()
    }
  }, [groupName, user, authLoading, router])

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlayer || joining) return

    try {
      setJoining(true)
      setError(null)
      await api.joinGroup(groupName, selectedPlayer)
      setSuccess(true)
      
      // Redirect after a brief delay to show success message
      setTimeout(() => {
        router.push(`/group/${groupName}/dashboard`)
      }, 1500)
    } catch (err) {
      console.error("Error joining group:", err)
      setError("Failed to join group. Please try again.")
    } finally {
      setJoining(false)
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
            <h1 className="text-2xl font-bold">Join Group: {decodeURIComponent(groupName)}</h1>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6">
              <CheckCircle className="h-4 w-4 mr-2" />
              <AlertDescription>You've successfully joined the group. Redirecting...</AlertDescription>
            </Alert>
          )}

          <Card className="overflow-hidden transition-all hover:shadow-md border border-border/40">
            <CardHeader>
              <CardTitle>Select Your Player</CardTitle>
              <CardDescription>Choose which player you want to join as</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : players.length > 0 ? (
                <form onSubmit={handleJoin} className="space-y-4">
                  <RadioGroup value={selectedPlayer} onValueChange={setSelectedPlayer} className="space-y-2">
                    {players.map((player) => (
                      <div key={player.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
                        <RadioGroupItem 
                          value={player.id.toString()} 
                          id={`player-${player.id}`}
                          disabled={player.joined}
                        />
                        <Label 
                          htmlFor={`player-${player.id}`}
                          className={`flex-1 ${player.joined ? 'text-muted-foreground' : ''}`}
                        >
                          {player.name} {player.joined && <span className="text-sm text-muted-foreground ml-2">(Already joined)</span>}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </form>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">No available players found in this group</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => router.push('/home')}
                disabled={joining || success}
              >
                Cancel
              </Button>
              {players.length > 0 && (
                <Button 
                  onClick={handleJoin}
                  disabled={!selectedPlayer || joining || success}
                  className="flex items-center gap-2"
                >
                  {joining ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Joining...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      <span>Join as Selected Player</span>
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
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
