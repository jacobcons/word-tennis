import { onMounted, onUnmounted, ref } from 'vue'

export function useAnimatedTripleDotMessage(message: string) {
  const animatedTripleDotMessage = ref(message)

  let intervalId: number
  onMounted(() => {
    intervalId = setInterval(() => {
      const length = animatedTripleDotMessage.value.length
      const areLastThreeCharactersDots =
        animatedTripleDotMessage.value.slice(length - 3, length) === '...'
      animatedTripleDotMessage.value = areLastThreeCharactersDots
        ? animatedTripleDotMessage.value.slice(0, length - 3)
        : `${animatedTripleDotMessage.value}.`
    }, 250)
  })
  onUnmounted(() => {
    clearInterval(intervalId)
  })

  return { animatedTripleDotMessage }
}
