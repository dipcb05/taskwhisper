import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"

class MCPManager {
  private clients: Map<string, Client> = new Map()

  async connect(id: string, url: string) {
    if (this.clients.has(id)) {
      return this.clients.get(id)
    }

    try {
      const transport = new SSEClientTransport(new URL(url))
      const client = new Client(
        {
          name: "TaskWhisper-Web-Client",
          version: "1.0.0",
        },
        {
          capabilities: {
            prompts: {},
            resources: {},
            tools: {},
          },
        }
      )

      await client.connect(transport)
      this.clients.set(id, client)
      console.log(`Connected to MCP server: ${url}`)
      return client
    } catch (error) {
      console.error(`Failed to connect to MCP server at ${url}:`, error)
      throw error
    }
  }

  async disconnect(id: string) {
    const client = this.clients.get(id)
    if (client) {
      await client.close()
      this.clients.delete(id)
    }
  }

  getClient(id: string) {
    return this.clients.get(id)
  }

  async callTool(serverId: string, toolName: string, args: any) {
    const client = this.clients.get(serverId)
    if (!client) throw new Error("Server not connected")
    return await client.callTool({ name: toolName, arguments: args })
  }

  async listTools(serverId: string) {
    const client = this.clients.get(serverId)
    if (!client) throw new Error("Server not connected")
    return await client.listTools()
  }
}

// Singleton instance
export const mcpManager = new MCPManager()
