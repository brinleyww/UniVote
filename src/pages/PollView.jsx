import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ArrowLeft, Shield, CheckCircle2, Share2, Lock, Bookmark, BookmarkCheck, Edit3 } from 'lucide-react';
import { formatDistanceToNow, isPast, format } from 'date-fns';

export default function PollView() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [poll, setPoll] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [currentVoteId, setCurrentVoteId] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchPollData() {
      try {
        const pollRef = doc(db, 'polls', id);
        const pollSnap = await getDoc(pollRef);
        
        if (!pollSnap.exists()) {
          setError('Poll not found');
          setLoading(false);
          return;
        }

        setPoll({ id: pollSnap.id, ...pollSnap.data() });

        if (currentUser) {
          // Check if voted
          const voteRef = doc(db, 'votes', `${currentUser.uid}_${id}`);
          const voteSnap = await getDoc(voteRef);
          if (voteSnap.exists()) {
            setHasVoted(true);
            setCurrentVoteId(voteSnap.data().optionId);
          }

          // Check if following
          const followRef = doc(db, 'users', currentUser.uid, 'following', id);
          const followSnap = await getDoc(followRef);
          if (followSnap.exists()) {
            setIsFollowing(true);
          }
        }
      } catch (err) {
        console.error(err);
        setError('Error fetching poll');
      } finally {
        setLoading(false);
      }
    }

    fetchPollData();
  }, [id, currentUser]);

  async function handleVote(optionId) {
    if (!currentUser) return navigate('/login');
    
    // Check expiration lock
    if (poll.expiresAt && isPast(poll.expiresAt.toDate())) {
      return setError('This poll is closed and no longer accepting votes.');
    }

    // Check if changing vote is allowed when already voted
    if (hasVoted && !poll.allowVoteChange) {
      return setError('Vote changing is not allowed for this poll.');
    }
    
    if (hasVoted && currentVoteId === optionId) {
      return; // Already voted for this exact option
    }

    setVotingId(optionId);
    setError('');

    try {
      const pollRef = doc(db, 'polls', id);
      const voteRef = doc(db, 'votes', `${currentUser.uid}_${id}`);

      await runTransaction(db, async (transaction) => {
        const pollDoc = await transaction.get(pollRef);
        if (!pollDoc.exists()) throw new Error("Poll does not exist!");
        
        const data = pollDoc.data();
        let updatedOptions = [...data.options];
        let newTotalVotes = data.totalVotes || 0;

        if (hasVoted && currentVoteId) {
          // Changing vote: deduct old
          updatedOptions = updatedOptions.map(opt => 
            opt.id === currentVoteId ? { ...opt, votes: Math.max(0, (opt.votes || 0) - 1) } : opt
          );
          // don't increment totalVotes since they already voted
        } else {
          newTotalVotes += 1;
        }

        // Add new vote
        updatedOptions = updatedOptions.map(opt => 
          opt.id === optionId ? { ...opt, votes: (opt.votes || 0) + 1 } : opt
        );

        transaction.update(pollRef, {
          options: updatedOptions,
          totalVotes: newTotalVotes
        });

        transaction.set(voteRef, {
          userId: currentUser.uid,
          pollId: id,
          optionId: optionId,
          timestamp: new Date()
        });
      });

      // Update local state
      setPoll(prev => {
        let options = [...prev.options];
        let total = prev.totalVotes;
        
        if (hasVoted && currentVoteId) {
          options = options.map(opt => opt.id === currentVoteId ? { ...opt, votes: Math.max(0, (opt.votes || 0) - 1) } : opt);
        } else {
          total = (prev.totalVotes || 0) + 1;
        }
        
        options = options.map(opt => opt.id === optionId ? { ...opt, votes: (opt.votes || 0) + 1 } : opt);
        
        return { ...prev, options, totalVotes: total };
      });
      
      setHasVoted(true);
      setCurrentVoteId(optionId);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setVotingId(null);
    }
  }

  async function toggleFollow() {
    if (!currentUser) return navigate('/login');
    
    const followRef = doc(db, 'users', currentUser.uid, 'following', id);
    try {
      if (isFollowing) {
        await deleteDoc(followRef);
        setIsFollowing(false);
      } else {
        await setDoc(followRef, { pollId: id, followedAt: new Date() });
        setIsFollowing(true);
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  }

  function handleShare() {
    // Copy the direct URL to clipboard
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Direct link copied to clipboard!');
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Oops!</h2>
        <p className="text-slate-500 mb-6">{error}</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const timeAgo = poll.createdAt?.toDate() 
    ? formatDistanceToNow(poll.createdAt.toDate(), { addSuffix: true }) 
    : 'recently';

  const isClosed = poll.expiresAt && isPast(poll.expiresAt.toDate());

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-700">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
        {poll.thumbnail && (
          <div className="w-full h-64 bg-slate-100 border-b border-slate-200 relative">
            <img 
              src={poll.thumbnail} 
              alt={poll.title} 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">{poll.title}</h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-slate-500">
                <span>By {poll.authorName}</span>
                <span className="hidden sm:inline">•</span>
                <span>{timeAgo}</span>
                
                {poll.isPrivate && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="flex items-center gap-1 text-slate-600" title="Private Poll">
                      <Shield size={14} /> Private
                    </span>
                  </>
                )}
                
                {poll.expiresAt && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className={`flex items-center gap-1 ${isClosed ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                      <Lock size={14} /> 
                      {isClosed ? 'Closed' : `Ends ${format(poll.expiresAt.toDate(), 'MMM d, h:mm a')}`}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={toggleFollow}
                className={`p-2 rounded-full transition-colors ${isFollowing ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'}`}
                title={isFollowing ? 'Unfollow Poll' : 'Follow Poll'}
              >
                {isFollowing ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
              </button>
              <button 
                onClick={handleShare}
                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
                title="Copy Direct Link"
              >
                <Share2 size={20} />
              </button>
            </div>
          </div>

          <p className="text-lg text-slate-700 mb-6">{poll.question}</p>
          
          {poll.tags && poll.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {poll.tags.map(tag => (
                <span key={tag} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md font-medium text-sm">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {isClosed && !hasVoted && (
            <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-600 font-medium flex justify-center items-center gap-2">
              <Lock size={18} />
              Voting has closed for this poll.
            </div>
          )}

          {/* Options */}
          <div className="space-y-3">
            {poll.options.map(opt => {
              const votes = opt.votes || 0;
              const percentage = poll.totalVotes > 0 ? Math.round((votes / poll.totalVotes) * 100) : 0;
              const isSelected = hasVoted && currentVoteId === opt.id;
              
              // We show results if user has voted OR if poll is closed
              const showResults = hasVoted || isClosed;
              
              return (
                <div key={opt.id} className="relative">
                  {showResults ? (
                    <button
                      onClick={() => handleVote(opt.id)}
                      disabled={isClosed || (!poll.allowVoteChange && hasVoted) || votingId !== null}
                      className={`w-full relative overflow-hidden border rounded-xl p-4 transition-all text-left ${
                        isSelected 
                          ? 'border-blue-400 bg-blue-50/30' 
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      } ${(!poll.allowVoteChange && hasVoted) || isClosed ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      {/* Progress bar background */}
                      <div 
                        className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-out ${
                          isSelected ? 'bg-blue-100' : 'bg-slate-200/60'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                      
                      <div className="relative z-10 flex justify-between items-center">
                        <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                          {opt.text}
                          {isSelected && <CheckCircle2 size={16} className="inline ml-2 text-blue-500" />}
                        </span>
                        <span className={`font-semibold ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                          {percentage}% <span className="text-slate-400 text-sm font-normal">({votes})</span>
                        </span>
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleVote(opt.id)}
                      disabled={votingId !== null}
                      className="w-full text-left p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all group flex justify-between items-center"
                    >
                      <span className="font-medium text-slate-700 group-hover:text-slate-900">{opt.text}</span>
                      {votingId === opt.id && <Loader2 size={18} className="animate-spin text-blue-500" />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-slate-500 font-medium">
              Total votes: {poll.totalVotes || 0}
            </div>
            
            {hasVoted && poll.allowVoteChange && !isClosed && (
              <div className="flex items-center gap-1.5 text-sm font-medium text-orange-500 bg-orange-50 px-3 py-1.5 rounded-lg">
                <Edit3 size={16} />
                You can change your vote
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
