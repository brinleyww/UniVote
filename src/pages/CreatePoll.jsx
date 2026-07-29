import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Image as ImageIcon, Shield, EyeOff, Loader2, Edit3, Tag, Clock } from 'lucide-react';

export default function CreatePoll() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState([{ id: 1, text: '' }, { id: 2, text: '' }]);
  const [thumbnail, setThumbnail] = useState('');
  
  // Settings
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowVoteChange, setAllowVoteChange] = useState(false);
  const [expirationHours, setExpirationHours] = useState(0); // 0 means never
  
  // Tags
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, { id: Date.now(), text: '' }]);
  };

  const removeOption = (id) => {
    if (options.length <= 2) return;
    setOptions(options.filter(opt => opt.id !== id));
  };

  const updateOption = (id, text) => {
    setOptions(options.map(opt => opt.id === id ? { ...opt, text } : opt));
  };

  const handleTagAdd = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = tagInput.trim().toLowerCase();
      if (val && !tags.includes(val) && tags.length < 5) {
        setTags([...tags, val]);
        setTagInput('');
      }
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const validOptions = options.filter(opt => opt.text.trim() !== '');
    if (validOptions.length < 2) {
      return setError('You must provide at least two valid options.');
    }

    setLoading(true);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.lastPollCreated) {
          const lastCreated = userData.lastPollCreated.toDate();
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          
          if (lastCreated > oneHourAgo) {
            throw new Error('You can only create one poll per hour. Please wait a bit.');
          }
        }
      }

      const formattedOptions = validOptions.map(opt => ({
        id: opt.id.toString(),
        text: opt.text.trim(),
        votes: 0
      }));

      // Calculate expiration timestamp
      let expiresAt = null;
      if (expirationHours > 0) {
        expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
      }

      const pollData = {
        title: title.trim(),
        question: question.trim(),
        options: formattedOptions,
        thumbnail: thumbnail.trim() || null,
        isAnonymous,
        isPrivate,
        allowVoteChange,
        expiresAt,
        tags,
        authorId: currentUser.uid,
        authorName: isAnonymous ? 'Anonymous' : (currentUser.displayName || currentUser.email.split('@')[0]),
        createdAt: new Date(),
        totalVotes: 0
      };

      const pollRef = await addDoc(collection(db, 'polls'), pollData);

      await updateDoc(userRef, {
        lastPollCreated: new Date()
      });

      navigate(`/poll/${pollRef.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Create a Poll</h1>
        <p className="text-slate-500">Ask a question and get answers from the community.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-8">
        
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Poll Title</label>
            <input
              type="text"
              required
              maxLength={100}
              value={title}
              autoComplete="off"
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="e.g., Best Programming Language"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Question</label>
            <textarea
              required
              maxLength={300}
              rows={3}
              value={question}
              autoComplete="off"
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
              placeholder="What language do you prefer for web development and why?"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Tag size={16} /> Tags (Optional, Max 5)
            </label>
            <div className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all flex flex-wrap gap-2">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-slate-200 text-slate-700 px-2 py-1 rounded-md text-sm font-medium">
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-slate-500 hover:text-red-500">
                    <X size={14} />
                  </button>
                </span>
              ))}
              {tags.length < 5 && (
                <input
                  type="text"
                  value={tagInput}
                  autoComplete="off"
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagAdd}
                  className="flex-1 bg-transparent min-w-[120px] outline-none text-sm px-1 py-1"
                  placeholder={tags.length === 0 ? "Type a tag and press Enter" : "Add another tag"}
                />
              )}
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Options */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-semibold text-slate-700">Poll Options</label>
            <span className="text-xs text-slate-400">{options.length}/10</span>
          </div>
          
          <div className="space-y-3">
            {options.map((opt, index) => (
              <div key={opt.id} className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    required
                    value={opt.text}
                    autoComplete="off"
                    onChange={(e) => updateOption(opt.id, e.target.value)}
                    className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder={`Option ${index + 1}`}
                  />
                </div>
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(opt.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {options.length < 10 && (
            <button
              type="button"
              onClick={addOption}
              className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Plus size={16} />
              Add another option
            </button>
          )}
        </div>

        <hr className="border-slate-100" />

        {/* Extras & Settings */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                <ImageIcon size={16} /> Thumbnail URL (Optional)
              </label>
              <input
                type="url"
                value={thumbnail}
                autoComplete="off"
                onChange={(e) => setThumbnail(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                <Clock size={16} /> Duration
              </label>
              <select
                value={expirationHours}
                onChange={(e) => setExpirationHours(Number(e.target.value))}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                <option value={0}>Never Expires</option>
                <option value={24}>24 Hours</option>
                <option value={72}>3 Days</option>
                <option value={168}>1 Week</option>
                <option value={336}>2 Weeks</option>
                <option value={720}>1 Month</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex items-center mt-0.5">
                <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="sr-only peer" />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-800"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <EyeOff size={14} /> Anonymous
                </span>
                <span className="text-xs text-slate-500">Hide your name</span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex items-center mt-0.5">
                <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="sr-only peer" />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-800"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Shield size={14} /> Private
                </span>
                <span className="text-xs text-slate-500">Hide from Discover</span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex items-center mt-0.5">
                <input type="checkbox" checked={allowVoteChange} onChange={(e) => setAllowVoteChange(e.target.checked)} className="sr-only peer" />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-800"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Edit3 size={14} /> Allow Changes
                </span>
                <span className="text-xs text-slate-500">Users can change vote</span>
              </div>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Publish Poll'}
          </button>
          <p className="text-center text-xs text-slate-500 mt-3">
            Note: You can only create one poll every hour.
          </p>
        </div>
      </form>
    </div>
  );
}
