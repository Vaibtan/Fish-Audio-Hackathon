import { useEffect, useRef, useState } from 'react';
import type { Catalog, Health, LineId, Take } from '../shared/contracts';
import { api } from './api/client';
import { AudioController } from './audio/AudioController';
import { ClipCache } from './audio/ClipCache';
import { GameCommands } from './game/commands';
import { initialState, reducer } from './game/reducer';
import { listenerProjection, scores } from './game/selectors';
import type { Event, Round, Slot } from './game/types';
import { Listener } from './Listener';
import { Icon } from './Icon';

function SlotView({ slot, round, catalog, commands, send }: { slot: Slot; round: Round; catalog: Catalog; commands: GameCommands; send: (e: Event) => void }) {
  const [waited, setWaited] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setWaited(true), 8000); return () => clearTimeout(timer); }, []);
  const card = catalog.directions.find(d => d.id === slot.input.directionId)!;
  const line = round.scene.lines.find(l => l.id === slot.input.lineId)!;
  const usable = slot.status === 'ready' && slot.usability === 'accepted';
  const canFallback = !round.rejectedTakeIds.includes(slot.expected.id) && slot.source !== 'prepared'
    && !(slot.status === 'ready' && slot.source === 'generated-this-round')
    && (waited || slot.status === 'failed' || slot.status === 'rejected' || slot.uncertain);
  return <section className={'audition ' + (round.selectedSlotId === slot.id ? 'selected' : '')} aria-label={`Audition ${slot.index}`}>
    <div className="row audition-heading"><h3><span className="take-number">{slot.index}</span> Audition {slot.index}</h3><span className="tag">{slot.source === 'prepared' ? 'Saved performance' : slot.source === 'generated-this-round' ? 'New this round' : slot.status === 'pending' ? 'Waiting' : 'Unavailable'}</span></div>
    <p className="card-name">{card.label}</p><blockquote>{line.text}</blockquote>
    {slot.status === 'pending' && <p className="muted">{waited ? 'Still waiting. You can use this slot’s exact saved performance.' : 'Your performance is being prepared…'}</p>}
    {slot.uncertain && <p className="notice">Outcome uncertain. This slot is retained. <button onClick={() => void commands.retrieve(slot.id)}>Retrieve same request</button></p>}
    {slot.take && slot.status === 'ready' && <>
      <button disabled={!!round.playback} onClick={() => void commands.play('preview', [slot.take!], slot.id)}><Icon name="headphones"/>Listen privately to audition {slot.index}</button>
      {slot.usability === 'unchecked' && <div className="review-controls"><p>Check the exact words and audibility. Direction quality is part of the gamble.</p>
        <button disabled={!slot.previewed || !!round.playback} onClick={() => send({ type: 'ACCEPT', roundId: round.id, id: slot.id })}>Words intact &amp; audible</button>
      </div>}
      <button className="text-button" disabled={!!round.playback} onClick={() => send({ type: 'REJECT', roundId: round.id, id: slot.id })}>Reject technical defect</button>
    </>}
    {slot.status === 'rejected' && <p className="notice">Rejected for a technical defect. This take will not be offered again this round.</p>}
    {slot.providerOutcome?.code && <p className="muted">{slot.providerOutcome.message}</p>}
    {canFallback && <button onClick={() => commands.fallback(slot.id)}>Use matching saved take</button>}
    {usable && <button aria-pressed={round.selectedSlotId === slot.id} className={round.selectedSlotId === slot.id ? 'chosen' : 'primary'} onClick={() => send({ type: 'SELECT', roundId: round.id, id: slot.id })}>{round.selectedSlotId === slot.id && <Icon name="check"/>}{round.selectedSlotId === slot.id ? 'Selected' : `Select audition ${slot.index}`}</button>}
  </section>;
}

