// #48 integration boundary. Replace these fixture exports with the sim selectors,
// save/jump helpers and the sandbox-backed worker driver. UI consumes only this file.
export * from './lesson-fixture/types'
export {
  chapterDeclarations, chapterReference, chapterSurface, continueStep, currentStep,
  heldItem, jumpToStep, loadChapter, placeNames, primaryButton, revealed,
} from './lesson-fixture/flow'
export { compileController, idleTick } from './lesson-fixture/driver'
