import { describe, it, expect } from 'vitest'
import { countWords, countCharacters } from '../../../app/utils/wordCounter'

describe('Word Counter Utils', () => {
  describe('countWords', () => {
    it('should return 0 for empty string', () => {
      expect(countWords('')).toBe(0)
    })

    it('should return 0 for whitespace only', () => {
      expect(countWords('   ')).toBe(0)
      expect(countWords('\t\n')).toBe(0)
    })

    it('should count single word', () => {
      expect(countWords('ciao')).toBe(1)
    })

    it('should count multiple words', () => {
      expect(countWords('Questo è un test')).toBe(4)
    })

    it('should handle extra whitespace between words', () => {
      expect(countWords('Parole   multiple   spazi')).toBe(3)
    })

    it('should handle leading and trailing whitespace', () => {
      expect(countWords('  parole con spazi  ')).toBe(3)
    })

    it('should count Italian text correctly', () => {
      expect(countWords('Oggi ho mangiato una pizza buonissima')).toBe(6)
    })

    it('should handle mixed punctuation', () => {
      expect(countWords('Ciao, mondo! Come stai?')).toBe(4)
    })
  })

  describe('countCharacters', () => {
    it('should return 0 for undefined/null', () => {
      expect(countCharacters('')).toBe(0)
    })

    it('should count characters including spaces', () => {
      expect(countCharacters('ciao')).toBe(4)
      expect(countCharacters('ciao mondo')).toBe(10)
    })
  })
})