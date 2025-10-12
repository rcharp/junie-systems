import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { runAllTests, TestResult } from '@/lib/system-tests';
import { Play, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const SystemTestRunner = () => {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);

  const handleRunTests = async () => {
    if (!user) return;

    setIsRunning(true);
    setTestResults([]);

    try {
      const results = await runAllTests(user.id);
      setTestResults(results);
      setLastRunTime(new Date());
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setIsRunning(false);
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>System Tests</CardTitle>
            <CardDescription>
              Run comprehensive tests to verify all system functions
            </CardDescription>
          </div>
          <Button 
            onClick={handleRunTests} 
            disabled={isRunning}
            className="gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run All Tests
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {lastRunTime && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last run: {lastRunTime.toLocaleString()}
          </div>
        )}

        {testResults.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold text-green-500">{totalPassed}</span>
              <span className="text-sm text-muted-foreground">Passed</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold text-red-500">{totalFailed}</span>
              <span className="text-sm text-muted-foreground">Failed</span>
            </div>
          </div>
        )}

        <ScrollArea className="h-[600px] pr-4">
          {testResults.length === 0 && !isRunning && (
            <div className="text-center py-12 text-muted-foreground">
              <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Click "Run All Tests" to start system verification</p>
            </div>
          )}

          {isRunning && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-muted-foreground">Running tests...</p>
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
                    {categoryResults.map(result => (
                      <div
                        key={result.id}
                        className={`p-3 rounded-lg border ${
                          result.status === 'passed'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2 flex-1">
                            {result.status === 'passed' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-sm">{result.name}</div>
                              {result.message && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {result.message}
                                </div>
                              )}
                              {result.error && (
                                <div className="text-sm text-red-600 mt-1 font-mono">
                                  Error: {result.error}
                                </div>
                              )}
                            </div>
                          </div>
                          {result.duration && (
                            <Badge variant="outline" className="text-xs ml-2">
                              {result.duration.toFixed(0)}ms
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
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
