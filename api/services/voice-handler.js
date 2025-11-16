/**
 * Voice Handler for Anchor AI Conversations
 *
 * Integrates:
 * - Whisper API (OpenAI) for speech-to-text
 * - ElevenLabs for text-to-speech (Australian male voice)
 * - AWS Polly as fallback TTS
 *
 * Real-time transcription and audio synthesis
 */

const FormData = require('form-data');

/**
 * Transcribe audio using OpenAI Whisper API
 */
async function transcribeAudio(audioBlob, options = {}) {
  const {
    language = 'en', // English
    prompt = '', // Optional context for better accuracy
    temperature = 0, // 0 = most deterministic
  } = options;

  try {
    // Whisper API expects multipart/form-data
    const formData = new FormData();
    formData.append('file', audioBlob, {
      filename: 'audio.webm', // or .mp3, .m4a, .wav
      contentType: 'audio/webm',
    });
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    formData.append('temperature', temperature);

    if (prompt) {
      formData.append('prompt', prompt);
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Whisper API error:', error);
      throw new Error(`Transcription failed: ${error.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();

    return {
      success: true,
      text: result.text,
      language: language,
      duration: result.duration || null,
    };

  } catch (error) {
    console.error('Error transcribing audio:', error);
    return {
      success: false,
      error: error.message,
      text: null,
    };
  }
}

/**
 * Synthesize speech using ElevenLabs (Australian male voice)
 */
async function synthesizeSpeechElevenLabs(text, options = {}) {
  const {
    voiceId = 'pNInz6obpgDQGcFmaJgB', // Adam - natural male voice
    // For Australian accent, you'd need to:
    // 1. Create custom voice in ElevenLabs with Australian samples
    // 2. Or use voice design feature with "Australian male" prompt
    // 3. Get the voice_id from your ElevenLabs account
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0, // 0 = neutral, 1 = expressive
    speakerBoost = true,
  } = options;

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1', // or 'eleven_multilingual_v2'
        voice_settings: {
          stability: stability,
          similarity_boost: similarityBoost,
          style: style,
          use_speaker_boost: speakerBoost,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs API error:', error);
      throw new Error(`Speech synthesis failed: ${error}`);
    }

    // Response is audio/mpeg binary data
    const audioBuffer = await response.arrayBuffer();

    return {
      success: true,
      audioBuffer: Buffer.from(audioBuffer),
      format: 'mp3',
      provider: 'elevenlabs',
    };

  } catch (error) {
    console.error('Error synthesizing speech (ElevenLabs):', error);
    return {
      success: false,
      error: error.message,
      audioBuffer: null,
    };
  }
}

/**
 * Synthesize speech using AWS Polly (fallback)
 */
async function synthesizeSpeechPolly(text, options = {}) {
  const {
    voiceId = 'Russell', // Australian male voice
    // Other Australian voices: Nicole (female), Russell (male)
    engine = 'neural', // neural or standard
    language = 'en-AU', // Australian English
  } = options;

  // Note: This requires AWS SDK
  // npm install @aws-sdk/client-polly

  try {
    // Placeholder for AWS Polly implementation
    // In production, you would:
    //
    // const { PollyClient, SynthesizeSpeechCommand } = require("@aws-sdk/client-polly");
    //
    // const client = new PollyClient({
    //   region: process.env.AWS_REGION || 'ap-southeast-2',
    //   credentials: {
    //     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    //   },
    // });
    //
    // const command = new SynthesizeSpeechCommand({
    //   Text: text,
    //   OutputFormat: 'mp3',
    //   VoiceId: voiceId,
    //   Engine: engine,
    //   LanguageCode: language,
    // });
    //
    // const response = await client.send(command);
    // const audioBuffer = await streamToBuffer(response.AudioStream);
    //
    // return {
    //   success: true,
    //   audioBuffer: audioBuffer,
    //   format: 'mp3',
    //   provider: 'aws-polly',
    // };

    console.log('AWS Polly synthesis (not implemented):', { text, voiceId });

    return {
      success: false,
      error: 'AWS Polly not configured',
      audioBuffer: null,
    };

  } catch (error) {
    console.error('Error synthesizing speech (AWS Polly):', error);
    return {
      success: false,
      error: error.message,
      audioBuffer: null,
    };
  }
}

/**
 * Main TTS function with fallback
 */
async function synthesizeSpeech(text, options = {}) {
  // Try ElevenLabs first (better quality, Australian voices available)
  if (process.env.ELEVENLABS_API_KEY) {
    const result = await synthesizeSpeechElevenLabs(text, options);
    if (result.success) {
      return result;
    }
    console.warn('ElevenLabs failed, trying AWS Polly...');
  }

  // Fallback to AWS Polly
  if (process.env.AWS_ACCESS_KEY_ID) {
    return await synthesizeSpeechPolly(text, options);
  }

  // No TTS available
  return {
    success: false,
    error: 'No TTS service configured',
    audioBuffer: null,
  };
}

/**
 * Upload audio to storage (Supabase Storage or S3)
 */
async function uploadAudio(audioBuffer, fileName, conversationId) {
  // Use Supabase Storage for audio files
  const { createClient } = require('@supabase/supabase-js');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const filePath = `conversations/${conversationId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('audio') // Bucket name
      .upload(filePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading audio:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('audio')
      .getPublicUrl(filePath);

    return urlData.publicUrl;

  } catch (error) {
    console.error('Error in uploadAudio:', error);
    return null;
  }
}

/**
 * Process user voice input
 * 1. Transcribe audio
 * 2. Store transcription
 * 3. Return text for AI processing
 */
async function processUserVoice(audioBlob, conversationId, messageIndex) {
  try {
    // Transcribe audio
    const transcription = await transcribeAudio(audioBlob, {
      prompt: 'Australian English. User responding to financial accountability questions about gambling addiction recovery.',
    });

    if (!transcription.success) {
      return {
        success: false,
        error: transcription.error,
        text: null,
      };
    }

    // Upload original audio
    const audioUrl = await uploadAudio(
      audioBlob,
      `user_message_${messageIndex}.webm`,
      conversationId
    );

    return {
      success: true,
      text: transcription.text,
      audioUrl: audioUrl,
      duration: transcription.duration,
    };

  } catch (error) {
    console.error('Error processing user voice:', error);
    return {
      success: false,
      error: error.message,
      text: null,
    };
  }
}

/**
 * Process AI voice response
 * 1. Synthesize speech from AI text
 * 2. Upload audio
 * 3. Return audio URL for playback
 */
async function processAIVoice(text, conversationId, messageIndex) {
  try {
    // Synthesize speech
    const synthesis = await synthesizeSpeech(text, {
      voiceId: process.env.TTS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB', // ElevenLabs voice ID
      stability: 0.6, // Slightly more stable for serious conversations
      similarityBoost: 0.8, // Higher similarity for consistency
      style: 0.3, // Slight expressiveness for natural tone
    });

    if (!synthesis.success) {
      console.warn('TTS failed, falling back to text-only');
      return {
        success: false,
        error: synthesis.error,
        audioUrl: null,
        fallbackToText: true,
      };
    }

    // Upload synthesized audio
    const audioUrl = await uploadAudio(
      synthesis.audioBuffer,
      `ai_message_${messageIndex}.mp3`,
      conversationId
    );

    return {
      success: true,
      audioUrl: audioUrl,
      format: synthesis.format,
      provider: synthesis.provider,
      fallbackToText: false,
    };

  } catch (error) {
    console.error('Error processing AI voice:', error);
    return {
      success: false,
      error: error.message,
      audioUrl: null,
      fallbackToText: true,
    };
  }
}

/**
 * Validate audio file format and size
 */
function validateAudioInput(audioBlob) {
  const MAX_SIZE = 25 * 1024 * 1024; // 25MB (Whisper limit)
  const ALLOWED_FORMATS = ['webm', 'mp3', 'm4a', 'wav', 'ogg'];

  if (!audioBlob) {
    return {
      valid: false,
      error: 'No audio provided',
    };
  }

  // Check size
  if (audioBlob.size > MAX_SIZE) {
    return {
      valid: false,
      error: 'Audio file too large (max 25MB)',
    };
  }

  // Check format (basic check)
  // In production, you'd check the actual MIME type
  return {
    valid: true,
  };
}

/**
 * Get audio duration from blob
 * (Requires browser API or ffmpeg on server)
 */
async function getAudioDuration(audioBlob) {
  // This would require ffmpeg or similar
  // For now, return null
  // In production: Use ffprobe or similar to get duration
  return null;
}

module.exports = {
  transcribeAudio,
  synthesizeSpeech,
  synthesizeSpeechElevenLabs,
  synthesizeSpeechPolly,
  processUserVoice,
  processAIVoice,
  uploadAudio,
  validateAudioInput,
};
