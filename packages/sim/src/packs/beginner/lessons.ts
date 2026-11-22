import unit1 from './units/01-calls-and-strings'
import unit2 from './units/02-numbers-and-output'
import unit3 from './units/03-variables-and-names'
import unit4 from './units/04-types-and-the-colon'
import unit5 from './units/05-return-values'

const curriculum = [
  unit1,
  unit2,
  unit3,
  unit4,
  unit5,
]

export const units = curriculum.map(section => section.unit)
export const lessons = curriculum.flatMap(section => section.lessons)
