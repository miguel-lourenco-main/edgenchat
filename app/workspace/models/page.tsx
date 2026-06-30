import { WorkspaceList } from "@/components/workspace/workspace-list"

// Demo data for workspace UI; not wired to lib/ai yet.
const sampleModels = [
  {
    id: "1",
    name: "GPT-4 Turbo",
    description: "Most capable model, best for complex tasks",
    status: "active",
    provider: "OpenAI",
    lastUsed: "2 minutes ago",
  },
  {
    id: "2",
    name: "Claude 3 Opus",
    description: "Anthropic's most powerful model",
    status: "active",
    provider: "Anthropic",
    lastUsed: "1 hour ago",
  },
  {
    id: "3",
    name: "Llama 2 70B",
    description: "Open-source model for local deployment",
    status: "inactive",
    provider: "Meta",
    lastUsed: "3 days ago",
  },
  {
    id: "4",
    name: "Mixtral 8x7B",
    description: "High-quality mixture of experts model",
    status: "active",
    provider: "Mistral AI",
    lastUsed: "30 minutes ago",
  },
]

export default function ModelsPage() {
  return (
    <WorkspaceList
      title="Models"
      description="Manage AI models and configurations"
      items={sampleModels}
      type="model"
      backHref="/workspace"
    />
  )
}
