import { describe, expect, it } from 'vitest';
import { ValueObject } from './value-object';

interface TestProps {
  value: string;
  nested: { count: number };
}

class TestValueObject extends ValueObject<TestProps> {
  constructor(props: TestProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }
}

class OtherValueObject extends ValueObject<TestProps> {
  constructor(props: TestProps) {
    super(props);
  }
}

describe('ValueObject', () => {
  it('is equal to another value object of the same type with the same props', () => {
    const a = new TestValueObject({ value: 'x', nested: { count: 1 } });
    const b = new TestValueObject({ value: 'x', nested: { count: 1 } });

    expect(a.equals(b)).toBe(true);
  });

  it('is not equal when a prop differs', () => {
    const a = new TestValueObject({ value: 'x', nested: { count: 1 } });
    const b = new TestValueObject({ value: 'y', nested: { count: 1 } });

    expect(a.equals(b)).toBe(false);
  });

  it('is not equal when a nested prop differs', () => {
    const a = new TestValueObject({ value: 'x', nested: { count: 1 } });
    const b = new TestValueObject({ value: 'x', nested: { count: 2 } });

    expect(a.equals(b)).toBe(false);
  });

  it('is not equal to a value object of a different type with identical props', () => {
    const a = new TestValueObject({ value: 'x', nested: { count: 1 } });
    const b = new OtherValueObject({ value: 'x', nested: { count: 1 } });

    expect(a.equals(b)).toBe(false);
  });

  it('is not equal to null or undefined', () => {
    const a = new TestValueObject({ value: 'x', nested: { count: 1 } });

    expect(a.equals(null)).toBe(false);
    expect(a.equals(undefined)).toBe(false);
  });

  it('is immutable: mutating the original props object does not affect it', () => {
    const props = { value: 'x', nested: { count: 1 } };
    const a = new TestValueObject(props);

    props.value = 'mutated';

    expect(a.value).toBe('x');
  });
});
