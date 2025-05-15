"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import * as api from "@/lib/api"

interface User {
  id: number
  username: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<{ success: boolean }>
  logout: () => Promise<void>
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const response = await api.checkAuthStatus()
        if (response.authenticated && response.user) {
          setUser(response.user)
        }
      } catch (err) {
        // Not logged in
        console.error("Auth check failed:", err)
      } finally {
        setLoading(false)
      }
    }
  
    checkAuth()
  }, [])

  const login = async (username: string, password: string, rememberMe: boolean = false) => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.login(username, password, rememberMe)
      setUser(response.user)
      router.push("/home")
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const register = async (username: string, password: string): Promise<{ success: boolean }> => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.register(username, password)
      return { success: true}
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed")
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      await api.logout()
      setUser(null)
      router.push("/")
    } catch (err) {
      console.error("Logout failed", err)
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => {
    setError(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, error, clearError }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

