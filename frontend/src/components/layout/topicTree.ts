import type { Topic } from "@/api/topics"

export type TopicNode = Topic & {
  children: TopicNode[]
}

/**
 * Builds a nested tree from the flat topic list returned by the API.
 * Children are sorted by `position`, then by `created_at`.
 */
export function buildTopicTree(flat: Topic[]): TopicNode[] {
  const byId = new Map<string, TopicNode>()
  for (const t of flat) {
    byId.set(t.id, { ...t, children: [] })
  }

  const roots: TopicNode[] = []
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const sortNodes = (nodes: TopicNode[]) => {
    nodes.sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position
      return a.created_at.localeCompare(b.created_at)
    })
    for (const n of nodes) sortNodes(n.children)
  }
  sortNodes(roots)
  return roots
}
