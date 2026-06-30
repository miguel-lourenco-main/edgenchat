import { WorkspaceHub } from "@/components/workspace/workspace-hub"

// Hub for future workspace modules; most sections are navigational placeholders.
export default function WorkspacePage() {
  return (
    <div className="min-h-screen bg-background">
      <WorkspaceHub />
    </div>
  )
}
