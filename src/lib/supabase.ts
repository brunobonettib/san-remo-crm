import { createClient } from '@supabase/supabase-js'

const getRequiredEnv = (name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_PUBLISHABLE_KEY') => {
  const value = import.meta.env[name]

  if (!value?.trim()) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`)
  }

  return value
}

const supabaseUrl = getRequiredEnv('VITE_SUPABASE_URL')
const supabasePublishableKey = getRequiredEnv('VITE_SUPABASE_PUBLISHABLE_KEY')

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
