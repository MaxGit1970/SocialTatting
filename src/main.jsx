import React, {forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {EditorState} from '@codemirror/state';
import {EditorView, keymap, lineNumbers, highlightActiveLineGutter, drawSelection, highlightActiveLine} from '@codemirror/view';
import {defaultKeymap, history, historyKeymap} from '@codemirror/commands';
import {javascript} from '@codemirror/lang-javascript';
import {syntaxHighlighting, defaultHighlightStyle, bracketMatching} from '@codemirror/language';
import {autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap} from '@codemirror/autocomplete';
import {lintGutter, setDiagnostics} from '@codemirror/lint';
import {Search, Undo2, Redo2, Download, Play, ChevronDown, ChevronRight, FileText, Layers3, Settings, BookOpen, PencilRuler, Plus, MoreHorizontal, Lock, Eye, EyeOff, CircleDot, ZoomIn, ZoomOut, Maximize, Grid3X3, Magnet, PanelRightClose, Sparkles, Save, Share2, Command, CheckCircle2, AlertCircle, Trash2} from 'lucide-react';
import {parseTatting, serializeRing} from './language/ringLanguage.js';
import {ringAttachmentPoints, ringPath} from './geometry/ringGeometry.js';
import './styles.css';

const initialDoc = `// La forma compatta crea un Ring completo\nring ring_center(\n  totalNodes: 16,\n  attachments: composition("4-4-4-4"),\n  position: point(350, 270),\n  rotation: 0,\n  roundness: 58,\n  style.stroke: "#6750A4",\n  style.strokeWidth: 3px\n)\n\n// Proprietà e metodi possono essere applicati in seguito\nring ring_right(totalNodes: 12, position: point(590, 270), roundness: 70, style.stroke: "#8B63CE")\nring_right.rotate(18)`;

const completionWords = ['ring', 'totalNodes', 'attachments', 'composition', 'position', 'point', 'rotation', 'roundness', 'style.stroke', 'style.strokeWidth', 'rotate', 'move', 'setNodes', 'hidden', 'locked'];

const CodeEditor = forwardRef(function CodeEditor({initialSource, onSource, diagnostics, onCursorObject}, ref) {
  const host = useRef(null);
  const viewRef = useRef(null);
  const diagnosticsRef = useRef(diagnostics);
  diagnosticsRef.current = diagnostics;

  useImperativeHandle(ref, () => ({
    getSource: () => viewRef.current?.state.doc.toString() || '',
    setSource: source => viewRef.current?.dispatch({changes: {from: 0, to: viewRef.current.state.doc.length, insert: source}}),
    append: text => {
      const view = viewRef.current;
      view.dispatch({changes: {from: view.state.doc.length, insert: `${view.state.doc.length ? '\n\n' : ''}${text}`}, selection: {anchor: view.state.doc.length + text.length + 2}, scrollIntoView: true});
      view.focus();
    },
    focusLines: lines => {
      const view = viewRef.current;
      if (!view || !lines?.length) return;
      const from = view.state.doc.line(Math.min(...lines)).from;
      const to = view.state.doc.line(Math.max(...lines)).to;
      view.dispatch({selection: {anchor: from, head: to}, scrollIntoView: true});
      view.focus();
    },
  }), []);

  useEffect(() => {
    const state = EditorState.create({
      doc: initialSource,
      extensions: [
        lineNumbers(), highlightActiveLineGutter(), history(), drawSelection(), javascript(),
        syntaxHighlighting(defaultHighlightStyle), bracketMatching(), closeBrackets(), lintGutter(),
        autocompletion({override: [context => {
          const word = context.matchBefore(/[\w.]*/);
          if (!word || (word.from === word.to && !context.explicit)) return null;
          return {from: word.from, options: completionWords.map(label => ({label, type: label.includes('.') ? 'property' : 'keyword'}))};
        }]}),
        highlightActiveLine(), keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...completionKeymap]),
        EditorView.updateListener.of(update => {
          if (update.docChanged) onSource(update.state.doc.toString());
          if (update.selectionSet || update.docChanged) {
            const line = update.state.doc.lineAt(update.state.selection.main.head).number;
            onCursorObject(line);
          }
        }),
        EditorView.theme({
          '&': {height: '100%', fontSize: '13px', backgroundColor: '#292725', color: '#ede9e4'},
          '.cm-content': {fontFamily: '"JetBrains Mono", monospace', padding: '14px 0', caretColor: '#d0bcff'},
          '.cm-gutters': {backgroundColor: '#292725', color: '#938f89', border: 'none', minWidth: '42px'},
          '.cm-activeLine,.cm-activeLineGutter': {backgroundColor: '#393532'},
          '.cm-selectionBackground': {backgroundColor: '#4f465d!important'},
          '.cm-line': {padding: '0 14px'},
          '.cm-tooltip': {backgroundColor: '#3c3835', border: '1px solid #5c5753'},
          '.cm-lintRange-error': {backgroundImage: 'none', borderBottom: '2px wavy #ff8a80'},
        }),
      ],
    });
    const view = new EditorView({state, parent: host.current});
    viewRef.current = view;
    onSource(initialSource);
    return () => view.destroy();
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const mapped = diagnostics.map(item => {
      const line = view.state.doc.line(Math.min(item.line, view.state.doc.lines));
      return {from: line.from, to: Math.max(line.from + 1, line.to), severity: 'error', message: item.message};
    });
    view.dispatch(setDiagnostics(view.state, mapped));
  }, [diagnostics]);

  return <div className="editor" ref={host}/>;
});

