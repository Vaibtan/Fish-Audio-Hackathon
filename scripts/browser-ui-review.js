async (page) => {
  // Run on an isolated prepared-only built server. No fixture audio or paid calls.
  const base = 'http://127.0.0.1:3811';
  const root = 'D:/SWE_DEV_NEW/Fish-Audio-Hackathon';
  const captures = root + '/.impeccable/review';
  const evidence = { createdAt: new Date().toISOString(), base, checks: {}, layouts: [], screenshots: [], errors: [], takeSources: [] };
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const button = name => page.getByRole('button', { name, exact: true });
  const enabled = async name => page.waitForFunction(label => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === label && !b.disabled), name, { timeout: 15000 });
  const responses = [];
  page.on('pageerror', error => evidence.errors.push(String(error)));
  page.on('response', response => {
    if (response.url().endsWith('/takes')) responses.push(response.json().then(body => evidence.takeSources.push(body.source)));
  });
  await page.context().route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(base + '/') || url.startsWith('blob:') || url.startsWith('data:')) return route.continue();
    evidence.errors.push('Unexpected external request: ' + url);
    return route.abort();
  });
  const capture = async (name, widths = [1440, 390]) => {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 960 });
      await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0); });
      const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, fonts: document.fonts.check('16px Bungee') && document.fonts.check('16px Barlow') }));
      evidence.layouts.push({ screen: name, ...layout });
      assert(layout.scrollWidth <= layout.width, `${name} overflows at ${width}px: ${layout.scrollWidth}`);
      assert(layout.fonts, 'Local fonts did not load');
      const path = `${captures}/${name}-${width}.png`;
      await page.screenshot({ path, fullPage: true, animations: 'disabled' });
      evidence.screenshots.push(path);
    }
    await page.setViewportSize({ width: 1440, height: 960 });
  };
  const health = await (await page.request.get(base + '/api/health')).json();
  assert(!health.liveEnabled && !health.keyConfigured && health.readySceneIds.length === 3, 'Expected three prepared scenes on a keyless server');
  await page.goto(base);
  await page.getByRole('heading', { name: 'The Cake Invitation', exact: true }).waitFor();
  await page.keyboard.press('Tab');
  assert(await page.locator('.skip-link').evaluate(el => el === document.activeElement), 'Skip link is not first in tab order');
  await page.keyboard.press('Enter');
  assert(await page.locator('main').evaluate(el => el === document.activeElement), 'Skip link did not focus the game');
  assert(await page.locator('main').evaluate(el => el.matches(':focus-visible') && getComputedStyle(el).outlineStyle === 'solid'), 'Skip-link target has no visible focus indicator');
  await page.screenshot({ path: captures + '/keyboard-focus-1440.png', fullPage: true, animations: 'disabled' });
  evidence.screenshots.push(captures + '/keyboard-focus-1440.png');
  await page.locator('h1').click();
  await capture('setup', [1440, 900, 390, 320]);
  assert(await button('Choose this scene').first().isDisabled(), 'Scene unlocked before sound activation');
  await button('Activate sound & check headphones').click();
  await enabled('Choose this scene');
  await page.getByLabel('Director', { exact: true }).fill('Player 2');
  assert(await button('Choose this scene').first().isDisabled(), 'Duplicate names unlocked the scene');
  await page.getByText('Use different names so each player is easy to identify.').waitFor();
  await page.getByLabel('Director', { exact: true }).fill('Player 1');
  evidence.checks.keyboardSoundAndNames = true;
  const choose = async title => {
    await page.getByRole('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) }).getByRole('button', { name: 'Choose this scene', exact: true }).click();
    assert(await page.locator('main').evaluate(el => el === document.activeElement), 'Phase change did not focus the stage');
  };
  await choose('The Cake Invitation');
  await capture('protection');
  await button('Register round & enter private desk').click();
  await page.getByRole('heading', { name: 'Change the delivery.', exact: true }).waitFor();
  await capture('desk-empty');
  assert(await page.locator('.empty-slot').count() === 2, 'Both empty audition slots must be visible');
  await button('Audition saved performance').click(); await button('Select audition 1').waitFor();
  await button('Listen privately to audition 1').click();
  assert(await button('Generate a new performance').isDisabled(), 'Generation enabled during playback');
  await enabled('Listen privately to audition 1');
  await button('3 Go on. Have a bite.').click();
  await button('Audition saved performance').click(); await button('Select audition 2').waitFor();
  await button('Select audition 1').click();
  assert(await button('Selected').getAttribute('aria-pressed') === 'true', 'Selected audition lacks pressed semantics');
  await capture('desk-selected', [1440, 900, 390, 320]);
  await button('Listen privately to audition 1').click();
  await button('Lock performance & hand over').click();
  await page.getByRole('heading', { name: 'Pass the stage.', exact: true }).waitFor();
  await capture('handoff');
  await button('I’m the listener. Ready to listen.').click(); await enabled('Play the scene');
  const neutral = await page.locator('main').innerText();
  assert(!/Badly hidden|Thin confidence|shield|Audition|Saved performance|Private desk|Your objective/i.test(neutral), 'Listener leaked private fields');
  for (const line of ['That is a very special cake.', 'I made it just for you.', 'Go on. Have a bite.']) assert(neutral.includes(line), 'Transcript changed');
  assert(await button('Politely decline').isDisabled(), 'Voting unlocked before playback');
  await capture('listener', [1440, 390, 320]);
  await button('Play the scene').click(); await page.waitForTimeout(400); await button('Stop audio').click();
  assert(await button('Politely decline').isDisabled(), 'Stopped initial playback unlocked voting');
  await button('Play the scene').click(); await enabled('Politely decline');
  await button('Replay the scene').click(); await page.waitForTimeout(400); await button('Stop audio').click();
  assert(await button('Replay the scene').isEnabled(), 'Partial replay spent allowance');
  await button('Replay the scene').click(); await enabled('Politely decline');
  assert(await button('Replay used').isDisabled(), 'Completed replay did not spend allowance');
  await button('Politely decline').dblclick();
  await page.getByText('Player 1 wins.', { exact: true }).waitFor();
  assert((await page.locator('.comparison').innerText()).includes('Badly hidden delight'), 'Committed the wrong direction');
  assert((await page.locator('.comparison blockquote').innerText()).includes('That is a very special cake.'), 'Committed the wrong line');
  assert(await page.locator('.scoreboard strong').count() === 1 && await page.locator('.scoreboard strong').innerText() === '1', 'Duplicate point');
  await button('Hear original line').click(); await enabled('Hear altered line');
  await button('Hear altered line').click(); await enabled('Hear original line');
  await capture('reveal', [1440, 390, 320]);
  evidence.checks.preparedRoundPrivatePreviewFirstCandidate = true;
  evidence.checks.listenerPrivacyStopReplayDoubleVoteComparison = true;
  await button('Back to scenes / swap roles').click();
  assert((await page.locator('main').innerText()).includes('Familiar scene'), 'Reused scene not labeled');
  // Exercise long public titles and the other real prepared scene packs on mobile.
  for (const title of ['The Extremely Normal Exhibition', 'The Galactic Gala']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await choose(title); await button('Register round & enter private desk').click();
    await button('Audition saved performance').click(); await button('Select audition 1').click();
    await button('Lock performance & hand over').click(); await button('I’m the listener. Ready to listen.').click();
    await enabled('Play the scene');
    const context = await page.locator('.context').innerText();
    const body = (await page.locator('main').innerText()).replace(context, '');
    assert(!/shield|audition|saved performance|private desk|objective/i.test(body), 'Additional scene leaked private details');
    await capture(title.includes('Exhibition') ? 'exhibition-listener' : 'gala-listener', [390]);
    await button('Play the scene').click();
    await page.waitForFunction(() => !!document.querySelector('.action:not(:disabled)'), { timeout: 15000 });
    await page.locator('.action').first().click();
    await page.getByRole('heading', { name: 'That’s how it landed.', exact: true }).waitFor();
    await button('Back to scenes / swap roles').click();
  }
  evidence.checks.allThreePreparedScenes = true;
  // Long names and reduced motion are real UI inputs, not reducer fixtures.
  await page.getByLabel('Director', { exact: true }).fill('A'.repeat(32));
  await choose('The Cake Invitation'); await button('Register round & enter private desk').click();
  await capture('long-name', [390, 320]);
  await button('Void round without points').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  evidence.checks.reducedMotion = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  await Promise.all(responses);
  assert(evidence.takeSources.length === 4 && evidence.takeSources.every(source => source === 'prepared'), 'Unexpected synthesis or take provenance');
  assert(evidence.errors.length === 0, 'Browser errors occurred');
  evidence.checks.noExternalRequestsOrBrowserErrors = true;
  return evidence;
}
