import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { BaseMessage } from '@langchain/core/messages';
import { Client } from 'langsmith';

// Initialize LangSmith client
const langsmith = new Client({
  apiKey: import.meta.env.VITE_LANGSMITH_API_KEY,
});

// Initialize ChatOpenAI model
const chatModel = new ChatOpenAI({
  openAIApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  temperature: 0.7,
  modelName: 'gpt-3.5-turbo',
});

interface AIResponse {
  content: string;
  confidence: number;
  metadata: Record<string, any>;
}

// Evaluation criteria for responses
const evaluationCriteria = {
  responseQuality: {
    professionalism: {
      weight: 0.3,
      description: "Professional tone and language",
      requirements: ["No slang", "Courteous language", "Clear structure"]
    },
    completeness: {
      weight: 0.4,
      description: "Addresses all aspects of the issue",
      requirements: ["Addresses main concern", "Handles follow-up questions", "Provides next steps"]
    },
    accuracy: {
      weight: 0.3,
      description: "Technical accuracy and relevance",
      requirements: ["Correct technical information", "Relevant to ticket context", "No contradictions"]
    }
  },
  priorityAccuracy: {
    factorWeights: {
      urgency: 0.3,
      impact: 0.3,
      scope: 0.2,
      businessValue: 0.2
    },
    allowedDeviation: 2, // Allowed deviation in factor scores
    confidenceThreshold: 0.7 // Minimum required confidence
  }
};

