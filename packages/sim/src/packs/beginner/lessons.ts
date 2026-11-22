import unit1 from './units/01-calls-and-strings'

const curriculum = [
  unit1,
]

export const units = curriculum.map(section => section.unit)
export const lessons = curriculum.flatMap(section => section.lessons)
