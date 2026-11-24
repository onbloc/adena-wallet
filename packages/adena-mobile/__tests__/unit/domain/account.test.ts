import { AVATAR_COLORS, isAvatarColor, SecretImportMode } from '../../../src/domain/account';
import { toAvatarColor } from '../../../src/presenters/account.presenter';
import { avatarColors } from '../../../src/theme';

describe('SecretImportMode', () => {
  it('exposes the import modes', () => {
    expect(SecretImportMode).toEqual({ MNEMONIC: 'mnemonic', PRIVATE_KEY: 'privateKey' });
  });
});

describe('AvatarColor', () => {
  it('has a theme color for every preset', () => {
    expect(Object.keys(avatarColors).sort()).toEqual([...AVATAR_COLORS].sort());
    Object.values(avatarColors).forEach(hex => expect(hex).toMatch(/^#[0-9A-F]{6}$/));
  });

  it('accepts only known presets and resolves them for display', () => {
    expect(isAvatarColor('teal')).toBe(true);
    expect(isAvatarColor('neon')).toBe(false);
    expect(toAvatarColor({ avatarColor: 'teal' })).toBe(avatarColors.teal);
    expect(toAvatarColor({ avatarColor: 'neon' as never })).toBeUndefined();
    expect(toAvatarColor(null)).toBeUndefined();
  });
});
