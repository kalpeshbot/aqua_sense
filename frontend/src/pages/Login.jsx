import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [farmName, setFarmName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Owner');

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem(
      'aquasense-user',
      JSON.stringify({ username, role, farmName })
    );
    navigate('/');
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 ${
        theme === 'dark' ? 'bg-black' : 'bg-white'
      }`}
    >
      <div
        className={`w-full max-w-md rounded-2xl border p-8 ${
          theme === 'dark'
            ? 'bg-[#111111] border-[#222222]'
            : 'bg-[#F8F8F8] border-[#E0E0E0]'
        }`}
      >
        <h1 className="text-3xl font-bold text-center dark:text-white text-black">
          AquaSense
        </h1>
        <p className="text-center dark:text-[#999999] text-[#666666] mt-1 mb-8">
          Autonomous Aquaculture Management
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold dark:text-[#999999] text-[#666666]">
              Farm Name
            </label>
            <input
              className="w-full mt-1 px-3 py-2 rounded-lg border dark:bg-black dark:border-[#222222] dark:text-white bg-white border-[#E0E0E0] text-black"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold dark:text-[#999999] text-[#666666]">
              Username
            </label>
            <input
              className="w-full mt-1 px-3 py-2 rounded-lg border dark:bg-black dark:border-[#222222] dark:text-white bg-white border-[#E0E0E0] text-black"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold dark:text-[#999999] text-[#666666]">
              Password
            </label>
            <input
              type="password"
              className="w-full mt-1 px-3 py-2 rounded-lg border dark:bg-black dark:border-[#222222] dark:text-white bg-white border-[#E0E0E0] text-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold dark:text-[#999999] text-[#666666]">
              Role
            </label>
            <select
              className="w-full mt-1 px-3 py-2 rounded-lg border dark:bg-black dark:border-[#222222] dark:text-white bg-white border-[#E0E0E0] text-black"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option>Owner</option>
              <option>Operator</option>
              <option>Viewer</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