function RingCanvas({rings, selected, setSelected, showGrid, showPoints}) {
  return <div className="canvas-wrap">
    <div className="canvas-tools"><button aria-label="Riduci zoom"><ZoomOut size={17}/></button><span>82%</span><button aria-label="Aumenta zoom"><ZoomIn size={17}/></button><i/><button aria-label="Adatta alla vista"><Maximize size={17}/></button></div>
    <div className="paper"><svg viewBox="0 0 820 540" role="img" aria-label="Anteprima dinamica degli anelli">
      <defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#e8e3dc" strokeWidth=".7"/></pattern></defs>
      <rect width="820" height="540" rx="2" fill="#fffcf7"/>{showGrid && <rect width="820" height="540" fill="url(#grid)" opacity=".7"/>}
      {rings.filter(ring => !ring.hidden).map(ring => <g key={ring.id} className={selected === ring.id ? 'selected shape' : 'shape'} transform={`translate(${ring.position.x} ${ring.position.y}) rotate(${ring.rotation})`} onClick={() => setSelected(ring.id)}>
        <path d={ringPath(ring)} fill={`${ring.style.stroke}14`} stroke={ring.style.stroke} strokeWidth={ring.style.strokeWidth}/>
        {showPoints && ringAttachmentPoints(ring).map(point => <circle key={point.node} cx={point.x} cy={point.y} r="5" className="attach"><title>Punto dopo il nodo {point.node}</title></circle>)}
        <text y={Math.max(50, ring.totalNodes * 1.2 + 42)} textAnchor="middle" transform={`rotate(${-ring.rotation})`}>{ring.id} · {ring.totalNodes}U</text>
      </g>)}
      {!rings.length && <text x="410" y="260" textAnchor="middle" className="empty-canvas">Scrivi una dichiarazione ring per iniziare</text>}
    </svg></div>
  </div>;
}

function updateRingProperty(source, id, property, value) {
  const assignment = `${id}.${property} = ${value}`;
  const escaped = property.replace(/\./g, '\\.');
  const expression = new RegExp(`^${id}\\.${escaped}\\s*=.*$`, 'm');
  return expression.test(source) ? source.replace(expression, assignment) : `${source.trimEnd()}\n${assignment}`;
}

