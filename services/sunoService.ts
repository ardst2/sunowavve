
import { API_BASE_URL, SUNOAPI_ORG_URL } from '../constants';
import { GenerateRequest, UploadCoverRequest, ApiResponse, Song, GeneratePersonaRequest, ExtendRequest, ApiProvider } from '../types';

// Configuration helpers
const getProvider = (): ApiProvider => {
  return (localStorage.getItem('suno_provider') as ApiProvider) || 'kie';
};

const getBaseUrl = (): string => {
  const provider = getProvider();
  if (provider === 'sunoapi.org') {
    return SUNOAPI_ORG_URL;
  }
  return API_BASE_URL; // Default for KIE
};

const getHeaders = () => {
  const apiKey = localStorage.getItem('suno_api_key') || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };
};

// Helper to prevent circular structure errors during fetch
const safeStringify = (data: any) => {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.error("JSON Serialization Error:", error);
    throw new Error("Failed to serialize request data. Please check input parameters.");
  }
};

export const generateMusic = async (data: GenerateRequest): Promise<string> => {
  const baseUrl = getBaseUrl();

  const payload: any = {
    ...data,
    prompt: data.customMode && !data.instrumental && data.lyrics ? data.lyrics : data.prompt
  };

  if ('lyrics' in payload) delete payload.lyrics;
  if (payload.styleWeight) payload.styleWeight = Number(payload.styleWeight);
  if (payload.weirdnessConstraint) payload.weirdnessConstraint = Number(payload.weirdnessConstraint);

  const response = await fetch(`${baseUrl}/generate`, {
    method: 'POST',
    headers: getHeaders(),
    body: safeStringify(payload)
  });

  const resData: ApiResponse = await response.json();
  if (resData.code !== 200) throw new Error(resData.msg || 'Generation failed');
  return resData.data.taskId;
};

export const extendAudio = async (data: ExtendRequest): Promise<string> => {
  const baseUrl = getBaseUrl();
  const payload: any = { ...data };
  if (!payload.callBackUrl) payload.callBackUrl = 'https://sunowave.app/api/webhook';
  
  const response = await fetch(`${baseUrl}/generate/extend-audio`, {
    method: 'POST',
    headers: getHeaders(),
    body: safeStringify(payload)
  });

  const resData: ApiResponse = await response.json();
  if (resData.code !== 200) throw new Error(resData.msg || 'Extension failed');
  return resData.data.taskId;
};

export const uploadAndCover = async (data: UploadCoverRequest): Promise<string> => {
  const baseUrl = getBaseUrl();
  const payload: any = { ...data };
  
  if (payload.styleWeight) payload.styleWeight = Number(payload.styleWeight);
  if (payload.weirdnessConstraint) payload.weirdnessConstraint = Number(payload.weirdnessConstraint);
  if (payload.audioWeight) payload.audioWeight = Number(payload.audioWeight);

  const response = await fetch(`${baseUrl}/generate/upload-cover`, {
    method: 'POST',
    headers: getHeaders(),
    body: safeStringify(payload)
  });

  const resData: ApiResponse = await response.json();
  if (resData.code !== 200) {
    throw new Error(resData.msg || 'Cover generation failed');
  }
  return resData.data.taskId;
};

export const createPersona = async (data: GeneratePersonaRequest): Promise<string> => {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/generate/generate-persona`, {
    method: 'POST',
    headers: getHeaders(),
    body: safeStringify(data)
  });

  const resData: ApiResponse = await response.json();
  if (resData.code !== 200) {
    throw new Error(resData.msg || 'Persona generation failed');
  }
  return resData.data.personaId;
};

// Polling for task details
export const getTaskDetails = async (taskId: string): Promise<Song[] | null> => {
  const baseUrl = getBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/generate/record-info?taskId=${taskId}`, {
        method: 'GET',
        headers: getHeaders(),
    });
    
    if (!response.ok) return null;
    
    const resData: any = await response.json();
    
    if (resData.code === 200 && resData.data) {
        const dataObj = resData.data;
        let status = dataObj.status || 'queue';
        
        // Handle callbacks logic from both KIE and SunoAPI.org
        if (dataObj.callbackType === 'complete') status = 'SUCCESS';
        else if (dataObj.callbackType === 'first') status = 'FIRST_SUCCESS';
        else if (dataObj.callbackType === 'error') status = 'FAILED';
        
        const isFailure = status.includes('FAILED') || status.includes('ERROR');
        const sunoData = dataObj.response?.sunoData || (Array.isArray(dataObj.data) ? dataObj.data : []) || [];

        if (isFailure && sunoData.length === 0) {
            return [{
                id: taskId, title: "Generation Failed", image_url: "", audio_url: "", duration: 0,
                tags: dataObj.errorMessage || "Error", prompt: "Error", model_name: "Error",
                createTime: new Date().toISOString(), status: 'error', taskId: taskId
            }];
        }

        let appStatus: Song['status'] = 'queue';
        if (status === 'SUCCESS' || dataObj.callbackType === 'complete') appStatus = 'complete';
        else if (status === 'FIRST_SUCCESS' || dataObj.callbackType === 'first') appStatus = 'streaming';
        else if (isFailure) appStatus = 'error';
        else if (status === 'TEXT_SUCCESS' || dataObj.callbackType === 'text') appStatus = 'submitted';
        
        return sunoData.map((item: any) => ({
            id: item.id,
            title: item.title || "Untitled",
            image_url: item.imageUrl || item.image_url,
            audio_url: item.audioUrl || item.audio_url,
            video_url: item.videoUrl || item.video_url || "", 
            stream_audio_url: item.streamAudioUrl || item.stream_audio_url,
            duration: item.duration,
            tags: item.tags,
            prompt: item.prompt,
            model_name: item.modelName || item.model_name,
            createTime: item.createTime,
            status: appStatus,
            taskId: taskId 
        }));
    } else if (resData.code !== 200) {
            return [{
            id: taskId, title: "API Error", image_url: "", audio_url: "", duration: 0,
            tags: resData.msg, prompt: "", model_name: "Error", createTime: new Date().toISOString(), status: 'error', taskId: taskId
        }];
    }
    
    return [];
  } catch (e) {
    console.warn("Polling error details:", e);
  }
  return null;
};
