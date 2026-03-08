/**
 * Meta API integration for ad set budget management
 * 
 * CURRENT STATUS: LIVE
 * Uses real Meta Graph API calls
 */

import { fetchAdSetDetails, updateAdSetBudget as graphUpdateBudget } from '@/app/lib/meta/graph-api'

export async function fetchMetaAdSetBudget(adSetId: string): Promise<number> {
  console.log(`[LIVE] Fetching budget for Ad Set: ${adSetId}`)
  
  const adSetDetails = await fetchAdSetDetails(adSetId)
  
  if (!adSetDetails || !adSetDetails.daily_budget) {
    console.error(`Failed to fetch budget for ad set ${adSetId}`)
    throw new Error(`Could not fetch budget for ad set ${adSetId}`)
  }
  
  // Meta returns budget in cents, convert to dollars
  const budgetDollars = parseFloat(adSetDetails.daily_budget) / 100
  console.log(`[LIVE] Ad Set ${adSetId} current budget: $${budgetDollars}`)
  
  return budgetDollars
}

export async function updateMetaAdSetBudget(
  adSetId: string,
  newBudget: number
): Promise<{ success: boolean; simulated: boolean; message: string; adSetId: string; newBudget: number }> {
  console.log(`[LIVE] Updating Ad Set ${adSetId} to $${newBudget}`)
  
  // Convert dollars to cents for Meta API
  const newBudgetCents = Math.round(newBudget * 100)
  
  const result = await graphUpdateBudget(adSetId, newBudgetCents)
  
  if (!result.success) {
    console.error(`Failed to update budget for ad set ${adSetId}: ${result.error}`)
    return {
      success: false,
      simulated: false,
      message: result.error || 'Failed to update budget',
      adSetId,
      newBudget
    }
  }
  
  console.log(`[LIVE] Successfully updated Ad Set ${adSetId} to $${newBudget}`)
  
  return {
    success: true,
    simulated: false,
    message: 'Live budget update successful',
    adSetId,
    newBudget
  }
}