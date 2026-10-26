import type { ListenerView } from './game/selectors';
import { Icon } from './Icon';
export function Listener({ view, notice, onPlay, onReplay, onAnswer, onRetry, onVoid }: {
  view: ListenerView; notice: string; onPlay: () => void; onReplay: () => void;
  onAnswer: (id: string) => void; onRetry: () => void; onVoid: () => void;
}) {
  return <main id="game" tabIndex={-1} className="listener stage" aria-label="Listener room">
    <div className="stage-heading"><span className="stage-number">Listen</span><p>Hear the scene. Make your choice.</p></div>
    <h1>{view.title}</h1><p className="context">{view.context}</p>
    <div className="transcript">{view.transcript.map((text, i) => <p key={i}>{text}</p>)}</div>
    <div className="playback-strip">
      <div className={view.playing ? 'playback-icon playing' : 'playback-icon'}><Icon name="headphones"/></div>
      <div><p role="status">{view.playing ? 'Playing the scene…' : view.preparing ? 'Preparing the scene…' : view.decisionReady ? 'The choice is yours.' : 'Ready when you are.'}</p>
        {view.canPlay && <button className="primary" onClick={onPlay}><Icon name="play"/>Play the scene</button>}
        {view.decisionReady && <button disabled={!view.canReplay} onClick={onReplay}>{view.canReplay || view.playing ? 'Replay the scene' : 'Replay used'}</button>}
        {!view.decisionReady && <small>Listen to the whole scene to unlock your choice.</small>}
      </div>
    </div>
    {view.preparationFailed && <div role="alert" className="notice">The scene could not be prepared. <button onClick={onRetry}>Retry loading audio</button></div>}
    {notice && <p role="status" className="notice">{notice}</p>}
    <div className="action-choices">{view.actions.map(action => <button className="action" key={action.id} disabled={!view.canVote} onClick={() => onAnswer(action.id)}>{action.label}<Icon name={view.canVote ? 'arrow' : 'lock'}/></button>)}</div>
    <button className="text-button" onClick={onVoid}>Void this round</button>
  </main>;
}
