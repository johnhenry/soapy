import { useState, useEffect } from 'react';
import { useApi } from '../context/ApiContext';
import { RestClient } from '../services/RestClient';
import type { Branch } from '../types';
import './BranchManager.css';

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
    <div className="branch-manager">
      <div className="branch-manager-header">
        <h3>Branches</h3>
        <button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'New Branch'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showCreateForm && (
        <div className="create-branch-form">
          <div className="form-group">
            <label>Branch Name</label>
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="feature/new-idea"
            />
          </div>
          <div className="form-group">
            <label>From Message Number</label>
            <input
              type="number"
              min="1"
              value={fromMessageNumber}
              onChange={(e) => setFromMessageNumber(parseInt(e.target.value))}
            />
          </div>
          <button onClick={handleCreateBranch} disabled={!newBranchName.trim()}>
            Create Branch
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading branches...</div>
      ) : (
        <div className="branch-list">
          {branches.length === 0 ? (
            <div className="empty-state">
              <p>No branches yet. Create a branch to explore alternative conversation paths.</p>
            </div>
          ) : (
            branches.map((branch) => (
              <div key={branch.name} className="branch-item">
                <div className="branch-header">
                  <h4 className="branch-name">{branch.name}</h4>
                  <span className="message-count">{branch.messageCount} messages</span>
                </div>
                <div className="branch-meta">
                  <span>From message #{branch.sourceMessageNumber}</span>
                  <span>Created {new Date(branch.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
