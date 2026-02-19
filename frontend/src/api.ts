// Re-export all API functions from the modular api/ directory for backwards compatibility
export {
  API_BASE_URL,
  classifyAudio,
  classifyAudioLocal,
  getModelStatus,
  getPrompts,
  analyzeYouTube,
  prepareYouTubeVideo,
  getVideoStreamUrl,
  cleanupVideo,
  analyzeUrl,
  prepareMedia,
  getAudioStreamUrl,
  audioSamplesToWavBlob,
  resampleAudio,
} from "./api/index";
