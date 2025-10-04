import { useState, useEffect } from 'react';
import { useApi } from '../context/ApiContext';
import { RestClient } from '../services/RestClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch } from 'lucide-react';
import type { Branch } from '../types';

interface BranchManagerProps {
  conversationId: string;
}

export function BranchManager({ conversationId }: BranchManagerProps) {
  const { config } = useApi();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [fromMessageNumber, setFromMessageNumber] = useState(1);

  const client = new RestClient(config.baseUrl, config.apiKey);

  useEffect(() => {
    loadBranches();
  }, [conversationId]);

  const loadBranches = async () => {
    try {
      setLoading(true);
      setError(null);
      const branchList = await client.getBranches(conversationId);
      setBranches(branchList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;

    try {
      setError(null);
      await client.createBranch(conversationId, newBranchName, fromMessageNumber);
      setNewBranchName('');
      setFromMessageNumber(1);
      setShowCreateForm(false);
      await loadBranches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create branch');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Branches
        </h3>
        <Button 
          variant={showCreateForm ? "outline" : "default"}
          size="sm"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'New Branch'}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive px-3 py-2 rounded-md text-sm">
          {error}
        </div>
      )}

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create New Branch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branch-name">Branch Name</Label>
              <Input
                id="branch-name"
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="feature/new-idea"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from-message">From Message Number</Label>
              <Input
                id="from-message"
                type="number"
                min="1"
                value={fromMessageNumber}
                onChange={(e) => setFromMessageNumber(parseInt(e.target.value))}
              />
            </div>
            <Button 
              onClick={handleCreateBranch} 
              disabled={!newBranchName.trim()}
              className="w-full"
            >
              Create Branch
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center text-muted-foreground py-8">Loading branches...</div>
      ) : (
        <div className="space-y-2">
          {branches.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>No branches yet. Create a branch to explore alternative conversation paths.</p>
              </CardContent>
            </Card>
          ) : (
            branches.map((branch) => (
              <Card key={branch.name}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-medium">{branch.name}</CardTitle>
                    <Badge variant="secondary">{branch.messageCount} messages</Badge>
                  </div>
                  <CardDescription className="flex items-center gap-3 text-xs">
                    <span>From message #{branch.sourceMessageNumber}</span>
                    <span>•</span>
                    <span>Created {new Date(branch.createdAt).toLocaleDateString()}</span>
                  </CardDescription>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
