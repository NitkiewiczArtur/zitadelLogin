import { Page } from "@playwright/test";
import { codeScreen } from "./code-screen";
import { getCodeFromSink } from "./sink";

export async function codeFromSink(page: Page, key: string) {
  // wait for send of the code
  await page.waitForTimeout(3000);
  const c = await getCodeFromSink(key);
  await code(page, c);
}

export async function code(page: Page, code: string) {
  await codeScreen(page, code);
  await page.getByTestId("submit-button").click();
}

export async function codeResend(page: Page) {
  await page.getByTestId("resend-button").click();
}
