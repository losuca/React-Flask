"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { useAuth } from "@/contexts/auth-context"
import { NavBar } from "@/components/nav-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import * as api from "@/lib/api"
import { 
  Plus, Search, Users, ArrowRight, AlertCircle, 
  Calendar, Trophy, DollarSign, Clock, Loader2,
  UserPlus
} from "lucide-react"

interface Group {
  id: number
  name: string
  creator_id: number
}

export default function HomePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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
  }, [user])

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
        <p className="mb-6">Please log in to view your poker groups and create new ones.</p>
        <Button asChild>
          <Link href="/">Log In</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavBar />
      
      <main className="flex-1">
        <div className="container mx-auto p-4 max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Welcome, {user.username}</h1>
              <p className="text-muted-foreground mt-1">Manage your poker groups and track your games</p>
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
                onClick={() => router.push('/find-group')}
                className="flex items-center gap-2"
              >
                <Search size={16} />
                Find Group
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <section className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">My Groups</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <Card key={i} className="overflow-hidden border border-border/40">
                    <div className="bg-muted h-3 w-full"></div>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                    <CardFooter>
                      <Skeleton className="h-10 w-full" />
                    </CardFooter>
                  </Card>
                ))
              ) : groups.length > 0 ? (
                groups.map((group) => (
                  <Card key={group.id} className="overflow-hidden transition-all hover:shadow-md border border-border/40">
                    <div className="bg-primary h-2 w-full"></div>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex justify-between items-start">
                        <span className="truncate">{group.name}</span>
                      </CardTitle>
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
                          <Trophy size={14} />
                          <span>Top Player: -</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <DollarSign size={14} />
                          <span>Total Pot: $0</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock size={14} />
                          <span>Last Game: -</span>
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
                <div className="col-span-full bg-muted/30 rounded-lg p-8 text-center border border-dashed border-muted-foreground/30">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Users size={32} className="text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">No groups found</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    You haven't created or joined any poker groups yet. Create your first group or join an existing one to get started.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={() => router.push('/create-group')} className="flex items-center gap-2">
                      <Plus size={16} />
                      Create Group
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/find-group')} className="flex items-center gap-2">
                      <UserPlus size={16} />
                      Join Group
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-border/40">
              <CardHeader>
                <CardTitle>Create a New Group</CardTitle>
                <CardDescription>Start tracking your poker games with friends</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Create a new poker group and invite your friends to join. Track your games, 
                  sessions, and winnings together.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => router.push('/create-group')}
                  className="w-full flex items-center gap-2"
                >
                  <Plus size={16} />
                  Create Group
                </Button>
              </CardFooter>
            </Card>

            <Card className="border border-border/40">
              <CardHeader>
                <CardTitle>Find a Group</CardTitle>
                <CardDescription>Join an existing poker group</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Search for existing groups to join. Connect with other players and 
                  start tracking your poker games together.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline"
                  onClick={() => router.push('/find-group')}
                  className="w-full flex items-center gap-2"
                >
                  <Search size={16} />
                  Find Groups
                </Button>
              </CardFooter>
            </Card>
          </section>
        </div>
      </main>
      
      <footer className="border-t border-border/40 mt-auto">
        <div className="container mx-auto p-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Poker Count. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
