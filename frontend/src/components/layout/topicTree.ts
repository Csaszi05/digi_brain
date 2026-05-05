export type TopicNode = {
  id: string
  emoji: string
  name: string
  count: number
  children?: TopicNode[]
}

export const TOPIC_TREE: TopicNode[] = [
  {
    id: "univ",
    emoji: "📚",
    name: "University — Business Informatics",
    count: 47,
    children: [
      {
        id: "sem1",
        emoji: "📁",
        name: "Semester 1",
        count: 18,
        children: [
          { id: "micro", emoji: "📄", name: "Microeconomics", count: 8 },
          { id: "math", emoji: "📄", name: "Mathematics", count: 6 },
          { id: "prog", emoji: "📄", name: "Programming I", count: 4 },
        ],
      },
      {
        id: "sem2",
        emoji: "📁",
        name: "Semester 2",
        count: 12,
        children: [
          { id: "macro", emoji: "📄", name: "Macroeconomics", count: 5 },
          { id: "stats", emoji: "📄", name: "Statistics", count: 7 },
        ],
      },
      { id: "thesis", emoji: "📄", name: "Thesis research", count: 3 },
    ],
  },
  {
    id: "work",
    emoji: "💼",
    name: "Work",
    count: 23,
    children: [
      { id: "proj-a", emoji: "📁", name: "Project Atlas", count: 14 },
      { id: "proj-b", emoji: "📁", name: "Client onboarding", count: 9 },
    ],
  },
  {
    id: "personal",
    emoji: "🏠",
    name: "Personal",
    count: 15,
    children: [
      { id: "health", emoji: "📁", name: "Health", count: 4 },
      { id: "finance", emoji: "📁", name: "Finance", count: 6 },
      { id: "travel", emoji: "📁", name: "Travel", count: 5 },
    ],
  },
]
