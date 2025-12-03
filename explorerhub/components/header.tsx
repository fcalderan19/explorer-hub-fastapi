"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Menu, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NotificationBell } from "@/components/notification-bell"
import { getUser, logout } from "@/lib/auth"
import { getProfilePictureUrl } from "@/lib/utils"
import { useRouter } from "next/navigation"

import styles from "./header.module.css"

export function Header() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const userData = getUser()
    setUser(userData)
  }, [])

  const handleLogout = () => {
    logout()
    setUser(null)
    router.push("/")
  }

  return (
    <header className={styles.root}>
      <div className={styles.container}>
        <div className={styles.left}>
          <Link href="/" className={styles.brandLink}>
            <img 
              src="/images/logo_transparent.png" 
              alt="ExplorerHub Logo" 
              className={styles.brandIcon}
              style={{ height: '2.5rem', width: 'auto' }}
            />
            <span className={styles.brandText}>ExplorerHub</span>
          </Link>

          <nav className={styles.nav}>
            {user && user.role === "business" ? (
              <>
                <Link href="/dashboard/business" className={styles.navLink}>
                  Dashboard
                </Link>
                <Link href="/dashboard/business/bookings" className={styles.navLink}>
                  Reservas
                </Link>
                <Link href="/business/promotions" className={styles.navLink}>
                  Promociones
                </Link>
                <Link href="/dashboard/business/analytics" className={styles.navLink}>
                  Analytics
                </Link>
              </>
            ) : (
              <>
                <Link href="/explore" className={styles.navLink}>
                  Explorar
                </Link>
                {user && (
                  <>
                    <Link href="/trips" className={styles.navLink}>
                      Viajes
                    </Link>
                    <Link href="/community" className={styles.navLink}>
                      Comunidad
                    </Link>
                    <Link href="/reviews" className={styles.navLink}>
                      Reseñas
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>
        </div>

        <div className={styles.right}>
          {user ? (
            <>
              <NotificationBell userRole={user.role} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className={styles.userButton}>
                    <img 
                      src={getProfilePictureUrl(user.profile_picture)}
                      alt={user.username || user.full_name}
                      className={styles.profilePicture}
                    />
                    <span className={styles.userName}>
                      {user.username || user.full_name || user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={styles.dropdownContent}>
                  {user.role === "business" ? (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/business" className={styles.menuItem}>
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/business/promotions" className={styles.menuItem}>
                          Promociones
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/business/analytics" className={styles.menuItem}>
                          Analytics
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/business/edit-profile" className={styles.menuItem}>
                          Perfil
                        </Link>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/favorites" className={styles.menuItem}>
                          Favoritos
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/bookings" className={styles.menuItem}>
                          Reservas
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/trips" className={styles.menuItem}>
                          Viajes
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/reviews" className={styles.menuItem}>
                          Reseñas
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/profile/traveler" className={styles.menuItem}>
                          Perfil
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className={styles.menuItemDestructive}>
                    <LogOut className={styles.menuIcon} />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className={styles.authButtons}>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/sign-in">Iniciar Sesión</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Registrarse</Link>
              </Button>
            </div>
          )}

          <Button variant="ghost" size="icon" className={styles.mobileMenuButton}>
            <Menu className={styles.userIcon} />
          </Button>
        </div>
      </div>
    </header>
  )
}
