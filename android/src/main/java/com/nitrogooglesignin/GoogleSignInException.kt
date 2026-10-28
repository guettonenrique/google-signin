package com.nitrogooglesignin

class GoogleSignInException(
  val code: String,
  message: String,
  val userInfo: Map<String, String> = emptyMap(),
) : Exception(message) {
  // fbjni sends toString() plus the stack trace to JS, so the code travels in toString().
  // toGoogleSignInError parses it back out on the JS side.
  override fun toString(): String = "[$code] $message"
}
