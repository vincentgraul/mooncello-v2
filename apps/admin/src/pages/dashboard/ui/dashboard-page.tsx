import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'

export function DashboardPage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient.getHealth(),
  })

  return (
    <main>
      <h1>Mooncello</h1>
      {isPending && <p>Connexion à l'API…</p>}
      {isError && <p>API injoignable</p>}
      {data && <p>API : {data.status}</p>}
    </main>
  )
}
