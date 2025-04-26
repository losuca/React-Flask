"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useParams, useRouter } from "next/navigation"
import { NavBar } from "@/components/nav-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import * as api from "@/lib/api"
import { 
  Calendar, Euro, Users, ArrowLeft, 
  AlertCircle, Save, Loader2
} from "lucide-react"

interface Player {
  id: number
  name: string
}

interface Balance {
  id: number
  amount: number
  player: Player
}

interface Session {
  id: number
  name: string
  date: string
  buy_in: number
  balances: Balance[]
}

export default function EditSessionPage() {
  const params = useParams()
  const groupName = params.groupName as string
  const sessionId = params.sessionId as string
  const { user, loading: authLoading } = useAuth()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Form state
  const [sessionName, setSessionName] = useState("")
  const [sessionDate, setSessionDate] = useState("")
  const [buyIn, setBuyIn] = useState("")
  const [playerBalances, setPlayerBalances] = useState<{[key: string]: string}>({})
  const [selectedPlayers, setSelectedPlayers] = useState<{[key: string]: boolean}>({})

  useEffect(() => {
    // Authentication check
    if (!user && !authLoading) {
      const currentPath = window.location.pathname
      router.push('/?redirect=' + encodeURIComponent(currentPath))
      return
    }

    if (!user) return

    const fetchSession = async () => {
      try {
        setLoading(true)
        const response = await api.viewSession(groupName, Number.parseInt(sessionId))
        setSession(response.session)
        
        // Initialize form with session data
        setSessionName(response.session.name)
        setSessionDate(response.session.date)
        setBuyIn(response.session.buy_in.toString())
        
        // Initialize player balances and selections
        const balances: {[key: string]: string} = {}
        const players: {[key: string]: boolean} = {}
        
        response.session.balances.forEach((balance: { amount: number; player: { id: string } }) => {
          // Calculate the cash-out amount (balance + buy-in)
          const cashOut = balance.amount + response.session.buy_in
          balances[balance.player.id] = cashOut.toString()
          players[balance.player.id] = true
        })
        
        setPlayerBalances(balances)
        setSelectedPlayers(players)
        setError(null)
      } catch (err) {
        console.error("Failed to load session:", err)
        setError("Failed to load session data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [groupName, sessionId, user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!sessionName.trim()) {
      setError("Session name is required")
      return
    }
    
    if (!sessionDate) {
      setError("Date is required")
      return
    }
    
    if (!buyIn || isNaN(Number(buyIn)) || Number(buyIn) <= 0) {
      setError("Buy-in must be a positive number")
      return
    }
    
    // Check if at least one player is selected
    if (Object.values(selectedPlayers).filter(Boolean).length === 0) {
      setError("At least one player must be selected")
      return
    }
    
    // Prepare data for API
    const formData: any = {
      session_name: sessionName,
      date: sessionDate,
      buy_in: Number(buyIn)
    }
    
    // Add player balances
    session?.balances.forEach(balance => {
      const playerId = balance.player.id
      if (selectedPlayers[playerId]) {
        // Only include selected players
        const cashOut = playerBalances[playerId] || "0"
        formData[`balance_${balance.player.name}`] = cashOut
      }
    })
    
    try {
      setIsSubmitting(true)
      await api.updateSession(groupName, Number.parseInt(sessionId), formData)
      
      toast({
        title: "Success",
        description: "Session updated successfully",
      })
      
      // Redirect back to session details
      router.push(`/group/${groupName}/session/${sessionId}`)
    } catch (err) {
      console.error("Failed to update session:", err)
      setError("Failed to update session. Please try again.")
      setIsSubmitting(false)
    }
  }

  const handlePlayerSelection = (playerId: number, checked: boolean) => {
    setSelectedPlayers(prev => ({
      ...prev,
      [playerId]: checked
    }))
  }

  const handleBalanceChange = (playerId: number, value: string) => {
    setPlayerBalances(prev => ({
      ...prev,
      [playerId]: value
    }))
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
        <div className="container mx-auto p-4">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="outline" size="sm" asChild className="mr-2">
              <Link href={`/group/${groupName}/session/${sessionId}`} className="flex items-center gap-1">
                <ArrowLeft size={16} />
                <span>Back to Session</span>
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Edit Session</h1>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : session ? (
            <form onSubmit={handleSubmit}>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Session Details</CardTitle>
                  <CardDescription>
                    Edit the basic information about this poker session
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="session-name">Session Name</Label>
                      <Input
                        id="session-name"
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                        placeholder="e.g., Friday Night Poker"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="session-date">Date</Label>
                      <Input
                        id="session-date"
                        type="date"
                        value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="buy-in">Buy-in Amount (€)</Label>
                      <Input
                        id="buy-in"
                        type="number"
                        min="0"
                        step="any"
                        value={buyIn}
                        onChange={(e) => setBuyIn(e.target.value)}
                        placeholder="e.g., 20"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Player Balances</CardTitle>
                  <CardDescription>
                    Update the cash-out amounts for each player
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {session.balances.map((balance) => (
                      <div key={balance.id} className="flex items-center space-x-4 p-3 rounded-md border">
                        <Checkbox
                          id={`player-${balance.player.id}`}
                          checked={selectedPlayers[balance.player.id] || false}
                          onCheckedChange={(checked) => 
                            handlePlayerSelection(balance.player.id, checked as boolean)
                          }
                        />
                        <Label 
                          htmlFor={`player-${balance.player.id}`}
                          className="flex-1 font-medium"
                        >
                          {balance.player.name}
                        </Label>
                        <div className="w-32">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={playerBalances[balance.player.id] || ""}
                            onChange={(e) => handleBalanceChange(balance.player.id, e.target.value)}
                            placeholder="Cash-out"
                            disabled={!selectedPlayers[balance.player.id]}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/20 border-t px-6 py-3">
                  <div className="text-sm text-muted-foreground">
                    <p>Enter the total cash-out amount for each player (not their profit/loss).</p>
                    <p>Profit/loss will be calculated automatically based on the buy-in amount.</p>
                  </div>
                </CardFooter>
              </Card>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/group/${groupName}/session/${sessionId}`)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="gap-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="bg-muted/30 rounded-lg p-8 text-center border border-dashed border-muted-foreground/30">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <AlertCircle size={32} className="text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium mb-2">Session not found</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                The session you're trying to edit doesn't exist or has been deleted.
              </p>
              <Button asChild>
                <Link href={`/group/${groupName}/dashboard`}>
                  Return to Dashboard
                </Link>
              </Button>
            </div>
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