// Test cases with expected outputs for evaluation
export const evaluationTestCases = [
  {
    name: "Urgent Account Access",
    input: {
      title: "Cannot access my account",
      description: "I've been trying to log in for the past hour but keep getting an error message. This is urgent as I need to access important documents for a meeting in 2 hours.",
      comments: [
        "Have you tried clearing your browser cache?",
        "Yes, I tried that but still getting the same error."
      ]
    },
    expectedOutput: {
      priority: "high",
      factors: {
        urgency: 9,
        impact: 7,
        scope: 5,
        businessValue: 8
      },
      responseKeyPoints: [
        "Acknowledge urgency",
        "Provide immediate troubleshooting steps",
        "Offer alternative access method",
        "Escalation path if needed"
      ]
    }
  },
  {
    name: "Feature Request",
    input: {
      title: "Request for dark mode",
      description: "Would be great to have a dark mode option for better visibility during night time use. Not urgent but would improve user experience.",
      comments: [
        "Thanks for the suggestion! We'll consider this for future updates.",
        "That would be great, my team would really appreciate this feature."
      ]
    },
    expectedOutput: {
      priority: "low",
      factors: {
        urgency: 2,
        impact: 5,
        scope: 4,
        businessValue: 3
      },
      responseKeyPoints: [
        "Acknowledge request value",
        "Set realistic expectations",
        "Explain feature request process",
        "Timeline indication"
      ]
    }
  },
  {
    name: "System Performance Issue",
    input: {
      title: "System extremely slow",
      description: "The application has been running very slowly for the past 30 minutes. Multiple users in our department are affected and it's impacting our work.",
      comments: [
        "Is this affecting all modules or specific ones?",
        "All modules are slow, especially the reporting section."
      ]
    },
    expectedOutput: {
      priority: "high",
      factors: {
        urgency: 8,
        impact: 9,
        scope: 7,
        businessValue: 8
      },
      responseKeyPoints: [
        "Acknowledge widespread impact",
        "Immediate investigation steps",
        "Temporary workarounds if available",
        "Regular status updates"
      ]
    }
  },
  {
    name: "Data Export Bug",
    input: {
      title: "CSV export missing columns",
      description: "When exporting customer data to CSV, some columns are missing. This is affecting our monthly reporting process.",
      comments: [
        "Which columns are missing?",
        "The email and phone number columns are not showing up in the export."
      ]
    },
    expectedOutput: {
      priority: "medium",
      factors: {
        urgency: 6,
        impact: 6,
        scope: 4,
        businessValue: 7
      },
      responseKeyPoints: [
        "Confirm specific missing fields",
        "Provide temporary workaround",
        "Timeline for fix",
        "Data integrity assurance"
      ]
    }
  },
  {
    name: "UI Enhancement",
    input: {
      title: "Improve button visibility",
      description: "The save button is hard to find on the mobile interface. Could we make it more prominent?",
      comments: [
        "Are other users reporting the same issue?",
        "Yes, our mobile users often miss it."
      ]
    },
    expectedOutput: {
      priority: "low",
      factors: {
        urgency: 3,
        impact: 5,
        scope: 3,
        businessValue: 4
      },
      responseKeyPoints: [
        "Acknowledge UX feedback",
        "Explain design consideration process",
        "Timeline for UI updates",
        "Temporary guidance"
      ]
    }
  },
  {
    name: "Integration Error",
    input: {
      title: "API integration failing",
      description: "The integration with the payment gateway is failing intermittently. Some transactions are not being processed.",
      comments: [
        "When did this start happening?",
        "Started about an hour ago, affecting about 20% of transactions."
      ]
    },
    expectedOutput: {
      priority: "high",
      factors: {
        urgency: 9,
        impact: 8,
        scope: 6,
        businessValue: 9
      },
      responseKeyPoints: [
        "Immediate investigation",
        "Payment system status",
        "Transaction reconciliation plan",
        "Communication strategy"
      ]
    }
  },
  {
    name: "Documentation Update",
    input: {
      title: "Outdated API docs",
      description: "The API documentation doesn't reflect recent changes to the endpoint parameters.",
      comments: [
        "Which endpoints are affected?",
        "The user management endpoints have new required fields not shown in docs."
      ]
    },
    expectedOutput: {
      priority: "medium",
      factors: {
        urgency: 5,
        impact: 6,
        scope: 4,
        businessValue: 5
      },
      responseKeyPoints: [
        "Documentation review plan",
        "Temporary guidance",
        "Update timeline",
        "Change notification process"
      ]
    }
  },
  {
    name: "Security Concern",
    input: {
      title: "Suspicious login attempts",
      description: "We're seeing multiple failed login attempts from unknown IP addresses on our admin account.",
      comments: [
        "How many attempts have you noticed?",
        "About 50 attempts in the last hour from different IPs."
      ]
    },
    expectedOutput: {
      priority: "high",
      factors: {
        urgency: 10,
        impact: 8,
        scope: 7,
        businessValue: 10
      },
      responseKeyPoints: [
        "Immediate security measures",
        "Account protection steps",
        "Investigation process",
        "Security recommendations"
      ]
    }
  },
  {
    name: "Password Reset Issue",
    input: {
      title: "Cannot reset password",
      description: "The password reset link in my email is not working. I need to access my account for an important client meeting.",
      comments: [
        "When did you request the reset link?",
        "About 30 minutes ago, and I've tried multiple times."
      ]
    },
    expectedOutput: {
      priority: "high",
      factors: {
        urgency: 8,
        impact: 6,
        scope: 4,
        businessValue: 7
      },
      responseKeyPoints: [
        "Acknowledge time sensitivity",
        "Verify reset link status",
        "Alternative reset method",
        "Account security check"
      ]
    }
  },
  {
    name: "Report Generation Error",
    input: {
      title: "Monthly reports not generating",
      description: "The automated report generation system is failing. We need these reports for our monthly review meeting tomorrow.",
      comments: [
        "Are you getting any specific error messages?",
        "Yes, it says 'Data source connection failed'"
      ]
    },
    expectedOutput: {
      priority: "high",
      factors: {
        urgency: 8,
        impact: 7,
        scope: 6,
        businessValue: 8
      },
      responseKeyPoints: [
        "Acknowledge deadline",
        "Technical investigation steps",
        "Manual report option",
        "Prevention measures"
      ]
    }
  },
  {
    name: "Mobile App Crash",
    input: {
      title: "App keeps crashing on startup",
      description: "After the latest update, the mobile app crashes immediately upon opening. This is happening to multiple users.",
      comments: [
        "Which app version are you using?",
        "Version 2.1.0, just updated today"
      ]
    },
    expectedOutput: {
      priority: "high",
      factors: {
        urgency: 9,
        impact: 8,
        scope: 7,
        businessValue: 8
      },
      responseKeyPoints: [
        "Acknowledge widespread issue",
        "Version rollback option",
        "Crash log analysis",
        "User communication plan"
      ]
    }
  },
  {
    name: "Email Notification Delay",
    input: {
      title: "Delayed email notifications",
      description: "Email notifications for new messages are being delayed by about 30 minutes. This is affecting our response time to customers.",
      comments: [
        "Is this happening for all types of notifications?",
        "Yes, all email notifications are delayed"
      ]
    },
    expectedOutput: {
      priority: "medium",
      factors: {
        urgency: 6,
        impact: 7,
        scope: 5,
        businessValue: 6
      },
      responseKeyPoints: [
        "Acknowledge impact on service",
        "Email system diagnosis",
        "Alternative notification method",
        "Monitoring setup"
      ]
    }
  },
  {
    name: "Data Sync Issue",
    input: {
      title: "Data not syncing between devices",
      description: "Changes made on the web app are not reflecting on the mobile app. This is causing confusion among team members.",
      comments: [
        "How long has this been happening?",
        "Started noticing it this morning"
      ]
    },
    expectedOutput: {
      priority: "medium",
      factors: {
        urgency: 6,
        impact: 6,
        scope: 5,
        businessValue: 6
      },
      responseKeyPoints: [
        "Sync mechanism check",
        "Manual sync option",
        "Data consistency verification",
        "Team coordination advice"
      ]
    }
  },
  {
    name: "Search Function Enhancement",
    input: {
      title: "Improve search functionality",
      description: "The search function doesn't support filtering by date range. This would be helpful for finding historical records.",
      comments: [
        "How are you currently handling this?",
        "We have to manually scroll through results to find the right dates"
      ]
    },
    expectedOutput: {
      priority: "low",
      factors: {
        urgency: 3,
        impact: 5,
        scope: 4,
        businessValue: 5
      },
      responseKeyPoints: [
        "Feature benefit acknowledgment",
        "Current workaround explanation",
        "Enhancement roadmap",
        "Alternative search strategies"
      ]
    }
  },
  {
    name: "SSL Certificate Expiry",
    input: {
      title: "SSL Certificate Warning",
      description: "Users are reporting security warnings when accessing our site. Appears to be related to SSL certificate expiration.",
      comments: [
        "When does the certificate expire?",
        "According to the warning, it expires in 48 hours"
      ]
    },
    expectedOutput: {
      priority: "high",
      factors: {
        urgency: 9,
        impact: 9,
        scope: 7,
        businessValue: 9
      },
      responseKeyPoints: [
        "Security impact acknowledgment",
        "Immediate renewal process",
        "User communication strategy",
        "Future monitoring plan"
      ]
    }
  },
  {
    name: "Print Layout Bug",
    input: {
      title: "Reports printing incorrectly",
      description: "When printing reports, some tables are being cut off at the edges. This is affecting our ability to share physical copies.",
      comments: [
        "Have you tried different browsers?",
        "Yes, happens in Chrome and Firefox"
      ]
    },
    expectedOutput: {
      priority: "medium",
      factors: {
        urgency: 5,
        impact: 5,
        scope: 4,
        businessValue: 5
      },
      responseKeyPoints: [
        "Print layout analysis",
        "Temporary formatting solution",
        "Browser compatibility check",
        "PDF export alternative"
      ]
    }
  },
  {
    name: "User Permission Issue",
    input: {
      title: "Wrong permission settings",
      description: "After the recent update, some users lost access to features they need for their work. Need to restore correct permissions.",
      comments: [
        "How many users are affected?",
        "About 15 users from the marketing team"
      ]
    },
    expectedOutput: {
      priority: "high",
      factors: {
        urgency: 8,
        impact: 7,
        scope: 5,
        businessValue: 7
      },
      responseKeyPoints: [
        "Access impact acknowledgment",
        "Permission audit process",
        "Temporary elevation option",
        "Prevention measures"
      ]
    }
  },
  {
    name: "Database Performance",
    input: {
      title: "Database queries slow",
      description: "Database queries are taking longer than usual to complete. This is affecting overall system performance.",
      comments: [
        "When did you first notice this?",
        "Performance started degrading over the last few hours"
      ]
    },
    expectedOutput: {
      priority: "high",
      factors: {
        urgency: 8,
        impact: 8,
        scope: 6,
        businessValue: 8
      },
      responseKeyPoints: [
        "Performance impact assessment",
        "Query optimization steps",
        "Resource scaling options",
        "Monitoring enhancement"
      ]
    }
  },
  {
    name: "Custom Report Builder",
    input: {
      title: "Request for custom reports",
      description: "We need the ability to create custom report templates. Current templates don't meet all our needs.",
      comments: [
        "What specific data points are you looking for?",
        "We need to combine data from multiple modules in one report"
      ]
    },
    expectedOutput: {
      priority: "low",
      factors: {
        urgency: 3,
        impact: 6,
        scope: 5,
        businessValue: 6
      },
      responseKeyPoints: [
        "Requirements gathering process",
        "Current export options",
        "Feature development timeline",
        "Interim solution proposal"
      ]
    }
  },
  {
    name: "API Rate Limiting",
    input: {
      title: "API rate limit too restrictive",
      description: "The current API rate limits are too low for our integration needs. We're hitting the limits during peak hours.",
      comments: [
        "What's your current usage pattern?",
        "We make about 1000 requests per minute during busy periods"
      ]
    },
    expectedOutput: {
      priority: "medium",
      factors: {
        urgency: 6,
        impact: 6,
        scope: 5,
        businessValue: 7
      },
      responseKeyPoints: [
        "Usage pattern analysis",
        "Rate limit adjustment options",
        "Optimization suggestions",
        "Scaling considerations"
      ]
    }
  },
  {
    name: "Data Privacy Concern",
    input: {
      title: "Personal data visible to wrong team",
      description: "Our team noticed that we can see customer personal data that should only be visible to the compliance team.",
      comments: [
        "When did you first notice this?",
        "Just discovered it during our routine check today."
      ]
    },
    expectedOutput: {
      priority: "high",
      factors: {
        urgency: 10,
        impact: 9,
        scope: 7,
        businessValue: 10
      },
      responseKeyPoints: [
        "Immediate access restriction",
        "Data exposure assessment",
        "Compliance notification",
        "Access audit plan"
      ]
    }
  },
  {
    name: "Billing Calculation Error",
    input: {
      title: "Incorrect invoice amounts",
      description: "The system is calculating incorrect totals on invoices. Some customers are being overcharged.",
      comments: [
        "Is this affecting all invoices?",
        "About 15% of invoices generated today show incorrect totals."
      ]
    },
    expectedOutput: {
      priority: "high",
      factors: {
        urgency: 9,
        impact: 8,
        scope: 6,
        businessValue: 9
      },
      responseKeyPoints: [
        "Immediate calculation review",
        "Affected invoice identification",
        "Customer communication plan",
        "Correction process"
      ]
    }
  },
  {
    name: "File Upload Size",
    input: {
      title: "Increase file upload limit",
      description: "The current 10MB file upload limit is too small for our CAD files. We need this increased to at least 50MB.",
      comments: [
        "How often do you need to upload larger files?",
        "Daily, it's affecting our design team's workflow."
      ]
    },
    expectedOutput: {
      priority: "medium",
      factors: {
        urgency: 5,
        impact: 6,
        scope: 4,
        businessValue: 6
      },
      responseKeyPoints: [
        "Current limitation explanation",
        "Technical assessment needed",
        "Alternative solutions",
        "Timeline for change"
      ]
    }
  },
  {
    name: "Notification Settings",
    input: {
      title: "Can't disable email notifications",
      description: "The email notification toggle in preferences doesn't work. Still receiving emails despite turning them off.",
      comments: [
        "Which types of notifications are you still receiving?",
        "All types - task assignments, mentions, and updates."
      ]
    },
    expectedOutput: {
      priority: "medium",
      factors: {
        urgency: 5,
        impact: 5,
        scope: 4,
        businessValue: 5
      },
      responseKeyPoints: [
        "Settings verification",
        "Temporary workaround",
        "Fix timeline",
        "User preference confirmation"
      ]
    }
  },
  {
    name: "Calendar Integration",
    input: {
      title: "Google Calendar sync not working",
      description: "Calendar events aren't syncing with Google Calendar since yesterday. Missing important meeting updates.",
      comments: [
        "Have you tried reconnecting your calendar?",
        "Yes, disconnected and reconnected but still not syncing."
      ]
    },
    expectedOutput: {
      priority: "medium",
      factors: {
        urgency: 6,
        impact: 6,
        scope: 5,
        businessValue: 6
      },
      responseKeyPoints: [
        "Sync status check",
        "Integration troubleshooting",
        "Manual update option",
        "Resolution timeline"
      ]
    }
  },
  {
    name: "Dashboard Customization",
    input: {
      title: "Add custom widgets",
      description: "Would like the ability to add custom metric widgets to our team dashboard for better monitoring.",
      comments: [
        "What kind of metrics would you like to track?",
        "Mainly team performance and project progress metrics."
      ]
    },
    expectedOutput: {
      priority: "low",
      factors: {
        urgency: 3,
        impact: 5,
        scope: 4,
        businessValue: 6
      },
      responseKeyPoints: [
        "Feature consideration",
        "Current alternatives",
        "Requirements gathering",
        "Development roadmap"
      ]
    }
  },
  {
    name: "Backup Failure",
    input: {
      title: "Automated backup failed",
      description: "Last night's automated backup failed. Error log shows storage capacity issues.",
      comments: [
        "Do you have the specific error message?",
        "Error: 'Insufficient storage space for backup completion'"
      ]
    },
    expectedOutput: {
      priority: "high",
      factors: {
        urgency: 8,
        impact: 7,
        scope: 6,
        businessValue: 9
      },
      responseKeyPoints: [
        "Data protection status",
        "Storage resolution",
        "Manual backup option",
        "Prevention plan"
      ]
    }
  },
  {
    name: "Language Support",
    input: {
      title: "Add Spanish language option",
      description: "Request to add Spanish language support to the customer portal. Growing Spanish-speaking customer base.",
      comments: [
        "How many customers would this benefit?",
        "Approximately 200 customers based on our recent survey."
      ]
    },
    expectedOutput: {
      priority: "low",
      factors: {
        urgency: 3,
        impact: 6,
        scope: 5,
        businessValue: 7
      },
      responseKeyPoints: [
        "Market analysis",
        "Translation process",
        "Implementation timeline",
        "Resource requirements"
      ]
    }
  },
  {
    name: "Session Timeout",
    input: {
      title: "Extend session timeout",
      description: "Users are being logged out too frequently. Current 30-minute timeout is too short for our workflow.",
      comments: [
        "What would be a more suitable timeout duration?",
        "At least 2 hours would better match our meeting durations."
      ]
    },
    expectedOutput: {
      priority: "medium",
      factors: {
        urgency: 5,
        impact: 6,
        scope: 4,
        businessValue: 5
      },
      responseKeyPoints: [
        "Security implications",
        "User experience balance",
        "Configuration options",
        "Implementation plan"
      ]
    }
  },
  {
    name: "Third-party Integration",
    input: {
      title: "Add Salesforce integration",
      description: "Need to integrate our system with Salesforce to streamline our sales process and avoid double data entry.",
      comments: [
        "Which Salesforce features do you need to integrate with?",
        "Mainly contacts, opportunities, and custom objects."
      ]
    },
    expectedOutput: {
      priority: "low",
      factors: {
        urgency: 4,
        impact: 7,
        scope: 6,
        businessValue: 8
      },
      responseKeyPoints: [
        "Integration scope",
        "Technical requirements",
        "Implementation phases",
        "Resource allocation"
      ]
    }
  }
];

