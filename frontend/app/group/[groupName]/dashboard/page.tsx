"use client"
import { useToast } from "@/components/ui/use-toast"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useParams } from "next/navigation"
import { NavBar } from "@/components/nav-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import * as api from "@/lib/api"
import { 
  Users, Calendar, Euro, PlusCircle, BarChart3, 
  Clock, Trophy, AlertCircle, ArrowRight, User, Loader2,
  CalendarDays, Settings, Share2, Copy, Check
} from "lucide-react"

interface Player {
  id: number
  name: string
  group_id: number
  joined: boolean
}

interface Session {
  id: number
  name: string
  date: string
  buy_in: number
  group_id: number
  balances: Balance[]
}

interface Balance {
  id: number
  amount: number
  session_id: number
  player_id: number
}

interface Group {
  id: number
  name: string
  creator_id: number
  players: Player[]
  sessions: Session[]
}

export default function GroupDashboardPage() {
  const params = useParams()
  const groupName = params.groupName as string
  const router = useRouter()
  const { user, loading:authLoading } = useAuth()
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<Player | null>(null)
  const [activeTab, setActiveTab] = useState("sessions")
  const { toast } = useToast()
  const [showAddPlayerDialog, setShowAddPlayerDialog] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // For invite link functionality
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [copied, setCopied] = useState(false)
  const inviteLinkRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Authentication check
    if (!user && !authLoading) {
      const currentPath = window.location.pathname
      router.push('/?redirect=' + encodeURIComponent(currentPath))
      return
    }

    if (!user) return

    const fetchGroupData = async () => {
      try {
        setLoading(true)
        const response = await api.getGroupDashboard(groupName)
        setGroup(response.group)
        setCurrentUser(response.current_user)
        setError(null)
      } catch (err) {
        console.error("Failed to load group data:", err)
        setError("Failed to load group data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchGroupData()
  }, [groupName, user, authLoading, router])

  // Helper functions for calculations
  const calculateTotalMoneyTracked = (sessions: Session[]): number => {
    return sessions.reduce((total, session) => {
      return total + (session.buy_in * (session.balances?.length || 0))
    }, 0)
  }

  const getTopWinner = (balances: Balance[]): string => {
    if (!balances.length) return "N/A"
    
    const topBalance = [...balances].sort((a, b) => b.amount - a.amount)[0]
    if (!topBalance) return "N/A"
    
    const player = group?.players.find(p => p.id === topBalance.player_id)
    return player ? `${player.name} (€${topBalance.amount})` : "N/A"
  }

  const countPlayerSessions = (playerId: number, sessions: Session[]): number => {
    return sessions.filter(session => 
      session.balances?.some(balance => balance.player_id === playerId) || false
    ).length
  }

  const getPlayerTotalWinnings = (playerId: number, sessions: Session[]): number => {
    return sessions.reduce((total, session) => {
      const playerBalance = session.balances?.find(b => b.player_id === playerId)
      return total + (playerBalance?.amount || 0)
    }, 0)
  }
  
  const calculateWinRate = (playerId: number, sessions: Session[]): number => {
    const playerSessions = sessions.filter(session => 
      session.balances?.some(balance => balance.player_id === playerId) || false
    )
    
    if (!playerSessions.length) return 0
    
    const winCount = playerSessions.filter(session => {
      const playerBalance = session.balances?.find(b => b.player_id === playerId)
      return playerBalance && playerBalance.amount > 0
    }).length
    
    return Math.round((winCount / playerSessions.length) * 100)
  }

  // Generate invite link
  const getInviteLink = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/join-group/${groupName}?code=${group?.id}`
  }

  // Copy invite link to clipboard
  const copyInviteLink = () => {
    if (inviteLinkRef.current) {
      inviteLinkRef.current.select()
      document.execCommand('copy')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleLeaveGroup = async () => {
    try {
      setIsSubmitting(true)
      await api.leaveGroup(groupName)
      toast({
        title: "Success",
        description: "You have left the group successfully",
      })
      router.push('/home')
    } catch (error) {
      console.error("Failed to leave group:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to leave the group. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Player name cannot be empty",
      })
      return
    }
    
    try {
      setIsSubmitting(true)
      await api.addPlayer(groupName, newPlayerName)
      toast({
        title: "Success",
        description: `Player "${newPlayerName}" added successfully`,
      })
      
      // Refresh group data
      const response = await api.getGroupDashboard(groupName)
      setGroup(response.group)
      setNewPlayerName("")
      setShowAddPlayerDialog(false)
    } catch (error) {
      console.error("Failed to add player:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add player. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatProfitLoss = (amount: number): string => {
    // Check if the amount is a whole number (no decimal part)
    const isWholeNumber = amount === Math.floor(amount);
    
    // Format the number - show no decimals for whole numbers, 2 decimals otherwise
    const formattedAmount = isWholeNumber 
      ? Math.abs(amount).toString() 
      : Math.abs(amount).toFixed(2);
    
    // Add the appropriate sign and currency symbol
    return amount >= 0 ? `+€${formattedAmount}` : `-€${formattedAmount}`;
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
          {loading ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-48" />
              </div>
              <Skeleton className="h-12 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
              <Skeleton className="h-12 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold">{groupName}</h1>
                    <Badge variant="outline" className="ml-2">ID: {group?.id}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1">
                    {group?.players?.length || 0} Members · {group?.sessions?.length || 0} Sessions
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/group/${groupName}/settings`} className="flex items-center gap-1">
                      <Settings size={16} />
                      <span>Settings</span>
                    </Link>
                  </Button>
                  
                  {/* Invite Dialog */}
                  <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        <Share2 size={16} />
                        <span>Invite</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Players to {groupName}</DialogTitle>
                        <DialogDescription>
                          Share this link with friends to invite them to join your poker group.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex items-center space-x-2">
                          <Input 
                            ref={inviteLinkRef}
                            value={getInviteLink()} 
                            readOnly 
                            className="flex-1"
                          />
                          <Button 
                            size="icon" 
                            onClick={copyInviteLink}
                            variant="outline"
                          >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground mt-2">
                          Anyone with this link can join your group.
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/settlements/${groupName}`} className="flex items-center gap-1">
                      <BarChart3 size={16} />
                      <span>Settlements</span>
                    </Link>
                  </Button>
                  {group?.creator_id === user?.id && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowAddPlayerDialog(true)}
                      className="flex items-center gap-1"
                    >
                      <PlusCircle size={16} />
                      <span>Add Player</span>
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="flex items-center gap-1">
                        <Users size={16} />
                        <span>Leave Group</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove you from the group. You can rejoin later if needed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleLeaveGroup}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Leaving...
                            </>
                          ) : (
                            "Leave Group"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button asChild>
                    <Link href={`/add-session/${groupName}`} className="flex items-center gap-1">
                      <PlusCircle size={16} />
                      <span>Add Session</span>
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Changed from AlertDialog to Dialog for adding a player */}
              <Dialog open={showAddPlayerDialog} onOpenChange={setShowAddPlayerDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Player</DialogTitle>
                    <DialogDescription>
                      Enter the name of the player you want to add to this group.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Input
                      placeholder="Player name"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAddPlayerDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddPlayer}
                      disabled={isSubmitting || !newPlayerName.trim()}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Player"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Total Sessions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{group?.sessions?.length || 0}</div>
                    <p className="text-muted-foreground text-sm">
                      {group?.sessions?.length ? 
                        `Last session on ${new Date(group.sessions[0].date).toLocaleDateString()}` : 
                        "No sessions recorded yet"}
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Active Players
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{group?.players?.length || 0}</div>
                    <p className="text-muted-foreground text-sm">
                      {currentUser ? `Including you (${currentUser.name})` : "No players yet"}
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Euro className="h-5 w-5 text-primary" />
                      Total Money Tracked
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      €{calculateTotalMoneyTracked(group?.sessions || [])}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Across all sessions
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                  <TabsTrigger value="sessions" className="flex items-center gap-2">
                    <Calendar size={16} />
                    Sessions
                  </TabsTrigger>
                  <TabsTrigger value="players" className="flex items-center gap-2">
                    <Users size={16} />
                    Players
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="sessions">
                  {group?.sessions && group.sessions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.sessions.map((session) => (
                        <Card key={session.id} className="overflow-hidden transition-all hover:shadow-md border border-border/40">
                          <div className="bg-primary h-2 w-full"></div>
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle>{session.name}</CardTitle>
                              <Badge variant="outline">
                                €{session.buy_in}
                              </Badge>
                            </div>
                            <CardDescription className="flex items-center gap-1">
                              <CalendarDays size={14} />
                              {new Date(session.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Players:</span>
                                <span className="font-medium">{session.balances?.length || 0}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total Pot:</span>
                                <span className="font-medium">€{session.buy_in * (session.balances?.length || 0)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Top Winner:</span>
                                <span className="font-medium">
                                  {getTopWinner(session.balances || [])}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                          <CardFooter>
                            <Button asChild className="w-full gap-1">
                              <Link href={`/group/${groupName}/session/${session.id}`}>
                                View Details
                                <ArrowRight size={16} />
                              </Link>
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-muted/30 rounded-lg p-8 text-center border border-dashed border-muted-foreground/30">
                      <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Calendar size={32} className="text-muted-foreground" />
                      </div>
                      <h3 className="text-xl font-medium mb-2">No sessions yet</h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Start tracking your poker games by adding your first session.
                      </p>
                      <Button asChild>
                        <Link href={`/add-session/${groupName}`} className="flex items-center gap-2">
                          <PlusCircle size={16} />
                          Add Your First Session
                        </Link>
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="players">
                  {group?.players && group.players.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.players.map((player) => (
                        <Card key={player.id} className={`overflow-hidden transition-all hover:shadow-md border ${
                          player.id === currentUser?.id ? 'border-primary/50 bg-primary/5' : 'border-border/40'
                        }`}>
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                {player.name}
                              </CardTitle>
                              {player.id === currentUser?.id && (
                                <Badge variant="secondary">You</Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Sessions Played:</span>
                                <span className="font-medium">
                                  {countPlayerSessions(player.id, group?.sessions || [])}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total Winnings:</span>
                                <span className={`font-medium ${
                                  getPlayerTotalWinnings(player.id, group?.sessions || []) > 0 
                                    ? 'text-green-600' 
                                    : getPlayerTotalWinnings(player.id, group?.sessions || []) < 0 
                                      ? 'text-red-600' 
                                      : ''
                                }`}>
                                  {formatProfitLoss(getPlayerTotalWinnings(player.id, group?.sessions || []))}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Win Rate:</span>
                                <span className="font-medium">
                                  {calculateWinRate(player.id, group?.sessions || [])}%
                                </span>
                              </div>
                            </div>
                          </CardContent>
                          <CardFooter>
                            <Button variant="outline" asChild className="w-full">
                              <Link href={`/player/${player.id}/stats`}>
                                View Stats
                              </Link>
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-muted/30 rounded-lg p-8 text-center border border-dashed border-muted-foreground/30">
                      <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Users size={32} className="text-muted-foreground" />
                      </div>
                      <h3 className="text-xl font-medium mb-2">No players yet</h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Invite players to join your poker group.
                      </p>
                      <Button 
                        className="flex items-center gap-2"
                        onClick={() => setShowInviteDialog(true)}
                      >
                        <Share2 size={16} />
                        Invite Players
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
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

