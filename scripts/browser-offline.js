async (page) => {
  const base = 'http://127.0.0.1:3811';
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const button = name => page.getByRole('button', { name, exact: true });
  const enabled = name => page.waitForFunction(label => [...document.querySelectorAll('button')].some(b => b.textContent === label && !b.disabled), name, { timeout: 15000 });
  const health = await (await page.request.get(base + '/api/health')).json();
  assert(!health.keyConfigured && !health.liveEnabled, 'Use an isolated keyless server.');
  const external = []; const requests = [];
  const context = page.context();
  const handler = async route => {
    const url = route.request().url();
    if (new URL(url).origin === base) { requests.push(url); await route.continue(); }
    else { external.push(url); await route.abort('internetdisconnected'); }
  };
  await context.route('**/*', handler);
  try {
    await page.goto(base);
    // Prove the deny rule is active without sending a real external request.
    assert(await page.evaluate(async () => {
      try { await fetch('https://example.com/dub-saboteur-offline-probe'); return false; }
      catch { return true; }
    }), 'External deny probe unexpectedly succeeded.');
    const choose = async () => {
      await page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'The Extremely Normal Exhibition', exact: true }) }).getByRole('button', { name: 'Choose this scene', exact: true }).click();
      await button('Register round & enter private desk').click();
      await button('Audition saved performance').click();
      await button('Select audition 1').waitFor();
      await button('Select audition 1').click();
      await button('Lock performance & hand over').click();
      await button('I’m the listener. Ready to listen.').click();
      await enabled('Play the scene');
    };
    await button('Activate sound & check headphones').click();
    await choose();
    await button('Play the scene').click(); await enabled('Request a rehearsal');
    await button('Replay the scene').click(); await enabled('Request a rehearsal');
    assert(await button('Replay used').isDisabled(), 'Replay allowance not consumed.');
    await button('Request a rehearsal').click();
    await page.getByText('Player 1 wins.', { exact: true }).waitFor();
    const reveal = await page.locator('main').innerText();
    await page.screenshot({ path: 'D:/SWE_DEV_NEW/Fish-Audio-Hackathon/docs/evidence/browser-external-denied-reveal.png', fullPage: true });
    assert(external.length === 1 && external[0].endsWith('/dub-saboteur-offline-probe'), 'App attempted an external dependency.');
    await button('Back to scenes / swap roles').click();
    await choose();
    const ready = await page.locator('main').innerText();
    assert(ready.includes('Ready when you are.'), 'Second round has not prepared its frozen clips.');
    return {
      kind: 'built-browser-external-network-denial', createdAt: new Date().toISOString(),
      browser: await context.browser().version(), base, keyConfigured: health.keyConfigured,
      liveEnabled: health.liveEnabled, externalDenied: external, localRequests: requests,
      checks: { externalDenyProbePassed: true, fullPreparedRound: true, replay: true, scoringAndReveal: true, nextCommittedRoundCached: true },
      reveal, nextState: ready,
      limits: 'External HTTP(S) blocked for this browser context; machine network adapters unchanged. Local server remains online and live synthesis is disabled. Independent people/rehearsals are not simulated.'
    };
  } finally { await context.unroute('**/*', handler); }
}
