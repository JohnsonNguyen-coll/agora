import { createHash } from 'node:crypto';
export interface HashInput {
  id: string; roomId: string; sequence: number; type: string; payloadJson: string;
  prevHash: string | null; createdAt: string;
}
export function eventHash(item: HashInput) {
  return createHash('sha256').update(JSON.stringify([
    item.id, item.roomId, item.sequence, item.type, item.payloadJson, item.prevHash, item.createdAt
  ])).digest('hex');
}
