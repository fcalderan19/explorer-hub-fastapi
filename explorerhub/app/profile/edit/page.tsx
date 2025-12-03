"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Loader2, User } from "lucide-react"
import Link from "next/link"

const travelPreferences = [
  { id: "adventure", label: "Aventura" },
  { id: "culture", label: "Cultura" },
  { id: "gastronomy", label: "Gastronomía" },
  { id: "relax", label: "Relax" },
  { id: "nature", label: "Naturaleza" },
]

const languages = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "pt", label: "Portugués" },
  { value: "fr", label: "Francés" },
  { value: "de", label: "Alemán" },
]

export default function EditProfile() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [userRole, setUserRole] = useState<"traveler" | "business" | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    country: "",
    date_of_birth: "",
    language: "",
    travel_preferences: [] as string[],
  })

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/sign-in")
      return
    }
    const parsedUser = JSON.parse(userData)
    setUserRole(parsedUser.role)
    
    setFormData({
      name: parsedUser.full_name || parsedUser.name || "",
      email: parsedUser.email || "",
      country: parsedUser.country || "",
      date_of_birth: parsedUser.birth_date || parsedUser.date_of_birth || "",
      language: parsedUser.language || "es",
      travel_preferences: parsedUser.preferences || parsedUser.travel_preferences || [],
    })
  }, [router])

  const handlePreferenceChange = (preferenceId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      travel_preferences: checked
        ? [...prev.travel_preferences, preferenceId]
        : prev.travel_preferences.filter((p) => p !== preferenceId),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess(false)

    // Validate age (18+)
    if (formData.date_of_birth) {
      const birthDate = new Date(formData.date_of_birth)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      
      if (age < 18) {
        setError("Debe ser mayor de 18 años")
        setIsLoading(false)
        return
      }
      
      if (birthDate > today) {
        setError("La fecha de nacimiento no puede estar en el futuro")
        setIsLoading(false)
        return
      }
    }

    try {
      // Call backend API to update profile
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No token found")
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/profile/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            full_name: formData.name,
            country: formData.country,
            birth_date: formData.date_of_birth,
            language: formData.language,
            preferences: formData.travel_preferences,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Error al actualizar el perfil")
      }

      const updatedUser = await response.json()

      // Update local storage with response from backend
      const userData = localStorage.getItem("user")
      if (userData) {
        const parsedUser = JSON.parse(userData)
        const newUserData = { 
          ...parsedUser, 
          ...updatedUser,
          full_name: updatedUser.full_name,
          name: updatedUser.full_name,
          country: updatedUser.country,
          birth_date: updatedUser.birth_date,
          date_of_birth: updatedUser.birth_date,
          language: updatedUser.language,
          preferences: updatedUser.preferences,
          travel_preferences: updatedUser.preferences,
        }
        localStorage.setItem("user", JSON.stringify(newUserData))
      }

      setSuccess(true)
      setTimeout(() => {
        if (userRole === "business") {
          router.push("/dashboard/business")
        } else {
          router.push("/profile/traveler")
        }
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar el perfil")
    } finally {
      setIsLoading(false)
    }
  }

  const getBackLink = () => {
    return userRole === "business" ? "/dashboard/business" : "/profile/traveler"
  }

  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        backgroundImage: 'url(/images/background-login.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="w-full max-w-2xl relative">
        <Button variant="ghost" asChild className="mb-6 bg-white/90 hover:bg-white">
          <Link href={getBackLink()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver {userRole === "business" ? "al panel" : ""}
          </Link>
        </Button>

        <Card className="backdrop-blur-sm bg-background/95">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Editar Perfil</CardTitle>
            <CardDescription className="text-center">
              Actualiza tu información personal
              {userRole === "traveler" && " y preferencias de viaje"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {success && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription className="text-green-800">
                    ¡Perfil actualizado exitosamente! Redirigiendo...
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">País de residencia</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Fecha de nacimiento</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Debes tener al menos 18 años
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Idioma preferido</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => setFormData({ ...formData, language: value })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un idioma" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {userRole === "traveler" && (
                <div className="space-y-3">
                  <Label>Preferencias de viaje</Label>
                  <div className="space-y-2">
                    {travelPreferences.map((pref) => (
                      <div key={pref.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={pref.id}
                          checked={formData.travel_preferences.includes(pref.id)}
                          onCheckedChange={(checked) => handlePreferenceChange(pref.id, checked as boolean)}
                          disabled={isLoading}
                        />
                        <Label htmlFor={pref.id} className="font-normal cursor-pointer">
                          {pref.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
                <Button type="button" variant="outline" asChild className="flex-1 bg-transparent" disabled={isLoading}>
                  <Link href={getBackLink()}>Cancelar</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
