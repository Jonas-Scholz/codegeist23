import OpenAI from "openai";
import { get_encoding } from "@dqbd/tiktoken";

const openai = new OpenAI({
  apiKey: process.env.OPEN_API_KEY,
});

export type Transcription = {
  prediction: {
    speaker: number;
    transcription: string;
  }[];
};

export const transformTranscription = (transcription: Transcription) =>
  transcription.prediction
    .map((item) => `Speaker ${item.speaker}: ${item.transcription}`)
    .join("\n");

export const cleanupTranscription = async (transcription: string) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content:
          "You will be given a meeting transcription. The sentences are assigned to a speaker, but sometimes this doesn't seem right or sentences are cut into multiple pieces. Clean up the transcription by guessing which speaker said what. You can also add speakers.",
      },
      {
        role: "user",
        content: transcription,
      },
    ],
    temperature: 1,
    max_tokens: 4000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  return response.choices[0].message.content;
};

export const transcribe = async (audioUrl: string) => {
  const gladiaApiKey = process.env.GLADIA_API_KEY;

  const headers = {
    "x-gladia-key": gladiaApiKey,
    accept: "application/json",
  };

  const form = new FormData();
  form.append("audio_url", audioUrl);
  form.append("toggle_diarization", "true");
  form.append("diarization_max_speakers", "2");

  const response = await fetch(
    "https://api.gladia.io/audio/text/audio-transcription/",
    {
      method: "POST",
      headers,
      body: form,
    }
  );

  const data = await response.json();

  return data as Transcription;
};
