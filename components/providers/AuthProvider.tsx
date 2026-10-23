'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
}

export function AuthProvider({ children }: Props) {
  return <>{children}</>
}
