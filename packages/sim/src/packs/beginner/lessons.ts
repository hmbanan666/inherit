import unit1 from './units/01-calls-and-strings'
import unit2 from './units/02-numbers-and-output'
import unit3 from './units/03-variables-and-names'
import unit4 from './units/04-types-and-the-colon'
import unit5 from './units/05-return-values'
import unit6 from './units/06-choices'
import unit7 from './units/07-arrays'
import unit8 from './units/08-loops'
import unit9 from './units/09-your-own-functions'
import unit10 from './units/10-fair-capstone'

const curriculum = [
  unit1,
  unit2,
  unit3,
  unit4,
  unit5,
  unit6,
  unit7,
  unit8,
  unit9,
  unit10,
]

export const units = curriculum.map(section => section.unit)
export const lessons = curriculum.flatMap(section => section.lessons)
