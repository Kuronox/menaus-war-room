/**
 * Base class for Domain Value Objects.
 *
 * A Value Object has no identity of its own: two value objects are equal
 * when all of their attributes are equal, and they are immutable once
 * constructed.
 *
 * See docs/canonical-domain-model.md §2.
 */
export abstract class ValueObject<TProps extends object> {
  protected readonly props: Readonly<TProps>;

  protected constructor(props: TProps) {
    this.props = Object.freeze({ ...props });
  }

  equals(other: unknown): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (!(other instanceof ValueObject)) {
      return false;
    }

    if (this.constructor !== other.constructor) {
      return false;
    }

    return deepEqual(this.props, (other as ValueObject<TProps>).props);
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }

  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const aKeys = Object.keys(aRecord);
  const bKeys = Object.keys(bRecord);

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  return aKeys.every((key) => deepEqual(aRecord[key], bRecord[key]));
}
