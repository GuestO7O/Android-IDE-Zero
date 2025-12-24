import { GoogleGenAI, Modality, Type } from "@google/genai";

export const generateCodeResponse = async (
  prompt: string, 
  currentFileContext: string, 
  usePro: boolean = true,
  useThinking: boolean = true
): Promise<{ text: string; urls: { uri: string; title: string; type: 'web' | 'maps' }[] }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const isLocationQuery = prompt.toLowerCase().includes('waar') || 
                           prompt.toLowerCase().includes('dichtbij') || 
                           prompt.toLowerCase().includes('restaurant') ||
                           prompt.toLowerCase().includes('kaart') ||
                           prompt.toLowerCase().includes('location');

    let modelName: string;
    const tools: any[] = [{ googleSearch: {} }];
    let toolConfig: any = undefined;

    if (isLocationQuery) {
      modelName = 'gemini-2.5-flash';
      tools.push({ googleMaps: {} });
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          }
        };
      } catch (e) {
        console.warn("Location tracking failed, using standard grounding.");
      }
    } else {
      modelName = (usePro || useThinking) ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    }

    // Thinking configuration as per JwP mega-upgrade rules
    const maxBudget = modelName.includes('pro') ? 32768 : 24576;
    const thinkingBudget = useThinking ? maxBudget : (usePro ? 8000 : undefined);

    const fullPrompt = `
      Je bent Agent Zero-DH, de meester-architect van deze mobiele IDE.
      Gebruiker: JwP (Samsung Galaxy S21 Ultra/Termux).
      
      Project Context:
      \`\`\`
      ${currentFileContext}
      \`\`\`
      
      Opdracht: ${prompt}
      
      Richtlijnen:
      1. Communiceer uitsluitend in het Nederlands.
      2. Lever codeblokken met triple backticks.
      3. Gebruik Google Search/Maps voor actuele data.
      4. Wees proactief en lever 'productie-waardige' oplossingen.
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: fullPrompt,
      config: {
        tools: tools,
        toolConfig: toolConfig,
        thinkingConfig: thinkingBudget !== undefined ? { thinkingBudget } : undefined
      },
    });

    const urls: { uri: string; title: string; type: 'web' | 'maps' }[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) urls.push({ uri: chunk.web.uri, title: chunk.web.title, type: 'web' });
        if (chunk.maps) urls.push({ uri: chunk.maps.uri, title: chunk.maps.title, type: 'maps' });
      });
    }

    return { 
      text: response.text || "// Agent Zero is bezig met de verwerking.", 
      urls 
    };
  } catch (error) {
    console.error("Agent Zero Sync Error:", error);
    return { 
      text: `// Fout in cognitieve verbinding: ${error instanceof Error ? error.message : String(error)}`, 
      urls: [] 
    };
  }
};

export const getAiCompletion = async (
  prefix: string,
  suffix: string,
  fileName: string,
  projectContext: string
): Promise<string[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Context-bewuste auto-completion voor IDE.
      Bestand: ${fileName}
      Project: ${projectContext}
      Voor cursor:
      ${prefix}
      Na cursor:
      ${suffix}
      
      Geef 1-3 korte code-suggesties als JSON array van strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    try {
      return JSON.parse(response.text || "[]");
    } catch {
      return [];
    }
  } catch (error) {
    return [];
  }
};

export const generateTTS = async (text: string): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Spreek dit natuurlijk en helder uit: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Protocol Error:", error);
    return null;
  }
};

// Audio Decoding logic for TTS playback
export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
