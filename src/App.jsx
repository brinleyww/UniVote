import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import CreatePoll from './pages/CreatePoll';
import Search from './pages/Search';
import PollView from './pages/PollView';
import MyPolls from './pages/MyPolls';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              <Route path="/" element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              } />

              <Route path="/poll/:id" element={
                <PrivateRoute>
                  <PollView />
                </PrivateRoute>
              } />
              
              <Route path="/create" element={
                <PrivateRoute>
                  <CreatePoll />
                </PrivateRoute>
              } />
              
              <Route path="/search" element={
                <PrivateRoute>
                  <Search />
                </PrivateRoute>
              } />

              <Route path="/my-polls" element={
                <PrivateRoute>
                  <MyPolls />
                </PrivateRoute>
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
