export type ConceptMapNode = {
  id: string
  label: string
  kind?: 'core' | 'concept' | 'detail'
}

export type ConceptMapRelation = {
  source: string
  target: string
  label: string
}

export type ConceptMapData = {
  title: string
  nodes: ConceptMapNode[]
  relations: ConceptMapRelation[]
}
