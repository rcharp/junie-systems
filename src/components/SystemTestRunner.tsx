import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { runAllTests, TestResult, getAllTestDefinitions, runSingleTest } from '@/lib/system-tests';
import { Play, CheckCircle2, XCircle, Loader2, Clock, ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const STORAGE_KEY = 'system-test-results';

export const SystemTestRunner = () => {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [currentTestIndex, setCurrentTestIndex] = useState<number>(0);
  const [totalTests, setTotalTests] = useState<number>(0);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [fixingTest, setFixingTest] = useState<string | null>(null);
  const allTests = getAllTestDefinitions();

  // Load previous results from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { results, timestamp } = JSON.parse(stored);
        setTestResults(results);
        setLastRunTime(new Date(timestamp));
      } catch (e) {
        console.error('Failed to load previous test results:', e);
      }
    }
  }, []);

  // Save results to localStorage
  const saveResults = (results: TestResult[], timestamp: Date) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
      results, 
      timestamp: timestamp.toISOString() 
    }));
  };

  const handleRunTests = async () => {
    if (!user) return;

    setIsRunning(true);
    setTestResults([]);
    setCurrentTestIndex(0);
    setTotalTests(allTests.length);

    try {
      const results: TestResult[] = [];
      
      // Run tests one by one and update progress in real-time
      for (let i = 0; i < allTests.length; i++) {
        const test = allTests[i];
        setRunningTestId(test.id);
        setCurrentTestIndex(i + 1);
        
        console.log(`\n🏃 Running test ${i + 1}/${allTests.length}: ${test.name}`);
        
        const result = await runSingleTest(test.id, user.id);
        results.push(result);
        
        // Update results in real-time
        setTestResults([...results]);
        
        // Small delay to make progress visible
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const timestamp = new Date();
      setLastRunTime(timestamp);
      saveResults(results, timestamp);
      
      console.log('\n✅ All tests completed!');
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setIsRunning(false);
      setRunningTestId(null);
      setCurrentTestIndex(0);
      setTotalTests(0);
    }
  };

  const handleRunSingleTest = async (testId: string) => {
    if (!user) return;

    setRunningTestId(testId);

    try {
      const result = await runSingleTest(testId, user.id);
      const timestamp = new Date();
      
      // Update the specific test result
      const updatedResults = testResults.map(r => 
        r.id === testId ? result : r
      );
      
      // If test doesn't exist in results, add it
      if (!testResults.find(r => r.id === testId)) {
        updatedResults.push(result);
      }
      
      setTestResults(updatedResults);
      setLastRunTime(timestamp);
      saveResults(updatedResults, timestamp);
    } catch (error) {
      console.error('Error running test:', error);
    } finally {
      setRunningTestId(null);
    }
  };

  const getCategoryResults = (category: string) => {
    return testResults.filter(r => r.category === category);
  };

  const getCategoryStats = (category: string) => {
    const results = getCategoryResults(category);
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    return { passed, failed, total: results.length };
  };

  const categories = ['Authentication', 'Database', 'Edge Functions', 'Integrations'];

  const totalPassed = testResults.filter(r => r.status === 'passed').length;
  const totalFailed = testResults.filter(r => r.status === 'failed').length;

  const toggleTestExpanded = (testId: string) => {
    const newExpanded = new Set(expandedTests);
    if (newExpanded.has(testId)) {
      newExpanded.delete(testId);
    } else {
      newExpanded.add(testId);
    }
    setExpandedTests(newExpanded);
  };

  const fixTest = async (result: TestResult) => {
    setFixingTest(result.id);
    
    try {
      let fixed = false;
      let message = '';

      // Authentication fixes
      if (result.id === 'auth-session') {
        const { error } = await supabase.auth.refreshSession();
        if (!error) {
          fixed = true;
          message = 'Session refreshed successfully';
        }
      }

      // User profile fixes
      if (result.id === 'user-profile' && user) {
        const { error } = await supabase
          .from('user_profiles')
          .upsert({
            id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (!error) {
          fixed = true;
          message = 'User profile created';
        }
      }

      // Business settings fixes
      if (result.id === 'business-settings' && user) {
        const { data: existing } = await supabase
          .from('business_settings')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from('business_settings')
            .insert({
              user_id: user.id,
              business_name: 'My Business',
              business_type: 'other'
            });
          
          if (!error) {
            fixed = true;
            message = 'Business settings initialized';
          }
        }
      }

      if (fixed) {
        toast({
          title: 'Test Fixed',
          description: message,
        });
        // Re-run tests after fix
        setTimeout(() => handleRunTests(), 1000);
      } else {
        toast({
          title: 'Unable to Auto-Fix',
          description: 'This test requires manual intervention. Check the error details.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Fix Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setFixingTest(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle>System Tests</CardTitle>
            <CardDescription>
              {allTests.length} tests available • Run comprehensive tests to verify all system functions
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button 
              onClick={handleRunTests} 
              disabled={isRunning || runningTestId !== null}
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running {currentTestIndex}/{totalTests}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run All Tests
                </>
              )}
            </Button>
            {isRunning && (
              <div className="text-xs text-muted-foreground">
                {runningTestId && (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {allTests.find(t => t.id === runningTestId)?.name}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 space-y-4">
          {isRunning && totalTests > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{currentTestIndex}/{totalTests}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(currentTestIndex / totalTests) * 100}%` }}
                />
              </div>
              {runningTestId && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Running: {allTests.find(t => t.id === runningTestId)?.name}
                </div>
              )}
            </div>
          )}

          {lastRunTime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Last run: {lastRunTime.toLocaleString()}
            </div>
          )}

          {testResults.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold text-green-500">{totalPassed}</div>
                  <div className="text-sm text-muted-foreground">Passed</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <div className="text-2xl font-bold text-red-500">{totalFailed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{testResults.length}</div>
                  <div className="text-sm text-muted-foreground">of {allTests.length}</div>
                </div>
              </div>
            </div>
          )}

          {testResults.length === 0 && !isRunning && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium mb-1">Ready to test</div>
              <div className="text-sm text-muted-foreground">{allTests.length} tests available</div>
            </div>
          )}
        </div>

        <ScrollArea className="h-[600px] pr-4">
          {isRunning && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-muted-foreground">Running all tests...</p>
            </div>
          )}

          <div className="space-y-6">
            {categories.map(category => {
              const categoryResults = getCategoryResults(category);
              const stats = getCategoryStats(category);

              if (categoryResults.length === 0) return null;

              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-semibold text-lg">{category}</h3>
                    <div className="flex gap-2 text-sm">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {stats.passed} passed
                      </Badge>
                      {stats.failed > 0 && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          {stats.failed} failed
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {categoryResults.map(result => {
                      const isTestRunning = runningTestId === result.id;
                      
                      return (
                        <Collapsible
                          key={result.id}
                          open={expandedTests.has(result.id)}
                          onOpenChange={() => toggleTestExpanded(result.id)}
                        >
                          <div
                            className={`rounded-lg border ${
                              result.status === 'passed'
                                ? 'bg-green-50 border-green-200'
                                : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div className="p-3">
                              <div className="flex items-start justify-between">
                                <CollapsibleTrigger className="flex items-start gap-2 flex-1 text-left">
                                  {isTestRunning ? (
                                    <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0 mt-0.5" />
                                  ) : result.status === 'passed' ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                  )}
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{result.name}</div>
                                    {result.message && !expandedTests.has(result.id) && (
                                      <div className="text-sm text-muted-foreground mt-1">
                                        {result.message}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {result.duration && (
                                      <Badge variant="outline" className="text-xs">
                                        {result.duration.toFixed(0)}ms
                                      </Badge>
                                    )}
                                    {expandedTests.has(result.id) ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </div>
                                </CollapsibleTrigger>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 ml-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRunSingleTest(result.id);
                                  }}
                                  disabled={isRunning || runningTestId !== null}
                                >
                                  <Play className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          
                          <CollapsibleContent>
                            <div className="px-3 pb-3 space-y-3 border-t border-current/10 mt-2 pt-3">
                              <div className="space-y-2 text-sm">
                                <div>
                                  <div className="font-medium text-xs uppercase text-muted-foreground mb-1">
                                    Description
                                  </div>
                                  <div className="text-xs leading-relaxed text-foreground/80">
                                    {result.description}
                                  </div>
                                </div>

                                <div>
                                  <div className="font-medium text-xs uppercase text-muted-foreground mb-1">
                                    Test ID
                                  </div>
                                  <div className="font-mono text-xs bg-background/50 p-2 rounded">
                                    {result.id}
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="font-medium text-xs uppercase text-muted-foreground mb-1">
                                    Category
                                  </div>
                                  <div className="text-xs">
                                    {result.category}
                                  </div>
                                </div>

                                <div>
                                  <div className="font-medium text-xs uppercase text-muted-foreground mb-1">
                                    Status
                                  </div>
                                  <Badge 
                                    variant={result.status === 'passed' ? 'outline' : 'destructive'}
                                    className="text-xs"
                                  >
                                    {result.status.toUpperCase()}
                                  </Badge>
                                </div>

                                {result.message && (
                                  <div>
                                    <div className="font-medium text-xs uppercase text-muted-foreground mb-1">
                                      Message
                                    </div>
                                    <div className="text-xs">
                                      {result.message}
                                    </div>
                                  </div>
                                )}

                                {result.error && (
                                  <div>
                                    <div className="font-medium text-xs uppercase text-muted-foreground mb-1">
                                      Error Details
                                    </div>
                                    <div className="text-xs font-mono bg-red-100 text-red-800 p-2 rounded break-all">
                                      {result.error}
                                    </div>
                                  </div>
                                )}

                                {result.duration && (
                                  <div>
                                    <div className="font-medium text-xs uppercase text-muted-foreground mb-1">
                                      Execution Time
                                    </div>
                                    <div className="text-xs">
                                      {result.duration.toFixed(2)}ms
                                    </div>
                                  </div>
                                )}
                              </div>

                              {result.status === 'failed' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full mt-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fixTest(result);
                                  }}
                                  disabled={fixingTest === result.id}
                                >
                                  {fixingTest === result.id ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                      Fixing...
                                    </>
                                  ) : (
                                    <>
                                      <Wrench className="h-3 w-3 mr-2" />
                                      Fix Test
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    )}
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