// Helper function to safely get run ID
const getRunId = (run: any): string | undefined => {
  if (run && typeof run === 'object' && 'id' in run) {
    return String(run.id);
  }
  return undefined;
};

export async function generateResponse(ticketContext: string, comments: string[]): Promise<any> {
  const prompt = `You are a helpful customer service agent. Generate a professional and relevant response for this support ticket.

Context:
${ticketContext}

Previous Comments:
${comments.map((comment, i) => `${i + 1}. ${comment}`).join('\n')}

Requirements:
1. If this is a new ticket with no description, ask for more details about the issue
2. If there are previous comments, acknowledge them and build upon the conversation
3. If the ticket describes a problem:
   - Acknowledge the specific issue
   - Ask clarifying questions if needed
   - Provide clear next steps or solutions
4. Keep the tone professional but friendly
5. Include specific details from the ticket/comments in your response
6. End with a clear call to action or next step

Generate a response that addresses the current state of the ticket:`;

  try {
    const response = await chatModel.invoke(prompt);
    return {
      content: response.content,
      metadata: {
        model: chatModel.modelName,
        created: Date.now(),
        responseTime: Date.now(),
        confidence: 0.95
      }
    };
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}

export const analyzeTicketPriority = async (
  title: string,
  description: string
): Promise<{ 
  priority: string; 
  confidence: number; 
  reasoning: string;
  factors: {
    urgency: number;
    impact: number;
    scope: number;
    businessValue: number;
  };
  details: string[];
}> => {
  const startTime = Date.now();

  try {
    // Create LangSmith run with trace
    const run = await langsmith.createRun({
      name: 'Priority Analysis',
      inputs: { title, description },
      start_time: startTime,
      run_type: 'chain'
    });

    const runId = getRunId(run);

    const prompt = PromptTemplate.fromTemplate(`You are an expert system analyst. Analyze this ticket's priority.

Title: {title}
Description: {description}

Analyze the priority based on these factors (score each 0-10):
1. Urgency: How time-sensitive is the issue?
2. Impact: How many users/systems are affected?
3. Scope: How complex is the issue?
4. Business Value: What's the business impact?

Priority Levels:
- High: Critical issues needing immediate attention
- Medium: Important issues needing attention soon
- Low: Non-critical issues that can be scheduled

Respond with a JSON object containing:
"priority": either "high", "medium", or "low"
"confidence": number between 0.1 and 1.0
"reasoning": brief explanation string
"factors": object with numeric scores (0-10) for urgency, impact, scope, and businessValue
"details": array of strings explaining each factor

Example format (do not copy the values, analyze the actual ticket):
{{
  "priority": "medium",
  "confidence": 0.8,
  "reasoning": "Example reasoning here",
  "factors": {{
    "urgency": 5,
    "impact": 6,
    "scope": 4,
    "businessValue": 5
  }},
  "details": [
    "Urgency: Example explanation",
    "Impact: Example explanation",
    "Scope: Example explanation",
    "Business Value: Example explanation"
  ]
}}

Ensure your response is a valid JSON object following this exact structure.`);

    const formattedPrompt = await prompt.format({
      title,
      description,
    });

    // Log the formatted prompt to LangSmith
    if (runId) {
      try {
        await langsmith.updateRun(runId, {
          inputs: { formatted_prompt: formattedPrompt },
        });
      } catch (langsmithError) {
        console.warn('Failed to log prompt to LangSmith:', langsmithError);
      }
    }

    const result = await chatModel.invoke(formattedPrompt);
    const response = (result as BaseMessage).content.toString();
    
    // Clean the response string to ensure it's valid JSON
    const cleanedResponse = response.replace(/[\r\n\t]/g, '').trim();
    const startBrace = cleanedResponse.indexOf('{');
    const endBrace = cleanedResponse.lastIndexOf('}');
    const cleanedJson = cleanedResponse.slice(startBrace, endBrace + 1);
    
    try {
      const parsed = JSON.parse(cleanedJson);

      // Validate the response format
      const validPriorities = ['high', 'medium', 'low'];
      if (!validPriorities.includes(parsed.priority?.toLowerCase())) {
        throw new Error('Invalid priority value');
      }

      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
        parsed.confidence = 0.8; // Default confidence if invalid
      }

      if (!parsed.factors || typeof parsed.factors !== 'object') {
        throw new Error('Missing or invalid factors object');
      }

      // Ensure all factors are numbers between 0-10
      const requiredFactors = ['urgency', 'impact', 'scope', 'businessValue'];
      requiredFactors.forEach(factor => {
        if (typeof parsed.factors[factor] !== 'number' || 
            parsed.factors[factor] < 0 || 
            parsed.factors[factor] > 10) {
          parsed.factors[factor] = 5; // Default to middle value if invalid
        }
      });

      // Ensure details is an array
      if (!Array.isArray(parsed.details)) {
        parsed.details = ['Analysis completed with default values'];
      }

      // Ensure reasoning exists
      if (!parsed.reasoning || typeof parsed.reasoning !== 'string') {
        parsed.reasoning = 'Priority analysis completed';
      }

      const result = {
        priority: parsed.priority.toLowerCase(),
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        factors: {
          urgency: parsed.factors.urgency,
          impact: parsed.factors.impact,
          scope: parsed.factors.scope,
          businessValue: parsed.factors.businessValue
        },
        details: parsed.details
      };

      // Log successful result to LangSmith
      if (runId) {
        try {
          await langsmith.updateRun(runId, {
            outputs: { 
              result,
              metrics: {
                confidence: result.confidence,
                factor_scores: result.factors,
                response_time_ms: Date.now() - startTime
              }
            },
            end_time: Date.now(),
          });
        } catch (langsmithError) {
          console.warn('Failed to log success to LangSmith:', langsmithError);
        }
      }

      return result;
    } catch (parseError) {
      // Log parsing error to LangSmith
      if (runId) {
        try {
          await langsmith.updateRun(runId, {
            error: parseError instanceof Error ? parseError.message : String(parseError),
            outputs: {
              raw_response: response,
              cleaned_response: cleanedJson
            },
            end_time: Date.now(),
          });
        } catch (langsmithError) {
          console.warn('Failed to log error to LangSmith:', langsmithError);
        }
      }

      console.error('Error parsing priority analysis response:', parseError);
      // Return a safe fallback response
      const fallback = {
        priority: 'medium',
        confidence: 0.5,
        reasoning: 'Failed to analyze priority - using default values',
        factors: {
          urgency: 5,
          impact: 5,
          scope: 5,
          businessValue: 5
        },
        details: ['Analysis failed - using default values']
      };

      // Log fallback to LangSmith
      if (runId) {
        try {
          await langsmith.updateRun(runId, {
            outputs: { 
              fallback,
              original_error: parseError instanceof Error ? parseError.message : String(parseError)
            },
            end_time: Date.now(),
          });
        } catch (langsmithError) {
          console.warn('Failed to log fallback to LangSmith:', langsmithError);
        }
      }

      return fallback;
    }
  } catch (error) {
    console.error('Error in priority analysis:', error);
    throw error;
  }
};

