import { NextRequest } from 'next/server'

export function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(new URL(url, 'http://localhost'), {
    method,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

export function params<T extends Record<string, string>>(value: T) {
  return { params: Promise.resolve(value) }
}
