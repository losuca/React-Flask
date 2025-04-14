"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import { NavBar } from "@/components/nav-bar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, CheckCircle2, RefreshCw, ArrowLeft } from "lucide-react"
import Link from "next/link"
import * as api from "@/lib/api"

interface Settlement {
  text: string
  from: string
  to: string
  amount: number
  settled: boolean
  id: string
}

export default function SettlementsPage() {
  const params = useParams()
  const groupName = params.groupName as string
  const { user, loading:authLoading } = useAuth()
  const router = useRouter()
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [currentPlayer, setCurrentPlayer] = useState<{id: number, name: string} | null>(null)

  const fetchSettlements = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.getSettlements(groupName)
      console.log("Settlements response:", response) // Debug log
      setSettlements(response.settlements || [])
      setCurrentPlayer(response.current_user || null)
    } catch (err) {
      setError("Failed to load settlements")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Authentication check
    if (!user && !authLoading) {
      const currentPath = window.location.pathname
      router.push('/?redirect=' + encodeURIComponent(currentPath))
      return
    }

    if (!user) return

    fetchSettlements()
  }, [groupName, user, authLoading, router])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchSettlements()
    setRefreshing(false)
  }

  const handleMarkAsSettled = async (settlementId: string) => {
    try {
      await api.markSettlementAsSettled(groupName, settlementId)
      
      // Update the local state to show the green check immediately
      setSettlements(settlements.map(settlement => 
        settlement.id === settlementId 
          ? { ...settlement, settled: true } 
          : settlement
      ))
    } catch (err) {
      setError("Failed to mark settlement as settled")
      console.error(err)
    }
  }

  // Filter settlements for the two sections
  const pendingSettlements = settlements.filter(s => !s.settled)
  const settledHistory = settlements.filter(s => s.settled)

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild className="mr-2">
                <Link href={`/group/${groupName}/dashboard`} className="flex items-center gap-1">
                  <ArrowLeft size={16} />
                  <span>Back to Dashboard</span>
                </Link>
              </Button>
              <h1 className="text-2xl font-bold">Settlements for {groupName}</h1>
            </div>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
              disabled={refreshing || loading}
              className="flex items-center gap-2 self-start sm:self-auto"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-[200px] w-full rounded-lg" />
              <Skeleton className="h-[200px] w-full rounded-lg" />
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="overflow-hidden transition-all border border-border/40">
                <CardHeader>
                  <CardTitle>Your Settlements</CardTitle>
                  <CardDescription>
                    Payments you need to make or receive to balance expenses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingSettlements.length > 0 ? (
                    <div className="space-y-4">
                      {pendingSettlements.map((settlement) => (
                        <Card key={settlement.id} className="overflow-hidden border border-border/40">
                          <div className="p-4 border-l-4 border-primary flex justify-between items-center">
                            <div>
                              <p className="font-medium">{settlement.text}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {settlement.from} → {settlement.to}: €{settlement.amount.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              {currentPlayer && settlement.from === currentPlayer.name && (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleMarkAsSettled(settlement.id)}
                                >
                                  Mark as Settled
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
                      <p className="text-lg font-medium mb-2">No pending settlements</p>
                      <p className="text-muted-foreground">You're all caught up! No payments are currently needed.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden transition-all border border-border/40">
                <CardHeader>
                  <CardTitle>Settlement History</CardTitle>
                  <CardDescription>
                    Past settlements that have been completed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {settledHistory.length > 0 ? (
                    <div className="space-y-2">
                      {settledHistory.map((settlement) => (
                        <div key={settlement.id} className="p-3 border rounded-md bg-muted/50">
                          <div className="flex justify-between items-center">
                            <div>
                              <p>{settlement.text}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Settled: €{settlement.amount.toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center text-green-600">
                              <CheckCircle2 className="h-5 w-5 mr-1" />
                              <span>Settled</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-4 text-muted-foreground">No settlement history yet</p>
                  )}
                </CardContent>
              </Card>
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
