import { chromium } from 'playwright'
const OUT = '/private/tmp/claude-501/-Users-rico-AI-Voice-Game/11205a9a-2f97-4177-b3ad-35cbba7c2473/scratchpad'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
const seen = []
await page.goto('http://localhost:8787/', { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
// open facilitator menu (gear bottom-left) and skip through all phases
for (let i = 0; i < 6; i++) {
  await page.locator('.fac-gear').click().catch(()=>{})
  await page.waitForTimeout(150)
  const skip = page.getByText('Skip to next screen')
  if (await skip.count()) { await skip.click() } else { await page.keyboard.press('Escape') }
  await page.waitForTimeout(700)
  const cls = await page.locator('.v-screen').first().getAttribute('class').catch(()=>'')
  seen.push((cls||'').split(' ').find(c=>c.endsWith('-screen')) || cls)
}
const riddle = await page.locator('.riddle-screen').count()
console.log('phases seen:', seen.join(' → '))
console.log('riddle screen ever present:', !!riddle)
await browser.close()
