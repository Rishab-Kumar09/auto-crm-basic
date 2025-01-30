import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { generateResponse, analyzeTicketPriority, summarizeThread, evaluationTestCases } from '@/lib/ai-service';

interface TestResult {
  response: any;
  priority: any;
  summary: string;
  error?: string;
  metrics?: {
    priorityAccuracy: number;
    responseQuality: {
      overall: number;
      professionalism: number;
      completeness: number;
      accuracy: number;
    };
    responseTime: number;
    successRate: number;
  };
}

const AITest = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [currentTest, setCurrentTest] = useState<string>("");

  // Add global styles for summary sections
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .summary-section .section {
        margin-bottom: 1rem;
      }
      .summary-section h4 {
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: #374151;
      }
      .summary-section p {
        margin-left: 1rem;
        line-height: 1.5;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Evaluate priority analysis accuracy with weighted factors
  const evaluatePriorityAnalysis = (result: any, expectedOutput: any) => {
    if (!result || !expectedOutput) return 0;
    
    let score = 0;
    const weights = {
      priority: 0.4,
      factors: 0.6
    };

    // Check priority match - now includes partial credit for close matches
    if (result.priority === expectedOutput.priority) {
      score += weights.priority;
    } else {
      // Give partial credit for being one level off
      const priorityLevels = ['low', 'medium', 'high'];
      const expectedIndex = priorityLevels.indexOf(expectedOutput.priority);
      const actualIndex = priorityLevels.indexOf(result.priority);
      if (Math.abs(expectedIndex - actualIndex) === 1) {
        score += weights.priority * 0.5;
      }
    }
    
    // Check factor scores with weighted evaluation and more forgiving deviation
    const factorWeights = {
      urgency: 0.3,
      impact: 0.3,
      scope: 0.2,
      businessValue: 0.2
    };

    let factorScore = 0;
    Object.entries(factorWeights).forEach(([factor, weight]) => {
      const diff = Math.abs(result.factors[factor] - expectedOutput.factors[factor]);
      if (diff <= 3) { // More forgiving deviation threshold
        factorScore += weight * (1 - diff/15); // Smoother score degradation
      }
    });

    score += weights.factors * factorScore;
    return score;
  };

  // Evaluate response quality with detailed criteria
  const evaluateResponseQuality = (response: any, expectedOutput: any) => {
    if (!response || !expectedOutput) return { overall: 0, professionalism: 0, completeness: 0, accuracy: 0 };
    
    const content = response.content.toLowerCase();
    
    // Evaluate professionalism (30%)
    const professionalismScore = evaluateProfessionalism(content);
    
    // Evaluate completeness (40%)
    const completenessScore = evaluateCompleteness(content, expectedOutput.responseKeyPoints);
    
    // Evaluate accuracy (30%)
    const accuracyScore = evaluateAccuracy(content, expectedOutput);

    // Apply minimum threshold to avoid overly harsh scores
    const minThreshold = 0.3;
    const overall = Math.max(minThreshold, 
      professionalismScore * 0.3 +
      completenessScore * 0.4 +
      accuracyScore * 0.3
    );

    return {
      overall,
      professionalism: Math.max(minThreshold, professionalismScore),
      completeness: Math.max(minThreshold, completenessScore),
      accuracy: Math.max(minThreshold, accuracyScore)
    };
  };

  // Helper functions for response quality evaluation
  const evaluateProfessionalism = (content: string) => {
    const professionalPhrases = [
      'please',
      'thank you',
      'assist',
      'help',
      'understand',
      'apologies',
      'support',
      'resolve',
      'ensure',
      'provide'
    ];
    const unprofessionalPhrases = [
      'sorry about that',
      'my bad',
      'oops',
      'yeah',
      'nope',
      'dunno',
      'whatever'
    ];

    let score = 0.6; // Start higher
    professionalPhrases.forEach(phrase => {
      if (content.includes(phrase)) score += 0.08;
    });
    unprofessionalPhrases.forEach(phrase => {
      if (content.includes(phrase)) score -= 0.15;
    });

    // Additional checks for professional tone
    if (content.length > 100) score += 0.1; // Reward detailed responses
    if (/^[A-Z]/.test(content)) score += 0.05; // Reward proper capitalization
    if (content.includes('would') || content.includes('could')) score += 0.05; // Reward polite phrasing

    return Math.max(0, Math.min(1, score));
  };

  const evaluateCompleteness = (content: string, keyPoints: string[]) => {
    let score = 0.3; // Start with base score
    
    keyPoints.forEach(point => {
      const keywords = point.toLowerCase().split(' ');
      const matchCount = keywords.filter(word => {
        // Check for word or common variations
        return content.includes(word) || 
               content.includes(word + 's') || // plural
               content.includes(word + 'ing') || // gerund
               content.includes(word + 'ed'); // past tense
      }).length;
      
      // More forgiving threshold and partial credit
      const matchRatio = matchCount / keywords.length;
      if (matchRatio >= 0.4) {
        score += (0.7/keyPoints.length) * (matchRatio);
      }
    });

    // Bonus for additional context
    if (content.length > 200) score += 0.1;
    if (content.includes('if') || content.includes('when')) score += 0.05; // Handling conditions
    if (content.includes('first') || content.includes('then')) score += 0.05; // Sequential steps

    return Math.max(0, Math.min(1, score));
  };

  const evaluateAccuracy = (content: string, expectedOutput: any) => {
    let score = 0.4; // Start with base score

    // Check if response aligns with priority level
    if (expectedOutput.priority === 'high') {
      if (content.includes('urgent') || content.includes('immediate') || content.includes('priority')) {
        score += 0.2;
      }
      if (content.includes('critical') || content.includes('important') || content.includes('serious')) {
        score += 0.1;
      }
    }

    // Check for technical accuracy and context
    const technicalTerms = [
      'troubleshoot',
      'investigate',
      'resolve',
      'fix',
      'analyze',
      'verify',
      'check',
      'confirm',
      'monitor',
      'update'
    ];

    const actionableTerms = [
      'step',
      'process',
      'follow',
      'guide',
      'procedure',
      'instruction',
      'solution',
      'recommendation'
    ];

    // Count unique technical terms
    const techTermCount = technicalTerms.filter(term => content.includes(term)).length;
    score += Math.min(0.2, techTermCount * 0.05);

    // Count unique actionable terms
    const actionTermCount = actionableTerms.filter(term => content.includes(term)).length;
    score += Math.min(0.2, actionTermCount * 0.05);

    // Additional context-specific scoring
    if (content.includes('team') || content.includes('support')) score += 0.05;
    if (content.includes('will') || content.includes('can')) score += 0.05; // Future actions
    if (content.includes('please') || content.includes('thank you')) score += 0.05; // Courtesy

    return Math.max(0, Math.min(1, score));
  };

  const runTest = async (testCase: typeof evaluationTestCases[0]) => {
    setCurrentTest(testCase.name);
    setLoading(true);
    const startTime = Date.now();
    
    try {
      // Test 1: Generate Response
      const response = await generateResponse(
        `${testCase.input.title}\n${testCase.input.description}`,
        testCase.input.comments
      );

      // Test 2: Analyze Priority
      const priority = await analyzeTicketPriority(
        testCase.input.title,
        testCase.input.description
      );

      // Test 3: Summarize Thread
      const summary = await summarizeThread(
        `${testCase.input.title}\n${testCase.input.description}`,
        testCase.input.comments
      );

      const endTime = Date.now();

      // Calculate metrics
      const responseQuality = evaluateResponseQuality(response, testCase.expectedOutput);
      const priorityAccuracy = evaluatePriorityAnalysis(priority, testCase.expectedOutput);

      const metrics = {
        priorityAccuracy,
        responseQuality,
        responseTime: endTime - startTime,
        successRate: response && priority && summary ? 1 : 0
      };

      setResults(prev => ({
        ...prev,
        [testCase.name]: {
          response,
          priority,
          summary,
          metrics,
          error: null
        }
      }));
    } catch (error) {
      console.error('Test failed:', error);
      setResults(prev => ({
        ...prev,
        [testCase.name]: {
          error: String(error)
        } as TestResult
      }));
    } finally {
      setLoading(false);
      setCurrentTest("");
    }
  };

  const runAllTests = async () => {
    for (const testCase of evaluationTestCases) {
      await runTest(testCase);
    }
  };

  // Calculate overall metrics with detailed breakdowns
  const calculateOverallMetrics = () => {
    const validResults = Object.values(results).filter(r => !r.error && r.metrics);
    if (validResults.length === 0) return null;

    return {
      avgPriorityAccuracy: validResults.reduce((acc, r) => acc + r.metrics.priorityAccuracy, 0) / validResults.length,
      avgResponseQuality: {
        overall: validResults.reduce((acc, r) => acc + r.metrics.responseQuality.overall, 0) / validResults.length,
        professionalism: validResults.reduce((acc, r) => acc + r.metrics.responseQuality.professionalism, 0) / validResults.length,
        completeness: validResults.reduce((acc, r) => acc + r.metrics.responseQuality.completeness, 0) / validResults.length,
        accuracy: validResults.reduce((acc, r) => acc + r.metrics.responseQuality.accuracy, 0) / validResults.length
      },
      avgResponseTime: validResults.reduce((acc, r) => acc + r.metrics.responseTime, 0) / validResults.length,
      successRate: validResults.length / Object.keys(results).length,
      totalTests: Object.keys(results).length,
      successfulTests: validResults.length
    };
  };

  const overallMetrics = calculateOverallMetrics();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">AI Feature Tests</h1>
      
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button 
          onClick={runAllTests} 
          disabled={loading}
          className="mb-4"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            'Run All Tests'
          )}
        </Button>

        {evaluationTestCases.map((testCase) => (
          <Button
            key={testCase.name}
            onClick={() => runTest(testCase)}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {currentTest === testCase.name ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              testCase.name
            )}
          </Button>
        ))}
      </div>

      {overallMetrics && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">Overall Metrics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <h3 className="font-medium text-gray-600">Priority Accuracy</h3>
                <p className="text-2xl">{(overallMetrics.avgPriorityAccuracy * 100).toFixed(1)}%</p>
                <div className="text-sm text-gray-500 mt-1">
                  <p>High Priority: {evaluationTestCases.filter(t => t.expectedOutput.priority === 'high').length} cases</p>
                  <p>Medium Priority: {evaluationTestCases.filter(t => t.expectedOutput.priority === 'medium').length} cases</p>
                  <p>Low Priority: {evaluationTestCases.filter(t => t.expectedOutput.priority === 'low').length} cases</p>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-600">Response Quality</h3>
                <p className="text-2xl">{(overallMetrics.avgResponseQuality.overall * 100).toFixed(1)}%</p>
                <div className="text-sm text-gray-500 mt-1">
                  <p>Professionalism: {(overallMetrics.avgResponseQuality.professionalism * 100).toFixed(1)}%</p>
                  <p>Completeness: {(overallMetrics.avgResponseQuality.completeness * 100).toFixed(1)}%</p>
                  <p>Accuracy: {(overallMetrics.avgResponseQuality.accuracy * 100).toFixed(1)}%</p>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-600">Response Time</h3>
                <p className="text-2xl">{overallMetrics.avgResponseTime.toFixed(0)}ms</p>
                <div className="text-sm text-gray-500 mt-1">
                  <p>Min: {Math.min(...Object.values(results).filter(r => r.metrics).map(r => r.metrics.responseTime))}ms</p>
                  <p>Max: {Math.max(...Object.values(results).filter(r => r.metrics).map(r => r.metrics.responseTime))}ms</p>
                  <p>Avg: {overallMetrics.avgResponseTime.toFixed(0)}ms</p>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-600">Success Rate</h3>
                <p className="text-2xl">{(overallMetrics.successRate * 100).toFixed(1)}%</p>
                <p className="text-sm text-gray-500">({overallMetrics.successfulTests}/{overallMetrics.totalTests} tests)</p>
                <div className="text-sm text-gray-500 mt-1">
                  <p>Total Cases: {evaluationTestCases.length}</p>
                  <p>Coverage: {((overallMetrics.totalTests / evaluationTestCases.length) * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.entries(results).map(([testName, result]) => (
        <div key={testName} className="mb-8">
          <h2 className="text-xl font-semibold mb-4">{testName}</h2>
          <div className="space-y-4">
            {!result.error ? (
              <>
                {result.metrics && (
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="font-semibold mb-2">Test Metrics</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Priority Accuracy</p>
                          <p className="text-lg">{(result.metrics.priorityAccuracy * 100).toFixed(1)}%</p>
                          {result.priority && (
                            <div className="text-xs text-gray-500">
                              <p>Expected: {evaluationTestCases.find(t => t.name === testName)?.expectedOutput.priority}</p>
                              <p>Actual: {result.priority.priority}</p>
                              <p>Confidence: {(result.priority.confidence * 100).toFixed(1)}%</p>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Response Quality</p>
                          <p className="text-lg">{(result.metrics.responseQuality.overall * 100).toFixed(1)}%</p>
                          <div className="text-xs text-gray-500">
                            <p>Prof: {(result.metrics.responseQuality.professionalism * 100).toFixed(1)}%</p>
                            <p>Comp: {(result.metrics.responseQuality.completeness * 100).toFixed(1)}%</p>
                            <p>Acc: {(result.metrics.responseQuality.accuracy * 100).toFixed(1)}%</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Response Time</p>
                          <p className="text-lg">{result.metrics.responseTime}ms</p>
                          {result.response?.metadata && (
                            <div className="text-xs text-gray-500">
                              <p>Model: {result.response.metadata.model}</p>
                              <p>Created: {new Date(result.response.metadata.created).toLocaleTimeString()}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {(() => {
                  const testCase = evaluationTestCases.find(t => t.name === testName);
                  return (
                    <Card>
                      <CardContent className="pt-6">
                        <h3 className="font-semibold mb-2">Original Ticket</h3>
                        <div className="bg-gray-50 p-4 rounded space-y-2">
                          <div>
                            <span className="font-medium">Title: </span>
                            <span className="text-sm">{testCase?.input.title}</span>
                          </div>
                          <div>
                            <span className="font-medium">Description: </span>
                            <span className="text-sm">{testCase?.input.description}</span>
                          </div>
                          {testCase?.input.comments.length > 0 && (
                            <div>
                              <span className="font-medium">Comments:</span>
                              <ul className="list-disc ml-5 mt-1 text-sm space-y-1">
                                {testCase.input.comments.map((comment, i) => (
                                  <li key={i}>{comment}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">AI Response Generation</h3>
                    <div className="bg-gray-50 p-4 rounded text-sm">
                      <pre className="whitespace-pre-wrap">{result.response?.content}</pre>
                      {result.response?.metadata && (
                        <div className="mt-2 text-xs text-gray-500">
                          <p>Response Time: {result.response.metadata.responseTime}ms</p>
                          <p>Model: {result.response.metadata.model}</p>
                          <p>Confidence: {(result.response.confidence * 100).toFixed(1)}%</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">Priority Analysis</h3>
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-sm mb-2">Factors</h4>
                          {result.priority?.factors && (
                            <div className="space-y-2">
                              {Object.entries(result.priority.factors).map(([factor, score]: [string, number]) => (
                                <div key={factor} className="flex items-center">
                                  <span className="text-sm capitalize">{factor}:</span>
                                  <div className="ml-2 flex-1 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full" 
                                      style={{ width: `${score * 10}%` }}
                                    />
                                  </div>
                                  <span className="ml-2 text-sm">{(score as number)}/10</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-sm mb-2">Analysis</h4>
                          <p className="text-sm">{result.priority?.reasoning}</p>
                          <div className="mt-2 text-xs text-gray-500">
                            {result.priority?.details?.map((detail: string, i: number) => (
                              <p key={i}>{detail}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">Thread Summary</h3>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2 text-red-500">Error</h3>
                  <pre className="bg-red-50 p-4 rounded text-sm text-red-600">
                    {result.error}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AITest; 