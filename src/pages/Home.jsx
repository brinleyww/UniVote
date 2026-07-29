import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import PollCard from '../components/PollCard';
import { Flame, Award, Loader2, Archive } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('top'); // 'top', 'trending', 'past'
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPolls() {
      setLoading(true);
      try {
        const pollsRef = collection(db, 'polls');
        // Fetch all public polls, then we filter and sort client-side to avoid complex Firestore index requirements
        const q = query(pollsRef, where('isPrivate', '==', false));
        const snapshot = await getDocs(q);
        
        const allPublicPolls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const now = new Date();

        let filtered = [];

        if (activeTab === 'past') {
          // Expired polls only
          filtered = allPublicPolls.filter(poll => {
            if (!poll.expiresAt) return false;
            return poll.expiresAt.toDate() <= now;
          });
          // Sort by votes
          filtered.sort((a, b) => (b.totalVotes || 0) - (a.totalVotes || 0));
        } else {
          // Active polls only (not expired)
          const activePolls = allPublicPolls.filter(poll => {
            if (!poll.expiresAt) return true;
            return poll.expiresAt.toDate() > now;
          });

          if (activeTab === 'top') {
            filtered = activePolls;
            // Sort by votes
            filtered.sort((a, b) => (b.totalVotes || 0) - (a.totalVotes || 0));
          } else if (activeTab === 'trending') {
            // Last 24 hours
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            filtered = activePolls.filter(poll => poll.createdAt && poll.createdAt.toDate() >= oneDayAgo);
            // Sort by votes
            filtered.sort((a, b) => (b.totalVotes || 0) - (a.totalVotes || 0));
          }
        }

        // Limit to top 50 for performance
        setPolls(filtered.slice(0, 50));
      } catch (error) {
        console.error("Error fetching polls:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPolls();
  }, [activeTab]);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Discover</h1>
          <p className="text-slate-500">Explore the most popular public polls</p>
        </div>
        
        <div className="flex flex-wrap bg-slate-200 p-1 rounded-lg gap-1">
          <button
            onClick={() => setActiveTab('top')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
              activeTab === 'top' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Award size={16} />
            Top Polls
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
              activeTab === 'trending' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Flame size={16} className={activeTab === 'trending' ? 'text-orange-500' : ''} />
            Trending
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
              activeTab === 'past' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Archive size={16} />
            Past Polls
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={32} className="animate-spin text-slate-400" />
        </div>
      ) : polls.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {polls.map(poll => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No polls found</h3>
          <p className="text-slate-500">
            {activeTab === 'trending' 
              ? "There are no active public polls created in the past 24 hours." 
              : activeTab === 'past' 
                ? "There are no expired public polls yet."
                : "There are no active public polls available right now."}
          </p>
        </div>
      )}
    </div>
  );
}
