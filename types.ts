
export type ApiProvider = 'kie' | 'sunoapi.org';

export interface Song {
  id: string;
  title: string;
  image_url: string;
  audio_url: string;
  video_url?: string; // New Field for video
  stream_audio_url?: string;
  duration: number;
  tags: string;
  prompt: string;
  model_name: string;
  createTime: string;
  status?: 'submitted' | 'queue' | 'streaming' | 'complete' | 'error' | 'pending';
  taskId?: string;
  isLiked?: boolean;
  type?: 'original' | 'cover';
}

export interface GenerateRequest {
  prompt: string;
  customMode: boolean;
  instrumental: boolean;
  model: 'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS' | 'V5';
  callBackUrl: string;
  // Custom Mode specific
  style?: string;
  title?: string;
  lyrics?: string; // Mapped to 'prompt' in custom mode
  negativeTags?: string;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
  personaId?: string;
}

export interface ExtendRequest {
  audioId: string;
  prompt: string;
  continueAt: number;
  model: 'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS' | 'V5';
  callBackUrl: string;
  tags?: string;
  title?: string;
  instrumental?: boolean; // Sometimes supported
}

export interface UploadCoverRequest {
  uploadUrl: string;
  prompt: string; // Used as prompt or lyrics depending on custom mode
  customMode: boolean;
  instrumental: boolean;
  model: 'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS' | 'V5';
  callBackUrl: string;
  style?: string;
  title?: string;
  negativeTags?: string;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  personaId?: string;
}

export interface GeneratePersonaRequest {
  taskId: string;
  audioId: string;
  name: string;
  description: string;
}

export interface ApiResponse {
  code: number;
  msg: string;
  data: any; 
}

// Based on OpenAPI /api/v1/generate/record-info
export interface RecordInfoResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status: 'PENDING' | 'TEXT_SUCCESS' | 'FIRST_SUCCESS' | 'SUCCESS' | 'CREATE_TASK_FAILED' | 'GENERATE_AUDIO_FAILED' | 'CALLBACK_EXCEPTION' | 'SENSITIVE_WORD_ERROR';
    response?: {
      sunoData?: Array<{
        id: string;
        audioUrl: string;
        videoUrl?: string; // New Field from API
        streamAudioUrl: string;
        imageUrl: string;
        prompt: string;
        modelName: string;
        title: string;
        tags: string;
        createTime: string;
        duration: number;
      }>
    };
    errorMessage?: string;
  };
}
