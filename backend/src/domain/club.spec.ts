import { describe, expect, it } from 'vitest';
import { Club, InvalidClubError } from './club';

describe('Club', () => {
  it('creates a club with the given id and name', () => {
    const club = Club.create('3301513', 'Menaus');

    expect(club.id).toBe('3301513');
    expect(club.name).toBe('Menaus');
  });

  it('rejects an empty id', () => {
    expect(() => Club.create('', 'Menaus')).toThrow(InvalidClubError);
  });

  it('rejects a whitespace-only id', () => {
    expect(() => Club.create('   ', 'Menaus')).toThrow(InvalidClubError);
  });

  it('rejects an empty name', () => {
    expect(() => Club.create('3301513', '')).toThrow(InvalidClubError);
  });

  it('rejects a whitespace-only name', () => {
    expect(() => Club.create('3301513', '   ')).toThrow(InvalidClubError);
  });

  it('inherits identity-based equality from Entity: same id means equal, even with a different name', () => {
    const a = Club.create('3301513', 'Menaus');
    const b = Club.create('3301513', 'Some Other Name');

    expect(a.equals(b)).toBe(true);
  });

  it('is not equal to a club with a different id', () => {
    const a = Club.create('3301513', 'Menaus');
    const b = Club.create('9999999', 'Menaus');

    expect(a.equals(b)).toBe(false);
  });
});
