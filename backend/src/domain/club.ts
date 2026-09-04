import { Entity } from './entity';

/**
 * Thrown when an attempt is made to construct a Club that violates its
 * invariants. Per D-014: a specific domain exception, not a generic
 * `Error` and not a `Result<T, E>`.
 */
export class InvalidClubError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidClubError';
  }
}

/**
 * A Hattrick club — the first real Entity of the domain.
 *
 * Minimal by design (see docs/canonical-domain-model.md §1.1): only `id`
 * and `name` today. Arena, Coach, league/region references, etc. are
 * left for later stories, once something in the pipeline actually needs
 * them.
 */
export class Club extends Entity<string> {
  readonly name: string;

  private constructor(id: string, name: string) {
    super(id);
    this.name = name;
  }

  static create(id: string, name: string): Club {
    if (id.trim().length === 0) {
      throw new InvalidClubError('Club id must not be empty');
    }
    if (name.trim().length === 0) {
      throw new InvalidClubError('Club name must not be empty');
    }

    return new Club(id, name);
  }
}
