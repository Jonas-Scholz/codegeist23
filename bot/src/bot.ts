import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { getStream, launch } from "puppeteer-stream";
import { createWriteStream } from "fs";
import { exec } from "child_process";
import { ScheduleRequest } from "./api";

export const main = async (call: ScheduleRequest) => {
  const filename = new Date().toISOString().replace(/:/g, "-");

  const file = createWriteStream(`./${filename}.webm`);

  puppeteer.use(StealthPlugin());

  // puppeteer usage as normal
  const browser = await launch(puppeteer, { headless: false });

  const page = await browser.newPage();
  await page.goto(call.url, {
    waitUntil: "networkidle0",
  });

  await page.waitForSelector('[data-mdc-dialog-action="cancel"]');

  // click on element even if its not a button or visible
  await page.evaluate(() => {
    const element: HTMLElement = document.querySelector(
      '[data-mdc-dialog-action="cancel"]'
    );
    if (element) element.click();
  });

  await page.waitForSelector('[aria-label="Got it"]');
  await page.evaluate(() => {
    const element: HTMLElement = document.querySelector(
      '[aria-label="Got it"]'
    );
    if (element) element.click();
  });

  await page.waitForSelector('[aria-label="Your name"]');
  // focus input

  console.log(await page.$eval('[aria-label="Your name"]', (e) => e.innerHTML));
  const inputElement = await page.$('[aria-label="Your name"]');

  await inputElement?.type("ProtokollANT", { delay: 100 });

  const buttonText = "Ask to join";
  await page.evaluate((text) => {
    const buttons = document.querySelectorAll("button");
    buttons.forEach((button) => {
      if (button.textContent.includes(text)) {
        button.click();
        return;
      }
    });
    return null;
  }, buttonText);

  const stream = await getStream(page, { audio: true, video: false });
  console.log("recording");

  stream.pipe(file);

  await page.waitForSelector('[aria-label="Show everyone"]');
  await page.evaluate(() => {
    const element: HTMLElement = document.querySelector(
      '[aria-label="Show everyone"]'
    );
    if (element) element.click();
  });

  while ((await isInCall(page)) && (await callIsNotEmpty(page))) {
    await new Promise((r) => setTimeout(r, 5000));
  }

  stream.destroy();

  file.close();

  convertToMp3(`./${filename}.webm`, `./${filename}.mp3`);

  console.log("done");

  return `./${filename}.mp3`;
};

const isInCall = async (page: any) => {
  const url = page.url();

  const urlParts = url.split("/");
  const lastPart = urlParts[urlParts.length - 1];

  console.log(`lastPart: ${lastPart}`);

  return lastPart.length === 12;
};

const callIsNotEmpty = async (page: any) => {
  try {
    await page.waitForSelector('[aria-label="Participants"]', {
      timeout: 3000,
    });

    const childrenCount = await page.evaluate(() => {
      const element: HTMLElement = document.querySelector(
        '[aria-label="Participants"]'
      );
      if (element) return element.childElementCount;
      return 0;
    });

    console.log(`childrenCount: ${childrenCount}`);

    return childrenCount > 1;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const convertToMp3 = async (input: string, output: string) => {
  exec(
    `ffmpeg -i ${input} -vn -ab 128k -ar 44100 -y ${output}`,
    (err, stdout, stderr) => {
      if (err) {
        console.log(err);
        return;
      }
      console.log(stdout);
    }
  );
};
