import { getDatabase, saveDatabase } from './db';

// Milestone 9 Marketplace Invariants & Exact Verified Counts
export const VERIFIED_SKILLS_COUNT = 41;
export const VERIFIED_AGENTS_COUNT = 27;
export const VERIFIED_PLUGINS_COUNT = 39; // Also reported as 39 MCP plugins (same count)
export const TOTAL_EXTENSIONS_COUNT = VERIFIED_SKILLS_COUNT + VERIFIED_AGENTS_COUNT + VERIFIED_PLUGINS_COUNT; // 107

export const PSTACK_BUNDLE_SKILLS_COUNT = 52;
export const PSTACK_BUNDLE_AGENTS_COUNT = 2;
export const PSTACK_BUNDLE_LICENSE = 'MIT';

export interface MarketplaceItem {
  id: string;
  type: 'skill' | 'agent' | 'plugin' | 'bundle';
  name: string;
  slug: string;
  description: string;
  author: string;
  license?: string;
  installsCount: number;
  version: string;
  price: null; // Invariant: no verified prices in spec; must show no price
  isBundle?: boolean;
  bundleItemsCount?: number;
  metadata?: Record<string, any>;
}

export interface AgentTemplatePayload {
  templateId: string;
  templateUrl: string;
  name: string;
  role: string;
  instructions: string;
  skills: string[];
  routines: any[];
  isPublicLinkOnly: true;
  hasWorkspaceFiles: false;
  hasMemories: false;
  isMarketplaceItem: false;
}

export class MarketplaceService {
  private initialised = false;
  private items: MarketplaceItem[] = [];

  public async init(): Promise<void> {
    if (this.initialised) return;
    this.populateVerifiedRegistry();
    this.syncDatabase();
    this.initialised = true;
  }

