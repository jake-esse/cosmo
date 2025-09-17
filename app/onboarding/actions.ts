"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function completeEducationAcknowledgment(
  sectionsRead: string[],
  timeSpent: number
) {
  const supabase = await createClient()

  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be logged in to continue")
  }

  // Call the database function to complete education acknowledgment
  const { data, error } = await supabase
    .rpc('complete_education_acknowledgment', {
      p_user_id: user.id,
      p_sections_read: sectionsRead,
      p_time_spent: timeSpent
    })

  if (error) {
    console.error('Education acknowledgment error:', error)
    throw new Error(error.message || 'Failed to save acknowledgment')
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to save acknowledgment')
  }

  // Redirect to onboarding complete page
  redirect('/onboarding/complete')
}

export async function trackSectionRead(
  sectionId: string,
  timeSpent: number
) {
  const supabase = await createClient()

  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "Not authenticated" }
  }

  // Check if acknowledgment record exists
  const { data: existing } = await supabase
    .from('education_acknowledgments')
    .select('id, sections_read, time_spent_seconds')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    // Update existing record
    const currentSections = existing.sections_read as string[] || []
    const updatedSections = currentSections.includes(sectionId)
      ? currentSections
      : [...currentSections, sectionId]

    const { error } = await supabase
      .from('education_acknowledgments')
      .update({
        sections_read: updatedSections,
        time_spent_seconds: (existing.time_spent_seconds || 0) + timeSpent
      })
      .eq('user_id', user.id)

    if (error) {
      console.error('Update section tracking error:', error)
      return { success: false, error: error.message }
    }
  } else {
    // Create new record with first section
    const { error } = await supabase
      .from('education_acknowledgments')
      .insert({
        user_id: user.id,
        sections_read: [sectionId],
        time_spent_seconds: timeSpent,
        all_sections_read: false
      })

    if (error) {
      console.error('Insert section tracking error:', error)
      return { success: false, error: error.message }
    }
  }

  return { success: true }
}

export async function getEducationProgress() {
  const supabase = await createClient()

  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return null
  }

  const { data } = await supabase
    .from('education_acknowledgments')
    .select('sections_read, all_sections_read, time_spent_seconds')
    .eq('user_id', user.id)
    .single()

  return data || {
    sections_read: [],
    all_sections_read: false,
    time_spent_seconds: 0
  }
}