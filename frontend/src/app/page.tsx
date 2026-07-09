'use client';
/* eslint-disable @next/next/no-img-element */
import { useState, useRef, useEffect, useCallback } from 'react';
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import vscDarkPlus from 'react-syntax-highlighter/dist/cjs/styles/prism/vsc-dark-plus';
import tsx from 'react-syntax-highlighter/dist/cjs/languages/prism/tsx';
import python from 'react-syntax-highlighter/dist/cjs/languages/prism/python';
import bash from 'react-syntax-highlighter/dist/cjs/languages/prism/bash';
import { DistributionTab } from '@/components/dashboard/DistributionTab';
import { OverviewTab } from '@/components/dashboard/OverviewTab';
import { RegionTab } from '@/components/dashboard/RegionTab';
import { SubjectTrendTab } from '@/components/dashboard/SubjectTrendTab';
import type { Tab } from '@/types/dashboard';

SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('bash', bash);

const API_BASE = '/api/backend';
const BACKEND_LABEL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001';
const CODE_VIEW_STYLE: CSSProperties = {
  margin: 0,
  padding: '1rem',
  background: '#1e1e1e',
  fontSize: '13px',
  lineHeight: 1.6,
  maxHeight: '22rem',
  overflow: 'auto',
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  output?: string;
  code?: string;
  plot_b64?: string;
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
}

interface PendingReview {
  code: string;
  explanation: string;
}

interface LogEntry {
  timestamp: string;
  event_type?: string;
  model?: string;
  prompt: string;
  explanation: string;
  generated_code: string;
  executed_code?: string;
  status: string;
  output: string;
  plot_b64?: string;
}

type MarkdownCodeProps = ComponentPropsWithoutRef<'code'> & {
  inline?: boolean;
  children?: ReactNode;
};

const SAMPLE_PROMPTS = [
  'Vẽ biểu đồ phổ điểm môn Toán năm 2024',
  'Phân tích tương quan điểm Toán và Văn',
  'Top 10 tỉnh có điểm trung bình cao nhất',
];

function isGeminiErrorText(text?: string) {
  return Boolean(
    text &&
    (text.includes('429') ||
      text.includes('RESOURCE_EXHAUSTED') ||
      text.includes('generate_content_free_tier_requests'))
  );
}

function compactGeminiError(text?: string) {
  if (!text) return '';
  if (isGeminiErrorText(text)) {
    const retryMatch = text.match(/retryDelay['"]?:\s*['"]?(\d+)s/) ?? text.match(/Please retry in\s+(\d+(?:\.\d+)?)s/);
    const retryAfter = retryMatch ? ` Bạn có thể thử lại sau khoảng ${retryMatch[1]} giây.` : '';
    return `Gemini API đã vượt quá hạn mức hiện tại (429 RESOURCE_EXHAUSTED). Vui lòng chờ quota được làm mới hoặc kiểm tra gói/billing của Gemini API.${retryAfter}`;
  }
  return text;
}

function isGeminiErrorCode(code?: string) {
  if (!code?.trim()) return true;
  return (
    code.includes('RESOURCE_EXHAUSTED') ||
    code.includes('generate_content_free_tier_requests') ||
    code.trim().startsWith('# Lỗi xảy ra khi gọi Gemini API')
  );
}

async function callApi(method: 'GET' | 'POST', endpoint: string, payload?: object) {
  try {
    const options: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
    if (payload) options.body = JSON.stringify(payload);
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    if (!res.ok) {
      const detail = await res.text();
      return { error: `HTTP ${res.status}`, detail };
    }
    return await res.json();
  } catch (error) {
    return {
      error: 'NETWORK_ERROR',
      detail: error instanceof Error ? error.message : 'Không gọi được backend.',
    };
  }
}

function getApiError(data: unknown) {
  if (!data || typeof data !== 'object' || !('error' in data)) return '';
  const err = data as { error?: string; detail?: string };
  return `${err.error ?? 'API_ERROR'}${err.detail ? `: ${err.detail}` : ''}`;
}

// ── Icons ──────────────────────────────────────────────────
const SparkleIcon = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
    <path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>
  </svg>
);

const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
  </svg>
);

