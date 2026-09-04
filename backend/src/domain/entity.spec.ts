import { describe, expect, it } from 'vitest';
import { Entity } from './entity';

class TestEntity extends Entity<string> {
  constructor(id: string) {
    super(id);
  }
}

class OtherTestEntity extends Entity<string> {
  constructor(id: string) {
    super(id);
  }
}

describe('Entity', () => {
  it('exposes its id', () => {
    const entity = new TestEntity('a-1');

    expect(entity.id).toBe('a-1');
  });

  it('is equal to another entity of the same type with the same id', () => {
    const a = new TestEntity('a-1');
    const b = new TestEntity('a-1');

    expect(a.equals(b)).toBe(true);
  });

  it('is not equal to an entity of the same type with a different id', () => {
    const a = new TestEntity('a-1');
    const b = new TestEntity('a-2');

    expect(a.equals(b)).toBe(false);
  });

  it('is not equal to an entity of a different type with the same id', () => {
    const a = new TestEntity('a-1');
    const b = new OtherTestEntity('a-1');

    expect(a.equals(b)).toBe(false);
  });

  it('is not equal to null or undefined', () => {
    const a = new TestEntity('a-1');

    expect(a.equals(null)).toBe(false);
    expect(a.equals(undefined)).toBe(false);
  });

  it('is not equal to a non-entity value', () => {
    const a = new TestEntity('a-1');

    expect(a.equals({ id: 'a-1' })).toBe(false);
  });
});
