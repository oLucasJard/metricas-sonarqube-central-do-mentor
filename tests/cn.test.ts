import { describe, it, expect } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('junta varias classes em uma string', () => {
    expect(cn('p-4', 'text-sm')).toBe('p-4 text-sm')
  })

  it('ignora valores falsy', () => {
    expect(cn('p-4', false, undefined, null, '')).toBe('p-4')
  })

  it('resolve conflito do tailwind mantendo a ultima classe', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('aceita objeto condicional', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500')
  })

  it('aceita array de classes', () => {
    expect(cn(['flex', 'gap-2'])).toBe('flex gap-2')
  })
})