const SidebarIcon = ({ name }: { name: 'new' | 'search' | 'history' | 'api' | 'data' | 'more' | 'panel' | 'chart' | 'map' | 'distribution' | 'correlation' }) => {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true" {...common}>
      {name === 'new' && <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></>}
      {name === 'search' && <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>}
      {name === 'history' && <><path d="M3 5h18"/><path d="M7 5v14"/><path d="M17 5v14"/><path d="M3 19h18"/></>}
      {name === 'api' && <><path d="M8 8 4 12l4 4"/><path d="m16 8 4 4-4 4"/><path d="m14 4-4 16"/></>}
      {name === 'data' && <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></>}
      {name === 'chart' && <><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16V9"/><path d="M12 16V7"/><path d="M16 16v-5"/></>}
      {name === 'map' && <><path d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Z"/><path d="M9 3v15"/><path d="M15 6v15"/></>}
      {name === 'distribution' && <><path d="M4 19h16"/><path d="M7 16c1.5-7 8.5-7 10 0"/><path d="M8 16h8"/><path d="M12 16v3"/></>}
      {name === 'correlation' && <><path d="M5 19 19 5"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/><circle cx="15" cy="9" r="2"/><circle cx="9" cy="15" r="2"/></>}
      {name === 'more' && <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>}
      {name === 'panel' && <><rect x="4" y="5" width="16" height="14" rx="3"/><path d="M10 5v14"/></>}
    </svg>
  );
};

const ActionIcon = ({ name }: { name: 'copy' | 'edit' | 'like' | 'dislike' | 'check' }) => {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" {...common}>
      {name === 'copy' && <><rect x="9" y="9" width="11" height="11" rx="2"/><rect x="4" y="4" width="11" height="11" rx="2"/></>}
      {name === 'edit' && <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></>}
      {name === 'like' && <><path d="M7 10v11"/><path d="M15 6.5 14 10h5.3a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 18 21H7"/><path d="M7 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/><path d="M14 10V5a2 2 0 0 0-2-2l-1 7"/></>}
      {name === 'dislike' && <><path d="M17 14V3"/><path d="M9 17.5 10 14H4.7a2 2 0 0 1-2-2.4l1.4-7A2 2 0 0 1 6 3h11"/><path d="M17 14h3a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3"/><path d="M10 14v5a2 2 0 0 0 2 2l1-7"/></>}
      {name === 'check' && <path d="m5 13 4 4L19 7"/>}
    </svg>
  );
};

// ── Chat Tab ──────────────────────────────────────────────
function ChatTab({
  initialMessages = [],
  onMessagesChange,
}: {
  initialMessages?: Message[];
  onMessagesChange?: (messages: Message[]) => void;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [pending, setPending] = useState<PendingReview | null>(null);
  const [editedCode, setEditedCode] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<number, 'like' | 'dislike' | undefined>>({});
  const [editingCodeIndex, setEditingCodeIndex] = useState<number | null>(null);
  const [editingCodeText, setEditingCodeText] = useState('');
  const [rerunExecutingIndex, setRerunExecutingIndex] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, pending, loading]);
  useEffect(() => { onMessagesChange?.(messages); }, [messages, onMessagesChange]);

  const copyMessage = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const sendPrompt = useCallback(async (prompt: string, baseMessages?: Message[]) => {
    if (loading || !prompt.trim()) return;
    const nextMessages = [...(baseMessages ?? messages), { role: 'user' as const, content: prompt.trim() }];
    setMessages(nextMessages);
    setInput('');
    setPending(null);
    setLoading(true);
    setError('');
    const gen = await callApi('POST', '/api/ai/generate', { prompt });
    setLoading(false);
    const generateError = getApiError(gen);
    if (generateError) { setError(`Lỗi kết nối tới AI Backend (${BACKEND_LABEL}): ${generateError}`); return; }
    const safeExplanation = compactGeminiError(gen.explanation);
    if (isGeminiErrorText(gen.explanation) || isGeminiErrorCode(gen.code)) {
      setMessages(prev => [...prev, { role: 'assistant', content: safeExplanation || 'Không thể sinh mã phân tích vào lúc này.' }]);
      return;
    }
    setPending({ code: gen.code, explanation: safeExplanation });
    setEditedCode(gen.code ?? '');
  }, [loading, messages]);

  const submitEditedMessage = () => {
    const text = editingText.trim();
    if (!text) return;
    setEditingIndex(null);
    setEditingText('');
    sendPrompt(text);
  };

  const executePythonCode = async ({
    code,
    explanation,
    prompt,
    onSuccess,
    messageIndex,
  }: {
    code: string;
    explanation: string;
    prompt: string;
    onSuccess: (output: string, plot_b64?: string) => void;
    messageIndex?: number;
  }) => {
    if (messageIndex === undefined) setExecuting(true);
    else setRerunExecutingIndex(messageIndex);
    const exec = await callApi('POST', '/api/execute', {
      code,
      prompt,
      explanation,
    });
    if (messageIndex === undefined) setExecuting(false);
    else setRerunExecutingIndex(null);
    const executeError = getApiError(exec);
    if (executeError) { setError(`Lỗi khi thực thi mã: ${executeError}`); return; }
    const combinedOutput = [exec.stdout, exec.stderr].filter(Boolean).join('\n\n');
    onSuccess(combinedOutput ? compactGeminiError(combinedOutput) : '', exec.plot_b64);
  };

  const handleAccept = async () => {
    if (!pending) return;
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    await executePythonCode({
      code: editedCode,
      prompt: lastUserMsg?.content ?? '',
      explanation: pending.explanation,
      onSuccess: (output, plot_b64) => {
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: pending.explanation,
            output,
        code: editedCode,
            plot_b64,
      },
    ]);
    setPending(null);
      },
    });
  };

  const rerunCompiledCode = async (messageIndex: number) => {
    const message = messages[messageIndex];
    const code = editingCodeText.trim();
    if (!message || !code) return;
    const relatedPrompt = [...messages.slice(0, messageIndex)].reverse().find(m => m.role === 'user')?.content ?? '';
    await executePythonCode({
      code,
      prompt: relatedPrompt,
      explanation: message.content,
      messageIndex,
      onSuccess: (output, plot_b64) => {
        setMessages(prev => prev.map((item, index) => (
          index === messageIndex
            ? { ...item, code, output, plot_b64 }
            : item
        )));
        setEditingCodeIndex(null);
        setEditingCodeText('');
      },
    });
  };

  const handleCancel = async () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    await callApi('POST', '/api/logs/event', {
      prompt: lastUserMsg?.content ?? '',
      generated_code: pending?.code ?? '',
      explanation: pending?.explanation ?? '',
      status: 'cancelled',
      event_type: 'cancel',
      output: 'Người dùng đã hủy, mã không được thực thi.',
    });
    setMessages(prev => [...prev, { role: 'assistant', content: 'Đã hủy thực thi mã lệnh.' }]);
    setPending(null);
  };

  const isEmpty = messages.length === 0 && !pending && !loading;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-500 shadow-lg shadow-indigo-500/20">
            <SparkleIcon size={20} color="white" />
          </div>
          <h2 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">Trợ lý AI dữ liệu</h2>
          <p className="max-w-md text-sm leading-relaxed text-slate-500">
            Trợ lý ảo phân tích dữ liệu thi THPT Quốc gia. Đặt câu hỏi bằng ngôn ngữ tự nhiên.
          </p>
          <div className="mt-8 grid w-full max-w-2xl grid-cols-3 gap-3">
            {SAMPLE_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => sendPrompt(p)}
                className="prompt-starter rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-indigo-300 hover:bg-indigo-50/70 hover:text-indigo-700">
                {p}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pb-8 pr-2">
          {messages.map((msg, i) => (
            <div key={i} className="group message-animate px-6 py-5">
              <div className={`mx-auto flex max-w-4xl gap-3 ${msg.role === 'user' ? 'justify-end' : 'flex-row'}`}>
              {msg.role === 'assistant' && (
                <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 shadow-md shadow-indigo-500/20">
                  <SparkleIcon size={14} color="white" />
                </div>
              )}
              <div className={`min-w-0 ${msg.role === 'user' ? 'flex max-w-[78%] flex-col items-end' : 'flex-1'}`}>
                {msg.role === 'user' ? (
                  <>
                    {editingIndex === i ? (
                      <textarea
                        autoFocus
                        value={editingText}
                        onChange={e => setEditingText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            submitEditedMessage();
                          }
                          if (e.key === 'Escape') {
                            setEditingIndex(null);
                            setEditingText('');
                          }
                        }}
                        className="w-full resize-none rounded-2xl rounded-tr-sm border border-indigo-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-indigo-100"
                        rows={Math.max(2, Math.min(8, editingText.split('\n').length))}
                      />
                    ) : (
                      <div className="rounded-2xl rounded-tr-sm bg-gradient-to-br from-indigo-600 to-blue-500 px-5 py-3.5 text-sm leading-relaxed text-white shadow-md shadow-indigo-100">
                        {msg.content}
                      </div>
                    )}
                    <div className="mt-1.5 flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => copyMessage(msg.content, i)} title="Sao chép" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600">
                        <ActionIcon name={copiedIndex === i ? 'check' : 'copy'} />
                      </button>
                      <button
                        onClick={() => { setEditingIndex(i); setEditingText(msg.content); }}
                        title="Chỉnh sửa"
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                      >
                        <ActionIcon name="edit" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full rounded-3xl bg-transparent px-5 py-4 text-sm leading-relaxed text-slate-800">
                    <div className="prose prose-sm max-w-none prose-p:leading-7 prose-p:my-2 prose-strong:text-slate-900 prose-ul:my-1 prose-li:my-0.5">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ inline, className, children, ...props }: MarkdownCodeProps) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <div className="rounded-xl overflow-hidden my-2 shadow-sm border border-slate-700">
                                <div className="bg-slate-800 text-slate-400 text-xs px-3 py-1.5 flex justify-between items-center border-b border-slate-700">
                                  <span>{match[1]}</span>
                                </div>
                                <SyntaxHighlighter
                                  {...props}
                                  style={vscDarkPlus}
                                  language={match[1]}
                                  PreTag="div"
                                  className="code-editor-scrollbar"
                                  customStyle={CODE_VIEW_STYLE}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              </div>
                            ) : (
                              <code {...props} className={`${className} bg-slate-200 text-indigo-700 px-1.5 py-0.5 rounded text-xs font-mono`}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    {msg.output && (
                      <div className="result-reveal mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80">
                        <div className="border-b border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900">
                          Kết quả
                        </div>
                        <div className="custom-scrollbar max-h-[32rem] overflow-y-auto px-4 py-3">
                          <div className="prose prose-sm max-w-none prose-p:my-2 prose-p:leading-7 prose-strong:text-slate-950 prose-ul:my-2 prose-li:my-1 prose-table:text-sm prose-th:bg-slate-100 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-tr:border-b prose-tr:border-slate-200">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.output}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )}
                    {msg.code && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-indigo-600 font-semibold hover:underline select-none">Xem mã Python</summary>
                        <div className="rounded-xl overflow-hidden mt-2 shadow-sm border border-slate-700">
                          <div className="bg-slate-800 text-slate-400 text-xs px-3 py-1.5 flex justify-between items-center border-b border-slate-700">
                            <span>python</span>
                            <button
                              onClick={() => {
                                setEditingCodeIndex(i);
                                setEditingCodeText(msg.code ?? '');
                              }}
                              className="rounded-md px-2 py-1 font-semibold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                            >
                              Chỉnh sửa & chạy lại
                            </button>
                          </div>
                          {editingCodeIndex === i ? (
                            <div className="bg-slate-900 p-3">
                              <textarea
                                value={editingCodeText}
                                onChange={e => setEditingCodeText(e.target.value)}
                                wrap="off"
                                spellCheck={false}
                                className="code-editor-scrollbar min-h-80 w-full resize-y overflow-auto rounded-xl border border-slate-700 bg-[#1e1e1e] p-4 font-mono text-[13px] leading-relaxed text-green-300 outline-none focus:border-indigo-400"
                              />
                              <div className="mt-3 flex gap-2">
                                <button
                                  onClick={() => rerunCompiledCode(i)}
                                  disabled={rerunExecutingIndex === i || !editingCodeText.trim()}
                                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-950/20 transition-all hover:from-indigo-700 hover:to-blue-600 disabled:opacity-60"
                                >
                                  {rerunExecutingIndex === i ? 'Đang thực thi...' : 'Thực thi lại'}
                                </button>
                                <button
                                  onClick={() => { setEditingCodeIndex(null); setEditingCodeText(''); }}
                                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800"
                                >
                                  Hủy
                                </button>
                              </div>
                            </div>
                          ) : (
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language="python"
                              PreTag="div"
                              className="code-editor-scrollbar"
                              customStyle={CODE_VIEW_STYLE}
                            >
                              {msg.code}
                            </SyntaxHighlighter>
                          )}
                        </div>
                      </details>
                    )}
                    {msg.plot_b64 && (
                      <div className="result-reveal mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2">
                        <img
                          src={`data:image/png;base64,${msg.plot_b64}`}
                          alt="Biểu đồ phân tích"
                          className="w-full rounded-lg"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-1">
                      <button onClick={() => copyMessage([msg.content, msg.output].filter(Boolean).join('\n\n'), i)} title="Sao chép" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
                        <ActionIcon name={copiedIndex === i ? 'check' : 'copy'} />
                      </button>
                      <button onClick={() => setFeedback(prev => ({ ...prev, [i]: prev[i] === 'like' ? undefined : 'like' }))} title="Hữu ích" className={`rounded-lg p-1.5 transition-colors hover:bg-indigo-50 hover:text-indigo-600 ${feedback[i] === 'like' ? 'text-emerald-500' : 'text-slate-400'}`}>
                        <ActionIcon name="like" />
                      </button>
                      <button onClick={() => setFeedback(prev => ({ ...prev, [i]: prev[i] === 'dislike' ? undefined : 'dislike' }))} title="Chưa tốt" className={`rounded-lg p-1.5 transition-colors hover:bg-indigo-50 hover:text-indigo-600 ${feedback[i] === 'dislike' ? 'text-red-400' : 'text-slate-400'}`}>
                        <ActionIcon name="dislike" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 shadow-sm">
                  <UserIcon />
                </div>
              )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="px-4 py-5">
              <div className="mx-auto flex max-w-4xl gap-4">
                <div className="skeleton h-8 w-8 flex-shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2.5 pt-1">
                  <div className="skeleton h-3.5 w-3/4" />
                  <div className="skeleton h-3.5 w-full" />
                  <div className="skeleton h-3.5 w-5/6" />
                </div>
              </div>
            </div>
          )}

          {pending && (
            <div className="mx-auto flex w-full max-w-4xl gap-4 px-4 py-5">
              <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 shadow-md shadow-indigo-500/20">
                <SparkleIcon size={14} color="white" />
              </div>
              <div className="min-w-0 flex-1 space-y-3 rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                <div className="prose prose-sm max-w-none prose-p:my-2 prose-p:leading-7 prose-strong:text-slate-950 prose-ul:my-2 prose-li:my-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {pending.explanation}
                  </ReactMarkdown>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-amber-700 text-xs font-medium">
                  Vui lòng kiểm tra và chỉnh sửa mã Python trước khi thực thi.
                </div>
                <textarea value={editedCode} onChange={e => setEditedCode(e.target.value)} rows={10}
                  wrap="off"
                  spellCheck={false}
                  className="code-editor-scrollbar min-h-[24rem] w-full overflow-hidden whitespace-pre rounded-xl bg-slate-900 p-4 font-mono text-[13px] leading-relaxed text-green-300 caret-green-200 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ height: `${Math.max(24, editedCode.split('\n').length * 1.35 + 2)}rem` }} />
                <div className="flex gap-2">
                  <button onClick={handleAccept} disabled={executing}
                    className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:from-indigo-700 hover:to-blue-600 transition-all shadow-md shadow-indigo-100 disabled:opacity-60">
                    {executing ? 'Đang thực thi...' : 'Chấp nhận & Thực thi'}
                  </button>
                  <button onClick={handleCancel}
                    className="text-slate-600 text-sm font-medium border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-100 transition-all">
                    Hủy bỏ
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="mt-auto bg-gradient-to-t from-slate-50 via-slate-50 to-transparent px-4 pb-4 pt-8">
        <div className="input-glow mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-indigo-100/30 transition-all">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPrompt(input); }}}
            placeholder="Nhập câu hỏi phân tích dữ liệu... (Enter để gửi)"
            rows={1} className="custom-scrollbar max-h-36 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-relaxed text-slate-800 outline-none placeholder-slate-400" />
          <button onClick={() => sendPrompt(input)} disabled={loading || !input.trim()}
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 text-white shadow-md transition-all active:scale-95 disabled:opacity-40 ${input.trim() ? 'send-btn-ready' : ''}`}>
            <SendIcon />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] font-medium text-slate-400">AI có thể mắc lỗi. Hãy kiểm tra lại kết quả quan trọng.</p>
      </div>
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────
function HistoryTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsError, setLogsError] = useState('');

  useEffect(() => {
    callApi('GET', '/api/logs').then(data => {
      if (Array.isArray(data)) {
        setLogs(data);
        setLogsError('');
      } else {
        setLogs([]);
        setLogsError('Chưa tải được lịch sử. Hãy kiểm tra backend tại http://localhost:8001.');
      }
      setLoading(false);
    });
  }, []);

  const formatTime = (ts: string) => {
    try { return new Date(ts).toLocaleString('vi-VN'); } catch { return ts; }
  };
  const safeLogs = Array.isArray(logs) ? logs : [];

  return (
    <div className="space-y-4">
      <p className="text-slate-500 text-sm">Kho lưu trữ toàn bộ các phiên làm việc. Bấm vào từng phiên để xem chi tiết.</p>
      {loading && <p className="text-slate-400 text-sm">Đang tải lịch sử...</p>}
      {!loading && logsError && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-500">
          {logsError}
        </div>
      )}
      {!loading && !logsError && safeLogs.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm">
          Chưa có lịch sử. Hãy thực hiện một phân tích ở tab Giao tiếp AI.
        </div>
      )}
      {[...safeLogs].reverse().map((log, i) => (
        <details key={i} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden group">
          <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span className="text-xs text-slate-400 font-mono flex-shrink-0">{formatTime(log.timestamp)}</span>
            <span className="text-slate-800 text-sm font-medium truncate flex-1">{log.prompt}</span>
            <svg className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
          </summary>
          <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4">
            <div className="text-sm text-slate-700 leading-relaxed">{compactGeminiError(log.explanation)}</div>
            {!isGeminiErrorCode(log.generated_code) && (
              <details className="rounded-xl overflow-hidden">
                <summary className="bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-2 cursor-pointer hover:bg-slate-200 transition-colors">Mã Python AI đề xuất</summary>
                <div className="rounded-xl overflow-hidden shadow-sm border border-slate-700 m-2">
                  <div className="bg-slate-800 text-slate-400 text-xs px-3 py-1.5 flex justify-between items-center border-b border-slate-700">
                    <span>python</span>
                  </div>
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language="python"
                    PreTag="div"
                    className="code-editor-scrollbar"
                    customStyle={CODE_VIEW_STYLE}
                  >
                    {log.generated_code}
                  </SyntaxHighlighter>
                </div>
              </details>
            )}
            {log.executed_code && log.executed_code !== log.generated_code && !isGeminiErrorCode(log.executed_code) && (
              <details className="rounded-xl overflow-hidden">
                <summary className="bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-2 cursor-pointer hover:bg-slate-200 transition-colors">Mã Python đã duyệt/thực thi</summary>
                <div className="rounded-xl overflow-hidden shadow-sm border border-slate-700 m-2">
                  <div className="bg-slate-800 text-slate-400 text-xs px-3 py-1.5 flex justify-between items-center border-b border-slate-700">
                    <span>python</span>
                  </div>
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language="python"
                    PreTag="div"
                    className="code-editor-scrollbar"
                    customStyle={CODE_VIEW_STYLE}
                  >
                    {log.executed_code}
                  </SyntaxHighlighter>
                </div>
              </details>
            )}
            {log.output && (
              <details className="rounded-xl overflow-hidden">
                <summary className="bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-2 cursor-pointer hover:bg-slate-200 transition-colors">Kết quả Output</summary>
                <div className="m-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="prose prose-sm max-w-none prose-p:my-2 prose-p:leading-7 prose-strong:text-slate-950 prose-ul:my-2 prose-li:my-1 prose-table:text-sm prose-th:bg-slate-100 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-tr:border-b prose-tr:border-slate-200">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {compactGeminiError(log.output)}
                    </ReactMarkdown>
                  </div>
                </div>
              </details>
            )}
            {log.plot_b64 && <img src={`data:image/png;base64,${log.plot_b64}`} alt="Biểu đồ" className="rounded-xl max-w-full border border-slate-200 mt-2" />}
          </div>
        </details>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
const CHAT_SESSIONS_KEY = 'examdata_ai_chat_sessions';

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Tổng quan',
  trends: 'Xu hướng & Môn học',
  distribution: 'Phổ điểm & Tổ hợp',
  regions: 'Địa phương & Vùng miền',
  assistant: 'Trợ lý AI',
};

function createChatSession(): ChatSession {
  const now = Date.now();
  return {
    id: `chat-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Cuộc trò chuyện mới',
    updatedAt: now,
    messages: [],
  };
}

