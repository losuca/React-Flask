"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useParams } from "next/navigation"
import { NavBar } from "@/components/nav-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import * as api from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, CheckCircle } from "lucide-react"

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
    if (!user && !authLoading) {
      router.push('/login?redirect=' + encodeURIComponent(`/join-group/${groupName}`))
      return
    }

    const fetchPlayers = async () => {
      if (!user) return
      
      try {
        setLoading(true)
        setError(null)
        const response = await api.joinGroup(groupName)
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

  if (authLoading) {
    return (
      <>
        <NavBar />
        <div className="container mx-auto p-4 flex justify-center items-center min-h-[50vh]">
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
      </>
    )
  }

  if (!user) {
    return (
      <>
        <NavBar />
        <div className="container mx-auto p-4 flex justify-center items-center min-h-[50vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>Please log in to join this group</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => router.push('/login?redirect=' + encodeURIComponent(`/join-group/${groupName}`))}
                className="w-full"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <NavBar />
      <div className="container mx-auto p-4 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Join Group: {decodeURIComponent(groupName)}</h1>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-600">Success!</AlertTitle>
            <AlertDescription>You've successfully joined the group. Redirecting...</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-md">
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
                <Skeleton className="h-10 w-full mt-4" />
              </div>
            ) : players.length > 0 ? (
              <form onSubmit={handleJoin} className="space-y-4">
                <RadioGroup value={selectedPlayer} onValueChange={setSelectedPlayer} className="space-y-2">
                  {players.map((player) => (
                    <div key={player.id} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                      <RadioGroupItem 
                        value={player.id.toString()} 
                        id={`player-${player.id}`}
                        disabled={player.joined}
                      />
                      <Label 
                        htmlFor={`player-${player.id}`}
                        className={`flex-1 ${player.joined ? 'text-gray-400' : ''}`}
                      >
                        {player.name} {player.joined && <span className="text-sm text-gray-400 ml-2">(Already joined)</span>}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                <Button 
                  type="submit" 
                  className="w-full mt-4" 
                  disabled={!selectedPlayer || joining || success}
                >
                  {joining ? "Joining..." : "Join as Selected Player"}
                </Button>
              </form>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600">No available players found in this group</p>
                <Button 
                  variant="outline" 
                  className="mt-4" 
                  onClick={() => router.push('/')}
                >
                  Return to Home
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
