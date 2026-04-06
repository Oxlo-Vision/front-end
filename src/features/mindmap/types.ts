export type MindMapBranch = {
  title: string
  children: string[]
}

export type MindMapData = {
  centralTopic: string
  branches: MindMapBranch[]
}
