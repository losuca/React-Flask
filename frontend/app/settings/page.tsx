"use client"

import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Moon, Sun, Smartphone, Monitor } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useEffect, useState } from "react"
import { NavBar } from "@/components/nav-bar"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background flex flex-col">
        <NavBar />

        <main className="flex-1">
            <div className="container max-w-2xl py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Customize your app experience.</p>
            </div>

            {/* Appearance Settings */}
            <Card>
                <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                    Choose how PokerCount looks on your device.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <RadioGroup 
                    defaultValue={theme} 
                    onValueChange={(value) => setTheme(value)}
                    className="grid grid-cols-3 gap-4"
                >
                    <div>
                    <RadioGroupItem value="light" id="light" className="peer sr-only" />
                    <Label
                        htmlFor="light"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                        <Sun className="mb-3 h-6 w-6" />
                        Light
                    </Label>
                    </div>
                    <div>
                    <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                    <Label
                        htmlFor="dark"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                        <Moon className="mb-3 h-6 w-6" />
                        Dark
                    </Label>
                    </div>
                    <div>
                    <RadioGroupItem value="system" id="system" className="peer sr-only" />
                    <Label
                        htmlFor="system"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                        <Monitor className="mb-3 h-6 w-6" />
                        System
                    </Label>
                    </div>
                </RadioGroup>
                </CardContent>
            </Card>

            {/* App Info Card */}
            <Card>
                <CardHeader>
                <CardTitle>About</CardTitle>
                <CardDescription>Application information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col space-y-1">
                    <span className="text-sm font-medium leading-none">Version</span>
                    <span className="text-xs text-muted-foreground">v0.1.0 (Beta)</span>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex flex-col space-y-1">
                    <span className="text-sm font-medium leading-none">Developer</span>
                    <span className="text-xs text-muted-foreground">Lowie Sucaet</span>
                    </div>
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