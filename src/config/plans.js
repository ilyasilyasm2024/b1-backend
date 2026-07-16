const PLAN_LIMITS = {
  beta: {
    modelTests: 15,
    vocabularyCapacity: -1,
    schreibenSaves: -1,
    sprechenRecordings: -1,
    aiTranslationsPerDay: -1,
    chatMessages: -1,
    progressSync: true,
    textHighlighting: true,
    audioRecording: true,
    audioTranscript: true,
    adFree: true,
    contextSentences: true,
    advancedSuggestions: true,
  },
  free: {
    modelTests: 1,
    vocabularyCapacity: 50,
    schreibenSaves: 2,
    sprechenRecordings: 2,
    aiTranslationsPerDay: 50,
    chatMessages: 20,
    progressSync: false,
    textHighlighting: false,
    audioRecording: true,
    audioTranscript: false,
    adFree: false,
    contextSentences: false,
    advancedSuggestions: false,
  },
  silver: {
    modelTests: 5,
    vocabularyCapacity: 500,
    schreibenSaves: 4,
    sprechenRecordings: 4,
    aiTranslationsPerDay: -1,
    chatMessages: 500,
    progressSync: true,
    textHighlighting: true,
    audioRecording: true,
    audioTranscript: false,
    adFree: true,
    contextSentences: false,
    advancedSuggestions: false,
  },
  gold: {
    modelTests: 15,
    vocabularyCapacity: 2500,
    schreibenSaves: 15,
    sprechenRecordings: 15,
    aiTranslationsPerDay: -1,
    chatMessages: 1000,
    progressSync: true,
    textHighlighting: true,
    audioRecording: true,
    audioTranscript: false,
    adFree: true,
    contextSentences: true,
    advancedSuggestions: false,
  },
  platinum: {
    modelTests: 15,
    vocabularyCapacity: -1,
    schreibenSaves: 60,
    sprechenRecordings: 60,
    aiTranslationsPerDay: -1,
    chatMessages: -1,
    progressSync: true,
    textHighlighting: true,
    audioRecording: true,
    audioTranscript: true,
    adFree: true,
    contextSentences: true,
    advancedSuggestions: true,
  },
  lifetime: {
    modelTests: 15,
    vocabularyCapacity: -1,
    schreibenSaves: 60,
    sprechenRecordings: 60,
    aiTranslationsPerDay: -1,
    chatMessages: -1,
    progressSync: true,
    textHighlighting: true,
    audioRecording: true,
    audioTranscript: true,
    adFree: true,
    contextSentences: true,
    advancedSuggestions: true,
  },
};

// Monthly prices in MAD (used for affiliate commission calculation).
// "lifetime" is a one-time price.
const PLAN_PRICES = {
  silver: 30,
  gold: 50,
  platinum: 70,
  lifetime: 300,
};

function getPlanPrice(planName) {
  return PLAN_PRICES[planName] || 0;
}

function getPlanLimits(planName) {
  return PLAN_LIMITS[planName] || PLAN_LIMITS.free;
}

function isExpired(user) {
  if (!user.subscriptionExpiresAt) return false;
  if (user.plan === 'free' || user.plan === 'lifetime') return false;
  return new Date(user.subscriptionExpiresAt) < new Date();
}

function getEffectivePlan(user) {
  if (isExpired(user)) return 'free';
  return user.plan || 'beta';
}

module.exports = { PLAN_LIMITS, PLAN_PRICES, getPlanPrice, getPlanLimits, isExpired, getEffectivePlan };
