"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useParams } from "next/navigation"
import { NavBar } from "@/components/nav-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { useRouter } from "next/navigation"
import Link from "next/link"
import * as api from "@/lib/api"
import { 
  Calendar, Euro, Users, Trash2, ArrowLeft, 
  AlertCircle, CalendarDays, TrendingUp, TrendingDown, 
  BarChart3, Edit
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

export default function SessionDetailPage() {
  const params = useParams()
  const groupName = params.groupName as string
  const sessionId = params.sessionId as string
  const { user, loading:authLoading } = useAuth()
  const [session, setSession] = useState<Session | null>(null)
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

    const fetchSession = async () => {
      try {
        setLoading(true)
        const response = await api.viewSession(groupName, Number.parseInt(sessionId))
        setSession(response.session)
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

  const handleDeleteSession = async () => {
    if (!confirm("Are you sure you want to delete this session? This action cannot be undone.")) return

    try {
      await api.removeSession(groupName, Number.parseInt(sessionId))
      router.push(`/group/${groupName}/dashboard`)
    } catch (err) {
      console.error("Failed to delete session:", err)
      setError("Failed to delete session. Please try again later.")
    }
  }

  // Helper functions
  const getTotalPot = (): number => {
    if (!session) return 0
    return session.buy_in * session.balances.length
  }

  const getWinners = (): Balance[] => {
    if (!session) return []
    return [...session.balances].filter(balance => balance.amount > 0)
      .sort((a, b) => b.amount - a.amount)
  }

  const getLosers = (): Balance[] => {
    if (!session) return []
    return [...session.balances].filter(balance => balance.amount < 0)
      .sort((a, b) => a.amount - b.amount)
  }

  const getTopWinner = (): Balance | null => {
    const winners = getWinners()
    return winners.length > 0 ? winners[0] : null
  }

  const getTopLoser = (): Balance | null => {
    const losers = getLosers()
    return losers.length > 0 ? losers[0] : null
  }

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
        <div className="container mx-auto p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild className="mr-2">
                <Link href={`/group/${groupName}/dashboard`} className="flex items-center gap-1">
                  <ArrowLeft size={16} />
                  <span>Back to Dashboard</span>
                </Link>
              </Button>
              <h1 className="text-2xl font-bold">Session Details</h1>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild className="flex items-center gap-1">
                <Link href={`/edit-session/${groupName}/${sessionId}`}>
                  <Edit size={16} />
                  <span>Edit Session</span>
                </Link>
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteSession} className="flex items-center gap-1">
                <Trash2 size={16} />
                <span>Delete Session</span>
              </Button>
            </div>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <Card className="overflow-hidden transition-all border border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">{session.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <CalendarDays size={14} />
                      {new Date(session.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-primary/5 p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                          <Euro size={14} />
                          Buy-in
                        </div>
                        <div className="text-xl font-bold">€{session.buy_in}</div>
                      </div>
                      <div className="bg-primary/5 p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                          <Users size={14} />
                          Players
                        </div>
                        <div className="text-xl font-bold">{session.balances?.length || 0}</div>
                      </div>
                      <div className="bg-primary/5 p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                          <BarChart3 size={14} />
                          Total Pot
                        </div>
                        <div className="text-xl font-bold">€{getTotalPot()}</div>
                      </div>
                      <div className="bg-primary/5 p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                          <Calendar size={14} />
                          Session ID
                        </div>
                        <div className="text-xl font-bold">#{session.id}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden transition-all border border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Session Highlights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {getTopWinner() && (
                      <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="bg-green-100 dark:bg-green-800 p-2 rounded-full">
                            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">Top Winner</div>
                            <div className="text-lg font-bold">{getTopWinner()?.player.name}</div>
                          </div>
                        </div>
                        <div className="text-xl font-bold text-green-600 dark:text-green-400">
                          {formatProfitLoss(getTopWinner()?.amount || 0)}
                        </div>
                      </div>
                    )}
                    
                    {getTopLoser() && (
                      <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="bg-red-100 dark:bg-red-800 p-2 rounded-full">
                            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">Biggest Loss</div>
                            <div className="text-lg font-bold">{getTopLoser()?.player.name}</div>
                          </div>
                        </div>
                        <div className="text-xl font-bold text-red-600 dark:text-red-400">
                          {formatProfitLoss(getTopLoser()?.amount || 0)}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Card className="overflow-hidden transition-all border border-border/40">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Player Results
                    </CardTitle>
                    <CardDescription>
                      Final balances for all players in this session
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {session.balances?.length > 0 ? (
                        session.balances
                          .sort((a, b) => b.amount - a.amount)
                          .map((balance) => (
                            <div key={balance.id} className="flex justify-between items-center p-3 rounded-lg hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  balance.amount > 0 
                                    ? 'bg-green-100 dark:bg-green-900/30' 
                                    : balance.amount < 0 
                                      ? 'bg-red-100 dark:bg-red-900/30' 
                                      : 'bg-gray-100 dark:bg-gray-800'
                                }`}>
                                  {balance.amount > 0 
                                    ? <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    : balance.amount < 0 
                                      ? <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                                      : <BarChart3 className="h-4 w-4 text-gray-500" />
                                  }
                                </div>
                                <span className="font-medium">{balance.player.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${
                                  balance.amount > 0 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                    : balance.amount < 0 
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                }`}>
                                  {formatProfitLoss(balance.amount)}
                                </span>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          No player balances recorded for this session
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="bg-muted/30 rounded-lg p-8 text-center border border-dashed border-muted-foreground/30">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <AlertCircle size={32} className="text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium mb-2">Session not found</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                The session you're looking for doesn't exist or has been deleted.
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
