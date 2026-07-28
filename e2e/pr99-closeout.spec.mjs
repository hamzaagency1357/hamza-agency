import { test, expect } from "@playwright/test";

const token = process.env.PR99_E2E_TOKEN || "";

test("PR99 isolated authenticated operations closeout", async ({ page, request }) => {
  expect(token).not.toBe("");
  const consoleErrors=[];page.on("console",message=>{if(message.type()==="error")consoleErrors.push(message.text())});page.on("pageerror",error=>consoleErrors.push(error.message));

  await page.goto("/admin/page-builder");
  await expect(page).toHaveURL(/\/admin\/login|\/admin$/);

  await page.goto("/pr99-e2e");
  await page.getByTestId("token").fill(token);
  await page.getByTestId("login").click();
  await expect(page.getByTestId("state")).toContainText("admin_login");

  for (const id of ["draft","translations","sections","publish"]) await page.getByTestId(id).click();
  await expect(page.getByTestId("state")).toContainText('"status": "published"');
  await expect(page.getByTestId("state")).toContainText('"versions": 1');
  await expect(page.getByTestId("state")).toContainText('"visible": false');

  for (const [locale,copy] of [["ar","محتوى عربي تجريبي"],["en","Isolated English fixture content"],["tr","Yalıtılmış Türkçe test içeriği"]]) {
    const response=await request.get(`/pr99-e2e/public/${locale}/fixture-page`);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(copy);
  }

  await page.getByTestId("restore").click();
  await expect(page.getByTestId("state")).toContainText('"status": "draft"');
  await page.getByTestId("publish").click();
  await expect(page.getByTestId("state")).toContainText('"versions": 3');

  for (const id of ["application","service","job"]) await page.getByTestId(id).click();
  await expect(page.getByTestId("state")).toContainText("job_application");
  await page.getByTestId("duplicate").click();
  await expect(page.getByTestId("error")).toContainText("duplicate");

  await page.getByTestId("mark_all_read").click();
  await expect(page.getByTestId("state")).toContainText('"notifications": 0');

  await page.getByTestId("trash").click();
  await page.getByTestId("delete-protected").click();
  await expect(page.getByTestId("error")).toContainText("protected");
  await page.getByTestId("restore_trash").click();
  await expect(page.getByTestId("state")).toContainText('"trash": "restored"');
  await page.getByTestId("trash").click();
  await page.getByTestId("delete-confirmed").click();
  await expect(page.getByTestId("state")).toContainText('"trash": "deleted"');

  await page.getByTestId("backup").click();
  await expect(page.getByTestId("state")).toContainText('"backups": 1');
  await page.getByTestId("dry-invalid").click();
  await expect(page.getByTestId("error")).toContainText("invalid_checksum");
  await page.getByTestId("dry-valid").click();
  await page.getByTestId("fixture_restore").click();
  await expect(page.getByTestId("state")).toContainText("fixture_restore_completed");

  await page.getByTestId("publish").click();
  await page.getByTestId("unpublish").click();
  await expect(page.getByTestId("state")).toContainText('"status": "unpublished"');
  expect((await request.get("/pr99-e2e/public/en/fixture-page")).status()).toBe(404);

  const bodyWidth=await page.evaluate(()=>document.body.scrollWidth<=window.innerWidth);
  expect(bodyWidth).toBe(true);
  expect(consoleErrors).toEqual([]);

  await page.getByTestId("reset").click();
  await expect(page.getByTestId("state")).toContainText('"authenticated": false');
});
