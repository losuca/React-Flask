"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, ArrowLeft, Frown } from "lucide-react"

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-background/80 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary">PokerCount</h1>
        </div>
        
        <Card className="border-border/40 shadow-lg">
          <CardHeader className="space-y-1 pb-2 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Brain className="w-10 h-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-semibold">Forgot your password?</CardTitle>
            <CardDescription>
              Security Question #1
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-4 text-center">
            <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground block mb-2">
                  Have you tried remembering it?
                </span>
                We don't actually have an email server to send resets because this is just for the boys. 
                <br /><br />
                Your best bet is to message the group chat and admit defeat, or create a new account and live with the shame.
              </p>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Link href="/" className="w-full">
              <Button className="w-full font-medium" size="lg">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Wait, I remembered it!
              </Button>
            </Link>
            
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              <Frown className="mr-2 h-4 w-4" />
              <span>Good luck</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}