  private populateVerifiedRegistry(): void {
    this.items = [];

    // 1. Exactly 41 Verified BissBot Skills (Zero installs, unpriced)
    const skillNames = [
      'Git Commit Helper', 'Code Review Analyzer', 'PostgreSQL Schema Optimizer',
      'Dockerfile Linter', 'Kubernetes Manifest Validator', 'REST API Endpoint Tester',
      'React Component Refactorer', 'TypeScript Strict Migration Helper', 'GraphQL Query Builder',
      'SQLite Query Tuning', 'Redis Cache Pattern Assistant', 'Tailwind Utility Organizer',
      'CSS Grid Layout Assistant', 'ESLint Custom Rule Generator', 'Jest Unit Test Scaffolder',
      'Playwright E2E Generator', 'Python Asyncio Tools', 'Rust Cargo Audit Inspector',
      'Go Goroutine Leak Detector', 'AWS IAM Policy Validator', 'GCP Cloud Run Deployer',
      'Azure Bicep Builder', 'S3 Bucket Security Auditor', 'Terraform State Inspector',
      'PR Summary Generator', 'Issue Triage Classifier', 'Changelog Markdown Generator',
      'Semver Version Calculator', 'Curl to Fetch Converter', 'Regex Explainer & Tester',
      'Markdown Documentation Formatter', 'JSON Schema Validator', 'Env Variable Security Auditor',
      'Cron Expression Syntax Helper', 'SSL Certificate Expiry Checker', 'JWT Token Debugger',
      'Bash Script Shellcheck Linter', 'Performance CPU Profiler Helper', 'Memory Leak Diagnostic Tool',
      'Network Latency Tracer', 'Dependency Vulnerability Scanner',
    ];

    for (let i = 0; i < VERIFIED_SKILLS_COUNT; i++) {
      const name = skillNames[i] || `BissBot Skill ${i + 1}`;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      this.items.push({
        id: `skill-${i + 1}`,
        type: 'skill',
        name,
        slug,
        description: `Verified BissBot skill for ${name.toLowerCase()}.`,
        author: 'BissBot',
        license: 'Apache-2.0',
        installsCount: 0, // All BissBot, zero installs rule
        version: '1.0.0',
        price: null, // Spec rule: no price rather than a made-up one
      });
    }

    // 2. Exactly 27 Verified BissBot Agents (Zero installs, unpriced)
    const agentNames = [
      'Senior Systems Architect', 'Frontend Specialist', 'Backend Engineer',
      'DevOps Automation Lead', 'Security Compliance Auditor', 'Database Administrator',
      'QA Test Engineer', 'SRE Incident Commander', 'Technical Documentation Writer',
      'API Integration Scout', 'Mobile Companion Engineer', 'Machine Learning Engineer',
      'Data Pipeline Architect', 'Codebase Migration Assistant', 'Performance Optimization Tuner',
      'Kubernetes Infrastructure Lead', 'Cloud Security Officer', 'Automated Dependency Updater',
      'Pull Request Reviewer', 'Release Delivery Coordinator', 'Log Analysis Sentinel',
      'API Contract Enforcer', 'Refactoring Specialist', 'Distributed Mesh Architect',
      'Microservice Discovery Scout', 'Chaos Engineering Evaluator', 'Disaster Recovery Planner',
    ];

    for (let i = 0; i < VERIFIED_AGENTS_COUNT; i++) {
      const name = agentNames[i] || `BissBot Agent ${i + 1}`;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      this.items.push({
        id: `agent-market-${i + 1}`,
        type: 'agent',
        name,
        slug,
        description: `Autonomous agent persona: ${name}.`,
        author: 'BissBot',
        license: 'Commercial-Included',
        installsCount: 0, // Zero installs rule
        version: '1.0.0',
        price: null,
      });
    }

    // 3. Exactly 39 Verified Plugins (also reported as 39 MCP plugins)
    const pluginNames = [
      'Filesystem MCP', 'PostgreSQL MCP', 'GitHub MCP', 'GitLab MCP',
      'Slack Connector MCP', 'Discord Bot MCP', 'Linear Issue MCP', 'Jira Software MCP',
      'Notion Workspace MCP', 'Confluence Docs MCP', 'Google Drive MCP', 'Google Sheets MCP',
      'Brave Search MCP', 'Puppeteer Browser MCP', 'Docker Container MCP', 'Kubernetes Cluster MCP',
      'AWS Cloud MCP', 'GCP Resources MCP', 'Azure Services MCP', 'Sentry Error MCP',
      'Datadog Telemetry MCP', 'Postman API MCP', 'Figma Design MCP', 'Cloudflare Workers MCP',
      'Stripe Billing MCP', 'SendGrid Mail MCP', 'Twilio SMS MCP', 'Elasticsearch MCP',
      'Redis Cache MCP', 'MongoDB Atlas MCP', 'MySQL Database MCP', 'Snowflake Warehouse MCP',
      'Google BigQuery MCP', 'Supabase Database MCP', 'Vercel Deployment MCP', 'Netlify Edge MCP',
      'Railway Services MCP', 'Render Hosting MCP', 'OpenPanel Analytics MCP',
    ];

    for (let i = 0; i < VERIFIED_PLUGINS_COUNT; i++) {
      const name = pluginNames[i] || `MCP Plugin ${i + 1}`;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      this.items.push({
        id: `plugin-${i + 1}`,
        type: 'plugin',
        name,
        slug,
        description: `Verified MCP tool bridge: ${name}. Connects your agent to external services.`,
        author: 'BissBot Verified',
        license: 'MIT',
        installsCount: 0,
        version: '1.0.0',
        price: null,
        metadata: {
          isMcpPlugin: true,
          isConnector: false, // Invariant: A user-added MCP server or marketplace plugin is NOT a connector
        },
      });
    }

    // 4. Exactly 1 Pstack Bundle (52 skills + 2 agents, MIT)
    this.items.push({
      id: 'bundle-pstack',
      type: 'bundle',
      name: 'pstack DevOps & SRE Core Bundle',
      slug: 'pstack',
      description: '52 specialized tools and 2 autonomous agents (K8s SRE & Cloud Architect). Full MCP protocol integration.',
      author: 'pstack open-source community',
      license: PSTACK_BUNDLE_LICENSE,
      installsCount: 0,
      version: '2.4.0',
      price: null,
      isBundle: true,
      bundleItemsCount: PSTACK_BUNDLE_SKILLS_COUNT + PSTACK_BUNDLE_AGENTS_COUNT, // 54 items
      metadata: {
        skillsCount: PSTACK_BUNDLE_SKILLS_COUNT,
        agentsCount: PSTACK_BUNDLE_AGENTS_COUNT,
        agents: ['K8s SRE Agent', 'Cloud Architect Agent'],
      },
    });
  }

