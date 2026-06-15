import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mfjqsqopopyxtswprwgl.supabase.co'
const supabaseKey = 'sb_publishable_gijhTn6HaJAO1Hze3KDdew_rR7YSJr7'

export const supabase = createClient(supabaseUrl, supabaseKey)