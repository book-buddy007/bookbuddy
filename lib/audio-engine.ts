/**
 * One audio element for the whole app.
 *
 * The audiobook player used to own its <audio> element, so leaving /player unmounted
 * it and playback stopped, while the mini player above the tab bar still showed
 * "playing" and its button controlled nothing. Living outside React means the
 * player can be minimised (swipe down / chevron) and keep playing.
 *
 * `dataset.sectionKey` records which `${sectionId}:${gender}` is loaded, so a
 * player that remounts can tell the track is already there and not restart it.
 */
let shared: HTMLAudioElement | null = null

export function getSharedAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null
  if (!shared) {
    shared = new Audio()
    shared.preload = "metadata"
  }
  return shared
}

export const sectionKey = (sectionId: string, gender: string) => `${sectionId}:${gender}`
