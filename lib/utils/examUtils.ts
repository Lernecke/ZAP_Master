export const validateInput = (
  userVal: string | number | undefined,
  correct: string | number | undefined
): 'correct' | 'incorrect' | 'empty' | null => {
  if (correct === undefined) return null
  if (!userVal) return 'empty'
  const normalizedUser = userVal.toString().replace(',', '.').trim()
  const normalizedCorrect = correct.toString().replace(',', '.').trim()
  return normalizedUser === normalizedCorrect ? 'correct' : 'incorrect'
}
