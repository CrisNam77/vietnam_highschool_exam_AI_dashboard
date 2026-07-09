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
  isFallbackInsight?: boolean;
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
  isFallbackInsight?: boolean;
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
const MAX_CONTEXT_MESSAGES = 10;
const MAX_CONTEXT_TEXT_LENGTH = 1200;

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

function truncateContextText(text?: string) {
  if (!text) return '';
  return text.length > MAX_CONTEXT_TEXT_LENGTH
    ? `${text.slice(0, MAX_CONTEXT_TEXT_LENGTH)}...`
    : text;
}

function ensureInsightText(text?: string, prompt?: string) {
  const cleaned = text?.trim();
  if (cleaned) return { text: cleaned, isFallback: false };

  const requestText = prompt?.trim();
  return {
    text: [
      '### Phân tích dự kiến',
      requestText
        ? `Cell code bên dưới sẽ xử lý yêu cầu: **${requestText}**.`
        : 'Cell code bên dưới sẽ xử lý yêu cầu phân tích dữ liệu đã nhập.',
      '',
      '- Lọc dữ liệu hợp lệ trước khi tính toán.',
      '- Tính các chỉ số chính và in kết quả dưới dạng Markdown.',
      '- Nếu có biểu đồ, dữ liệu sẽ được tổng hợp hoặc lấy mẫu để hiển thị rõ ràng.',
    ].join('\n'),
    isFallback: true,
  };
}

function getContextHistory(messages: Message[]) {
  return messages.slice(-MAX_CONTEXT_MESSAGES).map(message => ({
    role: message.role,
    content: truncateContextText(message.content),
    output: truncateContextText(message.output),
    code: truncateContextText(message.code),
  }));
}

