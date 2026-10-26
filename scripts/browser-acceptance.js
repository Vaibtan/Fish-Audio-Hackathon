async (page) => {
  // Run against an isolated built server started by the host with live generation disabled.
  // This function also runs in Playwright connectors that do not expose Node imports.
  const root = 'D:/SWE_DEV_NEW/Fish-Audio-Hackathon';
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const base = 'http://127.0.0.1:3811';
  const trace = []; const errors = []; const responses = []; const pending = [];
  const onRequest = request => { if (request.url().startsWith(base + '/api/')) trace.push({ url: request.url(), method: request.method(), body: request.postData() }); };
  const onResponse = response => {
    if (response.url().includes('/takes') && response.request().method() === 'POST') pending.push(response.json().then(body => responses.push(body)));
  };
  const onError = error => errors.push(String(error));
  page.on('request', onRequest); page.on('response', onResponse); page.on('pageerror', onError);
  const button = name => page.getByRole('button', { name, exact: true });
  const enabled = async name => {
    await page.waitForFunction(label => [...document.querySelectorAll('button')].some(b => b.textContent === label && !b.disabled), name, { timeout: 12000 });
  };
  const evidence = { kind: 'actual-built-browser-acceptance', createdAt: new Date().toISOString(), browser: await page.context().browser().version(), base, checks: {}, trace, responses, errors };
  try {
    const health = await (await page.request.get(base + '/api/health')).json();
    assert(health && !health.keyConfigured && !health.liveEnabled && health.readySceneIds.includes('cake_invitation'), 'Isolated prepared-only server must be ready without a key.');
    await page.goto(base);
    await button('Activate sound & check headphones').click();
    await page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'The Cake Invitation', exact: true }) }).getByRole('button', { name: 'Choose this scene', exact: true }).click();
    await button('Register round & enter private desk').click();
    await button('Audition saved performance').click(); await button('Select audition 1').waitFor();
    await button('Listen privately to audition 1').click();
    assert(await button('Generate a new performance').isDisabled(), 'Generation must be disabled during private preview.');
    await enabled('Listen privately to audition 1');
    evidence.checks.actualPrivatePreview = true;
    await button('3 Go on. Have a bite.').click();
    await button('Audition saved performance').click(); await button('Select audition 2').waitFor();
    await button('Select audition 1').click();
    await button('Listen privately to audition 1').click();
    await button('Lock performance & hand over').click();
    evidence.checks.commitStopsPrivatePreview = await page.getByRole('heading', { name: 'Pass the stage.', exact: true }).isVisible();
    await button('I’m the listener. Ready to listen.').click();
    await enabled('Play the scene');
    const neutral = await page.locator('main').innerText();
    assert(!/Badly hidden|Thin confidence|shield|Audition|Saved performance|Private desk|Your objective/i.test(neutral), 'Listener contains private fields.');
    for (const line of ['That is a very special cake.', 'I made it just for you.', 'Go on. Have a bite.']) assert(neutral.includes(line), 'Listener transcript changed.');
    assert(await button('Politely decline').isDisabled() && await button('Take the first bite').isDisabled(), 'Early votes must be disabled.');
    evidence.checks.blindListenerAndEarlyVote = true;
    await page.screenshot({ path: root + '/docs/evidence/browser-listener.png', fullPage: true });
    await button('Play the scene').click(); await page.waitForTimeout(500); await button('Stop audio').click();
    assert(await button('Politely decline').isDisabled(), 'Stopping the initial run unlocked voting.');
    evidence.checks.initialStopKeepsVoteLocked = true;
    await button('Play the scene').click(); await enabled('Politely decline');
    evidence.checks.completeInitialPlayback = true;
    await button('Replay the scene').click(); await page.waitForTimeout(400); await button('Stop audio').click();
    assert(await button('Politely decline').isEnabled() && await button('Replay the scene').isEnabled(), 'Partial replay consumed its allowance or locked decisions.');
    await button('Replay the scene').click(); await enabled('Politely decline');
    assert(await button('Replay used').isDisabled(), 'Successful replay did not consume allowance.');
    evidence.checks.replayStopAndOneSuccessfulReplay = true;
    await button('Politely decline').dblclick();
    await page.getByText('Player 1 wins.', { exact: true }).waitFor();
    assert((await page.locator('.comparison').innerText()).includes('Badly hidden delight'), 'Second editor line changed the committed candidate.');
    assert((await page.locator('.comparison blockquote').innerText()).includes('That is a very special cake.'), 'Wrong line replaced.');
    assert(await page.locator('.scoreboard strong').count() === 1 && await page.locator('.scoreboard strong').innerText() === '1', 'Duplicate vote awarded more than one point.');
    evidence.checks.firstCandidateAndDoubleVoteSinglePoint = true;
    await button('Stop audio').click();
    await button('Hear original line').click(); await enabled('Hear altered line');
    await button('Hear altered line').click(); await enabled('Hear original line');
    evidence.checks.actualBeforeAfterPlayback = true;
    await page.screenshot({ path: root + '/docs/evidence/browser-reveal.png', fullPage: true });
    evidence.reveal = await page.locator('main').innerText();
    await button('Back to scenes / swap roles').click();
    assert((await page.locator('main').innerText()).includes('Familiar scene'), 'Reused scene not marked familiar.');
    evidence.checks.familiarScene = true;
    await Promise.all(pending);
    assert(responses.length === 2 && responses.every(r => r.source === 'prepared'), 'Browser made an unexpected candidate request.');
    assert(trace.filter(r => r.method === 'POST' && r.url.includes('/takes')).every(r => JSON.parse(r.body).mode === 'prepared'), 'A live request was made.');
    assert(errors.length === 0, 'Browser page errors occurred.');
    evidence.checks.noLiveRequestsOrPageErrors = true;
    return evidence;
  } finally {
    page.off('request', onRequest); page.off('response', onResponse); page.off('pageerror', onError);
  }
}
