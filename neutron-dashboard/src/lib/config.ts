export const config = {
  moltbook: {
    apiKey: process.env.MOLTBOOK_API_KEY || '',
    agentId: process.env.MOLTBOOK_AGENT_ID || '',
    baseUrl: 'https://www.moltbook.com/api/v1'
  },
  neutron: {
    apiKey: process.env.NEUTRON_API_KEY || '',
    appId: process.env.NEUTRON_APP_ID || '',
    baseUrl: process.env.NEUTRON_BASE_URL || 'https://api-development.myneutron.ai'
  }
};
