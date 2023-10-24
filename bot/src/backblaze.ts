import { readFileSync } from "fs";
import B2 from "backblaze-b2";

export const uploadFile = async (file: string) => {
  const b2 = new B2({
    applicationKeyId: process.env.BACKBLAZE_APPLICATION_KEY_ID,
    applicationKey: process.env.BACKBLAZE_APPLICATION_KEY,
  });

  await b2.authorize();

  const bucketId = process.env.BACKBLAZE_BUCKET_ID;
  const fileName = file;

  const res = await b2.getUploadUrl({
    bucketId,
  });

  const fileData = readFileSync(file);

  await b2.uploadFile({
    uploadUrl: res.data.uploadUrl,
    uploadAuthToken: res.data.authorizationToken,
    fileName,
    data: fileData,
  });

  return `https://f003.backblazeb2.com/file/codegeist/${fileName}`;
};
