import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, UserPlus } from 'lucide-react'
import type { CommunityMember } from '@/types'

interface CommunityFormProps {
  onSubmit: (data: CommunityMember) => void
  isRunning: boolean
}

export function CommunityForm({ onSubmit, isRunning }: CommunityFormProps) {
  const [form, setForm] = useState<CommunityMember>({
    email: '',
    linkedInUrl: '',
    firstName: '',
    lastName: '',
    howICanHelp: '',
    whereINeedHelp: '',
  })

  const update = (field: keyof CommunityMember) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tell us about yourself</CardTitle>
        <CardDescription>
          We'll add you to the community directory so members can find and help each other
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-red-400">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@acme.com"
              value={form.email}
              onChange={update('email')}
              required
              disabled={isRunning}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="Jane"
                value={form.firstName}
                onChange={update('firstName')}
                disabled={isRunning}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Smith"
                value={form.lastName}
                onChange={update('lastName')}
                disabled={isRunning}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedInUrl">LinkedIn URL</Label>
            <Input
              id="linkedInUrl"
              placeholder="https://linkedin.com/in/janesmith"
              value={form.linkedInUrl}
              onChange={update('linkedInUrl')}
              disabled={isRunning}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="howICanHelp">How I can help</Label>
            <Textarea
              id="howICanHelp"
              placeholder="I have experience with product design, fundraising, go-to-market strategy..."
              rows={3}
              value={form.howICanHelp}
              onChange={update('howICanHelp')}
              disabled={isRunning}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whereINeedHelp">Where I could use help</Label>
            <Textarea
              id="whereINeedHelp"
              placeholder="Looking for intros to enterprise buyers, advice on pricing models..."
              rows={3}
              value={form.whereINeedHelp}
              onChange={update('whereINeedHelp')}
              disabled={isRunning}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <UserPlus />
                Join the Community
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
