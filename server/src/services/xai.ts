/**
 * xAI (Grok) API service
 * Centralized API calls to xAI with error handling and retries
 */

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface XAIResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }>;
}

export async function callXAI(
  apiKey: string,
  messages: ChatMessage[],
  tools: ToolDefinition[],
  toolName: string
): Promise<XAIResponse> {
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-3-mini-fast",
      messages,
      tools,
      tool_choice: { type: "function", function: { name: toolName } },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`xAI API error: ${response.status}`, errText);
    throw new Error(`xAI API error: ${response.status} - ${errText.slice(0, 200)}`);
  }

  return (await response.json()) as XAIResponse;
}