export default function App() {
  const [state, setState] = useState(initialState);
  const current = useRef(state);
  const [notice, setNotice] = useState('');
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(false);
  const [soundReady, setSoundReady] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [names, setNames] = useState({ director: 'Player 1', listener: 'Player 2' });
  const [lineId, setLineId] = useState<LineId>('line_1');
  const [directionId, setDirectionId] = useState('hidden_delight');
  const send = (event: Event) => { current.current = reducer(current.current, event); setState(current.current); };
  const [commands] = useState(() => new GameCommands(() => current.current, send, new AudioController(), new ClipCache(), setNotice));
  const refresh = async () => {
    setLoading(true);
    try { const [nextCatalog, nextHealth] = await Promise.all([api.catalog(), api.health()]); setCatalog(nextCatalog); setHealth(nextHealth); setNotice(''); }
    catch (e) { setNotice(e instanceof Error ? e.message : 'Could not reach the local server.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); return () => { commands.stop(); commands.cache.dispose(); }; }, [commands]);
  const r = state.round;
  const previousPhase = useRef(r?.phase);
  useEffect(() => {
    if (previousPhase.current === r?.phase) return;
    previousPhase.current = r?.phase;
    document.getElementById('game')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [r?.phase]);
  const listenerMode = r && (r.phase === 'handoff' || r.phase === 'listen' || r.phase === 'decide');
  const reset = () => { commands.reset(); setNotice(''); };
  const totals = scores(state);
  const baseline = (round: Round) => round.scene.lines.flatMap(l => l.baselineTake ? [l.baselineTake] : []);
  const playPrivate = (takes: Take[]) => void commands.play('preview', takes);
  const start = (scene: Catalog['scenes'][number]) => {
    setNotice('');
    const first = scene.alternatives[0];
    if (first) { setLineId(first.lineId); setDirectionId(first.directionId); }
    commands.newRound(scene, names.director.trim(), names.listener.trim());
  };
  const selectedLine = r?.scene.lines.find(l => l.id === lineId);
  const covered = r?.scene.alternatives.some(t => t.lineId === lineId && t.directionId === directionId && !r.rejectedTakeIds.includes(t.id));
  const nameIssue = !names.director.trim() || !names.listener.trim() ? 'Enter a name for each player.'
    : names.director.trim() === names.listener.trim() ? 'Use different names so each player is easy to identify.'
    : names.director.trim() === 'The house' || names.listener.trim() === 'The house' ? '“The house” is reserved. Choose another player name.' : '';
  return <div className="app-shell">
    <a className="skip-link" href="#game">Skip to game</a>
    <header><a className="wordmark" href="/" aria-label="Dub Saboteur home"><span className="brand-symbol"><Icon name="sound"/></span>Dub Saboteur</a>
      <div className="global-audio"><label>Volume <input aria-label="Volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={e => { const value = Number(e.target.value); setVolume(value); commands.audio.setVolume(value); }}/></label>
        <button className="stop" onClick={() => commands.stop()}><Icon name="stop"/>Stop audio</button></div>
    </header>
    {!r && <main id="game" tabIndex={-1} className="setup">
      <section className="premise">
        <div className="premise-copy"><h1>Same words.<br/><span>Different<br/>delivery.</span></h1><p className="lead">Can you steer their decision?</p><p>One director. One unsuspecting listener. Two auditions to change the way a single line lands.</p>
        <div className="game-facts"><span>2 players</span><span>2 auditions</span><span>1 changed line</span></div></div>
        <div className="player-setup"><div className="row"><h2>Before you play</h2>{soundReady && <span className="sound-ready"><Icon name="check"/>Sound activated</span>}</div>
        <div className="sound-check"><button className={soundReady ? 'sound-activated' : 'primary'} onClick={() => { commands.stop(); void commands.cache.soundCheck(volume).then(() => { setSoundReady(true); setNotice('Sound activated. Confirm the tone is audible through your headphones.'); }, () => setNotice('Sound activation failed. Check your browser audio settings.')); }}><Icon name="headphones"/>Activate sound &amp; check headphones</button><small>{soundReady ? 'Sound activated. Set a comfortable volume.' : 'Plays an unrelated test tone. No scene spoilers.'}</small></div>
        <div className="people"><label>Director<input maxLength={32} autoComplete="off" aria-invalid={!!nameIssue} value={names.director} onChange={e => setNames({ ...names, director: e.target.value })}/></label><label>Listener<input maxLength={32} autoComplete="off" aria-invalid={!!nameIssue} value={names.listener} onChange={e => setNames({ ...names, listener: e.target.value })}/></label></div>
        {nameIssue && <p className="notice" role="status">{nameIssue}</p>}
        <p className="private-note"><Icon name="lock"/><span>Headphones on for the director. The listener looks away until handoff. Keep the private desk off audience displays.</span></p></div>
      </section>
      <section className="program" aria-label="Scene selection"><div className="row program-heading"><h2>Tonight’s scenes</h2><button className="text-button" disabled={loading} onClick={() => void refresh()}>{loading ? 'Checking…' : 'Refresh readiness'}</button></div>
        <p className="muted">{health?.liveEnabled ? health.readySceneIds.length ? 'Live generation available. Qualified saved scenes are ready for offline play.' : 'Live generation configured. Prepare and approve a scene before play.' : 'Prepared play needs no key or internet once the local pack is approved.'}</p>
        {!soundReady && <p className="unlock-note"><Icon name="headphones"/>Activate sound to unlock your scene.</p>}
        {loading && !catalog && <p className="catalog-loading" role="status">Checking tonight’s scenes…</p>}
        {!catalog && !loading && <p className="notice">Could not load scenes. Check the local server, then refresh readiness.</p>}
        {catalog?.scenes.map(scene => <article className={'scene-option ' + (!scene.qualified ? 'scene-unavailable' : '')} key={scene.id}><h3>{scene.title}</h3><p>{scene.context}</p>
          {state.familiarSceneIds.includes(scene.id) && <p className="muted">Familiar scene — you have already seen this one.</p>}
          <div className="scene-bottom"><span className="tag"><Icon name={scene.qualified ? 'check' : 'lock'}/>{scene.qualified ? 'Prepared' : 'Needs audio'}</span><button className={scene.qualified ? 'scene-choose' : ''} disabled={!scene.qualified || !soundReady || !!nameIssue} onClick={() => start(scene)}>Choose this scene<Icon name="arrow"/></button></div>
          {!scene.qualified && <details><summary>Host preparation needed</summary><ul>{scene.missing.map(item => <li key={item}>{item.replace('line_', 'Line ')}</li>)}</ul></details>}
        </article>)}
        {catalog?.configurationMessage && <p className="notice">{catalog.configurationMessage}</p>}
        {catalog && !catalog.scenes.some(s => s.qualified) && <p className="host-note">No qualified scene yet. The host must generate real audio with an authorized voice and call budget, listen to it, and approve the pack. See the README for the preparation commands.</p>}
        <p className="muted">Wins count action matches, not a proven change of mind.</p>
      </section>
      {notice && <p className="notice setup-notice" role="status">{notice}</p>}
    </main>}
    {r?.phase === 'protect' && <main id="game" tabIndex={-1} className="stage protection"><div className="stage-heading"><span className="stage-number"><Icon name="lock"/>Private desk</span><p>Listener, look away. Director, put on headphones.</p></div><h1>{r.scene.title}</h1><p className="context">{r.scene.context}</p>
      <div className="shield-box"><Icon name="shield"/><div><h2>The house has protected one line.</h2><p>“{r.scene.lines.find(l => l.id === r.protectedLineId)?.text}”</p><p className="muted">Its original performance stays in the scene.</p></div></div>
      <p>Your objective: <strong>{r.scene.actions.find(a => a.id !== r.scene.defenderGoal)?.label}</strong></p>
      <button className="primary" disabled={r.registrationPending} onClick={() => void commands.register()}>{r.registrationPending ? 'Registering round…' : 'Register round & enter private desk'}</button>
      {r.registrationError && <p className="notice" role="alert">{r.registrationError} Retry registration without spending an audition.</p>}
      <button className="text-button" onClick={reset}>Void round</button>
    </main>}
    {r?.phase === 'sabotage' && catalog && <main id="game" tabIndex={-1} className="private-desk"><section className="direction-desk"><div className="stage-heading"><span className="stage-number"><Icon name="lock"/>Private desk</span><p>{r.saboteurId} directing. Listener looks away.</p></div>
      <h1>Change the delivery.</h1><p className="objective">Steer them toward: <strong>{r.scene.actions.find(a => a.id !== r.scene.defenderGoal)?.label}</strong></p>
      <button disabled={!!r.playback} onClick={() => playPrivate(baseline(r))}><Icon name="headphones"/>Hear original scene privately</button>
      <h2 className="step-title"><span>1</span>Choose one line</h2><div className="script">{r.scene.lines.map((line, index) => <button key={line.id} disabled={line.id === r.protectedLineId} aria-pressed={line.id === lineId} className={line.id === r.protectedLineId ? 'shielded' : ''} onClick={() => { setLineId(line.id); const first = r.scene.alternatives.find(t => t.lineId === line.id); if (first) setDirectionId(first.directionId); }}><span>{index + 1}</span><span>{line.text}</span>{line.id === r.protectedLineId ? <small><Icon name="shield"/>House shield</small> : line.id === lineId && <Icon name="check"/>}</button>)}</div>
      <h2 className="step-title"><span>2</span>Give it a direction</h2><div className="directions">{catalog.directions.map(card => { const enabled = r.scene.alternatives.some(t => t.lineId === lineId && t.directionId === card.id && !r.rejectedTakeIds.includes(t.id)); return <button aria-pressed={directionId === card.id} disabled={!enabled} key={card.id} onClick={() => setDirectionId(card.id)}><span>{card.label}</span>{enabled && directionId === card.id && <Icon name="check"/>}{!enabled && <small>No approved saved take</small>}</button>; })}</div>
      <p className="muted">{selectedLine?.text} Only covered cards are enabled, including for live generation.</p>
      <div className="generate-actions"><button className="primary" disabled={!covered || !!r.playback || r.slots.length >= 2} onClick={() => void commands.audition({ lineId, directionId, mode: 'prepared' })}>Audition saved performance</button><button disabled={!covered || !!r.playback || r.slots.length >= 2 || !health?.liveEnabled} onClick={() => void commands.audition({ lineId, directionId, mode: 'live' })}>Generate a new performance</button></div>
      <p className="muted">{health?.liveEnabled ? 'Each new performance makes one Fish request. A fresh audition spends a slot even with the same direction.' : 'Live generation is unavailable. The host must enable authorized access.'}</p>
    </section><aside className="audition-desk"><div className="row"><h2>Your two auditions</h2><span className="tag">{r.slots.length} / 2 used</span></div><p className="muted">Each slot keeps its original line and direction, even when you change the controls.</p>
      {r.slots.map(slot => <SlotView key={slot.id} slot={slot} round={r} catalog={catalog} commands={commands} send={send}/>)}
      {Array.from({ length: 2 - r.slots.length }, (_, i) => <div className="empty-slot" key={i}><span className="take-number">{r.slots.length + i + 1}</span><div><h3>Audition {r.slots.length + i + 1}</h3><p>Choose a line and direction to hear a performance.</p></div></div>)}
      {notice && <p className="notice" role="status">{notice}</p>}
      <button className="primary commit" disabled={!r.slots.some(s => s.id === r.selectedSlotId && s.status === 'ready' && s.usability === 'accepted')} onClick={() => { setNotice(''); void commands.commit(); }}>Lock performance &amp; hand over<Icon name="arrow"/></button>
      <p className="private-note">Locking stops private audio and replaces exactly one line. Your listener gets the full scene without clues.</p><button className="text-button" onClick={reset}>Void round without points</button>
    </aside></main>}
    {r?.phase === 'handoff' && <main id="game" tabIndex={-1} className="handoff stage"><div className="handoff-mark"><Icon name="swap"/></div><h1>Pass the stage.</h1><p>Private audio has stopped. Hand the device and headphones to the listener.</p><p>The listener is about to hear one complete scene and choose what to do.</p><button className="primary" onClick={() => { setNotice(''); send({ type: 'HANDOFF', roundId: r.id }); }}><Icon name="headphones"/>I’m the listener. Ready to listen.</button><button className="text-button" onClick={reset}>Void round</button></main>}
    {r && (r.phase === 'listen' || r.phase === 'decide') && <Listener view={listenerProjection(r)} notice={notice} onPlay={() => { setNotice(''); void commands.play('initial'); }} onReplay={() => { setNotice(''); void commands.play('replay'); }} onAnswer={actionId => { setNotice(''); send({ type: 'ANSWER', roundId: r.id, actionId }); }} onRetry={() => void commands.prepare()} onVoid={reset}/>}
    {r?.phase === 'reveal' && <main id="game" tabIndex={-1} className="stage reveal"><div className="stage-heading"><span className="stage-number">The reveal</span><p>{r.scene.title}</p></div><p className="result-line"><Icon name="spark"/>{state.results.find(result => result.roundId === r.id)?.winnerId} wins.</p><h1>That’s how it landed.</h1><p>The listener chose <strong>{r.scene.actions.find(a => a.id === r.answer)?.label}</strong>.</p>
      <div className="reveal-goals"><p><strong>The house</strong> wanted<br/>{r.scene.actions.find(a => a.id === r.scene.defenderGoal)?.label}</p><p><strong>{r.saboteurId}</strong> wanted<br/>{r.scene.actions.find(a => a.id !== r.scene.defenderGoal)?.label}</p></div>
      {(() => { const slot = r.slots.find(s => s.id === r.selectedSlotId)!; const original = r.scene.lines.find(l => l.id === slot.input.lineId)!; return <section className="comparison"><blockquote>“{original.text}”</blockquote><p>{catalog?.directions.find(d => d.id === slot.input.directionId)?.label} / {slot.take?.origin === 'test-fixture' ? 'Test fixture — not Drama 3 output' : slot.source === 'prepared' ? 'Saved Fish performance' : 'New Fish performance this round'}</p><div><button disabled={!!r.playback} onClick={() => void commands.play('comparison', [original.baselineTake!])}>Hear original line</button><button disabled={!!r.playback} onClick={() => void commands.play('comparison', [slot.take!])}>Hear altered line</button></div></section>; })()}
      <p className="muted">An action match earns a point. It does not prove a changed mind.</p><div className="scoreboard">{Object.entries(totals).map(([name, score]) => <span key={name}>{name}<strong>{score}</strong></span>)}</div>
      {notice && <p className="notice" role="status">{notice}</p>}<button className="primary" onClick={reset}>Back to scenes / swap roles</button><p className="muted">Prefer a fresh qualified scene for a role swap.</p>
    </main>}
    <footer>{listenerMode ? 'Listen. Then choose.' : 'Dub Saboteur · Same script. Different stakes.'}<span>Local two-person house game</span></footer>
  </div>;
}
