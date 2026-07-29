import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import PollCard from '../components/PollCard';
import { Search as SearchIcon, KeyRound, Loader2 } from 'lucide-react';

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [allPolls, setAllPolls] = useState([]);
  const [filteredPolls, setFilteredPolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchPolls() {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'polls'),
          where('isPrivate', '==', false)
        );
        const snap = await getDocs(q);
        const polls = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        polls.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
        // Limit to recent 200 after sort to avoid pulling thousands eventually (or just keep all for now)
        const recentPolls = polls.slice(0, 200);
        setAllPolls(recentPolls);
        setFilteredPolls(recentPolls);
      } catch (err) {
        console.error("Error fetching polls for search:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPolls();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPolls(allPolls);
      return;
    }
    
    const queryTerms = searchQuery.toLowerCase().trim().split(/\s+/);
    
    const scoredPolls = allPolls.map(poll => {
      let score = 0;
      const titleLower = poll.title.toLowerCase();
      const questionLower = poll.question.toLowerCase();
      const tags = poll.tags || [];

      queryTerms.forEach(term => {
        // Tag match is highly weighted
        if (tags.some(tag => tag.toLowerCase() === term || tag.toLowerCase().includes(term))) {
          score += 5;
        }
        
        // Title match is heavily weighted
        if (titleLower.includes(term)) {
          score += 3;
        }
        
        // Question match is lightly weighted
        if (questionLower.includes(term)) {
          score += 1;
        }
      });
      
      return { poll, score };
    });
    
    // Filter out polls with 0 score, sort by score descending
    const results = scoredPolls
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(p => p.poll);
      
    setFilteredPolls(results);
  }, [searchQuery, allPolls]);

  const handleShareCodeSubmit = (e) => {
    e.preventDefault();
    if (!shareCode.trim()) return;
    
    try {
      const pollId = atob(shareCode.trim());
      navigate(`/poll/${pollId}`);
    } catch (err) {
      alert('Invalid share code. Please check and try again.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Search</h1>
        <p className="text-slate-500">Find polls by title, question, or tags</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {/* Search Input */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <SearchIcon size={20} className="text-blue-500" /> Search Public Polls
            </h2>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <SearchIcon size={18} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Search by keywords or tags..."
              />
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Showing {filteredPolls.length} {filteredPolls.length === 1 ? 'result' : 'results'}
            </p>
          </div>
        </div>

        {/* Share Code Input */}
        <div className="md:col-span-1">
          <form onSubmit={handleShareCodeSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <KeyRound size={20} className="text-orange-500" /> Have a Share Code?
            </h2>
            <p className="text-sm text-slate-500 mb-4 flex-grow">
              Enter a share code to access a private poll. You can also just click a direct link if a friend sent you one!
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all font-mono text-sm"
                placeholder="e.g. cG9sbElEMTIz"
              />
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Go
              </button>
            </div>
          </form>
        </div>
      </div>

      <hr className="border-slate-200 mb-8" />

      {/* Results */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-6">Results</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-slate-400" />
          </div>
        ) : filteredPolls.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPolls.map(poll => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <p className="text-slate-500">
              No polls found matching "{searchQuery}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
