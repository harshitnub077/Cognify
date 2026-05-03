async function classify(video, profile) {
  if (!profile || !profile.interests) {
    return { verdict: 'ALLOW', layer: 0, confidence: 1, reason: 'No profile' };
  }

  // LAYER 1: Channel Trust Whitelist
  const channelLower = video.channel.toLowerCase();
  const trust = profile.channelTrust?.[channelLower] ?? 50;
  if (trust >= 80) {
    return { verdict: 'ALLOW', layer: 1, confidence: 1, reason: 'High channel trust', topicMatch: 'None' };
  }

  // LAYER 2: Blocked Topics / Low Trust Channels
  if (trust <= 20) {
    return { verdict: 'BLOCK', layer: 2, confidence: 1, reason: 'Low channel trust', topicMatch: 'None' };
  }

  const titleLower = video.title.toLowerCase();
  if (profile.blockedTopics) {
    for (const term of profile.blockedTopics) {
      if (titleLower.includes(term.toLowerCase())) {
        return { verdict: 'BLOCK', layer: 2, confidence: 0.9, reason: 'Matched blocked topic', topicMatch: term };
      }
    }
  }

  // LAYER 3: Title Keyword Scan (AI Pre-generated Keywords)
  const interestKeywords = profile.interestKeywords || {};
  
  for (const interest of profile.interests) {
    const topic = interest.topic;
    
    // Fallback to basic topic name if AI keywords don't exist
    let keywords = interestKeywords[topic];
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      keywords = [topic.toLowerCase()];
    }

    // Match keywords case-insensitively
    for (const keyword of keywords) {
      if (titleLower.includes(keyword)) {
        return { verdict: 'ALLOW', layer: 3, confidence: 0.85, reason: 'Title matched pre-generated interest keyword', topicMatch: topic };
      }
    }
  }

  // LAYER 4: Confirmed Topics
  if (profile.confirmedTopics) {
    for (const term of profile.confirmedTopics) {
      if (titleLower.includes(term.toLowerCase())) {
        return { verdict: 'ALLOW', layer: 4, confidence: 0.8, reason: 'Matched confirmed topic', topicMatch: term };
      }
    }
  }

  // LAYER 5: Server-side AI Classification Proxy
  try {
    const response = await fetch('http://localhost:3001/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoMetadata: video, profileSnapshot: profile })
    });
    
    if (response.ok) {
      const result = await response.json();
      return { 
        verdict: result.verdict, 
        layer: 5, 
        confidence: result.confidence, 
        reason: result.reason, 
        topicMatch: result.topicMatch 
      };
    }
  } catch (err) {
    console.warn('[FeedShift] AI Classification failed, falling back to ALLOW', err);
  }

  return { verdict: 'ALLOW', layer: 0, confidence: 0, reason: 'Default fallback', topicMatch: 'None' };
}
