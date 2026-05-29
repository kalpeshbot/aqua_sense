import { useCallback, useState } from 'react';
import { Send } from 'lucide-react';
import api from '../api/client';
import usePolling from '../hooks/usePolling';
const SUGGESTIONS = [
  'Why is Pond 2 in warning?',
  'Is it safe to feed now?',
  'What happened last night?',
  'Which sensor should I watch?',
  "What's the weather impact on my ponds?",
];

export default function AIAgent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [pondId, setPondId] = useState('pond_1');
  const [loading, setLoading] = useState(false);

  const { data: callLog } = usePolling(
    useCallback(async () => (await api.get('/api/agent/log')).data, []),
    15000
  );

  const sendMessage = async (text) => {
    const question = text || input;
    if (!question.trim()) return;

    setMessages((m) => [...m, { role: 'user', content: question }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/api/agent/ask', { question, pond_id: pondId });
      const data = res.data;
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: data.answer,
          confidence: data.confidence,
          data_used: data.data_used,
          follow_up: data.follow_up,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Failed to reach AI agent. Is Ollama running?' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">
      <div className="flex-1 lg:w-2/3 flex flex-col rounded-xl border dark:bg-[#111111] bg-[#F8F8F8] dark:border-[#222222] border-[#E0E0E0]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm dark:text-[#999999]">Suggested questions:</p>
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  className="block w-full text-left text-sm px-3 py-2 rounded-lg border dark:border-[#222222] border-[#E0E0E0] hover:border-accent dark:text-white text-black"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-accent text-white'
                    : 'dark:bg-black bg-white border dark:border-[#222222] border-[#E0E0E0] dark:text-white text-black'
                }`}
              >
                <p>{msg.content}</p>
                {msg.confidence !== undefined && (
                  <span className="text-[10px] opacity-70 mt-2 block">
                    {msg.confidence}% confident
                  </span>
                )}
                {msg.data_used?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {msg.data_used.map((d) => (
                      <span
                        key={d}
                        className="text-[10px] px-1.5 py-0.5 rounded dark:bg-[#222222] bg-[#E0E0E0]"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}
                {msg.follow_up && (
                  <button
                    type="button"
                    onClick={() => setInput(msg.follow_up)}
                    className="text-xs text-accent mt-2 hover:underline block"
                  >
                    {msg.follow_up}
                  </button>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-xl dark:bg-black bg-white border animate-pulse text-sm dark:text-[#999999]">
                Thinking...
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t dark:border-[#222222] border-[#E0E0E0] flex gap-2">
          <select
            value={pondId}
            onChange={(e) => setPondId(e.target.value)}
            className="px-2 py-2 rounded-lg border text-sm dark:bg-black dark:border-[#222222] dark:text-white"
          >
            <option value="pond_1">Pond 1</option>
            <option value="pond_2">Pond 2</option>
            <option value="pond_3">Pond 3</option>
          </select>
          <input
            className="flex-1 px-3 py-2 rounded-lg border dark:bg-black dark:border-[#222222] dark:text-white text-sm"
            placeholder="Ask AquaSense..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={loading}
            className="p-2 rounded-lg bg-accent text-white disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      <div className="lg:w-1/3 rounded-xl border p-4 dark:bg-[#111111] bg-[#F8F8F8] dark:border-[#222222] border-[#E0E0E0] overflow-y-auto">
        <h3 className="font-bold mb-4 dark:text-white text-black">LLM Decision History</h3>
        <div className="space-y-2">
          {(callLog || []).length === 0 ? (
            <p className="text-sm dark:text-[#999999]">No calls yet</p>
          ) : (
            (callLog || [])
              .slice()
              .reverse()
              .map((call) => (
                <div
                  key={call.call_id}
                  className="text-xs p-2 rounded border dark:border-[#222222] border-[#E0E0E0]"
                >
                  <div className="flex justify-between">
                    <span className="font-semibold text-accent">{call.call_type}</span>
                    <span className="dark:text-[#999999]">
                      {call.success ? '✓' : '✗'}
                    </span>
                  </div>
                  <p className="dark:text-[#999999] mt-1">
                    {new Date(call.timestamp).toLocaleTimeString()}
                  </p>
                  <p className="dark:text-[#999999]">
                    prompt: {call.prompt_length} · response: {call.response_length}
                  </p>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
