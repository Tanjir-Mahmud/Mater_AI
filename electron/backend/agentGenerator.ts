export interface AgentDraft {
  name: string;
  role: string;
  avatar: string;
  avatarColor: string;
  model: string;
  provider: string;
  reasoningLevel: 'low' | 'medium' | 'high';
  notificationLevel: 'all' | 'needs_me' | 'nothing';
  browserProfile: 'shared' | 'only_this_agent';
  sections: {
    systemDirective: string;
    executionBoundaries: string;
    memoryPolicy: string;
    fallbackStrategies: string;
  };
}

export function generateAgentFromPrompt(prompt: string): AgentDraft {
  const p = prompt.toLowerCase();

  let name = 'Sentinel';
  let role = 'Autonomous Systems Operator';
  let avatar = 'smart_toy';
  let avatarColor = 'bg-primary-container text-on-primary-container';
  let provider = 'opencode';
  let model = 'OpenCode Free';

  if (p.includes('sre') || p.includes('kubernetes') || p.includes('devops') || p.includes('cloud') || p.includes('infra')) {
    name = 'Vanguard';
    role = 'DevOps & SRE Specialist';
    avatar = 'deployed_code';
    avatarColor = 'bg-tertiary-container text-on-tertiary-container';
    provider = 'claude';
    model = 'Claude 3.5 Sonnet';
  } else if (p.includes('security') || p.includes('audit') || p.includes('penetration') || p.includes('vulnerability')) {
    name = 'Cipher';
    role = 'Security Auditor & Pentester';
    avatar = 'security';
    avatarColor = 'bg-secondary-container text-on-secondary-container';
    provider = 'codex';
    model = 'Codex o3-mini';
  } else if (p.includes('data') || p.includes('analytics') || p.includes('metrics') || p.includes('monitor')) {
    name = 'Pulse';
    role = 'Telemetry & Metrics Engineer';
    avatar = 'query_stats';
    avatarColor = 'bg-primary-container text-on-primary-container';
    provider = 'gemini';
    model = 'Gemini 1.5 Pro';
  } else if (p.includes('writer') || p.includes('docs') || p.includes('documentation') || p.includes('content')) {
    name = 'DocuBot';
    role = 'Technical Documentation Specialist';
    avatar = 'description';
    avatarColor = 'bg-surface-container-high text-on-surface';
    provider = 'opencode';
    model = 'OpenCode Free';
  }

  return {
    name,
    role,
    avatar,
    avatarColor,
    model,
    provider,
    reasoningLevel: 'high',
    notificationLevel: 'all',
    browserProfile: 'shared',
    sections: {
      systemDirective: `Operate autonomously as ${role}. Execute tasks systematically, maintaining workspace integrity and producing clear documentation for all changes based on the user's requirements: "${prompt.trim()}".`,
      executionBoundaries: `Read and modify files within the agent workspace. Run commands using the public agent protocol. Never alter files outside the workspace without approval.`,
      memoryPolicy: `Store architectural decisions and long-term invariants in local persistent memory. Review memory window every 20 turns.`,
      fallbackStrategies: `If tool execution fails, log stderr output and backoff retries. On quota or token limit pressure, summarize context immediately.`,
    },
  };
}
