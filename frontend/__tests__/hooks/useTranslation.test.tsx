import { renderHook, act } from '@testing-library/react-native';
import { useTranslation } from '@/hooks/useTranslation';
import { useApp } from '@/context/AppContext';

jest.mock('@/context/AppContext', () => ({ useApp: jest.fn() }));
const mockUseApp = jest.mocked(useApp);

describe('useTranslation', () => {
  it('t() returns English string for en locale', () => {
    mockUseApp.mockReturnValue({ locale: 'en', setLocale: jest.fn() });
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('welcome.title')).toBe('FinTrack');
  });

  it('t() returns English tagline for en locale', () => {
    mockUseApp.mockReturnValue({ locale: 'en', setLocale: jest.fn() });
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('welcome.tagline')).toBe('Take control of your finances');
  });

  it('t() returns Russian tagline for ru locale', () => {
    mockUseApp.mockReturnValue({ locale: 'ru', setLocale: jest.fn() });
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('welcome.tagline')).toBe('Контролируйте свои финансы');
  });

  it('t() returns Russian auth.logIn for ru locale', () => {
    mockUseApp.mockReturnValue({ locale: 'ru', setLocale: jest.fn() });
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('auth.logIn')).toBe('Войти');
  });

  it('t() returns English auth.logIn for en locale', () => {
    mockUseApp.mockReturnValue({ locale: 'en', setLocale: jest.fn() });
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('auth.logIn')).toBe('Log In');
  });

  it('t() returns the key itself for unknown key', () => {
    mockUseApp.mockReturnValue({ locale: 'en', setLocale: jest.fn() });
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('nonexistent.key.xyz')).toBe('nonexistent.key.xyz');
  });

  it('t() interpolates {{count}} with a number', () => {
    mockUseApp.mockReturnValue({ locale: 'en', setLocale: jest.fn() });
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('errors.passwordMinLength', { count: 8 }))
      .toBe('Password must be at least 8 characters.');
  });

  it('t() leaves {{count}} unreplaced when param is not provided', () => {
    mockUseApp.mockReturnValue({ locale: 'en', setLocale: jest.fn() });
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('errors.passwordMinLength', {})).toContain('{{count}}');
  });

  it('t() interpolates different count values', () => {
    mockUseApp.mockReturnValue({ locale: 'en', setLocale: jest.fn() });
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('errors.passwordMinLength', { count: 12 })).toContain('12');
  });

  it('locale is exposed from context', () => {
    mockUseApp.mockReturnValue({ locale: 'ru', setLocale: jest.fn() });
    const { result } = renderHook(() => useTranslation());
    expect(result.current.locale).toBe('ru');
  });

  it('setLocale calls through to the context setLocale', () => {
    const mockSetLocale = jest.fn();
    mockUseApp.mockReturnValue({ locale: 'en', setLocale: mockSetLocale });
    const { result } = renderHook(() => useTranslation());
    act(() => { result.current.setLocale('ru'); });
    expect(mockSetLocale).toHaveBeenCalledWith('ru');
  });

  it('t() falls back to key string for totally unknown keys', () => {
    mockUseApp.mockReturnValue({ locale: 'ru', setLocale: jest.fn() });
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('totally.unknown')).toBe('totally.unknown');
  });
});
