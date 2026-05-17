export function updateChannelTrust(currentTrust, signal) {
  const SIGNAL_WEIGHTS = {
    watch_full: +10,      // Watched to completion → very relevant
    watch: +5,            // Started watching → somewhat relevant
    click_away_fast: -8,  // Left immediately → was bait
    not_interested: -15,  // Explicitly rejected
    skip: -3,             // Scrolled past → mildly irrelevant
  };
  
  const delta = SIGNAL_WEIGHTS[signal] || 0;
  return Math.max(0, Math.min(100, currentTrust + delta));
}
