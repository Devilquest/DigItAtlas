import { describe, expect, it } from 'vitest';

import { signal } from './signal';

describe('a signal', () => {
  it('holds the value it was given, and the last one set', () => {
    const zoom = signal(1);
    expect(zoom.get()).toBe(1);
    zoom.set(4);
    expect(zoom.get()).toBe(4);
  });

  it('tells every subscriber that the value changed', () => {
    const zoom = signal(1);
    let first = 0;
    let second = 0;
    zoom.subscribe(() => (first += 1));
    zoom.subscribe(() => (second += 1));
    zoom.set(2);
    zoom.set(3);
    expect([first, second]).toEqual([2, 2]);
  });

  it('says nothing when the value set is the one already held', () => {
    const cursor = signal('40, 71');
    let told = 0;
    cursor.subscribe(() => (told += 1));
    cursor.set('40, 71');
    cursor.set('40, 72');
    cursor.set('40, 72');
    expect(told).toBe(1);
  });

  it('stops telling a subscriber that has unsubscribed', () => {
    const zoom = signal(1);
    let told = 0;
    const stop = zoom.subscribe(() => (told += 1));
    zoom.set(2);
    stop();
    zoom.set(3);
    expect(told).toBe(1);
    expect(zoom.get()).toBe(3);
  });

  it('tells the subscribers it had, and not one that subscribed while it was telling them', () => {
    const zoom = signal(1);
    let late = 0;
    zoom.subscribe(() => {
      zoom.subscribe(() => (late += 1));
    });
    zoom.set(2);
    expect(late).toBe(0);
    zoom.set(3);
    expect(late).toBe(1);
  });

  it('survives a subscriber that unsubscribes while being told', () => {
    const zoom = signal(1);
    let told = 0;
    const stop = zoom.subscribe(() => {
      told += 1;
      stop();
    });
    zoom.subscribe(() => (told += 1));
    zoom.set(2);
    zoom.set(3);
    expect(told).toBe(3);
  });
});