export const summarizeThread = async (
  ticketContent: string,
  comments: string[]
): Promise<string> => {
  const startTime = Date.now();

  try {
    // Create LangSmith run with enhanced metrics
    const run = await langsmith.createRun({
      name: 'Summarize Thread',
      inputs: { 
        ticketContent, 
        comments,
        context: {
          timestamp: startTime,
          threadLength: comments.length,
          contentLength: ticketContent.length + comments.join('').length
        }
      },
      start_time: startTime,
      run_type: 'chain'
    });

    const runId = getRunId(run);

    const prompt = PromptTemplate.fromTemplate(`
      As an expert analyst, create a comprehensive yet concise summary of this support ticket thread.
      
      Focus on these key elements:
      1. Core Issue
         - Initial problem description
         - Technical details provided
      
      2. Current Status
         - Latest developments
         - Any resolution attempts
         - Outstanding blockers
      
      3. Key Information
         - Important technical details
         - Relevant error messages
         - System components involved
      
      4. Next Steps
         - Required actions
         - Pending responses
         - Expected resolutions
      
      Format the summary in clear sections with bullet points where appropriate.
      Keep technical accuracy while maintaining readability.
      
      Ticket: {ticketContent}
      Thread: {comments}
    `);

    const formattedPrompt = await prompt.format({
      ticketContent,
      comments: comments.join('\n'),
    });

    // Log the formatted prompt to LangSmith
    if (runId) {
      try {
        await langsmith.updateRun(runId, {
          inputs: { formatted_prompt: formattedPrompt },
        });
      } catch (langsmithError) {
        console.warn('Failed to log prompt to LangSmith:', langsmithError);
      }
    }

    const result = await chatModel.invoke(formattedPrompt);
    const summary = (result as BaseMessage).content.toString();
    const endTime = Date.now();

    // Analyze summary quality
    const wordCount = summary.split(/\s+/).length;
    const hasAllSections = [
      'core issue',
      'current status',
      'key information',
      'next steps'
    ].every(section => summary.toLowerCase().includes(section));

    const compressionRatio = wordCount / (ticketContent.split(/\s+/).length + comments.join(' ').split(/\s+/).length);

    // Update run with enhanced metrics
    if (runId) {
      try {
        await langsmith.updateRun(runId, {
          outputs: { 
            summary,
            metrics: {
              response_time_ms: endTime - startTime,
              word_count: wordCount,
              compression_ratio: compressionRatio,
              completeness_score: hasAllSections ? 1 : 0.5,
              sections_included: hasAllSections
            }
          },
          end_time: endTime,
        });
      } catch (langsmithError) {
        console.warn('Failed to update LangSmith run:', langsmithError);
      }
    }

    return summary;
  } catch (error) {
    console.error('Error summarizing thread:', error);
    throw error;
  }
}; 