"use client"

import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { LogOut, User, CreditCard } from "lucide-react"
import { NavBar } from "@/components/nav-bar"

export default function ProfilePage() {
  const { user, logout } = useAuth()

  // Generate initials from username
  const initials = user?.username
    ? user.username.substring(0, 2).toUpperCase()
    : "PC"

  return (
    <div className="min-h-screen bg-background flex flex-col">
        <NavBar />

        <main className="flex-1">
            <div className="container max-w-2xl py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
                <p className="text-muted-foreground">Manage your account info.</p>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <Avatar className="h-16 w-16">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`} />
                    <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <CardTitle className="text-xl">{user?.username}</CardTitle>
                    <CardDescription>User ID: {user?.id}</CardDescription>
                </div>
                </CardHeader>
                <CardContent className="space-y-4">
                <Separator />
                
                <div className="grid gap-1">
                    <h3 className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Account Details
                    </h3>
                    <div className="text-sm text-muted-foreground mt-1">
                    <div className="flex justify-between py-2 border-b border-border/50">
                        <span>Username</span>
                        <span className="font-medium text-foreground">{user?.username}</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span>Member Status</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Active
                        </span>
                    </div>
                    </div>
                </div>

                <Separator />

                <div className="pt-2">
                    <Button variant="destructive" className="w-full sm:w-auto" onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                    </Button>
                </div>
                </CardContent>
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