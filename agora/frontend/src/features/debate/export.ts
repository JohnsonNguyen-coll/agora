import type { Room } from '../../../../shared/src/types';
export function exportTranscript(room: Room) {
  const text = ['# ' + room.topic, '', 'Duration: ' + room.durationMinutes + ' minutes', 'Status: ' + room.status, '',
    ...room.transcript.flatMap(turn => ['## ' + turn.side + ' — turn ' + turn.turnIndex, '', turn.content, '',
      turn.status === 'completed' ? '' : '[Incomplete turn: ' + turn.status + ']', ''])].join('\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'gavel-' + room.id + '.md'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
