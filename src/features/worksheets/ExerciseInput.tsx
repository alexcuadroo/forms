import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { WorksheetExercise } from '../../../shared/worksheet-contract.ts';
import { clueCells, isRecord, segmentCells } from '../../../shared/worksheet-exercises.ts';
import type { Answer } from '../../models/forms';

type Props = { exercise: WorksheetExercise; value?: Answer; update: (value: Answer) => void; readOnly?: boolean };
const directions: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

function moveCell(event: KeyboardEvent, root: HTMLElement | null, row: number, col: number, height: number, width: number) {
  const direction = directions[event.key];
  if (!root || !direction) return;
  event.preventDefault();
  const [dr, dc] = direction;
  for (let r = row + dr, c = col + dc; r >= 0 && c >= 0 && r < height && c < width; r += dr, c += dc) {
    const next = root.querySelector<HTMLElement>(`[data-cell="${r},${c}"]`);
    if (next) { next.focus(); return; }
  }
}

function WordSearch({ exercise, selections, update, readOnly }: { exercise: Extract<WorksheetExercise, { kind: 'word_search' }>; selections: string[]; update: (answer: string[]) => void; readOnly?: boolean }) {
  const grid = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState('');
  const [focus, setFocus] = useState('0,0');
  const [message, setMessage] = useState('');
  const [enlarged, setEnlarged] = useState(false);
  const selectedCells = new Set(selections.flatMap(segment => segmentCells(exercise.grid, segment)));

  function selectCell(cell: string) {
    if (!start) { setStart(cell); setMessage('Elegí la casilla final.'); return; }
    const next = `${start}:${cell}`;
    const reverse = `${cell}:${start}`;
    setStart('');
    if (!segmentCells(exercise.grid, next).length) { setMessage('Elegí dos casillas en la misma fila, columna o diagonal.'); return; }
    const existing = selections.find(segment => segment === next || segment === reverse);
    if (existing) { update(selections.filter(segment => segment !== existing)); setMessage('Selección quitada.'); return; }
    if (selections.length >= exercise.words.length) { setMessage('Quitá una selección antes de agregar otra.'); return; }
    update([...selections, next]);
    setMessage('Selección agregada.');
  }

  return <div className="worksheet-exercise worksheet-word-search" data-enlarged={enlarged}>
    <ul className="worksheet-words" aria-label="Palabras a buscar">
      {exercise.words.map(word => <li key={word}>{word}</li>)}
    </ul>
    {!readOnly && (
      <div className="worksheet-board-controls">
        <p className="answer-hint">Elegí las casillas inicial y final de cada palabra.</p>
        <button type="button" onClick={() => setEnlarged(value => !value)}>
          {enlarged ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
          {enlarged ? 'Ajustar al ancho' : 'Ampliar tablero'}
        </button>
      </div>
    )}
    <div className="worksheet-scroll">
      <div className="worksheet-grid word-search-grid" ref={grid} role="group" aria-label="Cuadrícula de la sopa" style={{ '--word-search-columns': exercise.grid[0].length } as CSSProperties}>
        {exercise.grid.map((line, r) => Array.from(line, (letter, c) => {
          const cell = `${r},${c}`;
          if (readOnly) return <span className="word-search-cell" key={cell}>{letter}</span>;
          return (
            <button
              className="word-search-cell"
              key={cell}
              data-cell={cell}
              data-start={start === cell}
              type="button"
              tabIndex={focus === cell ? 0 : -1}
              onFocus={() => setFocus(cell)}
              aria-pressed={selectedCells.has(cell) || start === cell}
              aria-label={`${letter}, fila ${r + 1}, columna ${c + 1}`}
              onKeyDown={event => moveCell(event, grid.current, r, c, exercise.grid.length, line.length)}
              onClick={() => selectCell(cell)}
            >
              {letter}
            </button>
          );
        }))}
      </div>
    </div>
    {!readOnly && <div className="worksheet-board-controls worksheet-board-status">
      <p className="answer-hint" role="status">{selections.length} de {exercise.words.length} selecciones. {message}</p>
      {!!selections.length && <button type="button" onClick={() => { update(selections.slice(0, -1)); setMessage('Última selección quitada.'); }}>Deshacer selección</button>}
    </div>}
  </div>;
}

function Crossword({ exercise, answers, update, readOnly }: { exercise: Extract<WorksheetExercise, { kind: 'crossword' }>; answers: Record<string, string>; update: (value: string, key: string) => void; readOnly?: boolean }) {
  const grid = useRef<HTMLDivElement>(null);
  const numbers = new Map(exercise.clues.map(clue => [`${clue.row},${clue.col}`, clue.number]));
  return <div className="worksheet-exercise">
    <div className="worksheet-scroll"><div ref={grid} className="worksheet-grid crossword" role="group" aria-label="Cuadrícula del crucigrama" style={{ gridTemplateColumns: `repeat(${exercise.grid[0].length}, 2.15rem)` }}>
      {exercise.grid.map((line, r) => Array.from(line, (cell, c) => {
        const key = `${r},${c}`;
        if (cell === '#') return <span key={key} className="worksheet-block" aria-hidden="true" />;
        return <label key={key}>
          {numbers.has(key) && <span aria-hidden="true">{numbers.get(key)}</span>}
          <input data-cell={key} type="text" maxLength={1} disabled={readOnly} aria-label={`Letra de la fila ${r + 1}, columna ${c + 1}`} value={answers[key] ?? ''} onKeyDown={event => moveCell(event, grid.current, r, c, exercise.grid.length, line.length)} onChange={event => update(event.target.value.normalize('NFC').toLocaleUpperCase('es').replace(/[^A-ZÑ]/g, ''), key)} />
        </label>;
      }))}
    </div></div>
    <ul className="worksheet-clues">{exercise.clues.map(clue => <li key={`${clue.number}-${clue.direction}`}><button type="button" disabled={readOnly} onClick={() => grid.current?.querySelector<HTMLElement>(`[data-cell="${clueCells(clue)[0]}"]`)?.focus()}>{clue.number} {clue.direction === 'across' ? 'Horizontal' : 'Vertical'}</button> {clue.text}</li>)}</ul>
  </div>;
}

export function ExerciseInput({ exercise, value, update, readOnly }: Props) {
  const answers = isRecord(value) ? value as Record<string, string> : {};
  const items = Array.isArray(value) ? value : [];
  function setItem(next: string, key: string) {
    const result = { ...answers };
    if (next) result[key] = next;
    else delete result[key];
    update(result);
  }
  switch (exercise.kind) {
    case 'word_search': return <WordSearch exercise={exercise} selections={items} update={update} readOnly={readOnly} />;
    case 'crossword': return <Crossword exercise={exercise} answers={answers} update={setItem} readOnly={readOnly} />;
    case 'fill_blanks': return <div className="worksheet-exercise worksheet-cloze">{exercise.parts.map((part, index) => typeof part === 'string' ? part : (
      <select key={part.id} aria-label={`Hueco ${exercise.parts.slice(0, index + 1).filter(part => typeof part !== 'string').length}`} disabled={readOnly} value={answers[part.id] ?? ''} onChange={event => setItem(event.target.value, part.id)}>
        <option value="">Elegí una palabra</option>{exercise.options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    ))}</div>;
    case 'match_columns': return <div className="worksheet-exercise worksheet-pairs">{exercise.left.map(item => (
      <label key={item.id}><span>{item.label}</span><select disabled={readOnly} value={answers[item.id] ?? ''} onChange={event => setItem(event.target.value, item.id)}>
        <option value="">Elegí una definición</option>{exercise.right.map(option => <option key={option.id} value={option.id} disabled={option.id !== answers[item.id] && Object.values(answers).includes(option.id)}>{option.label}</option>)}
      </select></label>
    ))}</div>;
    case 'sentence_order': return <div className="worksheet-exercise">
      <div className="worksheet-chips" role="group" aria-label="Oración armada">{items.map(id => <button type="button" key={id} disabled={readOnly} aria-label={`Quitar ${exercise.tokens.find(item => item.id === id)?.label}`} onClick={() => update(items.filter(item => item !== id))}>{exercise.tokens.find(item => item.id === id)?.label}</button>)}</div>
      <div className="worksheet-chips" role="group" aria-label="Palabras disponibles">{exercise.tokens.filter(item => !items.includes(item.id)).map(item => <button type="button" key={item.id} disabled={readOnly} onClick={() => update([...items, item.id])}>{item.label}</button>)}</div>
    </div>;
  }
}
