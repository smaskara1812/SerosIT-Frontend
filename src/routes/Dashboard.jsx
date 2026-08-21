import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-xl">Welcome, {user?.username}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This is the SerosIT dashboard. More sections — Masters, User Rights,
          Audit Trail — will land here as they're built.
        </p>
      </CardContent>
    </Card>
  )
}
