'use client'

import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

export default function LogoutButton() {
  const router = useRouter()

  function handleLogout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    Cookies.remove('access_token')
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-gray-600 hover:text-red-600 font-medium transition-colors"
    >
      Sign out
    </button>
  )
}
