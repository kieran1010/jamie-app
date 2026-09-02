/**
 * End-to-end smoke test.
 *
 * Drives a real browser through the flows that matter: searching, requesting a
 * lesson as a parent, a tutor accepting it, availability editing and the admin
 * verification badge. Assumes the app is running on port 3000 against a freshly
 * seeded database (`npm run db:seed`), because it asserts on exact counts.
 *
 *   npm run build && npm start &
 *   npm run test:e2e
 *
 * Set SHOTS=<dir> to also write screenshots.
 */
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:3000";
const SHOTS = process.env.SHOTS;
let failures = 0;

function check(label, condition, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures += 1;
}

// Honour a pre-installed browser when one is provided, otherwise let Playwright
// resolve its own download.
const executablePath = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});

async function signIn(page, email) {
  await page.goto(`${BASE}/login`);
  await page.fill("#email", email);
  await page.fill("#password", "password123");
  await page.click('button[type=submit]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

// ---- Parent books a lesson -------------------------------------------------
const parent = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await parent.goto(`${BASE}/search?subject=physics`);
await parent.click("text=View profile and request a lesson");
await parent.waitForURL(/\/tutors\//);
check("guest sees sign-in prompt", await parent.locator("text=create a free account").isVisible());

await signIn(parent, "parent@example.com");
check("signed in as parent", parent.url().includes("/dashboard"));

await parent.goto(`${BASE}/search?subject=physics&level=a-level`);
await parent.click("text=View profile and request a lesson");
await parent.waitForURL(/\/tutors\//);
const tutorUrl = parent.url();

check("booking form visible", await parent.locator("#pair").isVisible());
const studentPicker = await parent.locator("#studentId").isVisible();
check("child picker shown for parent", studentPicker);
if (studentPicker) await parent.selectOption("#studentId", { label: "Ellie" });

await parent.selectOption("#pair", { label: "Physics · A-Level" });
const slotChoices = parent.locator('label:has(input[name=slotChoice])');
const slotCount = await slotChoices.count();
check("slots offered", slotCount > 0, `${slotCount} slots`);

if (SHOTS) await parent.screenshot({ path: `${SHOTS}/03-tutor-profile.png`, fullPage: true });

// Click the label, not the visually hidden radio inside it — that is what a
// real user clicks.
const bookedSlotLabel = (await slotChoices.first().innerText()).trim();
const bookedDayLabel = (await parent.locator("div.max-h-80 > div").first().locator("p").first().innerText()).trim();
await slotChoices.first().click();
await parent.fill("#message", "Ellie is retaking the mechanics paper in January.");
await parent.click('button[type=submit]:has-text("Send lesson request")');
await parent.waitForSelector("text=Request sent", { timeout: 15000 });
check("request sent confirmation", true);

await parent.goto(`${BASE}/dashboard/bookings`);
check("booking listed as pending", await parent.locator("text=Awaiting reply").first().isVisible());
check("booking shows the child", await parent.locator("text=for Ellie").first().isVisible());

// ---- Tutor accepts ---------------------------------------------------------
const tutor = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await signIn(tutor, "priya@example.com");
await tutor.goto(`${BASE}/dashboard/requests`);
check("tutor sees the request", await tutor.locator("text=Physics · A-Level").first().isVisible());
check("tutor sees the message", await tutor.locator("text=mechanics paper").first().isVisible());

await tutor.fill('input[name=responseNote]', "Happy to help — see you then.");
await tutor.click('button:has-text("Accept")');
await tutor.waitForSelector("text=Confirmed", { timeout: 15000 });
check("tutor accepted", await tutor.locator("text=Confirmed").first().isVisible());
check("contact details revealed after accepting", await tutor.locator("text=parent@example.com").first().isVisible());

// ---- The accepted slot is no longer offered --------------------------------
await parent.goto(tutorUrl);
await parent.waitForSelector('label:has(input[name=slotChoice])');
const remaining = await parent.locator('label:has(input[name=slotChoice])').count();
// A 60-minute booking removes every start that overlaps it, so the count falls
// by more than one. What matters is that the booked start itself is gone.
const firstDay = parent.locator("div.max-h-80 > div").first();
const firstDayStillFirst = (await firstDay.locator("p").first().innerText()).trim() === bookedDayLabel;
const stillOffered = firstDayStillFirst
  ? await firstDay.locator(`label:text-is("${bookedSlotLabel}")`).count()
  : 0;
check("booked start no longer offered", stillOffered === 0, `${bookedDayLabel} ${bookedSlotLabel}`);
check("overlapping starts also removed", remaining < slotCount, `${slotCount} -> ${remaining}`);

await parent.goto(`${BASE}/dashboard/bookings`);
check("parent sees confirmation", await parent.locator("text=Confirmed").first().isVisible());
check("parent sees tutor's note", await parent.locator("text=Happy to help").first().isVisible());

// ---- Tutor edits availability ---------------------------------------------
await tutor.goto(`${BASE}/dashboard/availability`);
await tutor.locator('label:has-text("Sun")').first().click();
await tutor.fill("#startTime", "10:00");
await tutor.fill("#endTime", "13:00");
await tutor.click('button:has-text("Add to my week")');
await tutor.waitForSelector("text=Availability added", { timeout: 15000 });
check("weekly rule added", (await tutor.locator("text=10am–1pm").count()) > 0);

await tutor.fill("#date", "2026-12-24");
await tutor.click('button:has-text("Block this out")');
await tutor.waitForSelector("text=Time blocked out", { timeout: 15000 });
check("date exception added", (await tutor.locator("text=24 Dec").count()) > 0);
if (SHOTS) await tutor.screenshot({ path: `${SHOTS}/04-availability.png`, fullPage: true });

// ---- Access control --------------------------------------------------------
await parent.goto(`${BASE}/dashboard/requests`);
check("parent redirected away from tutor pages", !parent.url().endsWith("/requests"), parent.url());
await tutor.goto(`${BASE}/admin`);
check("tutor redirected away from admin", !tutor.url().endsWith("/admin"), tutor.url());

// ---- Admin verification ----------------------------------------------------
const admin = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await signIn(admin, "admin@example.com");
await admin.goto(`${BASE}/admin`);
check("admin sees tutor list", await admin.locator("text=Daniel Okoro").first().isVisible());
const verifiedCountText = async () => {
  const p = await browser.newPage();
  await p.goto(`${BASE}/search?verified=1`);
  const text = await p.locator("h2").first().innerText();
  await p.close();
  return Number(text.match(/^(\d+)/)?.[1] ?? -1);
};
const verifiedBefore = await verifiedCountText();

const danielCard = admin.locator('div.rounded-xl:has-text("Daniel Okoro")').first();
const alreadyVerified = (await danielCard.locator('button:has-text("Remove verification")').count()) > 0;
await danielCard
  .locator(alreadyVerified ? 'button:has-text("Remove verification")' : 'button:has-text("Mark as verified")')
  .click();
await admin.waitForTimeout(1500);

const danielAfter = admin.locator('div.rounded-xl:has-text("Daniel Okoro")').first();
const nowVerified = (await danielAfter.locator('button:has-text("Remove verification")').count()) > 0;
check("verification toggled", nowVerified === !alreadyVerified);

const verifiedAfter = await verifiedCountText();
const expected = verifiedBefore + (nowVerified ? 1 : -1);
check("verified filter reflects the change", verifiedAfter === expected, `${verifiedBefore} -> ${verifiedAfter}`);

// ---- Screenshots -----------------------------------------------------------
if (SHOTS) {
  const shot = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await shot.goto(`${BASE}/`);
  await shot.screenshot({ path: `${SHOTS}/01-home.png`, fullPage: true });
  await shot.goto(`${BASE}/search?postcode=SE1+9RT&radius=20&day=2&band=evening`);
  await shot.screenshot({ path: `${SHOTS}/02-search.png`, fullPage: true });
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mob.goto(`${BASE}/search?postcode=SE1+9RT&radius=20`);
  await mob.screenshot({ path: `${SHOTS}/05-mobile-search.png`, fullPage: true });
  await mob.goto(tutorUrl);
  await mob.screenshot({ path: `${SHOTS}/06-mobile-profile.png`, fullPage: true });
}

await browser.close();
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
