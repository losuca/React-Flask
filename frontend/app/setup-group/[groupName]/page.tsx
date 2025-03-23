"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { NavBar } from "@/components/nav-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"
import * as api from "@/lib/api"

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

export default function SetupGroupPage({ params }: { params: { groupName: string } }) {
  const { groupName } = params
  const { user } = useAuth()
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState("")
  const router = useRouter()

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const response = await api.setupGroup(groupName)
        setGroup(response.group)
      } catch (err) {
        setError("Failed to load group")
      } finally {
        setLoading(false)
      }
    }

    fetchGroup()
  }, [groupName])

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerName.trim()) return

    try {
      await api.setupGroup(groupName, playerName)
      // Refresh the group data
      const response = await api.setupGroup(groupName)
      setGroup(response.group)
      setPlayerName("")
    } catch (err) {
      setError("Failed to add player")
    }
  }

  const handleFinish = () => {
    router.push(`/group/${groupName}/dashboard`)
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please log in to view this page</p>
      </div>
    )
  }

  return (
    <>
      <NavBar />
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Setup Group: {groupName}</h1>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <p>Loading group...</p>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Add Players</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddPlayer} className="flex gap-2 mb-4">
                  <Input
                    placeholder="Player Name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    required
                  />
                  <Button type="submit">Add</Button>
                </form>

                <div className="space-y-2">
                  <h3 className="font-medium">Current Players:</h3>
                  {group?.players && group.players.length > 0 ? (
                    <ul className="list-disc pl-5">
                      {group.players.map((player) => (
                        <li key={player.id}>{player.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No players added yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleFinish}>Finish Setup</Button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

