/**
 * Base class for Domain Entities.
 *
 * An Entity is defined by its identity, not by its attributes: two entities
 * are the same entity if they share identity, even if their other fields
 * differ; two entities are different if their identity differs, even if
 * every other field is identical.
 *
 * See docs/canonical-domain-model.md §1.
 */
export abstract class Entity<TId> {
  readonly id: TId;

  protected constructor(id: TId) {
    this.id = id;
  }

  equals(other: unknown): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (!(other instanceof Entity)) {
      return false;
    }

    if (this.constructor !== other.constructor) {
      return false;
    }

    return this.id === (other as Entity<TId>).id;
  }
}
