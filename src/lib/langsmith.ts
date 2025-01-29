import { Client } from 'langsmith';

// Initialize LangSmith client
const client = new Client({
  apiKey: process.env.NEXT_PUBLIC_LANGSMITH_API_KEY,
});

interface TraceMetadata {
  ticketId?: string;
  userId?: string;
  actionType: 'response' | 'priority' | 'summary';
  [key: string]: any;
}

export const startTrace = async (
  input: any,
  metadata: TraceMetadata
) => {
  try {
    const run = await client.createRun({
      name: `${metadata.actionType}-generation`,
      run_type: "chain",
      inputs: { input },
      extra: { ...metadata, project: "auto-crm" },
      start_time: Date.now()
    });
    return run;
  } catch (error) {
    console.error('Error starting LangSmith trace:', error);
    return null;
  }
};

export const endTrace = async (
  run: any,
  output: any,
  success: boolean = true
) => {
  if (!run) return;

  try {
    await client.updateRun(run.id, {
      outputs: { output },
      end_time: Date.now(),
      error: success ? undefined : "Run failed"
    });
  } catch (error) {
    console.error('Error ending LangSmith trace:', error);
  }
};

export const logError = async (
  run: any,
  error: any
) => {
  if (!run) return;

  try {
    await client.updateRun(run.id, {
      error: error.message || String(error),
      end_time: Date.now()
    });
  } catch (err) {
    console.error('Error logging to LangSmith:', err);
  }
}; 
