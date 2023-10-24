import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { main } from "./bot";
import {
  cleanupTranscription,
  transcribe,
  transformTranscription,
} from "./transcription";
import { uploadFile } from "./backblaze";
import { sendToConfluence } from "./trigger";

const scheduledCalls: ScheduleRequest[] = [];

export type ScheduleRequest = {
  name: string;
  time: string;
  url: string;
  webtriggerUrl: string;
  spaceId: string;
};

const app = new Hono();

app.post("/schedule", async (c) => {
  const data = await c.req.json<ScheduleRequest>();

  if (!data.name || !data.time || !data.url || !data.webtriggerUrl) {
    return c.text("missing data");
  }

  const exists = scheduledCalls.find((call) => call.url === data.url);
  if (exists) {
    return c.text("already scheduled");
  }

  scheduledCalls.push(data);

  return c.text("ok");
});

setInterval(() => {
  const now = new Date();

  const callsToMake = scheduledCalls.filter((call) => {
    const callTime = new Date(call.time);
    return callTime.getTime() < now.getTime();
  });

  callsToMake.forEach(async (call) => {
    const audioFile = await main(call);

    const url = await uploadFile(audioFile);

    const transcription = await transcribe(url);

    const cleanedUp = await cleanupTranscription(
      transformTranscription(transcription)
    );

    await sendToConfluence(call.webtriggerUrl, cleanedUp, call.spaceId);
  });
}, 1000);

serve(app, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});
