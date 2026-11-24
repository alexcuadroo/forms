import type { Answer, Q } from '../../models/forms';

export function answerText(question: Q, value: Answer | undefined) {
  if (value === undefined) return '';
  const exercise = question.exercise;
  if (!exercise) return Array.isArray(value) ? value.join(', ') : typeof value === 'string' ? value : '';
  if (Array.isArray(value)) {
    if (exercise.kind === 'sentence_order') return value.map(id => exercise.tokens.find(token => token.id === id)?.label ?? id).join(' ');
    if (exercise.kind === 'word_search') return value.map(segment => segment.split(':').map(cell => cell.split(',').map(n => Number(n) + 1).join(', ')).join(' → ')).join(' · ');
    return value.join(', ');
  }
  if (typeof value === 'string') return value;
  if (exercise.kind === 'fill_blanks') return exercise.parts.flatMap(part => typeof part === 'string' || !value[part.id] ? [] : [exercise.options.find(option => option.id === value[part.id])?.label ?? value[part.id]]).join(' · ');
  if (exercise.kind === 'match_columns') return exercise.left.flatMap(item => value[item.id] ? [`${item.label} → ${exercise.right.find(option => option.id === value[item.id])?.label ?? value[item.id]}`] : []).join(' · ');
  return Object.entries(value).map(([cell, letter]) => `${cell.split(',').map(n => Number(n) + 1).join(', ')} → ${letter}`).join(' · ');
}
