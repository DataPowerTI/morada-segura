import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Calculate date 60 days ago
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    const cutoffDate = sixtyDaysAgo.toISOString()

    console.log(`[cleanup-old-photos] Starting cleanup for photos older than: ${cutoffDate}`)

    // Find parcels with photos older than 60 days
    const { data: oldParcels, error: fetchError } = await supabase
      .from('parcels')
      .select('id, photo_url, arrived_at')
      .not('photo_url', 'is', null)
      .lt('arrived_at', cutoffDate)

    if (fetchError) {
      console.error('[cleanup-old-photos] Error fetching old parcels:', fetchError)
      throw fetchError
    }

    if (!oldParcels || oldParcels.length === 0) {
      console.log('[cleanup-old-photos] No old photos to clean up')
      return new Response(
        JSON.stringify({ message: 'No old photos to clean up', deleted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[cleanup-old-photos] Found ${oldParcels.length} parcels with old photos`)

    let deletedCount = 0
    const errors: string[] = []

    for (const parcel of oldParcels) {
      try {
        // Extract file path from the signed URL or stored path
        // The photo_url is a signed URL, we need to extract the file path
        const photoUrl = parcel.photo_url
        
        // Extract the file path from the URL
        // Format: .../object/sign/photos/filename?token=...
        const match = photoUrl.match(/\/photos\/([^?]+)/)
        
        if (match && match[1]) {
          const filePath = match[1]
          console.log(`[cleanup-old-photos] Deleting file: ${filePath}`)

          // Delete from storage
          const { error: storageError } = await supabase.storage
            .from('photos')
            .remove([filePath])

          if (storageError) {
            console.error(`[cleanup-old-photos] Error deleting file ${filePath}:`, storageError)
            errors.push(`Failed to delete storage file for parcel ${parcel.id}: ${storageError.message}`)
          } else {
            // Update parcel to remove photo_url
            const { error: updateError } = await supabase
              .from('parcels')
              .update({ photo_url: null })
              .eq('id', parcel.id)

            if (updateError) {
              console.error(`[cleanup-old-photos] Error updating parcel ${parcel.id}:`, updateError)
              errors.push(`Failed to update parcel ${parcel.id}: ${updateError.message}`)
            } else {
              deletedCount++
              console.log(`[cleanup-old-photos] Successfully cleaned up parcel ${parcel.id}`)
            }
          }
        } else {
          console.warn(`[cleanup-old-photos] Could not extract file path from URL for parcel ${parcel.id}`)
          errors.push(`Could not extract file path for parcel ${parcel.id}`)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error(`[cleanup-old-photos] Error processing parcel ${parcel.id}:`, err)
        errors.push(`Error processing parcel ${parcel.id}: ${errorMessage}`)
      }
    }

    const result = {
      message: `Cleanup completed`,
      totalFound: oldParcels.length,
      deleted: deletedCount,
      errors: errors.length > 0 ? errors : undefined
    }

    console.log('[cleanup-old-photos] Cleanup result:', result)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[cleanup-old-photos] Fatal error:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
