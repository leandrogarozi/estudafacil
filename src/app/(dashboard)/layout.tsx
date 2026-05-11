import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { NavSidebar } from "@/components/nav-sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="flex h-screen overflow-hidden">
      <NavSidebar
        userName={session.user?.name ?? "Usuário"}
        userEmail={session.user?.email ?? undefined}
        userRole={session.user?.role}
      />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        {children}
      </main>
    </div>
  )
}