function getSessionTitle(messages: Message[]) {
  return messages.find(message => message.role === 'user')?.content.trim().slice(0, 64) || 'Cuộc trò chuyện mới';
}

function formatSessionTime(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function loadChatSessions() {
  if (typeof window === 'undefined') return [createChatSession()];
  try {
    const saved = window.localStorage.getItem(CHAT_SESSIONS_KEY);
    const parsed = saved ? JSON.parse(saved) as ChatSession[] : [];
    const validSessions = parsed.filter(session => session?.id && Array.isArray(session.messages));
    if (validSessions.length > 0) {
      return [...validSessions].sort((a, b) => b.updatedAt - a.updatedAt);
    }
  } catch {
    window.localStorage.removeItem(CHAT_SESSIONS_KEY);
  }
  return [createChatSession()];
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [initialSessions] = useState<ChatSession[]>(loadChatSessions);
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState(initialSessions[0]?.id ?? '');
  const [sessionSearch, setSessionSearch] = useState('');

  useEffect(() => {
    const nonEmptySessions = sessions.filter(session => session.messages.length > 0);
    window.localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(nonEmptySessions));
  }, [sessions]);

  const startNewChat = useCallback(() => {
    const newSession = createChatSession();
    setSessions(prev => [newSession, ...prev.filter(session => session.messages.length > 0)]);
    setActiveSessionId(newSession.id);
    setActiveTab('assistant');
  }, []);

  const updateActiveSession = useCallback((messages: Message[]) => {
    if (!activeSessionId) return;
    setSessions(prev => {
      const next = prev.map(session => (
        session.id === activeSessionId
          ? {
              ...session,
              messages,
              title: getSessionTitle(messages),
              updatedAt: messages.length > 0 ? Date.now() : session.updatedAt,
            }
          : session
      ));
      return [...next]
        .sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }, [activeSessionId]);

  const activeSession = sessions.find(session => session.id === activeSessionId) ?? sessions[0];
  const visibleSessions = sessions
    .filter(session => session.messages.length > 0)
    .filter(session => session.title.toLowerCase().includes(sessionSearch.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#F5F7FB] font-sans text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-[272px] flex-col border-r border-white/5 px-3 py-4 text-slate-300 shadow-2xl shadow-slate-950/10" style={{ background: 'linear-gradient(180deg, #00195A 0%, #31327E 100%)' }}>
        <div className="mb-4 flex h-12 items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 shadow-lg shadow-indigo-500/20">
              <SparkleIcon size={16} color="white" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-white">ExamData AI</p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Analytics</p>
            </div>
          </div>
          <button
            aria-label="Thu gọn sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-200"
          >
            <SidebarIcon name="panel" />
          </button>
        </div>

        <nav className="space-y-2">
          <button onClick={() => setActiveTab('overview')} className={`sidebar-nav-item ${activeTab === 'overview' ? 'sidebar-item-active text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
            <SidebarIcon name="chart" />
            <span>Tổng quan</span>
          </button>
          <button onClick={() => setActiveTab('trends')} className={`sidebar-nav-item ${activeTab === 'trends' ? 'sidebar-item-active text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
            <SidebarIcon name="distribution" />
            <span>Xu hướng & Môn học</span>
          </button>
          <button onClick={() => setActiveTab('distribution')} className={`sidebar-nav-item ${activeTab === 'distribution' ? 'sidebar-item-active text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
            <SidebarIcon name="correlation" />
            <span>Phổ điểm & Tổ hợp</span>
          </button>
          <button onClick={() => setActiveTab('regions')} className={`sidebar-nav-item ${activeTab === 'regions' ? 'sidebar-item-active text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
            <SidebarIcon name="map" />
            <span>Địa phương & Vùng miền</span>
          </button>
          <button onClick={() => setActiveTab('assistant')} className={`sidebar-nav-item ${activeTab === 'assistant' ? 'sidebar-item-active text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
            <SidebarIcon name="data" />
            <span>Trợ lý AI</span>
          </button>
        </nav>

        <div className="mx-2 my-4 border-t border-white/5" />
      </aside>

      <main className="ml-[272px] h-screen overflow-hidden bg-[#F5F7FB]">
        <div className="flex h-full flex-col">
          <div className="px-8 pb-3 pt-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              {TAB_LABELS[activeTab]}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
              Hệ thống phân tích điểm thi THPT Quốc gia
            </h1>
          </div>
          <div className="min-h-0 flex-1">
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'trends' && <SubjectTrendTab />}
            {activeTab === 'distribution' && <DistributionTab />}
            {activeTab === 'regions' && <RegionTab />}
            {activeTab === 'assistant' && activeSession && (
              <div className="grid h-full min-h-0 gap-4 px-8 pb-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                <section className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <ChatTab
                    key={activeSession.id}
                    initialMessages={activeSession.messages}
                    onMessagesChange={updateActiveSession}
                  />
                </section>
                <aside className="min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-bold text-slate-950">Trợ lý AI</h2>
                        <p className="mt-0.5 text-xs font-medium text-slate-500">Sinh mã, duyệt code và thực thi phân tích.</p>
                      </div>
                      <button
                        onClick={startNewChat}
                        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#594DA3] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#31327E]"
                      >
                        <SidebarIcon name="new" />
                        <span>Cuộc trò chuyện mới</span>
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><SidebarIcon name="search" /></span>
                      <input
                        value={sessionSearch}
                        onChange={e => setSessionSearch(e.target.value)}
                        placeholder="Tìm kiếm hội thoại..."
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-[12.5px] font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#826ACA]"
                      />
                    </div>
                    <div className="custom-scrollbar mt-3 max-h-44 space-y-1 overflow-y-auto pr-1">
                      {visibleSessions.length === 0 && (
                        <div className="px-3 py-4 text-center text-[12px] italic leading-relaxed text-slate-400">
                          {sessionSearch ? 'Không tìm thấy hội thoại.' : 'Chưa có hội thoại nào.'}
                        </div>
                      )}
                      {visibleSessions.map(session => (
                        <button
                          key={session.id}
                          onClick={() => { setActiveSessionId(session.id); setActiveTab('assistant'); }}
                          className={`group relative flex w-full items-center rounded-xl px-3 py-2.5 text-left transition-all ${
                            activeSessionId === session.id
                              ? 'bg-white text-[#31327E] shadow-sm'
                              : 'text-slate-500 hover:bg-white hover:text-[#31327E]'
                          }`}
                        >
                          <SidebarIcon name="data" />
                          <div className="ml-2.5 min-w-0 flex-1">
                            <span className="block truncate text-[12.5px] font-semibold">{session.title}</span>
                          </div>
                          <span className="ml-2 flex-shrink-0 text-[10px] text-slate-400">{formatSessionTime(session.updatedAt)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <h2 className="mb-3 text-sm font-bold text-slate-950">Lịch sử tương tác AI</h2>
                  <HistoryTab />
                </aside>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
