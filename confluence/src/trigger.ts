import api, { route, webTrigger } from "@forge/api";

type Request = {
  method: string;
  headers: Record<string, string>;
  body: string;
  queryParameters: Record<string, string>;
  context: {
    cloudId: string;
    moduleKey: string;
  };
  contextToken: string;
};

const createConfluencePage = async (spaceId: string, body: string) => {
  const reqBody = JSON.stringify({
    spaceId: spaceId,
    status: "current",
    title: "Meeting Transcription",
    body: {
      representation: "storage",
      value: body,
    },
  });

  const response = await api
    .asApp()
    .requestConfluence(route`/wiki/api/v2/pages`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: reqBody,
    });

  console.log(`Response: ${response.status} ${response.statusText}`);
  console.log(await response.json());
};

export async function run(req: Request) {
  const { transcription, spaceId } = JSON.parse(req.body);

  await createConfluencePage(spaceId, transcription);

  return {
    body: "Hello world!",
    headers: {
      "Content-Type": "text/plain",
    },
    statusText: "OK",
    statusCode: 200,
  };
}
