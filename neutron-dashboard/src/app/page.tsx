'use client';

import { useState, useEffect } from 'react';

interface Post {
  id: string;
  content: string;
  upvotes: number;
  comments_count: number;
  created_at: string;
}

interface Memory {
  id: string;
  memoryType: string;
  data: Record<string, unknown>;
  createdAt: string;
}

interface SeedResult {
  seedId: string;
  content: string;
  similarity: number;
}

export default function Dashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [seedQuery, setSeedQuery] = useState('');
  const [seedResults, setSeedResults] = useState<SeedResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [postsRes, memoriesRes] = await Promise.all([
        fetch('/api/moltbook/posts'),
        fetch('/api/neutron/memories')
      ]);

      const postsData = await postsRes.json();
      const memoriesData = await memoriesRes.json();

      if (postsData.success) setPosts(postsData.posts || []);
      if (memoriesData.success) setMemories(memoriesData.memories || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
    setLoading(false);
  }

  async function checkComments() {
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await fetch('/api/trigger/check-comments', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const totalReplies = data.results.reduce(
          (acc: number, r: { replies?: { length: number } }) => acc + (r.replies?.length || 0),
          0
        );
        setCheckResult(`Checked ${data.results.length} posts, sent ${totalReplies} replies`);
        fetchData();
      } else {
        setCheckResult('Failed to check comments');
      }
    } catch (error) {
      setCheckResult('Error checking comments');
    }
    setChecking(false);
  }

  async function searchSeeds() {
    if (!seedQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch('/api/neutron/seeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: seedQuery, limit: 10, threshold: 0.5 })
      });
      const data = await res.json();
      if (data.success) {
        setSeedResults(data.results || []);
      }
    } catch (error) {
      console.error('Seed search failed:', error);
    }
    setSearching(false);
  }

  const totalUpvotes = posts.reduce((acc, p) => acc + (p.upvotes || 0), 0);
  const totalComments = posts.reduce((acc, p) => acc + (p.comments_count || 0), 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-cyan-400">NeutronMemoryBot</h1>
            <p className="text-gray-400">AI Agent Dashboard</p>
          </div>
          <button
            onClick={checkComments}
            disabled={checking}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
          >
            {checking ? 'Checking...' : 'Check for Comments'}
          </button>
        </div>

        {checkResult && (
          <div className="mb-6 p-4 bg-cyan-900/30 border border-cyan-700 rounded-lg">
            {checkResult}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard title="Posts" value={posts.length} icon="📝" />
          <StatCard title="Total Upvotes" value={totalUpvotes} icon="👍" />
          <StatCard title="Total Comments" value={totalComments} icon="💬" />
          <StatCard title="Memories" value={memories.length} icon="🧠" />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Posts Section */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-cyan-400">Moltbook Posts</h2>
            {loading ? (
              <p className="text-gray-400">Loading...</p>
            ) : posts.length === 0 ? (
              <p className="text-gray-400">No posts found</p>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="bg-gray-700/50 rounded-lg p-4">
                    <p className="text-gray-200 mb-2 line-clamp-3">{post.content}</p>
                    <div className="flex gap-4 text-sm text-gray-400">
                      <span>👍 {post.upvotes || 0}</span>
                      <span>💬 {post.comments_count || 0}</span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Memories Section */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-cyan-400">Agent Memories</h2>
            {loading ? (
              <p className="text-gray-400">Loading...</p>
            ) : memories.length === 0 ? (
              <p className="text-gray-400">No memories stored yet</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {memories.map((memory) => (
                  <div key={memory.id} className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-cyan-900 text-cyan-300 text-xs rounded">
                        {memory.memoryType}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(memory.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-hidden">
                      {JSON.stringify(memory.data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Semantic Search */}
        <div className="mt-8 bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-cyan-400">Semantic Search</h2>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={seedQuery}
              onChange={(e) => setSeedQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchSeeds()}
              placeholder="Search interactions by meaning..."
              className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={searchSeeds}
              disabled={searching || !seedQuery.trim()}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {seedResults.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {seedResults.map((result, i) => (
                <div key={result.seedId || i} className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">
                      Seed: {result.seedId?.substring(0, 12)}...
                    </span>
                    <span className="px-2 py-1 bg-cyan-900 text-cyan-300 text-xs rounded">
                      {(result.similarity * 100).toFixed(1)}% match
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{result.content}</p>
                </div>
              ))}
            </div>
          )}

          {seedResults.length === 0 && seedQuery && !searching && (
            <p className="text-gray-500 text-sm">
              No results found. Try a different search or wait for seeds to finish processing (5-30 seconds after creation).
            </p>
          )}
        </div>

        {/* Webhook Info */}
        <div className="mt-8 bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-cyan-400">Webhook Endpoint</h2>
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
            <p className="text-gray-400 mb-2">POST endpoint for Moltbook webhooks:</p>
            <code className="text-cyan-300">/api/webhook/moltbook</code>
          </div>
          <div className="mt-4 text-sm text-gray-400">
            <p>Supported events:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><code className="text-cyan-400">comment.created</code> - New comment on your posts</li>
              <li><code className="text-cyan-400">post.upvoted</code> - Someone upvoted your post</li>
              <li><code className="text-cyan-400">mention</code> - Someone mentioned your agent</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: string }) {
  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