  private syncDatabase(): void {
    const db = getDatabase();
    for (const item of this.items) {
      db.run(
        `INSERT OR REPLACE INTO marketplace_items (id, type, name, slug, description, author, license, installs_count, version, price, metadata, is_bundle, bundle_items_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          item.id,
          item.type,
          item.name,
          item.slug,
          item.description,
          item.author,
          item.license || null,
          item.installsCount,
          item.version,
          item.price,
          JSON.stringify(item.metadata || {}),
          item.isBundle ? 1 : 0,
          item.bundleItemsCount || 0,
          new Date().toISOString(),
        ]
      );
    }
    saveDatabase(db);
  }

  // -------------------------------------------------------------
  // REGISTRY QUERIES & INVARIANTS
  // -------------------------------------------------------------

  public getRegistryCounts(): {
    skills: number;
    agents: number;
    plugins: number;
    mcpPlugins: number;
    bundles: number;
    totalExtensions: number;
    pstackBundle: {
      skills: number;
      agents: number;
      license: string;
    };
  } {
    const skills = this.items.filter((i) => i.type === 'skill').length;
    const agents = this.items.filter((i) => i.type === 'agent').length;
    const plugins = this.items.filter((i) => i.type === 'plugin').length;
    const bundles = this.items.filter((i) => i.type === 'bundle').length;

    return {
      skills,
      agents,
      plugins,
      mcpPlugins: plugins, // same count invariant
      bundles,
      totalExtensions: skills + agents + plugins,
      pstackBundle: {
        skills: PSTACK_BUNDLE_SKILLS_COUNT,
        agents: PSTACK_BUNDLE_AGENTS_COUNT,
        license: PSTACK_BUNDLE_LICENSE,
      },
    };
  }

  public getMarketplaceCounts(): {
    skillsCount: number;
    agentsCount: number;
    pluginsCount: number;
    mcpPluginsCount: number;
    bundlesCount: number;
    totalExtensionsCount: number;
    pstackBundle: {
      skillsCount: number;
      agentsCount: number;
      license: string;
    };
  } {
    const counts = this.getRegistryCounts();
    return {
      skillsCount: counts.skills,
      agentsCount: counts.agents,
      pluginsCount: counts.plugins,
      mcpPluginsCount: counts.mcpPlugins,
      bundlesCount: counts.bundles,
      totalExtensionsCount: counts.totalExtensions,
      pstackBundle: {
        skillsCount: counts.pstackBundle.skills,
        agentsCount: counts.pstackBundle.agents,
        license: counts.pstackBundle.license,
      },
    };
  }

  public listItems(filterType?: string): MarketplaceItem[] {
    if (!filterType || filterType === 'all') return this.items;
    if (filterType === 'skills') return this.items.filter((i) => i.type === 'skill');
    if (filterType === 'agents') return this.items.filter((i) => i.type === 'agent');
    if (filterType === 'plugins' || filterType === 'mcp_plugins') {
      return this.items.filter((i) => i.type === 'plugin');
    }
    if (filterType === 'bundles') return this.items.filter((i) => i.type === 'bundle');
    return this.items;
  }

  public listExtensions(filterType?: string): MarketplaceItem[] {
    return this.listItems(filterType).filter((i) => i.type !== 'bundle');
  }

  public getItemBySlug(slug: string): MarketplaceItem | null {
    return this.items.find((i) => i.slug === slug) || null;
  }

  public getExtensionBySlug(slug: string): MarketplaceItem | null {
    return this.getItemBySlug(slug);
  }

  // -------------------------------------------------------------
  // DEEP LINK RESOLUTION (bissbot:// and ?plugin=<slug>)
  // -------------------------------------------------------------

  public resolveDeepLink(linkUri: string): {
    action: 'preview_plugin' | 'preview_agent' | 'preview_bundle' | 'invalid';
    item: MarketplaceItem | null;
    requiresUserActionToInstall: boolean; // Invariant: Never auto-installs or joins without press
    requiresUserConfirmation: boolean;
    dialogMessage: string;
  } {
    let slug = '';
    if (linkUri.startsWith('bissbot://plugin/')) {
      slug = linkUri.replace('bissbot://plugin/', '').split('?')[0].split('/')[0];
    } else if (linkUri.startsWith('bissbot://marketplace/')) {
      slug = linkUri.replace('bissbot://marketplace/', '').split('?')[0].split('/')[0];
    } else if (linkUri.includes('?plugin=')) {
      const parts = linkUri.split('?plugin=');
      slug = (parts[1] || '').split('&')[0];
    }

    const item = this.getItemBySlug(slug);
    if (!item) {
      return {
        action: 'invalid',
        item: null,
        requiresUserActionToInstall: false,
        requiresUserConfirmation: false,
        dialogMessage: `Plugin or marketplace extension "${slug}" was not found in the registry.`,
      };
    }

    return {
      action: item.type === 'plugin' ? 'preview_plugin' : item.type === 'agent' ? 'preview_agent' : 'preview_bundle',
      item,
      requiresUserActionToInstall: true,
      requiresUserConfirmation: true,
      dialogMessage: `Opening preview for "${item.name}". Press "Install" or "Add to Server" to confirm installation.`,
    };
  }

  // -------------------------------------------------------------
  // AGENT TEMPLATE VS MARKETPLACE AGENT
  // -------------------------------------------------------------

  public createAgentTemplate(agentId: string): AgentTemplatePayload {
    const db = getDatabase();
    let name = 'Senior Systems Architect';
    let role = 'Cluster Reliability Lead';
    try {
      const res = db.exec(`SELECT name, role FROM agents WHERE id = '${agentId.replace(/'/g, "''")}';`);
      if (res.length && res[0].values.length) {
        name = String(res[0].values[0][0]);
        role = String(res[0].values[0][1]);
      }
    } catch {}

