/// <reference types="bun" />

import { describe, expect, test } from 'bun:test'
import {
  bridged,
  GoogleSignInError,
  isErrorWithCode,
  toGoogleSignInError,
} from '../types'

describe('toGoogleSignInError', () => {
  test('parses a rejected promise text', () => {
    const original = new Error('[SIGN_IN_REQUIRED] No signed-in Google user.')
    const result = toGoogleSignInError(original)
    expect(result).toBeInstanceOf(GoogleSignInError)
    const error = result as GoogleSignInError
    expect(error.code).toBe('SIGN_IN_REQUIRED')
    expect(error.message).toBe('No signed-in Google user.')
    expect(error.cause).toBe(original)
    expect(isErrorWithCode(error)).toBe(true)
  })

  test('parses the prefix Nitro adds to a synchronous throw', () => {
    const original = new Error(
      'NitroGoogleSignin.configure(...): [IN_PROGRESS] Google Sign-In is not configured. Call configure() first.'
    )
    const error = toGoogleSignInError(original) as GoogleSignInError
    expect(error.code).toBe('IN_PROGRESS')
    expect(error.message).toBe(
      'Google Sign-In is not configured. Call configure() first.'
    )
  })

  test('drops the Android stack trace from message and keeps it in cause', () => {
    const original = new Error(
      '[SIGN_IN_REQUIRED] No signed-in Google user. Sign in before calling getTokens().\n\tat com.nitrogooglesignin.GoogleSignInController.getTokens(GoogleSignInController.kt:278)\n\tat kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:100)'
    )
    const error = toGoogleSignInError(original) as GoogleSignInError
    expect(error.message).toBe(
      'No signed-in Google user. Sign in before calling getTokens().'
    )
    expect((error.cause as Error).message).toContain(
      'GoogleSignInController.kt:278'
    )
  })

  test('keeps a multi-line message without a stack trace whole', () => {
    const error = toGoogleSignInError(
      new Error('[DEVELOPER_ERROR] first line\nsecond line')
    ) as GoogleSignInError
    expect(error.message).toBe('first line\nsecond line')
  })

  test('returns the same error for an unknown code', () => {
    const original = new Error('[NOPE] x')
    expect(toGoogleSignInError(original)).toBe(original)
  })

  test('returns the same error when there is no prefix', () => {
    const original = new Error('plain failure')
    expect(toGoogleSignInError(original)).toBe(original)
  })

  test('returns the same error when the prefix is not at the start', () => {
    const original = new Error('network said [SIGN_IN_REQUIRED] later')
    expect(toGoogleSignInError(original)).toBe(original)
  })

  test('returns non-errors as they are', () => {
    const value = { message: '[SIGN_IN_REQUIRED] x' }
    expect(toGoogleSignInError('text')).toBe('text')
    expect(toGoogleSignInError(undefined)).toBeUndefined()
    expect(toGoogleSignInError(value)).toBe(value)
  })

  test('returns a GoogleSignInError unchanged', () => {
    const original = new GoogleSignInError('SIGN_IN_REQUIRED', 'x')
    expect(toGoogleSignInError(original)).toBe(original)
  })

  test('recognises the Android sign-out and revoke codes', () => {
    for (const code of ['SIGN_OUT_FAILED', 'REVOKE_ACCESS_FAILED'] as const) {
      const error = toGoogleSignInError(new Error(`[${code}] failed`))
      expect((error as GoogleSignInError).code).toBe(code)
    }
  })
})

describe('bridged', () => {
  test('converts a synchronous throw', () => {
    const original = new Error('[IN_PROGRESS] Not configured.')
    let thrown: unknown
    try {
      void bridged(() => {
        throw original
      })
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(GoogleSignInError)
    expect((thrown as GoogleSignInError).code).toBe('IN_PROGRESS')
    expect((thrown as GoogleSignInError).cause).toBe(original)
  })

  test('converts a rejected promise', async () => {
    const original = new Error('[SIGN_IN_REQUIRED] No signed-in Google user.')
    const error = await bridged(() => Promise.reject(original)).catch(
      (e: unknown) => e
    )
    expect(error).toBeInstanceOf(GoogleSignInError)
    expect((error as GoogleSignInError).code).toBe('SIGN_IN_REQUIRED')
  })

  test('passes a resolved value through', async () => {
    expect(await bridged(() => Promise.resolve(1))).toBe(1)
  })
})
