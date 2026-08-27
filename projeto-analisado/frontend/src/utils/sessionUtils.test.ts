import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatTime,
  getStatusColor,
  getStatusText,
  getInitials,
  getBackgroundColor,
} from './sessionUtils'

describe('formatDate', () => {
  it('formata no padrao pt-BR dd/mm/aaaa hh:mm', () => {
    const resultado = formatDate(new Date('2026-03-15T14:30:00'))
    expect(resultado).toMatch(/^\d{2}\/\d{2}\/\d{4},? \d{2}:\d{2}$/)
  })

  it('aceita string de data alem de objeto Date', () => {
    const resultado = formatDate('2026-03-15T14:30:00' as unknown as Date)
    expect(resultado).toMatch(/^\d{2}\/\d{2}\/\d{4},? \d{2}:\d{2}$/)
  })
})

describe('formatTime', () => {
  it('retorna apenas hora e minuto', () => {
    const resultado = formatTime(new Date('2026-03-15T09:05:00'))
    expect(resultado).toMatch(/^\d{2}:\d{2}$/)
  })
})

describe('getStatusColor', () => {
  it('usa azul para sessoes futuras', () => {
    expect(getStatusColor('upcoming')).toBe('bg-blue-100 text-blue-800')
    expect(getStatusColor('scheduled')).toBe('bg-blue-100 text-blue-800')
  })

  it('usa verde para sessoes em andamento', () => {
    expect(getStatusColor('live')).toBe('bg-green-100 text-green-800')
    expect(getStatusColor('in-progress')).toBe('bg-green-100 text-green-800')
  })

  it('usa cinza para concluidas', () => {
    expect(getStatusColor('completed')).toBe('bg-gray-100 text-gray-800')
  })

  it('usa vermelho para canceladas', () => {
    expect(getStatusColor('cancelled')).toBe('bg-red-100 text-red-800')
  })

  it('cai no cinza para status desconhecido', () => {
    expect(getStatusColor('qualquer-coisa')).toBe('bg-gray-100 text-gray-800')
  })
})

describe('getStatusText', () => {
  it('traduz cada status conhecido', () => {
    expect(getStatusText('upcoming')).toBe('Próxima')
    expect(getStatusText('scheduled')).toBe('Agendada')
    expect(getStatusText('live')).toBe('Ao Vivo')
    expect(getStatusText('in-progress')).toBe('Em Andamento')
    expect(getStatusText('completed')).toBe('Concluída')
    expect(getStatusText('cancelled')).toBe('Cancelada')
  })

  it('devolve o proprio valor quando o status e desconhecido', () => {
    expect(getStatusText('pausada')).toBe('pausada')
  })
})

describe('getInitials', () => {
  it('pega a inicial das duas primeiras palavras', () => {
    expect(getInitials('Lucas Jardim')).toBe('LJ')
  })

  it('limita a duas letras mesmo com nome composto', () => {
    expect(getInitials('Ana Maria de Souza Lima')).toBe('AM')
  })

  it('funciona com nome unico', () => {
    expect(getInitials('Beatriz')).toBe('B')
  })

  it('sempre retorna maiusculas', () => {
    expect(getInitials('carlos eduardo')).toBe('CE')
  })
})

describe('getBackgroundColor', () => {
  it('e deterministico para o mesmo nome', () => {
    expect(getBackgroundColor('Lucas')).toBe(getBackgroundColor('Lucas'))
  })

  it('retorna sempre uma classe da paleta', () => {
    const paleta = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-teal-500',
    ]
    for (const nome of ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fabio']) {
      expect(paleta).toContain(getBackgroundColor(nome))
    }
  })

  it('distribui nomes diferentes em cores diferentes', () => {
    expect(getBackgroundColor('Ana')).not.toBe(getBackgroundColor('Bruno'))
  })
})
