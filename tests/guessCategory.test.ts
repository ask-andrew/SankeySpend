// tests/guessCategory.test.ts
import { describe, it, expect } from 'vitest';
import { guessCategoryFromDescription } from '../utils/categorizationUtils';

describe('guessCategoryFromDescription', () => {
  it('should categorize housing-related transactions', () => {
    expect(guessCategoryFromDescription('Rent payment for May')).toBe('Housing');
    expect(guessCategoryFromDescription('Mortgage payment')).toBe('Housing');
    expect(guessCategoryFromDescription('HOA fees')).toBe('Housing');
    expect(guessCategoryFromDescription('Home insurance payment')).toBe('Housing');
    expect(guessCategoryFromDescription('Property tax')).toBe('Housing');
  });

  it('should categorize transport-related transactions', () => {
    expect(guessCategoryFromDescription('Uber ride')).toBe('Transport');
    expect(guessCategoryFromDescription('Shell gas station')).toBe('Transport');
    expect(guessCategoryFromDescription('Parking fee')).toBe('Transport');
    expect(guessCategoryFromDescription('EZPASS TOLL')).toBe('Transport');
    expect(guessCategoryFromDescription('Enterprise rental')).toBe('Transport');
  });

  it('should categorize food & drink transactions', () => {
    expect(guessCategoryFromDescription('Whole Foods Market')).toBe('Food & Drink');
    expect(guessCategoryFromDescription('STARBUCKS COFFEE')).toBe('Food & Drink');
    expect(guessCategoryFromDescription('MCDONALDS #1234')).toBe('Food & Drink');
    expect(guessCategoryFromDescription('Pizza delivery')).toBe('Food & Drink');
    expect(guessCategoryFromDescription('TACO BELL 1234')).toBe('Food & Drink');
  });

  it('should categorize bills & utilities', () => {
    expect(guessCategoryFromDescription('Netflix subscription')).toBe('Bills & Utilities');
    expect(guessCategoryFromDescription('Electric bill')).toBe('Bills & Utilities');
    expect(guessCategoryFromDescription('Comcast internet')).toBe('Bills & Utilities');
    expect(guessCategoryFromDescription('Verizon wireless')).toBe('Bills & Utilities');
    expect(guessCategoryFromDescription('Car insurance')).toBe('Bills & Utilities');
  });

  it('should categorize wellness & health', () => {
    expect(guessCategoryFromDescription('Gym membership')).toBe('Wellness & Health');
    expect(guessCategoryFromDescription('CVS pharmacy')).toBe('Wellness & Health');
    expect(guessCategoryFromDescription('Doctor visit')).toBe('Wellness & Health');
  });

  it('should categorize shopping', () => {
    expect(guessCategoryFromDescription('Amazon.com')).toBe('Shopping');
    expect(guessCategoryFromDescription('TARGET T-1234')).toBe('Shopping');
    expect(guessCategoryFromDescription('Best Buy #1234')).toBe('Shopping');
    expect(guessCategoryFromDescription('Nike Store')).toBe('Shopping');
  });

  it('should categorize travel', () => {
    expect(guessCategoryFromDescription('Delta Airlines')).toBe('Travel');
    expect(guessCategoryFromDescription('Marriott Hotel')).toBe('Travel');
    expect(guessCategoryFromDescription('Expedia.com')).toBe('Travel');
  });

  it('should categorize fun & hobbies', () => {
    expect(guessCategoryFromDescription('AMC Theatres')).toBe('Fun & Hobbies');
    expect(guessCategoryFromDescription('Steam purchase')).toBe('Fun & Hobbies');
    expect(guessCategoryFromDescription('Concert tickets')).toBe('Fun & Hobbies');
  });

  it('should categorize money & finance', () => {
    expect(guessCategoryFromDescription('ATM FEE')).toBe('Money & Finance');
    expect(guessCategoryFromDescription('E*TRADE')).toBe('Money & Finance');
    expect(guessCategoryFromDescription('IRS TAX PAYMENT')).toBe('Money & Finance');
  });

  it('should categorize education', () => {
    expect(guessCategoryFromDescription('University tuition')).toBe('Education');
    expect(guessCategoryFromDescription('Textbook store')).toBe('Education');
    expect(guessCategoryFromDescription('Coursera subscription')).toBe('Education');
  });

  it('should categorize income', () => {
    expect(guessCategoryFromDescription('SALARY PAYMENT')).toBe('Income');
    expect(guessCategoryFromDescription('Paycheck')).toBe('Income');
    expect(guessCategoryFromDescription('BONUS PAYMENT')).toBe('Income');
  });

  it('should categorize work expenses', () => {
    expect(guessCategoryFromDescription('Office supplies')).toBe('Work');
    expect(guessCategoryFromDescription('Business expense')).toBe('Work');
  });

  it('should categorize account transfers', () => {
    expect(guessCategoryFromDescription('Transfer to savings')).toBe('Account Transfer');
    expect(guessCategoryFromDescription('VENMO PAYMENT')).toBe('Account Transfer');
    expect(guessCategoryFromDescription('ZELLE PAYMENT')).toBe('Account Transfer');
  });

  it('should return undefined for unknown transactions', () => {
    expect(guessCategoryFromDescription('Random transaction')).toBeUndefined();
    expect(guessCategoryFromDescription('12345')).toBeUndefined();
  });

  it('should handle partial matches', () => {
    expect(guessCategoryFromDescription('UberEATS delivery')).toBe('Food & Drink');
    expect(guessCategoryFromDescription('Netflix subscription renewal')).toBe('Bills & Utilities');
    expect(guessCategoryFromDescription('Starbucks Reserve')).toBe('Food & Drink');
  });
});