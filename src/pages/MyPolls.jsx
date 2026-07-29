import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import PollCard from '../components/PollCard';
import { Bookmark, User as UserIcon, Loader2, Sparkles } from 'lucide-react';

export default function MyPolls() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('created');
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPolls() {
      if (!currentUser) return;
      setLoading(true);
      setPolls([]);

      try {
        if (activeTab === 'created') {
          // Fetch polls created by user
          const q = query(
            collection(db, 'polls'),
            where('authorId', '==', currentUser.uid)
          );
          const snap = await getDocs(q);
          const fetchedPolls = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          fetchedPolls.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
          setPolls(fetchedPolls);
        } else {
          // Fetch followed polls
          const followingRef = collection(db, 'users', currentUser.uid, 'following');
          const followingSnap = await getDocs(followingRef);
          
          const followedPolls = [];
          for (const followDoc of followingSnap.docs) {
            const pollId = followDoc.id;
            const pollSnap = await getDoc(doc(db, 'polls', pollId));
            if (pollSnap.exists()) {
              followedPolls.push({ id: pollSnap.id, ...pollSnap.data() });
            }
          }
          // Sort followed polls by creation date (or you could save followedAt and sort by that)
          followedPolls.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
          setPolls(followedPolls);
        }
      } catch (err) {
        console.error("Error fetching my polls:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPolls();
  }, [activeTab, currentUser]);

  const renderBadge = (poll) => {
    const votes = poll.totalVotes || 0;
    if (votes >= 500) {
      return (
        <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1 z-10 border border-yellow-300">
          <Sparkles size={12} /> 500+ Votes!
        </div>
      );
    }
    if (votes >= 100) {
      return (
        <div className="absolute -top-3 -right-3 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1 z-10 border border-blue-400">
          <Sparkles size={12} /> 100+ Votes!
        </div>
      );
    }
    if (votes >= 50) {
      return (
        <div className="absolute -top-3 -right-3 bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1 z-10 border border-purple-400">
          <Sparkles size={12} /> 50+ Votes!
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">My Polls</h1>
          <p className="text-slate-500">Manage your polls and track the ones you follow</p>
        </div>
        
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('created')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
              activeTab === 'created' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserIcon size={16} />
            Created by Me
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
              activeTab === 'following' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Bookmark size={16} />
            Following
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={32} className="animate-spin text-slate-400" />
        </div>
      ) : polls.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-4">
          {polls.map(poll => (
            <div key={poll.id} className="relative">
              {renderBadge(poll)}
              <PollCard poll={poll} />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <h3 className="text-lg font-semibold text-slate-700 mb-1">Nothing here yet</h3>
          <p className="text-slate-500">
            {activeTab === 'created' 
              ? "You haven't created any polls yet." 
              : "You aren't following any polls. Click the bookmark icon on a poll to follow it."}
          </p>
        </div>
      )}
    </div>
  );
}
