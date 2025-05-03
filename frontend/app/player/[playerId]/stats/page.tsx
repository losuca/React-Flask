"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useParams } from "next/navigation"
import { NavBar } from "@/components/nav-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import Link from "next/link"
import * as api from "@/lib/api"
import { 
  ArrowLeft, AlertCircle, User, Calendar, 
  TrendingUp, TrendingDown, Euro, Percent,
  BarChart3, Calculator
} from "lucide-react"

interface Player {
  id: number
  name: string
  group_id: number
}

interface Balance {
  id: number
  amount: number
  player_id: number
  session_id: number
}

interface Session {
  id: number
  name: string
  date: string
  buy_in: number
  balances: Balance[]
}

interface Group {
  id: number
  name: string
}

interface PlayerStats {
  totalWinnings: number
  sessionsPlayed: number
  winRate: number
  biggestWin: number
  biggestLoss: number
  averageWinnings: number
}

interface PlayerData {
  player: Player
  group: Group
  sessions: Session[]
  stats: PlayerStats
}

export default function PlayerStatsPage() {
  const params = useParams()
  const playerId = params.playerId as string
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<PlayerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Authentication check
    if (!user && !authLoading) {
      const currentPath = window.location.pathname
      router.push('/?redirect=' + encodeURIComponent(currentPath))
      return
    }

    if (!user) return

    const fetchPlayerStats = async () => {
      try {
        setLoading(true)
        const response = await api.getPlayerStats(parseInt(playerId))
        setData(response)
        setError(null)
      } catch (err: any) {
        console.error("Failed to load player stats:", err)
        setError(err.response?.data?.error || "Failed to load player statistics. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchPlayerStats()
  }, [playerId, user, authLoading, router])

  // For displaying profit/loss values consistently
  const formatProfitLoss = (amount: number): string => {
    // Check if the amount is a whole number (no decimal part)
    const isWholeNumber = amount === Math.floor(amount);
    
    // Format the number - show no decimals for whole numbers, 2 decimals otherwise
    let formattedAmount = isWholeNumber 
      ? Math.abs(amount).toString() 
      : Math.abs(amount).toFixed(2);

    formattedAmount = formattedAmount.replace('.', ',');
    // Add the appropriate sign and currency symbol
    if (amount === 0)
      return `€${formattedAmount}`;
    return amount < 0 ? `-€${formattedAmount}` : `+€${formattedAmount}`;
  };

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
            {data?.group && (
              <Button variant="outline" size="sm" asChild className="mr-2">
                <Link href={`/group/${data.group.name}/dashboard`} className="flex items-center gap-1">
                  <ArrowLeft size={16} />
                  <span>Back to Dashboard</span>
                </Link>
              </Button>
            )}
            <h1 className="text-2xl font-bold">Player Statistics</h1>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-20 w-full rounded-lg" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          ) : data?.player ? (
            <>
              <Card className="mb-6 overflow-hidden">
                <div className="bg-primary h-1 w-full"></div>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{data.player.name}</CardTitle>
                      <CardDescription>
                        {data.group ? `Member of ${data.group.name}` : 'Player'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Euro className="h-5 w-5 text-primary" />
                      Total Winnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold ${
                      data.stats.totalWinnings > 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : data.stats.totalWinnings < 0 
                          ? 'text-red-600 dark:text-red-400' 
                          : ''
                    }`}>
                        {data.stats.totalWinnings === 0 ? '€0' : formatProfitLoss(data.stats.totalWinnings)}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Across {data.stats.sessionsPlayed} sessions
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Percent className="h-5 w-5 text-primary" />
                      Win Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {data.stats.winRate}%
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Percentage of profitable sessions
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Sessions Played
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {data.stats.sessionsPlayed}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Total poker sessions attended
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                        Biggest Win
                    </CardTitle>
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {data.stats.biggestWin === 0 
                        ? '€0' 
                        : formatProfitLoss(data.stats.biggestWin)}
                    </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Average Per Session
                    </CardTitle>
                    </CardHeader>
                    <CardContent>
                    <div className={`text-2xl font-bold ${
                        data.stats.averageWinnings > 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : data.stats.averageWinnings < 0 
                            ? 'text-red-600 dark:text-red-400' 
                            : ''
                    }`}>
                        {data.stats.averageWinnings === 0 
                        ? '€0' 
                        : formatProfitLoss(data.stats.averageWinnings)}
                    </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                        Biggest Loss
                    </CardTitle>
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {data.stats.biggestLoss === 0 
                        ? '€0' 
                        : formatProfitLoss(data.stats.biggestLoss)}
                    </div>
                    </CardContent>
                </Card>
                </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Session History
                  </CardTitle>
                  <CardDescription>
                    Performance in recent poker sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.sessions.length > 0 ? (
                    <div className="space-y-4">
                      {data.sessions.map((session) => {
                        const playerBalance = session.balances.find(
                          b => b.player_id === data.player.id
                        )
                        
                        // Skip sessions where this player didn't participate
                        if (!playerBalance) return null
                        
                        const amount = playerBalance ? playerBalance.amount : 0
                        
                        return (
                          <div key={session.id} className="flex items-center justify-between p-3 border rounded-md">
                            <div>
                              <div className="font-medium">{session.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(session.date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className={`font-medium ${
                              amount > 0 
                                ? 'text-green-600 dark:text-green-400' 
                                : amount < 0 
                                  ? 'text-red-600 dark:text-red-400' 
                                  : ''
                            }`}>
                              {amount === 0 ? '€0' : formatProfitLoss(amount)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No session history available
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>Player not found or you don't have access to view this player's statistics.</AlertDescription>
            </Alert>
          )}
        </div>
      </main>
    </div>
  )
}

