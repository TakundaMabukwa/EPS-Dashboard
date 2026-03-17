import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions/permissions'
import { createClient } from '@/lib/supabase/client'

export async function migrateUserPermissions() {
  const supabase = createClient()

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, role, permissions')
    .is('permissions', null)

  if (error) {
    throw error
  }

  if (!users?.length) {
    return 0
  }

  for (const user of users) {
    const permissions =
      user.email === 'admin@eps.com'
        ? DEFAULT_ROLE_PERMISSIONS.admin
        : DEFAULT_ROLE_PERMISSIONS[user.role] || []

    const { error: updateError } = await supabase
      .from('users')
      .update({ permissions })
      .eq('id', user.id)

    if (updateError) {
      throw updateError
    }
  }

  return users.length
}