function OutputMarkdown({ children }: { children: string }) {
  return (
    <div className="result-markdown prose prose-sm max-w-none prose-headings:mb-2 prose-headings:mt-0 prose-p:my-2 prose-p:leading-7 prose-strong:text-slate-950 prose-ul:my-2 prose-li:my-1 prose-table:my-0 prose-table:text-sm prose-th:bg-slate-100 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-tr:border-b prose-tr:border-slate-200">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

function ResultPanel({
  summary,
  output,
  plot_b64,
  code,
  isFallbackInsight,
  isEditingCode,
  editingCodeText,
  rerunExecuting,
  onEditCode,
  onChangeCode,
  onRerunCode,
  onCancelEditCode,
}: {
  summary?: string;
  output?: string;
  plot_b64?: string;
  code?: string;
  isFallbackInsight?: boolean;
  isEditingCode: boolean;
  editingCodeText: string;
  rerunExecuting: boolean;
  onEditCode: () => void;
  onChangeCode: (value: string) => void;
  onRerunCode: () => void;
  onCancelEditCode: () => void;
}) {
  if (!summary && !output && !plot_b64 && !code) return null;
  const summaryText = isFallbackInsight && output?.trim() ? "" : summary?.trim();
  const analysisText = [summaryText, output?.trim()].filter(Boolean).join('\n\n---\n\n');

  return (
    <section className="result-reveal mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-slate-950">Phân tích</h3>
          <p className="mt-0.5 text-xs text-slate-500">Số liệu, biểu đồ và insight trong một khung</p>
        </div>
      </div>
      <div className="space-y-3 bg-slate-50/70 p-3">
        {plot_b64 && (
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Biểu đồ</div>
            <img
              src={`data:image/png;base64,${plot_b64}`}
              alt="Biểu đồ phân tích"
              className="w-full rounded-lg border border-slate-100"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
        {analysisText && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Kết quả & insight</div>
            <div className="custom-scrollbar overflow-x-auto">
              <OutputMarkdown>{analysisText}</OutputMarkdown>
            </div>
          </div>
        )}
        {code && (
          <details className="rounded-xl border border-slate-200 bg-white">
            <summary className="cursor-pointer select-none px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50">
              Mã Python
            </summary>
            <div className="border-t border-slate-200 p-3">
              <div className="overflow-hidden rounded-xl border border-slate-700 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400">
                  <span>python</span>
                  <button
                    onClick={onEditCode}
                    className="rounded-md px-2 py-1 font-semibold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                  >
                    Chỉnh sửa & chạy lại
                  </button>
                </div>
                {isEditingCode ? (
                  <div className="bg-slate-900 p-3">
                    <textarea
                      value={editingCodeText}
                      onChange={e => onChangeCode(e.target.value)}
                      wrap="off"
                      spellCheck={false}
                      className="code-editor-scrollbar min-h-80 w-full resize-y overflow-auto rounded-xl border border-slate-700 bg-[#1e1e1e] p-4 font-mono text-[13px] leading-relaxed text-green-300 outline-none focus:border-indigo-400"
                    />
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={onRerunCode}
                        disabled={rerunExecuting || !editingCodeText.trim()}
                        className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-950/20 transition-all hover:from-indigo-700 hover:to-blue-600 disabled:opacity-60"
                      >
                        {rerunExecuting ? 'Đang thực thi...' : 'Thực thi lại'}
                      </button>
                      <button
                        onClick={onCancelEditCode}
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
                    {code}
                  </SyntaxHighlighter>
                )}
              </div>
            </div>
          </details>
        )}
      </div>
    </section>
  );
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

const SidebarIcon = ({ name }: { name: 'new' | 'search' | 'history' | 'api' | 'data' | 'more' | 'panel' }) => {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true" {...common}>
      {name === 'new' && <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></>}
      {name === 'search' && <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>}
      {name === 'history' && <><path d="M3 5h18"/><path d="M7 5v14"/><path d="M17 5v14"/><path d="M3 19h18"/></>}
      {name === 'api' && <><path d="M8 8 4 12l4 4"/><path d="m16 8 4 4-4 4"/><path d="m14 4-4 16"/></>}
      {name === 'data' && <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></>}
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
// Required flow: prompt -> generate code -> user reviews/edits -> execute after confirmation.
// The confirmation step is mandatory: keep pending, setPending, PendingReview,
// editedCode, handleAccept, handleCancel, the review warning, and the
// "Chấp nhận & Thực thi" button.
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
    const gen = await callApi('POST', '/api/ai/generate', {
      prompt,
      history: getContextHistory(baseMessages ?? messages),
    });
    const generateError = getApiError(gen);
    if (generateError) {
      setLoading(false);
      setError(`Lỗi kết nối tới AI Backend (${BACKEND_LABEL}): ${generateError}`);
      return;
    }
    const insight = ensureInsightText(compactGeminiError(gen.explanation), prompt);
    const safeExplanation = insight.text;
    if (isGeminiErrorText(gen.explanation) || isGeminiErrorCode(gen.code)) {
      setLoading(false);
      setMessages(prev => [...prev, { role: 'assistant', content: safeExplanation || 'Không thể sinh mã phân tích vào lúc này.' }]);
      return;
    }
    setLoading(false);
    setPending({ code: gen.code, explanation: safeExplanation, isFallbackInsight: insight.isFallback });
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
    onSuccess: (output: string, plot_b64?: string, analysis?: string) => void;
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
    const combinedOutput = exec.success ? exec.stdout : [exec.stdout, exec.stderr].filter(Boolean).join('\n\n');
    const resultOutput = exec.analysis
      ? [compactGeminiError(exec.analysis), combinedOutput?.trim() ? `### Kết quả chi tiết\n\n${combinedOutput}` : '']
          .filter(Boolean)
          .join('\n\n---\n\n')
      : (combinedOutput ? compactGeminiError(combinedOutput) : '');
    onSuccess(
      resultOutput,
      exec.plot_b64,
      exec.analysis
    );
  };

  const handleAccept = async () => {
    if (!pending) return;
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    await executePythonCode({
      code: editedCode,
      prompt: lastUserMsg?.content ?? '',
      explanation: pending.explanation,
      onSuccess: (output, plot_b64, analysis) => {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: analysis ? '' : pending.explanation,
            isFallbackInsight: pending.isFallbackInsight && !analysis,
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
          <h2 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">Data AI Assistant</h2>
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
                    {msg.output || msg.plot_b64 || msg.code ? (
                      <ResultPanel
                        summary={msg.content}
                        output={msg.output}
                        plot_b64={msg.plot_b64}
                        code={msg.code}
                        isFallbackInsight={msg.isFallbackInsight}
                        isEditingCode={editingCodeIndex === i}
                        editingCodeText={editingCodeText}
                        rerunExecuting={rerunExecutingIndex === i}
                        onEditCode={() => {
                          setEditingCodeIndex(i);
                          setEditingCodeText(msg.code ?? '');
                        }}
                        onChangeCode={setEditingCodeText}
                        onRerunCode={() => rerunCompiledCode(i)}
                        onCancelEditCode={() => { setEditingCodeIndex(null); setEditingCodeText(''); }}
                      />
                    ) : (
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
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Phân tích câu hỏi</div>
                  <div className="prose prose-sm max-w-none prose-p:my-2 prose-p:leading-7 prose-strong:text-slate-950 prose-ul:my-2 prose-li:my-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {pending.explanation}
                    </ReactMarkdown>
                  </div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                  Vui lòng kiểm tra và chỉnh sửa mã Python trước khi thực thi.
                </div>
                <textarea
                  value={editedCode}
                  onChange={e => setEditedCode(e.target.value)}
                  rows={10}
                  wrap="off"
                  spellCheck={false}
                  className="code-editor-scrollbar min-h-[24rem] w-full resize-none overflow-hidden whitespace-pre rounded-xl bg-slate-900 p-4 font-mono text-[13px] leading-relaxed text-green-300 caret-green-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ height: `${Math.max(24, editedCode.split('\n').length * 1.35 + 2)}rem` }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAccept}
                    disabled={executing || !editedCode.trim()}
                    className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-100 transition-all hover:from-indigo-700 hover:to-blue-600 disabled:opacity-60"
                  >
                    {executing ? 'Đang thực thi...' : 'Chấp nhận & Thực thi'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={executing}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100 disabled:opacity-60"
                  >
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
  const visibleLogs = logs.filter(log => log.event_type !== 'generate');

  useEffect(() => {
    callApi('GET', '/api/logs').then(data => { setLogs(data ?? []); setLoading(false); });
  }, []);

  const formatTime = (ts: string) => {
    try { return new Date(ts).toLocaleString('vi-VN'); } catch { return ts; }
  };

  const getStatusMeta = (status: string) => {
    if (status === 'success') {
      return {
        label: 'Thành công',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
    }
    if (status === 'cancelled') {
      return {
        label: 'Đã hủy',
        className: 'border-amber-200 bg-amber-50 text-amber-700',
      };
    }
    return {
      label: 'Lỗi',
      className: 'border-rose-200 bg-rose-50 text-rose-700',
    };
  };

  const getFinalOutput = (log: LogEntry) => {
    return compactGeminiError(log.output || log.explanation || 'Không có nội dung output.');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-950">Lịch sử chạy mã</h2>
        <p className="mt-1 text-sm text-slate-500">Lưu lại output cuối cùng, mã đã thực thi, biểu đồ và trạng thái từng lần chạy.</p>
      </div>
      {loading && <p className="text-slate-400 text-sm">Đang tải lịch sử...</p>}
      {!loading && visibleLogs.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm">
          Chưa có lịch sử. Hãy thực hiện một phân tích ở tab Giao tiếp AI.
        </div>
      )}
      {[...visibleLogs].reverse().map((log, i) => {
        const statusMeta = getStatusMeta(log.status);
        const finalOutput = getFinalOutput(log);
        return (
        <details key={i} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow open:shadow-md">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-50">
            <span className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusMeta.className}`}>
              {statusMeta.label}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold text-slate-950">{log.prompt || 'Không có prompt'}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                <span className="font-mono">{formatTime(log.timestamp)}</span>
                {log.event_type && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-500">{log.event_type}</span>}
                {log.model && <span className="truncate">{log.model}</span>}
              </div>
            </div>
            <svg className="h-4 w-4 flex-shrink-0 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
          </summary>
          <div className="space-y-4 border-t border-slate-100 bg-slate-50/70 px-5 py-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Output cuối cùng</div>
              <div className="custom-scrollbar max-h-[34rem] overflow-auto">
                <OutputMarkdown>{finalOutput}</OutputMarkdown>
              </div>
            </div>

            <div className="grid gap-3">
              {!isGeminiErrorCode(log.generated_code) && (
                <details className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <summary className="cursor-pointer select-none px-4 py-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50">Mã Python AI đề xuất</summary>
                  <div className="border-t border-slate-200 p-3">
                    <div className="overflow-hidden rounded-xl border border-slate-700 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400">
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
                  </div>
                </details>
              )}
              {log.executed_code && log.executed_code !== log.generated_code && !isGeminiErrorCode(log.executed_code) && (
                <details className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <summary className="cursor-pointer select-none px-4 py-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50">Mã Python đã duyệt/thực thi</summary>
                  <div className="border-t border-slate-200 p-3">
                    <div className="overflow-hidden rounded-xl border border-slate-700 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400">
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
                  </div>
                </details>
              )}
              {log.plot_b64 && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Biểu đồ</div>
                  <img src={`data:image/png;base64,${log.plot_b64}`} alt="Biểu đồ" className="max-w-full rounded-lg border border-slate-100" />
                </div>
              )}
            </div>
          </div>
        </details>
      );
      })}
    </div>
  );
}

// ── API Docs Tab ──────────────────────────────────────────
function ApiTab() {
  const endpoints = [
    {
      method: 'POST', path: '/api/ai/generate', title: 'API AI — Sinh mã & Giải thích',
      desc: 'Tiếp nhận yêu cầu tự nhiên từ Frontend, gửi kèm ngữ cảnh cấu trúc dữ liệu cho mô hình AI. Yêu cầu AI trả về mã Python và giải thích.',
      req: '{ "prompt": "Vẽ biểu đồ phổ điểm môn Toán..." }',
      res: '{ "code": "import ...", "explanation": "Mã này sẽ..." }'
    },
    {
      method: 'POST', path: '/api/execute', title: 'API Thực thi — Chạy code trên dữ liệu',
      desc: 'Tiếp nhận mã đã được người dùng phê duyệt. Thực thi trực tiếp trên dữ liệu tại máy, thu thập kết quả (ảnh biểu đồ, bảng, logs) trả về.',
      req: '{ "code": "...", "prompt": "...", "explanation": "..." }',
      res: '{ "success": true, "stdout": "...", "stderr": "", "plot_b64": "..." }'
    },
    {
      method: 'GET', path: '/api/logs', title: 'API Logs — Lịch sử lưu trữ',
      desc: 'Lưu trữ và truy xuất tất cả các yêu cầu, mã nguồn, kết quả phân tích và giải thích. Tuân thủ bắt buộc phần Lưu trữ (ai-guide-v2.pdf).',
      req: '—',
      res: '[{ "timestamp": "...", "prompt": "...", "generated_code": "...", "status": "success", ... }]'
    },
    {
      method: 'GET', path: '/api/report/ai-usage', title: 'API Báo cáo — Tóm tắt sử dụng AI',
      desc: 'Tổng hợp số lượt sinh mã, hủy, thực thi thành công/thất bại và các yêu cầu gần nhất để đưa vào phần báo cáo.',
      req: '—',
      res: '{ "total_logs": 10, "status_counts": {...}, "event_counts": {...}, "recent_requests": [...] }'
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-slate-500 text-sm">Tài liệu tích hợp API Backend (Phần 5.2 — ai-guide-v2.pdf). Backend chạy tại <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono text-xs">{BACKEND_LABEL}</code>.</p>
      {endpoints.map((ep, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${ep.method === 'POST' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{ep.method}</span>
            <code className="text-sm font-mono text-slate-800 font-semibold">{ep.path}</code>
          </div>
          <h3 className="font-semibold text-slate-900 text-base">{ep.title}</h3>
          <p className="text-slate-600 text-sm leading-relaxed">{ep.desc}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">Payload / Body</p>
              <pre className="bg-slate-900 text-green-300 text-xs p-3 rounded-xl overflow-x-auto leading-relaxed">{ep.req}</pre>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">Response</p>
              <pre className="bg-slate-900 text-cyan-300 text-xs p-3 rounded-xl overflow-x-auto leading-relaxed">{ep.res}</pre>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
type Tab = 'chat' | 'history' | 'api';
const CHAT_SESSIONS_KEY = 'examdata_ai_chat_sessions';
const EMPTY_CHAT_SESSION: ChatSession = {
  id: 'chat-empty',
  title: 'Cuộc trò chuyện mới',
  updatedAt: 0,
  messages: [],
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

function getSessionGroupLabel(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Hôm nay';
  if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function groupSessionsByDate(sessions: ChatSession[]) {
  return sessions.reduce<Array<{ label: string; sessions: ChatSession[] }>>((groups, session) => {
    const label = getSessionGroupLabel(session.updatedAt);
    const existing = groups.find(group => group.label === label);
    if (existing) {
      existing.sessions.push(session);
    } else {
      groups.push({ label, sessions: [session] });
    }
    return groups;
  }, []);
}

function loadChatSessions() {
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
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [sessions, setSessions] = useState<ChatSession[]>([EMPTY_CHAT_SESSION]);
  const [activeSessionId, setActiveSessionId] = useState(EMPTY_CHAT_SESSION.id);
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionsHydrated, setSessionsHydrated] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const loadedSessions = loadChatSessions();
    setSessions(loadedSessions);
    setActiveSessionId(loadedSessions[0]?.id ?? EMPTY_CHAT_SESSION.id);
    setSessionsHydrated(true);
  }, []);

  useEffect(() => {
    if (!sessionsHydrated) return;
    const nonEmptySessions = sessions.filter(session => session.messages.length > 0);
    window.localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(nonEmptySessions));
  }, [sessions, sessionsHydrated]);

  const startNewChat = useCallback(() => {
    const newSession = createChatSession();
    setSessions(prev => [newSession, ...prev.filter(session => session.messages.length > 0)]);
    setActiveSessionId(newSession.id);
    setActiveTab('chat');
  }, []);

  const updateActiveSession = useCallback((messages: Message[]) => {
    if (!activeSessionId) return;
    setSessions(prev => {
      const next = prev.map(session => (
        session.id === activeSessionId
          ? JSON.stringify(session.messages) === JSON.stringify(messages)
            ? session
            : {
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
  const groupedVisibleSessions = groupSessionsByDate(visibleSessions);
  const sidebarWidthClass = sidebarCollapsed ? 'w-[80px]' : 'w-[272px]';
  const mainOffsetClass = sidebarCollapsed ? 'ml-[80px]' : 'ml-[272px]';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-20 flex ${sidebarWidthClass} flex-col border-r border-slate-200 bg-white px-3 py-4 text-slate-700 shadow-xl shadow-slate-200/70 transition-all duration-200`}>
        <div className={`mb-4 flex h-12 items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between px-2'}`}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 shadow-lg shadow-indigo-500/20">
              <SparkleIcon size={16} color="white" />
            </div>
            <div className={sidebarCollapsed ? 'hidden' : ''}>
              <p className="text-sm font-bold tracking-tight text-slate-950">ExamData AI</p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-indigo-600">Analytics</p>
            </div>
          </div>
          <button
            aria-label={sidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
            onClick={() => setSidebarCollapsed(prev => !prev)}
            className={`${sidebarCollapsed ? 'absolute left-1/2 top-16 -translate-x-1/2' : ''} flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700`}
          >
            <SidebarIcon name="panel" />
          </button>
        </div>

        <nav className="space-y-2">
          <button onClick={startNewChat} className={`flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-left text-[13px] font-semibold text-indigo-700 transition-all hover:border-indigo-300 hover:bg-indigo-100 ${sidebarCollapsed ? 'mt-10 h-11 px-0' : ''}`}>
            <SidebarIcon name="new" />
            {!sidebarCollapsed && <span>New chat</span>}
          </button>
          {!sidebarCollapsed && <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><SidebarIcon name="search" /></span>
            <input
              value={sessionSearch}
              onChange={e => setSessionSearch(e.target.value)}
              placeholder="Tìm kiếm đoạn chat..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-[12.5px] text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>}
          <button onClick={() => setActiveTab('chat')} className={`sidebar-nav-item ${sidebarCollapsed ? 'justify-center px-0' : ''} ${activeTab === 'chat' ? 'sidebar-item-active text-indigo-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
            <SidebarIcon name="data" />
            {!sidebarCollapsed && <span>Giao tiếp AI</span>}
          </button>
          <button onClick={() => setActiveTab('history')} className={`sidebar-nav-item ${sidebarCollapsed ? 'justify-center px-0' : ''} ${activeTab === 'history' ? 'sidebar-item-active text-indigo-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
            <SidebarIcon name="history" />
            {!sidebarCollapsed && <span>Lịch sử chạy mã</span>}
          </button>
          <button onClick={() => setActiveTab('api')} className={`sidebar-nav-item ${sidebarCollapsed ? 'justify-center px-0' : ''} ${activeTab === 'api' ? 'sidebar-item-active text-indigo-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
            <SidebarIcon name="api" />
            {!sidebarCollapsed && <span>Đặc tả API</span>}
          </button>
        </nav>

        <div className="mx-2 my-4 border-t border-slate-200" />

        <div className={`min-h-0 flex-1 ${sidebarCollapsed ? 'hidden' : ''}`}>
          <div className="custom-scrollbar h-full space-y-4 overflow-y-auto pr-1">
            {visibleSessions.length === 0 && (
              <div className="px-3 py-6 text-center text-[12px] italic leading-relaxed text-slate-400">
                {sessionSearch ? 'Không tìm thấy đoạn chat.' : 'Chưa có hội thoại nào.'}
              </div>
            )}
            {groupedVisibleSessions.map(group => (
              <div key={group.label} className="space-y-1">
                <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{group.label}</p>
                <div className="space-y-1">
                  {group.sessions.map(session => {
                    const isActiveSession = activeSessionId === session.id;
                    return (
                      <button
                        key={session.id}
                        onClick={() => { setActiveSessionId(session.id); setActiveTab('chat'); }}
                        className={`group relative flex w-full items-center rounded-xl px-3 py-2.5 text-left transition-all ${
                          isActiveSession
                            ? 'sidebar-item-active text-indigo-700'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <SidebarIcon name="data" />
                        <div className="ml-2.5 min-w-0 flex-1">
                          <span className={`block truncate text-[12.5px] ${isActiveSession ? 'font-bold' : 'font-medium'}`}>{session.title}</span>
                        </div>
                        <span className={`ml-2 flex-shrink-0 text-[10px] ${isActiveSession ? 'font-semibold text-indigo-500' : 'text-slate-400'}`}>{formatSessionTime(session.updatedAt)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className={`${mainOffsetClass} h-screen overflow-hidden bg-slate-50 transition-all duration-200`}>
        <div className="flex h-full flex-col">
          <div className="px-8 pb-3 pt-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              {activeTab === 'chat' ? 'Giao tiếp AI' : activeTab === 'history' ? 'Lịch sử truy xuất' : 'Đặc tả API'}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
              Hệ thống phân tích điểm thi THPT Quốc gia
            </h1>
          </div>
          <div className="min-h-0 flex-1">
            {activeTab === 'chat' && activeSession && (
              <ChatTab
                key={activeSession.id}
                initialMessages={activeSession.messages}
                onMessagesChange={updateActiveSession}
              />
            )}
            {activeTab === 'history' && <div className="h-full overflow-y-auto px-8 pb-6"><HistoryTab /></div>}
            {activeTab === 'api' && <div className="h-full overflow-y-auto px-8 pb-6"><ApiTab /></div>}
          </div>
        </div>
      </main>
    </div>
  );
}
