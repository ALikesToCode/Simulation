import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import ModelService from './ModelService';

// Define interfaces for agent communication
export interface AgentContext {
  agentId: string;
  agentType: 'red' | 'blue';
  position: { x: number; y: number; lat?: number; lng?: number };
  status: string;
  nearbyAgents: {
    id: string;
    type: 'red' | 'blue';
    position: { x: number; y: number; lat?: number; lng?: number };
    distance: number;
  }[];
  objectives?: {
    targetLocations?: { x: number; y: number; lat?: number; lng?: number }[];
    adBoards?: { x: number; y: number; lat?: number; lng?: number }[];
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
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private isApiAvailable: boolean = false;
  private apiKey: string = '';
  private retryCount: number = 0;
  private maxRetries: number = 3;
  
  constructor(apiKey: string = process.env.GOOGLE_API_KEY || '') {
    this.apiKey = apiKey;
    this.initializeApi();
  }
  
  private initializeApi(): void {
    try {
      if (!this.apiKey || this.apiKey === 'your_google_api_key_here') {
        console.warn('Invalid or missing Google API key. Using local fallback for agent decisions.');
        this.isApiAvailable = false;
        return;
      }
      
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      
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
      
      this.isApiAvailable = true;
      console.log('Gemini API initialized successfully with model:', modelId);
    } catch (error) {
      console.error('Failed to initialize Gemini API:', error);
      this.isApiAvailable = false;
    }
  }

  async getAgentDecision(context: AgentContext): Promise<AgentResponse> {
    // If API is not available or we've exceeded retry count, use local fallback
    if (!this.isApiAvailable || this.retryCount >= this.maxRetries) {
      return this.getLocalAgentDecision(context);
    }
    
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

      // Reset retry count on success
      this.retryCount = 0;
      
      // Parse the response
      return this.parseAgentResponse(text, functionCall);
    } catch (error) {
      console.error('Error getting agent decision from Gemini:', error);
      
      // Increment retry count
      this.retryCount++;
      
      // If we've exceeded max retries, mark API as unavailable
      if (this.retryCount >= this.maxRetries) {
        console.warn(`Exceeded maximum retries (${this.maxRetries}). Marking Gemini API as unavailable.`);
        this.isApiAvailable = false;
      }
      
      // Return a fallback response using local decision making
      return this.getLocalAgentDecision(context);
    }
  }

  /**
   * Local fallback for agent decision making when the API is unavailable
   */
  private getLocalAgentDecision(context: AgentContext): AgentResponse {
    const { agentType, nearbyAgents, position, objectives } = context;
    
    // Simple rule-based decision making
    if (agentType === 'blue') {
      // Blue agents prioritize reaching target locations
      const targetLocations = objectives?.targetLocations || [];
      
      // If there are target locations, move towards the closest one
      if (targetLocations.length > 0) {
        // Find closest target
        let closestTarget = targetLocations[0];
        let closestDistance = this.calculateDistance(position, closestTarget);
        
        for (const target of targetLocations) {
          const distance = this.calculateDistance(position, target);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestTarget = target;
          }
        }
        
        // Determine direction to move
        const direction = this.getDirectionToTarget(position, closestTarget);
        
        return {
          action: 'move',
          direction,
          reasoning: [
            'API unavailable, using local decision making',
            `Moving towards closest target at (${Math.round(closestTarget.x)}, ${Math.round(closestTarget.y)})`,
            `Chosen direction: ${direction}`
          ]
        };
      }
      
      // If no targets, check if there are nearby red agents to avoid
      const nearbyRedAgents = nearbyAgents.filter(a => a.type === 'red');
      if (nearbyRedAgents.length > 0) {
        // Move away from the closest red agent
        const closestRed = nearbyRedAgents.reduce((closest, current) => 
          current.distance < closest.distance ? current : closest, nearbyRedAgents[0]);
        
        // Get opposite direction
        const directionToRed = this.getDirectionToTarget(position, closestRed.position);
        const oppositeDirection = this.getOppositeDirection(directionToRed);
        
        return {
          action: 'move',
          direction: oppositeDirection,
          reasoning: [
            'API unavailable, using local decision making',
            `Avoiding nearby red agent ${closestRed.id}`,
            `Moving in opposite direction: ${oppositeDirection}`
          ]
        };
      }
      
      // If no targets and no red agents, explore randomly
      const randomDirection = this.getRandomDirection();
      return {
        action: 'move',
        direction: randomDirection,
        reasoning: [
          'API unavailable, using local decision making',
          'No targets or threats detected',
          `Exploring randomly in direction: ${randomDirection}`
        ]
      };
    } else {
      // Red agents prioritize approaching blue agents
      const nearbyBlueAgents = nearbyAgents.filter(a => a.type === 'blue');
      
      if (nearbyBlueAgents.length > 0) {
        // Move towards the closest blue agent
        const closestBlue = nearbyBlueAgents.reduce((closest, current) => 
          current.distance < closest.distance ? current : closest, nearbyBlueAgents[0]);
        
        // If very close, communicate instead of moving
        if (closestBlue.distance < 50) {
          return {
            action: 'communicate',
            targetAgentId: closestBlue.id,
            message: 'Hey, I found a shortcut to your destination! Follow me.',
            reasoning: [
              'API unavailable, using local decision making',
              `Blue agent ${closestBlue.id} is nearby`,
              'Attempting to distract with communication'
            ]
          };
        }
        
        // Otherwise move towards the blue agent
        const direction = this.getDirectionToTarget(position, closestBlue.position);
        return {
          action: 'move',
          direction,
          reasoning: [
            'API unavailable, using local decision making',
            `Moving towards blue agent ${closestBlue.id}`,
            `Chosen direction: ${direction}`
          ]
        };
      }
      
      // If no blue agents nearby, move towards ad boards if available
      const adBoards = objectives?.adBoards || [];
      if (adBoards.length > 0) {
        // Find closest ad board
        let closestBoard = adBoards[0];
        let closestDistance = this.calculateDistance(position, closestBoard);
        
        for (const board of adBoards) {
          const distance = this.calculateDistance(position, board);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestBoard = board;
          }
        }
        
        // Determine direction to move
        const direction = this.getDirectionToTarget(position, closestBoard);
        
        return {
          action: 'move',
          direction,
          reasoning: [
            'API unavailable, using local decision making',
            `Moving towards ad board at (${Math.round(closestBoard.x)}, ${Math.round(closestBoard.y)})`,
            `Chosen direction: ${direction}`
          ]
        };
      }
      
