import type { Habit } from "@/types"

export const hashtagRegex = /#[a-zA-Z0-9_]+/g

export function normalizeTag(tag: string) {
  return tag.trim().toLowerCase()
}

export function extractTags(text: string) {
  const matches = text.match(hashtagRegex) ?? []
  return matches.map((match) => normalizeTag(match.slice(1)))
}

export function buildTodoTitle(text: string) {
  return text.replace(hashtagRegex, " ").replace(/\s+/g, " ").trim()
}

export function findLinkedHabit(tags: string[], habits: Habit[]) {
  const tagSet = new Set(tags)
  return habits.find((habit) => tagSet.has(normalizeTag(habit.tag))) ?? null
}
