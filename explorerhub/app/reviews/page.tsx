"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"

interface Review {
  id: number
  business_id: number
  user_id: string
  user_name: string
  rating: number
  title: string
  text: string
  images?: string[]
  helpful_count: number
  created_at: string
}

export default function ReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [businessNames, setBusinessNames] = useState<Record<number, string>>({})
  const [businessImages, setBusinessImages] = useState<Record<number, string>>({})

  useEffect(() => {
    const fetchMyReviews = async () => {
      try {
        setIsLoading(true)
        const token = localStorage.getItem("token")
        if (!token) {
          // redirect to login if not authenticated
          router.push("/sign-in")
          return
        }
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
        const res = await fetch(`${baseUrl}/api/reviews/user/my-reviews`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error("No se pudieron cargar tus reseñas")
        const data: Review[] = await res.json()
        setReviews(data)

        // Fetch business names for each unique business_id
        const uniqueIds = Array.from(new Set(data.map(r => r.business_id)))
        const nameEntries: Array<[number, string]> = []
        const imageEntries: Array<[number, string]> = []
        await Promise.all(
          uniqueIds.map(async (bid) => {
            try {
              const bRes = await fetch(`${baseUrl}/api/businesses/${bid}`)
              if (bRes.ok) {
                const b = await bRes.json()
                nameEntries.push([bid, b.name])
                const img =
                  b.cover_image ||
                  (Array.isArray(b.images) && b.images.length > 0 ? b.images[0] : null) ||
                  (Array.isArray(b.photos) && b.photos.length > 0 ? b.photos[0] : null)
                if (img) imageEntries.push([bid, img])
              }
            } catch {}
          })
        )
        setBusinessNames(prev => ({ ...prev, ...Object.fromEntries(nameEntries) }))
        setBusinessImages(prev => ({ ...prev, ...Object.fromEntries(imageEntries) }))
      } catch (e: any) {
        setError(e.message || "Error desconocido")
      } finally {
        setIsLoading(false)
      }
    }
    fetchMyReviews()
  }, [router])

  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-8 flex-1 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4">Mis Reseñas</h1>
        {isLoading ? (
          <div className="py-10 text-center">Cargando...</div>
        ) : error ? (
          <div className="py-10 text-center text-red-600">{error}</div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-lg p-6 text-center shadow">
            <p className="mb-4">Aún no has escrito reseñas todavia</p>
            <Button onClick={() => router.push('/explore')}>Explorar actividades</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="bg-white rounded-lg p-4 shadow">
                <div className="flex gap-4">
                  <button
                    className="shrink-0 w-20 h-20 rounded-md overflow-hidden border border-gray-200 hover:opacity-90"
                    onClick={() => router.push(`/activity/${r.business_id}`)}
                    title="Ver actividad"
                  >
                    {businessImages[r.business_id] ? (
                      <img
                        src={businessImages[r.business_id]}
                        alt={businessNames[r.business_id] ?? `Negocio #${r.business_id}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                        Sin imagen
                      </div>
                    )}
                  </button>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        className="font-semibold text-left hover:underline"
                        onClick={() => router.push(`/activity/${r.business_id}`)}
                        title="Ver actividad"
                      >
                        {businessNames[r.business_id] ?? `Negocio #${r.business_id}`}
                      </button>
                      <div className="text-sm text-gray-500">
                        {new Date(r.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={`inline-block w-3 h-3 rounded-full ${i < Math.floor(r.rating) ? 'bg-yellow-500' : 'bg-gray-300'}`} />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">{r.rating.toFixed(1)}</span>
                    </div>
                    {r.title && <div className="font-medium mb-1">{r.title}</div>}
                    <p className="text-sm text-gray-700">{r.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}