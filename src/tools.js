export const TOOLS = [
  {
    id: 'device-surveyor',
    title: 'Device Surveyor',
    description:
      'Scan and inventory all devices on the network. View hardware details, OS information, open ports, and track device history over time.',
    icon: '🔍',
    href: `${window.location.protocol}//${window.location.hostname}:3002`,
    target: '_blank',
    badge: 'Surveyor',
    category: 'Discovery',
  },
  {
    id: 'device-monitoring-api',
    title: 'Device Monitoring API',
    description:
      'REST API endpoint exposing live device statistics including current device count and change events tracked by the monitoring service.',
    icon: '🌐',
    href: '/api/devices/stats',
    target: '_blank',
    badge: 'API',
    category: 'Discovery',
  },
  {
    id: 'nmap-monitor',
    title: 'Nmap Monitor',
    description:
      'Run continuous or scheduled Nmap scans across your network. Detect new hosts, monitor port changes, and receive alerts on anomalies.',
    icon: '📡',
    href: `${window.location.protocol}//172.18.240.204:3001`,
    target: '_blank',
    badge: 'Monitor',
    category: 'Monitoring',
  },
  {
    id: 'rundeck',
    title: 'Rundeck',
    description:
      'Automate and schedule operational tasks across your infrastructure. Run jobs, manage workflows, and track execution history.',
    icon: '⚙️',
    href: null,
    target: null,
    badge: 'Automation',
    category: 'Automation',
    placeholder: true,
  },
  {
    id: 'rundeck-outputs',
    title: 'Rundeck Outputs',
    description:
      'Browse and search historical Rundeck job execution outputs. Quickly review logs, filter by job or node, and diagnose past automation runs.',
    icon: '📋',
    href: null,
    target: null,
    badge: 'Automation',
    category: 'Automation',
    placeholder: true,
  },
  {
    id: 'naming-tool',
    title: 'Naming Tool',
    description:
      'Generate and validate consistent hostnames, resource names, and identifiers based on your organisation\'s naming conventions and policies.',
    icon: '🏷️',
    href: null,
    target: null,
    badge: 'Utility',
    category: 'Utilities',
    placeholder: true,
  },
  {
    id: 'generic-api-docs',
    title: 'API Docs',
    description:
      'Centralised API documentation portal. Browse endpoint references, authentication guides, and request/response examples for internal services.',
    icon: '📖',
    href: null,
    target: null,
    badge: 'Docs',
    category: 'Documentation',
    placeholder: true,
  },
]
