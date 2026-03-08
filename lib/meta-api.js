export async function fetchMetaAdSetBudget(adSetId) {
  console.warn(`[SIMULATED] Fetching budget for Ad Set: ${adSetId}`);
  return 100.00;
}

export async function updateMetaAdSetBudget(adSetId, newBudget) {
  console.warn(`[SIMULATED] Would update Ad Set ${adSetId} to $${newBudget}`);
  return {
    success: true,
    simulated: true,
    message: 'Simulated budget update - no real Meta API call made',
    adSetId,
    newBudget
  };
}