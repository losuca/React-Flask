"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useParams } from "next/navigation"
import { NavBar } from "@/components/nav-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import Link from "next/link"
import * as api from "@/lib/api"
import { 
  Calendar, Euro, Users, ArrowLeft, 
  AlertCircle, CalendarDays, Save, Calculator, 
  PlusCircle, MinusCircle, HelpCircle, Info
} from "lucide-react"

interface Player {
  id: number
  name: string
  group_id: number
  joined: boolean
}

interface Group {
  id: number
  name: string
  players: Player[]
}

export default function AddSessionPage() {
  const params = useParams();
  const groupName = params.groupName as string
  const { user } = useAuth()
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionName, setSessionName] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [buyIn, setBuyIn] = useState("0")
  const [playerChips, setPlayerChips] = useState<Record<string, string>>({})
  const router = useRouter()

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        setLoading(true)
        const response = await api.getGroupDashboard(groupName)
        setGroup(response.group)

        // Initialize player chips with buy-in amount
        const chips: Record<string, string> = {}
        response.group.players.forEach((player: Player) => {
          chips[player.name] = "0"
        })
        setPlayerChips(chips)
        setError(null)
      } catch (err) {
        console.error("Failed to load group:", err)
        setError("Failed to load group data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchGroup()
  }, [groupName])

  // Update all player chips when buy-in changes
  useEffect(() => {
    if (group?.players && buyIn) {
      const chips: Record<string, string> = {}
      group.players.forEach((player: Player) => {
        // Keep existing values if they exist, otherwise set to buy-in
        chips[player.name] = playerChips[player.name] || buyIn
      })
      setPlayerChips(chips)
    }
  }, [buyIn, group?.players])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSubmitting(true)
      setError(null)
      
      const formData = new FormData()
      formData.append("session_name", sessionName)
      formData.append("date", date)
      formData.append("buy_in", buyIn)
  
      // Add player balances - send the raw chip counts as entered by the user
      Object.entries(playerChips).forEach(([name, chips]) => {
        formData.append(`balance_${name}`, chips)
      })
  
      await api.addSession(groupName, formData)
      router.push(`/group/${groupName}/dashboard`)
    } catch (err) {
      console.error("Failed to add session:", err)
      setError("Failed to add session. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleChipsChange = (playerName: string, value: string) => {
    setPlayerChips((prev) => ({
      ...prev,
      [playerName]: value,
    }))
  }

  const resetChips = () => {
    if (!group?.players.length || !buyIn) return
    
    const newChips: Record<string, string> = {}
    group.players.forEach(player => {
      newChips[player.name] = buyIn
    })
    
    setPlayerChips(newChips)
  }

  // Calculate total profit/loss
  const calculateTotalProfitLoss = (): number => {
    if (!buyIn) return 0
    const buyInAmount = parseFloat(buyIn) || 0
    
    return Object.values(playerChips).reduce((total, chips) => {
      const chipsAmount = parseFloat(chips) || 0
      return total + (chipsAmount - buyInAmount)
    }, 0)
  }

  // Get profit/loss for a player
  const getPlayerProfitLoss = (playerName: string): number => {
    const buyInAmount = parseFloat(buyIn) || 0
    const chipsAmount = parseFloat(playerChips[playerName] || "0")
    return chipsAmount - buyInAmount
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to add a session</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/">Sign In</Link>
            </Button>
          </CardFooter>
        </Card>
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
              <Link href={`/group/${groupName}/dashboard`} className="flex items-center gap-1">
                <ArrowLeft size={16} />
                <span>Back to Dashboard</span>
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Add New Session</h1>
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
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Session Information</CardTitle>
                    <CardDescription>
                      Enter the basic details about this poker session
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="session-name" className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Session Name
                      </Label>
                      <Input
                        id="session-name"
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                        placeholder="e.g., Friday Night Game"
                        className="focus:ring-2 focus:ring-primary/50"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date" className="flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        Date
                      </Label>
                      <Input 
                        id="date" 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)} 
                        className="focus:ring-2 focus:ring-primary/50"
                        required 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="buy-in" className="flex items-center gap-1">
                        <Euro className="h-4 w-4" />
                        Buy-in Amount (€)
                      </Label>
                      <Input
                        id="buy-in"
                        type="number"
                        min="0"
                        step="0.01"
                        value={buyIn}
                        onChange={(e) => setBuyIn(e.target.value)}
                        className="focus:ring-2 focus:ring-primary/50"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        The amount each player contributed to the pot
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Session Summary</CardTitle>
                    <CardDescription>
                      Overview of player results
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-primary/5 p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Total Profit/Loss</div>
                      <div className={`text-2xl font-bold ${
                        Math.abs(calculateTotalProfitLoss()) < 0.01 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        €{calculateTotalProfitLoss().toFixed(2)}
                      </div>
                      {Math.abs(calculateTotalProfitLoss()) < 0.01 ? (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          ✓ Balances are correctly distributed
                        </p>
                      ) : (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          ✗ Total should be close to zero
                        </p>
                      )}
                    </div>

                    <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <AlertDescription className="text-sm text-blue-800 dark:text-blue-300">
                        Enter each player's final chip count. The system will automatically calculate profit/loss based on the buy-in amount.
                      </AlertDescription>
                    </Alert>

                    <div className="flex flex-col gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={resetChips}
                        className="flex items-center gap-1"
                      >
                        <MinusCircle className="h-4 w-4" />
                        Reset All to Buy-in
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <form onSubmit={handleSubmit}>
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Player Chip Counts
                          </CardTitle>
                          <CardDescription>
                            Enter the final chip count for each player
                          </CardDescription>
                        </div>
                        <div className="flex items-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              alert("Chip Count Tips:\n\n• Enter the final chip amount for each player\n• Players who end with more than their buy-in are winners\n• Players who end with less than their buy-in are losers\n• The system will calculate profit/loss automatically");
                            }}
                            className="flex items-center gap-1"
                          >
                            <HelpCircle className="h-4 w-4" />
                            <span className="hidden sm:inline">Tips</span>
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {group?.players && group.players.length > 0 ? (
                          <>
                            <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground mb-2">
                              <div className="col-span-5 sm:col-span-6">Player</div>
                              <div className="col-span-4 sm:col-span-3">Final Chips (€)</div>
                              <div className="col-span-3 sm:col-span-3">Profit/Loss</div>
                            </div>
                            
                            {group.players.map((player) => (
                              <div key={player.id} className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-5 sm:col-span-6">
                                  <Label 
                                    htmlFor={`chips-${player.id}`}
                                    className="flex items-center gap-2"
                                  >
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                      {player.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span>{player.name}</span>
                                  </Label>
                                </div>
                                <div className="col-span-4 sm:col-span-3">
                                  <Input
                                    id={`chips-${player.id}`}
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={playerChips[player.name] || "0"}
                                    onChange={(e) => handleChipsChange(player.name, e.target.value)}
                                    className="focus:ring-2 focus:ring-primary/50"
                                    required
                                  />
                                </div>
                                <div className="col-span-3 sm:col-span-3">
                                  <div className={`px-2 py-1 rounded text-sm font-medium ${
                                    getPlayerProfitLoss(player.name) > 0
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                      : getPlayerProfitLoss(player.name) < 0
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                  }`}>
                                    {getPlayerProfitLoss(player.name) > 0 ? '+' : ''}
                                    €{getPlayerProfitLoss(player.name).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            No players found in this group. Add players before creating a session.
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => router.push(`/group/${groupName}/dashboard`)}
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="w-full sm:w-auto flex items-center gap-2"
                        disabled={submitting || Math.abs(calculateTotalProfitLoss()) > 1}
                      >
                        {submitting ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            <span>Save Session</span>
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

