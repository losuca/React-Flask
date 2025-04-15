import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

// Auth endpoints
export const checkAuthStatus = async () => {
  const response = await api.get("/auth/status")
  return response.data
}

export const login = async (username: string, password: string) => {
  const response = await api.post("/", { username, password })
  return response.data
}

export const register = async (username: string, password: string) => {
  const response = await api.post("/register", { username, password })
  return response.data
}

export const logout = async () => {
  const response = await api.get("/logout")
  return response.data
}

// Group endpoints
export const getAllGroups = async () => {
  const response = await api.get("/groups/all")
  return response.data
}

export const getGroups = async () => {
  const response = await api.get("/home")
  return response.data
}

export const createGroup = async (groupName: string) => {
  const response = await api.post("/create_group", { group_name: groupName })
  return response.data
}

export const setupGroup = async (groupName: string, playerName?: string) => {
  if (playerName) {
    const response = await api.post(`/setup_group/${groupName}`, { player_name: playerName })
    return response.data
  }
  const response = await api.get(`/setup_group/${groupName}`)
  return response.data
}

export const findGroup = async (groupName: string) => {
  const response = await api.post("/find_group", { group_name: groupName })
  return response.data
}

export const joinGroup = async (groupName: string, playerId?: string, code?: string) => {
  if (playerId) {
    const response = await api.post(`/join_group/${groupName}`, { selected_player: playerId })
    return response.data
  }
  // If code is provided, add it as a query parameter
  let url = `/join_group/${groupName}`;
  if (code) {
    url += `?code=${code}`;
  }
  
  const response = await api.get(url)
  return response.data
}

export const getGroupDashboard = async (groupName: string) => {
  const response = await api.get(`/group/${groupName}/dashboard`)
  return response.data
}

// Session endpoints
export const addSession = async (groupName: string, sessionData: any) => {
  const response = await api.post(`/add_session/${groupName}`, sessionData)
  return response.data
}

export const viewSession = async (groupName: string, sessionId: number) => {
  const response = await api.get(`/group/${groupName}/session/${sessionId}`)
  return response.data
}

export const getSettlements = async (groupName: string) => {
  const response = await api.get(`/settlements/${groupName}`)
  return response.data
}

export const markSettlementAsSettled = async (groupName: string, settlementId: string) => {
  const response = await api.post(`/settlements/${groupName}/settle`, { settlementId })
  return response.data
}

// Player endpoints
export const addPlayer = async (groupName: string, playerName: string) => {
  const response = await api.post(`/add_player/${groupName}`, { player_name: playerName })
  return response.data
}

export const removePlayer = async (groupName: string, playerId: number) => {
  const response = await api.post(`/remove_player/${groupName}/${playerId}`)
  return response.data
}

export const getPlayerStats = async (playerId: number) => {
  const response = await api.get(`/player/${playerId}/stats`)
  return response.data
}

export const removeGroup = async (groupName: string) => {
  const response = await api.post(`/remove_group/${groupName}`)
  return response.data
}

export const removeSession = async (groupName: string, sessionId: number) => {
  const response = await api.post(`/remove_session/${groupName}/${sessionId}`)
  return response.data
}

export const leaveGroup = async (groupName: string) => {
  const response = await api.post(`/leave_group/${groupName}`)
  return response.data
}