function App() {
  const editorRef = useRef(null);
  const bootSource = useMemo(() => localStorage.getItem('tatting-studio-source') || initialDoc, []);
  const initialResult = useMemo(() => parseTatting(bootSource), [bootSource]);
  const [source, setSource] = useState(bootSource);
  const [model, setModel] = useState(initialResult);
  const [diagnostics, setDiagnosticsState] = useState([]);
  const [selected, setSelected] = useState('ring_center');
  const [activePage, setActivePage] = useState(0);
  const [tab, setTab] = useState('canvas');
  const [saved, setSaved] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [dirty, setDirty] = useState(false);
  const pages = [{name: 'Motivo principale', count: model.order.length}];

  function handleSource(nextSource) {
    setSource(nextSource);
    setDirty(true);
    const parsed = parseTatting(nextSource);
    setDiagnosticsState(parsed.diagnostics);
    if (parsed.valid) {
      setModel(parsed);
      if (selected && !parsed.rings[selected]) setSelected(parsed.order[0] || null);
    }
  }

  function selectRing(id) {
    setSelected(id);
    editorRef.current?.focusLines(model.rings[id]?.sourceLines);
  }

  function cursorObject(line) {
    const found = model.order.find(id => model.rings[id].sourceLines.includes(line));
    if (found) setSelected(found);
  }

  function createRing() {
    let index = 1;
    while (model.rings[`ring_${index}`]) index += 1;
    const ring = {...model.rings[model.order[0]], id: `ring_${index}`, position: {x: 410 + index * 35, y: 270 + index * 20}, attachments: [], style: {stroke: '#6750A4', strokeWidth: 2.5}, totalNodes: 12, roundness: 50, rotation: 0};
    editorRef.current?.append(serializeRing(ring));
    setSelected(ring.id);
  }

  function deleteRing() {
    if (!selected || !window.confirm(`Eliminare “${selected}”? L'operazione rimuoverà la sua definizione dal sorgente.`)) return;
    const ring = model.rings[selected];
    const lineSet = new Set(ring.sourceLines);
    const next = source.split(/\r?\n/).filter((_, index) => !lineSet.has(index + 1)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    editorRef.current?.setSource(next);
  }

  function setProperty(property, rawValue) {
    if (!selected) return;
    editorRef.current?.setSource(updateRingProperty(source, selected, property, rawValue));
  }

  const ring = selected ? model.rings[selected] : null;
  return <div className="app">
    <header><div className="brand"><div className="logo">T</div><div><strong>Tatting Studio</strong><span>Motivo primavera <i>•</i> {dirty ? 'Modifiche non salvate' : 'Salvato'}</span></div></div><div className="header-actions"><button className="icon"><Undo2/></button><button className="icon disabled"><Redo2/></button><span className="divider"/><button className="text-btn" onClick={() => {localStorage.setItem('tatting-studio-source', source); setDirty(false); setSaved(true);}}><Save/> Salva bozza</button><button className="primary"><Download/> Esporta PNG</button><button className="avatar">AL</button></div></header>
    <div className="workspace"><nav><button className="nav-active"><PencilRuler/><span>Editor</span></button><button><Layers3/><span>Oggetti</span></button><button><BookOpen/><span>Linguaggio</span></button><button><FileText/><span>Progetto</span></button><div/><button><Settings/><span>Impostazioni</span></button></nav>
      <aside className="pages"><div className="aside-title"><div><span>PROGETTO</span><h2>Pagine</h2></div><button><Plus/></button></div><div className="page-list">{pages.map((page, index) => <button key={page.name} onClick={() => setActivePage(index)} className={index === activePage ? 'active' : ''}><span className="page-num">{index + 1}</span><span><b>{page.name}</b><small>{page.count} ring</small></span><MoreHorizontal/></button>)}</div>
        <div className="tree-head"><span>OGGETTI RING</span><button><Search size={16}/></button></div><div className="tree"><div className="tree-root"><ChevronDown/><Layers3/><b>{pages[0].name}</b></div>{model.order.map(id => {const item = model.rings[id]; return <button className={selected === id ? 'selected' : ''} onClick={() => selectRing(id)} key={id}><span className="branch">└</span><CircleDot style={{color: item.style.stroke}}/><span><b>{id}</b><small>{item.totalNodes}U · Ring</small></span>{item.hidden ? <EyeOff/> : <Eye/>}{item.locked ? <Lock/> : <Lock className="muted"/>}</button>;})}</div>
        <button className="add-object" onClick={createRing}><Plus/> Crea nuovo Ring</button>
      </aside>
      <main><div className="main-tabs"><button className={tab === 'source' ? 'active' : ''} onClick={() => setTab('source')}><Command/> Sorgente</button><button className={tab === 'canvas' ? 'active' : ''} onClick={() => setTab('canvas')}><PencilRuler/> Canvas</button><div/>{diagnostics.length ? <span className="invalid"><AlertCircle/> {diagnostics.length} errori · ultima versione valida</span> : <span className="valid"><CheckCircle2/> Sintassi valida</span>}<button className="run" onClick={() => handleSource(source)}><Play/> Aggiorna anteprima</button></div>
        <div className="split"><section className={tab === 'source' ? 'code-pane expanded' : 'code-pane'}><div className="pane-title"><span><i/> SCHEMA.TAT</span><span>Tatting Ring · 1.0</span></div><CodeEditor ref={editorRef} initialSource={bootSource} onSource={handleSource} diagnostics={diagnostics} onCursorObject={cursorObject}/><div className="status"><span>{model.order.length} ring</span><span>UTF-8</span><span>{diagnostics.length ? 'Ultimo modello valido' : 'Modello aggiornato'}</span></div></section>
          <section className={tab === 'canvas' ? 'preview expanded' : 'preview'}><div className="pane-title"><span>ANTEPRIMA DINAMICA</span><div><button><Share2/> Condividi</button><button><PanelRightClose/></button></div></div><RingCanvas rings={model.order.map(id => model.rings[id])} selected={selected} setSelected={selectRing} showGrid={showGrid} showPoints={showPoints}/><div className="canvas-bottom"><button className={`chip ${showGrid ? 'active' : ''}`} onClick={() => setShowGrid(value => !value)}><Grid3X3 size={15}/> Griglia</button><button className="chip"><Magnet size={15}/> Aggancio</button><button className={`chip ${showPoints ? 'active' : ''}`} onClick={() => setShowPoints(value => !value)}><CircleDot size={15}/> Punti</button><span>Foglio A4 · Orizzontale</span></div></section></div>
      </main>
      <aside className="properties"><div className="prop-head"><span>PROPRIETÀ</span><button><MoreHorizontal/></button></div>{ring ? <><div className="selected-card"><div className="object-icon"><CircleDot/></div><div><small>RING</small><b>{ring.id}</b></div><span className="valid-dot">Valido</span></div><div className="section"><h3><ChevronDown/> Geometria</h3><label>Posizione <div className="coords"><span>X <input aria-label="Posizione X" type="number" value={ring.position.x} onChange={event => setProperty('position', `point(${event.target.value}, ${ring.position.y})`)}/></span><span>Y <input aria-label="Posizione Y" type="number" value={ring.position.y} onChange={event => setProperty('position', `point(${ring.position.x}, ${event.target.value})`)}/></span></div></label><label>Nodi strutturali <input className="prop-input" type="number" min="1" value={ring.totalNodes} onChange={event => setProperty('totalNodes', event.target.value)}/><span>U</span></label><label>Rotazione <input className="prop-input" type="number" value={ring.rotation} onChange={event => setProperty('rotation', event.target.value)}/><span>°</span></label><label>Rotondità <input type="range" min="0" max="100" value={ring.roundness} onChange={event => setProperty('roundness', event.target.value)}/><b>{ring.roundness}</b></label></div><div className="section"><h3><ChevronDown/> Aspetto</h3><label>Tratto <div className="color"><input aria-label="Colore tratto" type="color" value={ring.style.stroke} onChange={event => setProperty('style.stroke', `"${event.target.value}"`)}/><b>{ring.style.stroke}</b></div></label><label>Spessore <input className="prop-input" type="number" min="0.5" step="0.5" value={ring.style.strokeWidth} onChange={event => setProperty('style.strokeWidth', `${event.target.value}px`)}/><span>px</span></label></div><div className="section"><h3><ChevronRight/> Punti di attacco <span>{ring.attachments.length}</span></h3></div><div className="source-link"><FileText/><span>Definito alle righe <b>{Math.min(...ring.sourceLines)}–{Math.max(...ring.sourceLines)}</b></span><button onClick={() => editorRef.current?.focusLines(ring.sourceLines)}>Vai al codice</button></div><button className="delete-object" onClick={deleteRing}><Trash2/> Elimina Ring dal sorgente</button></> : <div className="empty-properties"><Sparkles/><p>Crea o seleziona un Ring.</p></div>}</aside>
    </div>{saved && <div className="snackbar"><CheckCircle2/> Bozza salvata nel browser <button onClick={() => setSaved(false)}>Chiudi</button></div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
