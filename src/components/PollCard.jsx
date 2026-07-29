import { Link } from 'react-router-dom';
import { formatDistanceToNow, isPast } from 'date-fns';
import { BarChart2, Shield, Lock, Tag } from 'lucide-react';

export default function PollCard({ poll }) {
  const timeAgo = poll.createdAt?.toDate() 
    ? formatDistanceToNow(poll.createdAt.toDate(), { addSuffix: true }) 
    : 'recently';

  const isClosed = poll.expiresAt && isPast(poll.expiresAt.toDate());

  return (
    <Link 
      to={`/poll/${poll.id}`}
      className="block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full"
    >
      {poll.thumbnail && (
        <div className="w-full h-48 bg-slate-100 border-b border-slate-200 overflow-hidden relative flex-shrink-0">
          <img 
            src={poll.thumbnail} 
            alt={poll.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {isClosed && (
            <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center backdrop-blur-[2px]">
              <span className="bg-white/90 text-slate-800 px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1.5 shadow-sm">
                <Lock size={16} /> Closed
              </span>
            </div>
          )}
        </div>
      )}
      
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-start justify-between mb-2 gap-2">
          <h3 className="text-lg font-bold text-slate-800 line-clamp-1">{poll.title}</h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isClosed && !poll.thumbnail && (
              <span className="text-slate-400" title="Poll Closed">
                <Lock size={16} />
              </span>
            )}
            {poll.isPrivate && (
              <span className="text-slate-400" title="Private Poll">
                <Shield size={16} />
              </span>
            )}
          </div>
        </div>
        
        <p className="text-slate-600 text-sm mb-4 line-clamp-2 flex-grow">{poll.question}</p>
        
        {poll.tags && poll.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {poll.tags.map(tag => (
              <span key={tag} className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-md font-medium">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
          <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
            <BarChart2 size={16} />
            <span>{poll.totalVotes || 0} votes</span>
          </div>
          <div className="text-xs text-slate-400 text-right">
            By <span className="font-semibold text-slate-500">{poll.authorName}</span>
            <br />
            {timeAgo}
          </div>
        </div>
      </div>
    </Link>
  );
}
