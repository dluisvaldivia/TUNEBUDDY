/**
 * In-place iterative radix-2 Cooley–Tukey FFT.
 * `re` and `im` must have the same power-of-two length.
 */
export function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length
  if (n !== im.length || (n & (n - 1)) !== 0) {
    throw new Error('fft: input length must be a power of two')
  }

  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) {
      j ^= bit
    }
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len
    const wRe = Math.cos(angle)
    const wIm = Math.sin(angle)
    for (let start = 0; start < n; start += len) {
      let curRe = 1
      let curIm = 0
      const half = len >> 1
      for (let k = 0; k < half; k++) {
        const evenIdx = start + k
        const oddIdx = start + k + half
        const tRe = re[oddIdx] * curRe - im[oddIdx] * curIm
        const tIm = re[oddIdx] * curIm + im[oddIdx] * curRe
        re[oddIdx] = re[evenIdx] - tRe
        im[oddIdx] = im[evenIdx] - tIm
        re[evenIdx] += tRe
        im[evenIdx] += tIm
        const nextRe = curRe * wRe - curIm * wIm
        curIm = curRe * wIm + curIm * wRe
        curRe = nextRe
      }
    }
  }
}

/**
 * Magnitude spectrum of a real signal: returns `signal.length / 2` bins,
 * where bin k corresponds to frequency k * sampleRate / signal.length.
 */
export function magnitudeSpectrum(signal: Float32Array): Float32Array {
  const n = signal.length
  const re = new Float32Array(signal)
  const im = new Float32Array(n)
  fft(re, im)
  const half = n >> 1
  const mags = new Float32Array(half)
  for (let k = 0; k < half; k++) {
    mags[k] = Math.hypot(re[k], im[k])
  }
  return mags
}
