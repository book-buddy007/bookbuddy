"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { SidebarProvider } from "@/components/sidebar-provider"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { AdminStateProvider } from "@/hooks/use-admin-state"
import { useAuthStore } from "@/store/useAuthStore"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuthStore()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // NOTE: Auth redirects to /login are handled by middleware.ts (single source of truth).
  // No client-side redirect here — this prevents the infinite loop.

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false)
      } else {
        setIsSidebarOpen(true)
      }
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  // Don't render dashboard if not authenticated
  if (!isAuthenticated && !isLoading) {
    return null
  }

  // Check if current route uses its own layout with sidebar
  const isSuperAdminRoute = pathname?.startsWith('/dashboard/super-admin')
  const isStudentRoute = pathname?.startsWith('/dashboard/student')
  const hasOwnSidebar = isSuperAdminRoute || isStudentRoute

  return (
    <SidebarProvider>
      <AdminStateProvider>
        <div className="flex w-full min-h-screen">
          {/* Only render main sidebar if the route doesn't have its own sidebar */}
          {!hasOwnSidebar && (
            <DashboardSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} isMobile={isMobile} />
          )}
          <div className={`flex flex-col flex-1 min-w-0 w-full transition-all duration-300 ${isSidebarOpen && !isMobile && !hasOwnSidebar ? "lg:ml-64" : ""}`}>
            {children}
          </div>
        </div>
      </AdminStateProvider>
    </SidebarProvider>
  )
}
