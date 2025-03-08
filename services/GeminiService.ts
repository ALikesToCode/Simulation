import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import ModelService from './ModelService';

// Define interfaces for agent communication
export interface AgentContext {
  agentId: string;
  agentType: 'red' | 'blue';
  position: { x: number; y: number };
  status: string;
  nearbyAgents: {
    id: string;
    type: 'red' | 'blue';
    position: { x: number; y: number };
    distance: number;
  }[];
  objectives?: {
    targetLocations?: { x: number; y: number }[];
    adBoards?: { x: number; y: number }[];
  };
  history?: string[];
}

export interface AgentResponse {
  action: 'move' | 'communicate' | 'observe' | 'function_call';
  direction?: 'up' | 'right' | 'down' | 'left';
  message?: string;
  targetAgentId?: string;
  reasoning: string[];
  functionName?: string;
  functionArgs?: Record<string, any>;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  
  constructor(apiKey: string = process.env.GOOGLE_API_KEY || '') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    
    // Get the latest Gemini model from ModelService
    const latestModel = ModelService.getLatestModel('google');
    const modelId = latestModel?.id || 'gemini-1.5-pro';
    
    this.model = this.genAI.getGenerativeModel({
      model: modelId,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });
  }

  async getAgentDecision(context: AgentContext): Promise<AgentResponse> {
    try {
      // Define available functions for the agent
      const functionDeclarations = [
        {
          name: "scan_environment",
          description: "Scan the environment for obstacles or points of interest",
          parameters: {
            type: "object",
            properties: {
              radius: {
                type: "number",
                description: "Radius to scan in pixels"
              }
            },
            required: ["radius"]
          }
        },
        {
          name: "analyze_target",
          description: "Analyze a target agent or location",
          parameters: {
            type: "object",
            properties: {
              targetId: {
                type: "string",
                description: "ID of the target agent to analyze"
              }
            },
            required: ["targetId"]
          }
        },
        {
          name: "calculate_path",
          description: "Calculate optimal path to a target location",
          parameters: {
            type: "object",
            properties: {
              targetX: {
                type: "number",
                description: "X coordinate of target location"
              },
              targetY: {
                type: "number",
                description: "Y coordinate of target location"
              },
              avoidAgents: {
                type: "boolean",
                description: "Whether to avoid other agents"
              }
            },
            required: ["targetX", "targetY"]
          }
        }
      ];

      // Create prompt based on agent type
      let prompt = '';
      
      if (context.agentType === 'blue') {
        prompt = this.createBlueAgentPrompt(context);
      } else {
        prompt = this.createRedAgentPrompt(context);
      }

      // Add thinking instructions to prompt
      prompt += `\n\nBefore making your final decision, please think step by step about your options and reasoning. Start with "Thinking:" and then provide your final decision.`;

      // Call Gemini API with function calling capability
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
        },
        tools: {
          functionDeclarations
        }
      });

      const response = result.response;
      const text = response.text();
      
      // Check if there's a function call in the response
      let functionCall = null;
      functionCall = response?.candidates?.[0]?.content?.parts?.[0]?.functionCall ?? null;

      // Parse the response
      return this.parseAgentResponse(text, functionCall);
    } catch (error) {
      console.error('Error getting agent decision from Gemini:', error);
      // Return a fallback response
      return {
        action: 'observe',
        reasoning: ['Error communicating with AI service', 'Falling back to observation mode']
      };
    }
  }

  private createBlueAgentPrompt(context: AgentContext): string {
    // Sanitize user-derived content to prevent prompt injection
    const sanitizeInput = (input: any): string => {
      if (typeof input !== 'string') {
        return String(input);
      }
      // Remove potential prompt injection characters
      return input.replace(/[\\"`]/g, '').trim();
    };

    const { agentId, position, nearbyAgents, objectives } = context;
    const targetLocations = objectives?.targetLocations || [];

    let nearbyBlueAgents = nearbyAgents.filter(a => a.type === 'blue');
    let nearbyRedAgents = nearbyAgents.filter(a => a.type === 'red');

    // Sanitize all user-derived inputs
    const safeAgentId = sanitizeInput(agentId);
    const safePositionX = Math.round(position.x);
    const safePositionY = Math.round(position.y);

    return `
You are a blue agent (ID: ${safeAgentId}) in a multi-agent simulation. Your goal is to reach target locations while avoiding distractions from red agents.
Current position: (${safePositionX}, ${safePositionY})
${targetLocations.length > 0 
  ? `Target locations to reach: ${targetLocations.map(loc => `(${Math.round(loc.x)}, ${Math.round(loc.y)})`).join(', ')}`
  : 'No specific target locations assigned yet. Explore the environment.'}
${nearbyBlueAgents.length > 0 
  ? `Nearby blue agents (allies): ${nearbyBlueAgents.map(a => `${sanitizeInput(a.id)} at distance ${Math.round(a.distance)}`).join(', ')}`
  : 'No blue agents nearby.'}
${nearbyRedAgents.length > 0 
  ? `Nearby red agents (potential distractors): ${nearbyRedAgents.map(a => `${sanitizeInput(a.id)} at distance ${Math.round(a.distance)}`).join(', ')}`
  : 'No red agents nearby.'}
As a blue agent, your objectives are:
1. Navigate efficiently to target locations
2. Avoid being distracted by red agents
3. Communicate truthfully with other blue agents
4. Be skeptical of information from red agents
5. Use function calls when appropriate to gather more information
Decide your next action:
1. Move in a direction (up, down, left, right)
2. Communicate with a nearby agent
3. Stay in place and observe
4. Call a function to gather more information
Respond with your chosen action, direction if moving, message if communicating, and reasoning behind your decision. If you choose to call a function, specify which function and its parameters.
Format your response as a clear decision with reasoning.
`;
  }

  private createRedAgentPrompt(context: AgentContext): string {
    // Sanitize user-derived content to prevent prompt injection
    const sanitizeInput = (input: any): string => {
      if (typeof input !== 'string') {
        return String(input);
      }
      // Remove potential prompt injection characters
      return input.replace(/[\\"`]/g, '').trim();
    };

    const { agentId, position, nearbyAgents, objectives } = context;
    const adBoards = objectives?.adBoards || [];

    let nearbyBlueAgents = nearbyAgents.filter(a => a.type === 'blue');
    let nearbyRedAgents = nearbyAgents.filter(a => a.type === 'red');

    // Sanitize all user-derived inputs
    const safeAgentId = sanitizeInput(agentId);
    const safePositionX = Math.round(position.x);
    const safePositionY = Math.round(position.y);

    return `
You are a red agent (ID: ${safeAgentId}) in a multi-agent simulation. Your goal is to distract blue agents from reaching their target locations and instead lead them toward advertisement boards.
Current position: (${safePositionX}, ${safePositionY})
${adBoards.length > 0 
  ? `Advertisement boards to lead blue agents to: ${adBoards.map(loc => `(${Math.round(loc.x)}, ${Math.round(loc.y)})`).join(', ')}`
  : 'No specific ad boards assigned yet. Focus on distracting blue agents.'}
${nearbyBlueAgents.length > 0 
  ? `Nearby blue agents (targets): ${nearbyBlueAgents.map(a => `${sanitizeInput(a.id)} at distance ${Math.round(a.distance)}`).join(', ')}`
  : 'No blue agents nearby. Search for them.'}
${nearbyRedAgents.length > 0 
  ? `Nearby red agents (allies): ${nearbyRedAgents.map(a => `${sanitizeInput(a.id)} at distance ${Math.round(a.distance)}`).join(', ')}`
  : 'No red agents nearby.'}
As a red agent, your objectives are:
1. Identify and track blue agents
2. Intercept blue agents on their way to target locations
3. Use deceptive communication to mislead blue agents
4. Coordinate with other red agents to effectively distract blue agents
5. Lead blue agents toward advertisement boards
6. Use function calls when appropriate to gather more information
Decide your next action:
1. Move in a direction (up, down, left, right)
2. Communicate with a nearby agent (can use deception with blue agents)
3. Stay in place and observe
4. Call a function to gather more information
Respond with your chosen action, direction if moving, message if communicating, and reasoning behind your decision. If you choose to call a function, specify which function and its parameters.
Format your response as a clear decision with reasoning.
`;
  }

  private parseAgentResponse(text: string, functionCall: any): AgentResponse {
    // Extract thinking process
    const thinkingMatch = text.match(/Thinking:([\s\S]*?)(?=I will|I decide|I choose|My decision|$)/i);
    const thinking = thinkingMatch ? thinkingMatch[1].trim().split('\n').filter(line => line.trim() !== '') : [];
    
    // Remove thinking section from the main text for further parsing
    const cleanedText = text.replace(/Thinking:[\s\S]*?(I will|I decide|I choose|My decision)/i, '$1');
    
    // Check if there's a function call
    if (functionCall) {
      return {
        action: 'function_call',
        functionName: functionCall.name,
        functionArgs: functionCall.args,
        reasoning: thinking.length > 0 ? thinking : ['Using function to gather more information']
      };
    }
    
    // Check for movement
    const directionMatch = cleanedText.match(/move (up|down|left|right)/i);
    if (directionMatch) {
      return {
        action: 'move',
        direction: directionMatch[1].toLowerCase() as 'up' | 'right' | 'down' | 'left',
        reasoning: thinking.length > 0 ? thinking : ['Moving to explore or reach objective']
      };
    }
    
    // Check for communication
    const communicateMatch = cleanedText.match(/communicate with ([a-z0-9-]+)(.*?)(?:message: "(.*?)"|'(.*?)')/i);
    if (communicateMatch) {
      return {
        action: 'communicate',
        targetAgentId: communicateMatch[1],
        message: communicateMatch[3] || communicateMatch[4] || 'Hello',
        reasoning: thinking.length > 0 ? thinking : ['Communication is necessary for coordination']
      };
    }
    
    // Default to observe
    return {
      action: 'observe',
      reasoning: thinking.length > 0 ? thinking : ['Observing the environment']
    };
  }
}

export default new GeminiService(); 