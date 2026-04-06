export type DiagramKind = 'uml_class' | 'uml_sequence' | 'er' | 'flowchart'

export type DiagramArtifact = {
  kind: DiagramKind
  title: string
  rationale: string
  mermaid: string
}
