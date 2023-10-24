export const sendToConfluence = async (
  trigger: string,
  transcription: string,
  spaceId: string
) => {
  await fetch(trigger, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transcription, spaceId }),
  });
};
