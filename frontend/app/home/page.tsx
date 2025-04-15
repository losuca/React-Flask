"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Link as LinkIcon, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { NavBar } from "@/components/nav-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import * as api from "@/lib/api"
import { 
  Plus, Search, Users, ArrowRight, AlertCircle, 
  Calendar, Euro, UserPlus
} from "lucide-react"
import { Input } from "@/components/ui/input"

interface Group {
  id: number
  name: string
  creator_id: number
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [inviteUrl, setInviteUrl] = useState("")
  const [processingUrl, setProcessingUrl] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Authentication check
    if (!user && !authLoading) {
      const currentPath = window.location.pathname
      router.push('/?redirect=' + encodeURIComponent(currentPath))
      return
    }

    if (!user) return

    const fetchGroups = async () => {
      try {
        setLoading(true)
        const response = await api.getGroups()
        setGroups(response.groups || [])
        setError(null)
      } catch (err) {
        console.error("Failed to fetch groups:", err)
        setError("Failed to load groups. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchGroups()
  }, [user, authLoading, router])

  const handleJoinViaUrl = () => {
    try {
      setProcessingUrl(true)
      
      // Parse the URL to extract group name
      const url = new URL(inviteUrl);
      const pathParts = url.pathname.split('/');
      const groupNameIndex = pathParts.findIndex(part => part === 'join-group') + 1;
      
      if (groupNameIndex <= 0 || groupNameIndex >= pathParts.length) {
        throw new Error("Invalid URL format");
      }
      
      const groupName = pathParts[groupNameIndex];
      
      if (!groupName) {
        throw new Error("Missing group name");
      }
      
      // Close the dialog
      setShowJoinDialog(false);
      setInviteUrl("");
      
      // Redirect to the join-group page
      router.push(`/join-group/${groupName}`);
      
    } catch (err) {
      console.error("Failed to process invite URL:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid invite URL format. Please check and try again.",
      });
    } finally {
      setProcessingUrl(false);
    }
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
            <div>
              <h1 className="text-2xl font-bold">Welcome, {user.username}</h1>
              <p className="text-muted-foreground mt-1">Manage your poker groups</p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => router.push('/create-group')}
                className="flex items-center gap-2"
              >
                <Plus size={16} />
                New Group
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowJoinDialog(true)}
                className="flex items-center gap-2"
              >
                <LinkIcon size={16} />
                Join Group
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <section className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">My Groups</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <Card key={i} className="overflow-hidden border border-border/40">
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                    <CardFooter>
                      <Skeleton className="h-10 w-full" />
                    </CardFooter>
                  </Card>
                ))
              ) : groups.length > 0 ? (
                groups.map((group) => (
                  <Card key={group.id} className="overflow-hidden border border-border/40">
                    <CardHeader className="pb-2">
                      <CardTitle>{group.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Users size={14} />
                        <span>Group #{group.id}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar size={14} />
                          <span>Recent Games: 0</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Euro size={14} />
                          <span>Total Pot: €0</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button asChild className="w-full gap-1">
                        <Link href={`/group/${encodeURIComponent(group.name)}/dashboard`}>
                          View Group
                          <ArrowRight size={16} />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="col-span-full bg-muted/30 rounded-lg p-6 text-center border border-dashed border-muted-foreground/30">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Users size={24} className="text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No groups found</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't created or joined any poker groups yet.
                  </p>
                </div>
              )}
            </div>
          </section>

          {groups.length === 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Get Started</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border border-border/40">
                  <CardHeader>
                    <CardTitle>Create a Group</CardTitle>
                    <CardDescription>Start tracking your poker games</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Create a new poker group and invite your friends to join.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => router.push('/create-group')}
                      className="w-full"
                    >
                      Create Group
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="border border-border/40">
                  <CardHeader>
                    <CardTitle>Join a Group</CardTitle>
                    <CardDescription>Connect with other players</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Join an existing group using an invite link.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline"
                      onClick={() => setShowJoinDialog(true)}
                      className="w-full flex items-center gap-2"
                    >
                      <LinkIcon size={16} />
                      Join Group
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </section>
          )}
          <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Group</DialogTitle>
                <DialogDescription>
                  Paste an invite URL to join a poker group
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <label className="text-sm font-medium mb-2 block">
                  Invite URL
                </label>
                <Input
                  placeholder="https://example.com/join-group/group-name"
                  value={inviteUrl}
                  onChange={(e) => setInviteUrl(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  You'll be redirected to select your player after submitting.
                </p>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowJoinDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleJoinViaUrl}
                  disabled={!inviteUrl || processingUrl}
                >
                  {processingUrl ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Join Group"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
