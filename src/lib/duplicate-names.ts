import type { Client } from '@/types'

export interface DuplicateMatch {
  client: Client
  similarity: number
}

export interface DuplicateResult {
  exact: Client | null
  similar: DuplicateMatch[]
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, '').toLowerCase()
}

function jaro(s1: string, s2: string): number {
  if (s1 === s2) return s1.length === 0 ? 0 : 1

  const len1 = s1.length
  const len2 = s2.length
  if (len1 === 0 || len2 === 0) return 0

  const matchDistance = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1)
  const s1Matches = new Array<boolean>(len1).fill(false)
  const s2Matches = new Array<boolean>(len2).fill(false)

  let matches = 0
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance)
    const end = Math.min(i + matchDistance + 1, len2)
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue
      s1Matches[i] = true
      s2Matches[j] = true
      matches++
      break
    }
  }
  if (matches === 0) return 0

  let transpositions = 0
  let k = 0
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue
    while (!s2Matches[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }

  const halfTranspositions = transpositions / 2
  return (matches / len1 + matches / len2 + (matches - halfTranspositions) / matches) / 3
}

function jaroWinkler(s1: string, s2: string): number {
  const score = jaro(s1, s2)
  if (score < 0.7) return score

  let prefix = 0
  const maxPrefix = Math.min(4, s1.length, s2.length)
  for (let i = 0; i < maxPrefix; i++) {
    if (s1[i] !== s2[i]) break
    prefix++
  }

  return score + prefix * 0.1 * (1 - score)
}

function findClientByName(
  clients: Client[],
  name: string,
  excludeId?: string,
): Client | null {
  const target = normalizeName(name)
  if (!target) return null

  return (
    clients.find((client) => client.id !== excludeId && normalizeName(client.name) === target) ??
    null
  )
}

function findSimilarClients(
  clients: Client[],
  name: string,
  excludeId?: string,
  threshold = 0.85,
): DuplicateMatch[] {
  const target = normalizeName(name)
  if (!target || target.length < 2) return []

  const matches: DuplicateMatch[] = []
  for (const client of clients) {
    if (client.id === excludeId) continue

    const candidate = normalizeName(client.name)
    if (!candidate || candidate === target) continue

    const similarity = jaroWinkler(target, candidate)
    if (similarity >= threshold) matches.push({ client, similarity })
  }

  return matches.sort((a, b) => b.similarity - a.similarity)
}

export function checkDuplicateName(
  clients: Client[],
  name: string,
  excludeId?: string,
): DuplicateResult {
  return {
    exact: findClientByName(clients, name, excludeId),
    similar: findSimilarClients(clients, name, excludeId),
  }
}