    // Template invariant:
    // Holds NO workspace files or memories
    // Is NOT a marketplace agent (no review, no listing)
    return {
      templateId: `tpl-${Date.now().toString(36)}`,
      templateUrl: `https://tiyandegital.com/template/${agentId}`,
      name,
      role,
      instructions: `Public link-only template instructions for ${name}.`,
      skills: ['git-commit-helper', 'code-review-analyzer'],
      routines: [],
      isPublicLinkOnly: true,
      hasWorkspaceFiles: false,
      hasMemories: false,
      isMarketplaceItem: false,
    };
  }

  // -------------------------------------------------------------
  // ACCOUNT API MARKETPLACE PAGES SERVICE
  // -------------------------------------------------------------

  public getMarketplacePage(route: 'landing' | 'news' | 'guides' | 'items'): {
    title: string;
    servedBy: 'api.tiyandegital.com';
    content: any;
  } {
    switch (route) {
      case 'landing':
        return {
          title: 'BissBot Marketplace Registry',
          servedBy: 'api.tiyandegital.com',
          content: {
            headline: 'Extend your multi-agent cluster with verified tools and personas',
            stats: this.getRegistryCounts(),
            featuredBundle: this.getItemBySlug('pstack'),
          },
        };
      case 'news':
        return {
          title: 'BissBot Engineering News',
          servedBy: 'api.tiyandegital.com',
          content: {
            articles: [
              { title: 'Model Context Protocol (MCP) v1alpha Integration', date: '2026-11-10' },
              { title: 'pstack Core Bundle Released under MIT License', date: '2026-11-08' },
            ],
          },
        };
      case 'guides':
        return {
          title: 'Marketplace Development Guides',
          servedBy: 'api.tiyandegital.com',
          content: {
            guides: [
              { title: 'Authoring an MCP Tool Bridge', slug: 'authoring-mcp' },
              { title: 'Distributing Custom Skills to Your Team', slug: 'distributing-skills' },
            ],
          },
        };
      case 'items':
      default:
        return {
          title: 'Marketplace Catalog',
          servedBy: 'api.tiyandegital.com',
          content: {
            items: this.items,
            counts: this.getRegistryCounts(),
          },
        };
    }
  }
}

export const marketplaceService = new MarketplaceService();
