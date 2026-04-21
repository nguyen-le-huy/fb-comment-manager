export interface AuthUser {
  id: string
  name: string
  email?: string
  avatar?: string
}

export interface JwtPayload {
  sub: string
  facebookId: string
}