      // If no blue agents and no ad boards, explore randomly
      const randomDirection = this.getRandomDirection();
      return {
        action: 'move',
        direction: randomDirection,
        reasoning: [
          'API unavailable, using local decision making',
          'No blue agents or ad boards detected',
          `Exploring randomly in direction: ${randomDirection}`
        ]
      };
    }
  }
  
  private calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
  }
  
  private getDirectionToTarget(from: { x: number; y: number }, to: { x: number; y: number }): 'up' | 'right' | 'down' | 'left' {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    
    // Determine primary direction based on which delta is larger
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }
  
  private getOppositeDirection(direction: 'up' | 'right' | 'down' | 'left'): 'up' | 'right' | 'down' | 'left' {
    switch (direction) {
      case 'up': return 'down';
      case 'right': return 'left';
      case 'down': return 'up';
      case 'left': return 'right';
    }
  }
  
  private getRandomDirection(): 'up' | 'right' | 'down' | 'left' {
    const directions: ('up' | 'right' | 'down' | 'left')[] = ['up', 'right', 'down', 'left'];
    return directions[Math.floor(Math.random() * directions.length)];
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
1. Distract blue agents from their targets
2. Lead blue agents toward advertisement boards
3. Coordinate with other red agents when possible
4. Use misleading but believable communication
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

  private parseAgentResponse(text: string, functionCall: any): AgentResponse {
    // Default response structure
    const response: AgentResponse = {
      action: 'observe',
      reasoning: []
    };
    
    // Extract reasoning from the text
    const reasoningMatch = text.match(/Thinking:(.*?)(?=I will|I decide|I choose|My decision|$)/is);
    if (reasoningMatch && reasoningMatch[1]) {
      // Split reasoning into bullet points and clean up
      response.reasoning = reasoningMatch[1]
        .split(/\d+\.|\n-|\n\*/)
        .map(r => r.trim())
        .filter(r => r.length > 0);
    }
    
    // Check for function call first
    if (functionCall) {
      response.action = 'function_call';
      response.functionName = functionCall.name;
      response.functionArgs = functionCall.args;
      return response;
    }
    
    // Check for movement direction
    const moveMatch = text.match(/move (up|down|left|right)/i);
    if (moveMatch) {
      response.action = 'move';
      response.direction = moveMatch[1].toLowerCase() as 'up' | 'right' | 'down' | 'left';
      return response;
    }
    
    // Check for communication
    const communicateMatch = text.match(/communicate with ([a-z0-9-_]+)/i);
    if (communicateMatch) {
      response.action = 'communicate';
      response.targetAgentId = communicateMatch[1];
      
      // Try to extract the message content
      const messageMatch = text.match(/message:?\s*["'](.+?)["']/i) || 
                          text.match(/say:?\s*["'](.+?)["']/i) ||
                          text.match(/communicate:?\s*["'](.+?)["']/i);
      
      if (messageMatch && messageMatch[1]) {
        response.message = messageMatch[1];
      } else {
        // Default message if none found
        response.message = "Hello, I'd like to share some information with you.";
      }
      
      return response;
    }
    
    // If no specific action was detected, return observe
    return response;
  }
}

export default new GeminiService(); 