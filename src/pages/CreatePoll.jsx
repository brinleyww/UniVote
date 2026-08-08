import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../firebase';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Image as ImageIcon, Shield, EyeOff, Loader2, Edit3, Tag, Clock, Settings, Upload, Shuffle, Share2, Eye } from 'lucide-react';

export default function CreatePoll() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState([{ id: 1, text: '' }, { id: 2, text: '' }]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Settings
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowVoteChange, setAllowVoteChange] = useState(false);
  const [expirationHours, setExpirationHours] = useState(24); // Removed 0 (never)
  
  // Advanced Settings
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [hideShareButton, setHideShareButton] = useState(false);
  const [resultsVisibility, setResultsVisibility] = useState('after_voting');
  
  // Tags
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cooldown
  const [cooldownEndsAt, setCooldownEndsAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    async function checkCooldown() {
      if (!currentUser) return;
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().lastPollCreated) {
          const lastCreated = userSnap.data().lastPollCreated.toDate();
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          if (lastCreated > oneHourAgo) {
            setCooldownEndsAt(new Date(lastCreated.getTime() + 60 * 60 * 1000));
          }
        }
      } catch (err) {
        console.error("Error checking cooldown", err);
      }
    }
    checkCooldown();
  }, [currentUser]);

  useEffect(() => {
    if (!cooldownEndsAt) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      const diff = cooldownEndsAt - now;
      if (diff <= 0) {
        setCooldownEndsAt(null);
        setTimeLeft('');
        clearInterval(interval);
      } else {
        const minutes = Math.floor((diff / 1000) / 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [cooldownEndsAt]);

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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        return setError("Image must be under 5MB");
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (cooldownEndsAt) return;
    setError('');

    const validOptions = options.filter(opt => opt.text.trim() !== '');
    if (validOptions.length < 2) {
      return setError('You must provide at least two valid options.');
    }

    setLoading(true);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      
      let thumbnailUrl = null;
      if (imageFile) {
        const imageRef = ref(storage, `polls/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        thumbnailUrl = await getDownloadURL(imageRef);
      }

      const formattedOptions = validOptions.map(opt => ({
        id: opt.id.toString(),
        text: opt.text.trim(),
        votes: 0
      }));

      const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

      const pollData = {
        title: title.trim(),
        question: question.trim(),
        options: formattedOptions,
        thumbnail: thumbnailUrl,
        isAnonymous,
        isPrivate,
        allowVoteChange,
        expiresAt,
        tags,
        randomizeOptions,
        hideShareButton,
        resultsVisibility,
        followerCount: 0,
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
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (cooldownEndsAt) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="bg-orange-50 text-orange-800 p-8 rounded-2xl border border-orange-200 shadow-sm">
          <Clock size={48} className="mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl font-bold mb-2">You're on cooldown</h2>
          <p className="text-orange-700/80 mb-6">
            To prevent spam, you can only create one poll every hour.
          </p>
          <div className="text-4xl font-mono font-bold tracking-wider tabular-nums">
            {timeLeft}
          </div>
          <p className="text-sm mt-2 font-medium opacity-70">minutes remaining</p>
        </div>
      </div>
    );
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

        {/* Media & Duration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
              <ImageIcon size={16} /> Upload Image (Optional)
            </label>
            <div className="relative w-full h-10">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="absolute inset-0 w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg flex items-center gap-2 text-slate-500 text-sm overflow-hidden">
                <Upload size={16} />
                <span className="truncate">{imageFile ? imageFile.name : 'Choose an image file...'}</span>
              </div>
            </div>
            {imagePreview && (
              <div className="mt-2 relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                >
                  <X size={12} />
                </button>
              </div>
            )}
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
              <option value={24}>24 Hours</option>
              <option value={72}>3 Days</option>
              <option value={168}>1 Week</option>
              <option value={336}>2 Weeks</option>
              <option value={720}>1 Month</option>
            </select>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Basic Settings */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Settings size={16} /> Basic Settings
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

        {/* Advanced Settings */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Advanced Settings</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center mt-0.5">
                  <input type="checkbox" checked={randomizeOptions} onChange={(e) => setRandomizeOptions(e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Shuffle size={14} /> Randomize option order
                  </span>
                  <span className="text-xs text-slate-500">Prevents voting bias</span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center mt-0.5">
                  <input type="checkbox" checked={hideShareButton} onChange={(e) => setHideShareButton(e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Share2 size={14} /> Hide share button
                  </span>
                  <span className="text-xs text-slate-500">Removes share links on poll</span>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                <Eye size={14} /> Results Visibility
              </label>
              <select
                value={resultsVisibility}
                onChange={(e) => setResultsVisibility(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
              >
                <option value="always_public">Always Public (Even before voting)</option>
                <option value="after_voting">After Voting (Default)</option>
                <option value="creator_only">Only to Creator</option>
              </select>
              <p className="text-xs text-slate-500 mt-2">
                Controls when users can see the percentages.
              </p>
            </div>
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
        </div>
      </form>
    </div>
  );
}
