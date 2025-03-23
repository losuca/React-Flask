"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { NavBar } from "@/components/nav-bar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import * as api from "@/lib/api"

interface Settlement {
  text: string
}

export default function SettlementsPage({ params }: { params: { groupName: string } }) {
  const { groupName } = params
  const { user } = useAuth()
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSettlements = async () => {
      try {
        const response = await api.getSettlements(groupName)
        setSettlements(response.settlements || [])
      } catch (err) {
        setError("Failed to load settlements")
      } finally {
        setLoading(false)
      }
    }

    fetchSettlements()
  }, [groupName])

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
        <h1 className="text-2xl font-bold mb-6">Settlements for {groupName}</h1>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <p>Loading settlements...</p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Your Settlements</CardTitle>
            </CardHeader>
            <CardContent>
              {settlements.length > 0 ? (
                <ul className="space-y-2">
                  {settlements.map((settlement, index) => (
                    <li key={index} className="p-2 border rounded">
                      {settlement.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No settlements needed. Everyone is square!</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

