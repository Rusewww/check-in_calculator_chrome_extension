import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PERIOD,
  LIMITS,
  PRESETS,
  isPreset,
  parsePeriod,
  periodToMs,
  serializePeriod,
  validatePeriodValue,
} from '../../src/core/period.js';

describe('presets', () => {
  it('match the product requirements', () => {
    expect(PRESETS.hours).toEqual([12, 24, 36, 48, 72]);
    expect(PRESETS.days).toEqual([3, 5, 7, 10, 30, 60]);
    expect(DEFAULT_PERIOD).toEqual({ unit: 'hours', value: 24 });
  });
});

describe('validatePeriodValue', () => {
  it('accepts whole numbers within limits, tolerating whitespace', () => {
    expect(validatePeriodValue('hours', '24')).toEqual({ ok: true, value: 24 });
    expect(validatePeriodValue('hours', ' 12 ')).toEqual({ ok: true, value: 12 });
    expect(validatePeriodValue('days', LIMITS.days.max)).toEqual({ ok: true, value: 365 });
    expect(validatePeriodValue('hours', LIMITS.hours.max)).toEqual({ ok: true, value: 8760 });
  });
  it('rejects empty, fractional, negative, non-numeric and out-of-range input', () => {
    expect(validatePeriodValue('hours', '')).toEqual({ ok: false, error: 'empty' });
    expect(validatePeriodValue('hours', '1.5')).toEqual({ ok: false, error: 'not-integer' });
    expect(validatePeriodValue('hours', '-3')).toEqual({ ok: false, error: 'not-integer' });
    expect(validatePeriodValue('hours', 'abc')).toEqual({ ok: false, error: 'not-integer' });
    expect(validatePeriodValue('hours', '0')).toEqual({ ok: false, error: 'out-of-range' });
    expect(validatePeriodValue('hours', '8761')).toEqual({ ok: false, error: 'out-of-range' });
    expect(validatePeriodValue('days', '366')).toEqual({ ok: false, error: 'out-of-range' });
  });
});

describe('serializePeriod / parsePeriod', () => {
  it('round-trips', () => {
    expect(serializePeriod({ unit: 'hours', value: 24 })).toBe('24h');
    expect(serializePeriod({ unit: 'days', value: 30 })).toBe('30d');
    expect(parsePeriod('24h')).toEqual({ unit: 'hours', value: 24 });
    expect(parsePeriod('30D')).toEqual({ unit: 'days', value: 30 });
  });
  it('returns null for invalid or out-of-range text', () => {
    expect(parsePeriod('x')).toBeNull();
    expect(parsePeriod('0h')).toBeNull();
    expect(parsePeriod('400d')).toBeNull();
    expect(parsePeriod('24')).toBeNull();
    expect(parsePeriod(null)).toBeNull();
  });
});

describe('periodToMs / isPreset', () => {
  it('computes exact durations', () => {
    expect(periodToMs({ unit: 'hours', value: 36 })).toBe(36 * 3_600_000);
    expect(periodToMs({ unit: 'days', value: 3 })).toBe(3 * 86_400_000);
  });
  it('recognises presets', () => {
    expect(isPreset({ unit: 'days', value: 60 })).toBe(true);
    expect(isPreset({ unit: 'days', value: 61 })).toBe(false);
  });
});
