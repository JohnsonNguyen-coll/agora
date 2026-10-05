import { test } from 'node:test';
import assert from 'node:assert/strict';
import { responseWindow } from '../shared/src/recovery.ts';
const start='2026-10-06T00:00:00.000Z', end='2026-10-06T00:05:00.000Z';
test('opening deadline belongs to FOR',()=>assert.deepEqual(responseWindow(start,end,null,-1,45),{at:'2026-10-06T00:00:45.000Z',side:'FOR'}));
test('response window follows the actual opponent turn',()=>assert.deepEqual(responseWindow(start,end,'2026-10-06T00:01:00.000Z',0,45),{at:'2026-10-06T00:01:45.000Z',side:'AGAINST'}));
test('match clock takes precedence over an incomplete or exactly ending turn window',()=>{assert.equal(responseWindow(start,end,'2026-10-06T00:04:30.000Z',1,45),null);assert.equal(responseWindow(start,end,'2026-10-06T00:04:15.000Z',1,45),null);});
test('recorded platform pause extends deadline without changing argument timestamp',()=>assert.equal(responseWindow(start,end,'2026-10-06T00:01:00.000Z',0,45,60000)?.at,'2026-10-06T00:02:45.000Z'));