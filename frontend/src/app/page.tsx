'use client';
/* eslint-disable @next/next/no-img-element */
import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react';
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
import type { Tab as DashboardTab } from '@/types/dashboard';

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

const STATUS_BADGE_CLASS: Record<'pending' | 'running' | 'success' | 'error' | 'neutral', string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  running: 'border-sky-200 bg-sky-50 text-sky-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  error: 'border-rose-200 bg-rose-50 text-rose-700',
  neutral: 'border-slate-200 bg-slate-100 text-slate-600',
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isFallbackInsight?: boolean;
  output?: string;
  errorText?: string;
  logText?: string;
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

interface ChatAttachment {
  id: string;
  filename: string;
  kind: 'table' | 'image';
  content_type: string;
  size_bytes: number;
  summary: string;
  data_url?: string;
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
  'So sánh điểm trung bình Toán theo vùng miền năm 2024',
  'Tỉnh nào có tỷ lệ điểm Văn từ 8 trở lên cao nhất?',
  'Phổ điểm môn Tiếng Anh thay đổi thế nào qua các năm?',
  'Tìm các tỉnh có điểm Lý lệch nhiều so với trung bình cả nước',
  'Nhóm tổ hợp A00 có xu hướng điểm ra sao?',
  'So sánh điểm trung bình khối D01 giữa Hà Nội và TP.HCM',
  'Môn nào có nhiều điểm 10 nhất trong năm gần nhất?',
  'Vẽ heatmap tương quan giữa các môn thi',
  'Phân tích nhóm thí sinh điểm Toán cao nhưng Văn thấp',
  'Top 5 tỉnh tăng điểm trung bình mạnh nhất so với năm trước',
  'Tỷ lệ thí sinh dưới điểm liệt theo từng môn là bao nhiêu?',
  'So sánh phân phối điểm Sinh giữa miền Bắc và miền Nam',
  'Tỉnh nào có độ phân tán điểm Toán lớn nhất?',
  'Nhận xét xu hướng điểm trung bình các môn tự nhiên',
  'Vẽ boxplot điểm Hóa theo vùng miền',
  'Các môn nào có phân phối lệch trái hoặc lệch phải rõ nhất?',
  'So sánh top tỉnh theo điểm trung bình tiếng Anh',
];
const MAX_CONTEXT_MESSAGES = 10;
const MAX_CONTEXT_TEXT_LENGTH = 1200;
const SAMPLE_PROMPT_COUNT = 6;
const MAX_SAVED_SESSIONS = 30;
const MAX_SAVED_MESSAGES_PER_SESSION = 24;
const MAX_SAVED_MESSAGE_TEXT_LENGTH = 5000;
const MAX_SAVED_CODE_LENGTH = 12000;

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

async function uploadAttachment(file: File): Promise<ChatAttachment | { error: string; detail?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/api/ai/attachments/analyze`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const detail = await res.text();
      return { error: `HTTP ${res.status}`, detail };
    }
    return await res.json();
  } catch (error) {
    return {
      error: 'NETWORK_ERROR',
      detail: error instanceof Error ? error.message : 'Không upload được file.',
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

function truncateSavedText(text?: string, maxLength = MAX_SAVED_MESSAGE_TEXT_LENGTH) {
  if (!text) return undefined;
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function compactMessageForStorage(message: Message): Message {
  return {
    role: message.role,
    content: truncateSavedText(message.content) ?? '',
    isFallbackInsight: message.isFallbackInsight,
    output: truncateSavedText(message.output),
    errorText: truncateSavedText(message.errorText),
    logText: truncateSavedText(message.logText, 1800),
    code: truncateSavedText(message.code, MAX_SAVED_CODE_LENGTH),
  };
}

function compactSessionForStorage(session: ChatSession): ChatSession {
  return {
    ...session,
    title: truncateSavedText(session.title, 90) ?? 'Cuộc trò chuyện mới',
    messages: session.messages
      .slice(-MAX_SAVED_MESSAGES_PER_SESSION)
      .map(compactMessageForStorage),
  };
}

function normalizePromptText(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function hashText(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getSuggestedPrompts(messages: Message[]) {
  const askedPrompts = new Set(
    messages
      .filter(message => message.role === 'user')
      .map(message => normalizePromptText(message.content))
  );
  const seed = hashText(messages.map(message => message.content).join('|'));

  return SAMPLE_PROMPTS
    .filter(prompt => !askedPrompts.has(normalizePromptText(prompt)))
    .map((prompt, index) => ({ prompt, score: hashText(`${seed}:${index}:${prompt}`) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, SAMPLE_PROMPT_COUNT)
    .map(item => item.prompt);
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
    <div className="result-markdown prose max-w-none text-[15px] leading-7 text-slate-700 prose-headings:mb-2 prose-headings:mt-0 prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-950 prose-h1:text-[22px] prose-h2:text-[18px] prose-h3:text-[16px] prose-p:my-2 prose-p:leading-7 prose-strong:font-semibold prose-strong:text-slate-950 prose-ul:my-2 prose-li:my-1 prose-table:my-0 prose-table:text-[13px] prose-th:bg-slate-100 prose-th:px-3 prose-th:py-2.5 prose-th:text-left prose-th:font-bold prose-th:text-slate-700 prose-td:px-3 prose-td:py-2.5 prose-td:text-slate-700 prose-tr:border-b prose-tr:border-slate-200">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

function splitMarkdownTables(markdown: string) {
  const blocks = markdown.split(/\n{2,}/);
  const tableBlocks: string[] = [];
  const textBlocks: string[] = [];

  blocks.forEach(block => {
    const lines = block.trim().split('\n');
    const hasTableDivider = lines.some(line => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line));
    const hasTableRows = lines.filter(line => line.includes('|')).length >= 2;

    if (hasTableDivider && hasTableRows) {
      tableBlocks.push(block.trim());
    } else if (block.trim()) {
      textBlocks.push(block.trim());
    }
  });

  return {
    text: textBlocks.join('\n\n'),
    tables: tableBlocks.join('\n\n'),
  };
}

function removeOrphanDetailHeading(markdown: string, hasTables: boolean) {
  if (!hasTables) return markdown;
  return markdown
    .replace(/(^|\n)#{1,6}\s*Kết quả chi tiết\s*\n*/gi, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function uniqueMarkdownSections(sections: Array<string | undefined>) {
  const seen = new Set<string>();
  return sections
    .map(section => section?.trim())
    .filter((section): section is string => {
      if (!section) return false;
      const key = section.replace(/\s+/g, ' ');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join('\n\n---\n\n');
}

function ResultPanel({
  summary,
  output,
  errorText,
  logText,
  plot_b64,
  code,
  isFallbackInsight,
  isEditingCode,
  editingCodeText,
  rerunExecuting,
  onEditCode,
  onCopyCode,
  onChangeCode,
  onRerunCode,
  onCancelEditCode,
}: {
  summary?: string;
  output?: string;
  errorText?: string;
  logText?: string;
  plot_b64?: string;
  code?: string;
  isFallbackInsight?: boolean;
  isEditingCode: boolean;
  editingCodeText: string;
  rerunExecuting: boolean;
  onEditCode: () => void;
  onCopyCode: () => void;
  onChangeCode: (value: string) => void;
  onRerunCode: () => void;
  onCancelEditCode: () => void;
}) {
  const [zoomedPlot, setZoomedPlot] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);

  if (!summary && !output && !errorText && !logText && !plot_b64 && !code) return null;
  const summaryText = isFallbackInsight && output?.trim() ? "" : summary?.trim();
  const analysisText = uniqueMarkdownSections([summaryText, output]);
  const { text: rawNarrativeText, tables: tableText } = splitMarkdownTables(analysisText);
  const narrativeText = removeOrphanDetailHeading(rawNarrativeText, Boolean(tableText));
  const isCodeSectionOpen = codeOpen || isEditingCode;

  return (
    <section className="result-reveal overflow-hidden rounded-2xl border border-[#DDE3EE] bg-white shadow-sm shadow-slate-300/60">
      <div className="flex items-center justify-between border-b border-[#E6EBF3] bg-white px-4 py-3">
        <div>
          <h3 className="text-[15px] font-bold tracking-tight text-slate-950">Phân tích</h3>
        </div>
      </div>
      <div className="grid gap-3 bg-[#F5F7FB] p-3 xl:grid-cols-[minmax(0,0.85fr)_minmax(34rem,1.15fr)]">
        {errorText && (
          <div className="xl:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
            <div className="font-bold text-red-800">Lỗi thực thi</div>
            <div className="mt-1 whitespace-pre-wrap">{errorText}</div>
          </div>
        )}
        {narrativeText && (
          <div className="min-w-0 rounded-xl border border-[#DDE3EE] bg-white p-5 shadow-sm">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Kết quả & insight</div>
            <div className="custom-scrollbar overflow-x-auto">
              <OutputMarkdown>{narrativeText}</OutputMarkdown>
            </div>
          </div>
        )}
        {(code || plot_b64 || tableText) && (
          <div className="min-w-0 space-y-3">
            {code && (
              <details
                className="rounded-xl border border-[#DDE3EE] bg-white"
                open={isCodeSectionOpen}
                onToggle={e => setCodeOpen(e.currentTarget.open)}
              >
                <summary className="group flex cursor-pointer select-none items-center justify-between gap-2 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 transition-colors hover:bg-slate-50">
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                    <span>Mã Python</span>
                    {!isCodeSectionOpen && <span className="hidden text-[10px] font-semibold normal-case tracking-normal text-slate-400 sm:inline">Bấm để mở</span>}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        onCopyCode();
                      }}
                      title="Sao chép mã"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                      <ActionIcon name="copy" />
                    </button>
                    <button
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCodeOpen(true);
                        onEditCode();
                      }}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-[#594DA3] transition-colors hover:bg-[#F3F0FF]"
                    >
                      Chỉnh sửa
                    </button>
                  </div>
                </summary>
                <div className="border-t border-slate-200 p-3">
                  <div className="overflow-hidden rounded-xl border border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400">
                      <span>python</span>
                    </div>
                    {isEditingCode ? (
                      <div className="bg-slate-900 p-3">
                        <textarea
                          value={editingCodeText}
                          onChange={e => onChangeCode(e.target.value)}
                          wrap="off"
                          spellCheck={false}
                          className="code-editor-scrollbar min-h-80 w-full resize-y overflow-auto rounded-xl border border-slate-700 bg-[#1e1e1e] p-4 font-mono text-[13px] leading-relaxed text-green-300 outline-none focus:border-slate-400"
                        />
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={onRerunCode}
                            disabled={rerunExecuting || !editingCodeText.trim()}
                            className="rounded-lg bg-[#00195A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#31327E] disabled:cursor-not-allowed disabled:bg-slate-300"
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
            {plot_b64 && (
              <div className="rounded-xl border border-[#DDE3EE] bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Biểu đồ</div>
                  <button
                    onClick={() => setZoomedPlot(true)}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-[#594DA3] transition-colors hover:bg-[#F3F0FF]"
                  >
                    Phóng to
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setZoomedPlot(true)}
                  className="block w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-left transition-colors hover:border-slate-300"
                >
                  <img
                    src={`data:image/png;base64,${plot_b64}`}
                    alt="Biểu đồ phân tích"
                    className="w-full cursor-zoom-in"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </button>
              </div>
            )}
            {tableText && (
              <div className="rounded-xl border border-[#DDE3EE] bg-white p-3 shadow-sm">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Bảng</div>
                <div className="custom-scrollbar max-h-[28rem] overflow-auto">
                  <OutputMarkdown>{tableText}</OutputMarkdown>
                </div>
              </div>
            )}
            {logText && (
              <details className="overflow-hidden rounded-xl border border-[#DDE3EE] bg-white">
                <summary className="cursor-pointer select-none px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 transition-colors hover:bg-slate-50">
                  Log
                </summary>
                <pre className="custom-scrollbar max-h-72 overflow-auto whitespace-pre-wrap border-t border-slate-200 bg-slate-950 p-3 text-xs leading-5 text-slate-200">
                  {logText}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
      {plot_b64 && zoomedPlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setZoomedPlot(false)}
        >
          <div
            className="max-h-[94vh] w-full max-w-[96vw] overflow-auto rounded-2xl bg-white p-3 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Biểu đồ</div>
              <button
                onClick={() => setZoomedPlot(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
            <img
              src={`data:image/png;base64,${plot_b64}`}
              alt="Biểu đồ phân tích phóng to"
              className="mx-auto max-h-[86vh] w-auto max-w-none rounded-lg border border-slate-100"
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
      )}
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

const USER_AVATAR_SRC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAmfUlEQVR42qV7d3xUZdb/95bpM8lMMhAghEBIMIhACC0UCSBldZGiKPgiYFesCwqClBfYoOCytEVABCTyriXqropkKSJNWFFqTDNIJAnpCSnT7p1bzvvHnbmZBPb9/fGbzydMmPvkmef083zPOUwgECCO46AoCjiOh6LIYDkWpBIYMABDIAJYlg2t4dq9sywLIgIAMAwDVVVvW8NxHFRFBcMyEWtZEKn/3/sqqgKW+b/XyrICnm/bFwCICCzLguV5HrIkwWAwQJYl8DyvHZZhQCCoqrZQlmUYeB6SJMPAGyDLsrZW1dYyaPvi8LO2fWVwPNe2lmFApP0eDAa1tXLEWq79WlVVQ2tk/d0QeudYbW0k8ZFrJUmCwcDr+xKRTrwsSWAlSYLRZIIoijAajZAkjQkUOoBOvMEAMRiEyWSCGNTWBoNB8JzGBAJpxCva2mAwCIPRiEAgAKPBAFEU9QOGpcXzPGw2W+i7tTPwPI9gMKgzMsxUKcTMYOicYjDYjmEAdOIlSdLPZzKZtLOE1rIMC4ZhoCgKDEYjWKPRCFEUNcIimMCGuKWqqk6QtkZov1aW9AMoigIDb4AUDMJoNEJRFNjtdgiiCJvNBpPJFJI+wWQy4caNGzh79ixsNpvGKKMRBoMBNpsNsizDarXCZDJBlmUYDSGCzGb9vGHCFEUBwzDtGKWtaVsb/lxRFRBpwgoGg2B8Ph+FCbqNW2yIW7IMvh0TItbyPOTQAViWhSLL4EKmIQgCDn17CF6fFx6PB2kDB2L8ffeBYRj8/PPP2L9/P9IGDUKvnj0xYcIEKIqC06dPIy8vD1arFaqqYtq0aejUqVM7IbW9GxEMSrophgmTZRn/SbCRZsDzvKYBwZDEgh3UKqwBXAe1arc25Fh058O32dtLL72Eo8eOQlEUPPHEE/j9xg2sWbMGJSUlWLlqJSorKzF+3DgcOnQIBYUF2Lp1K25WVODxxx9HIBDAiRMnsGDBAgiCoJuG0WhEUAyfQSNeUdrMVVEUXWO1tRrxYZ9ARGAAXVuYQCBAPMdDkiXNuSntnVCkx4yMFHwEoZFrRVGEw+HAmTNncO3aNZw+fQpxcV3wxz8+AEEQce7cOZgtFljMZrjdbnhaWyEGRfgDAlRFwaD0QTCbLcj57DOoqorMzEx07doV48ePh8/nA8uyGtERmhY2K6AtWkWeT5EVcP8hCjCiKBIR6Zt0fA9718jPWIaFSmq7z1VFActxMBqN8Hq9WL9hPbrEdUFcXBxaWlpQU1OD8vJyCKKA5qZmNDXdQnNzC6xWKziOg9VqRZcuXWC329GlSxd0T+gOZ7QTNTU1uHnzJhYvXozY2FjIkqz7ndvOCS1yMQwDUlWwEcK5E02qShoDQADhdmJB2qe3bRB6Fn6pqgqLxQKv14vvv/8eN27cgNFoRGlpKa5cuYLCokJU3qyEy+WCqipoaWmF2+2Gy+VCaWkp7HY7rFYLqqtr9D1NZhPSBqZh1KhR6NWrFwRBQPfu3XH//fcjOjoagUBAkyCAtpOgPQ2hZ5GEd3wxgiBQONRp9tSWhGhqHU6EGChK+wQj7FkNBgPOnj2Ln86fh8lsRnFxMb744gtU11QDBERHR2PTpk0wmYyorq7B8uVvYfnyFZg2fTrSBg7E008/jZUrV+Luu++G3W7D4sVLcO3aNeTm5uLmzZvo1asXJk+ejP79+8Pj8WDEiBEYM2YMJElq56904kPS/08Jlm4CDAs+Ms6Hc4COmVikXYWJFgQBdrsdfr8f//M/f4fX64HX58PuDz5AcXExhg4dCpZlUVNTgz179iAmJgaTJk2EzWaHJGnxPcrhwPjx4zF06FAoqoJAIIDhw4fjtddew9KlS/HQQw/h/fffR1lZGXbt2oXY2FgsWLAAly5dQmlpKWbNmgWLxYJAIACO5QAG7ZKxME0dfRsAsAyrZZGRMTbsLTWOtmViYeLDa4RAAHa7HRU3K7Bz507Isozvv/8eq1atQnFxMaxWK3JycvDaa69BURRMmjQJn+XkQFFUmM1mPbqwLIshQ4YgPr47pKAEIsIf//hH+Hw+XLlyBTt37oTb7cbBgwdx8uRJpKWlISsrC9999x0EQcCunbtQXV0Ni8UCWZHbhUFDBE1SKMNVZLmNJlWjCZIkkc/nI1mWyefzkSRJ5Pf7KRgMkiAI+u/hNa2trUREVFRURH/5y19o+/bt1Du5NwGgOXPm0MMPP0w8z1NGxnASBIESEhLo8OHDdP78eQJAUVFR1K1bN9q+fTsVFBQQAFq0aBFVV1cTz/NUUlJCWVlZNH/+fHK73TR16lQiIho1ahS9/fY6SkzsQQAoJSWF3n//fdqwfgOVlpYSEVEgENDP6/V6KZI2v99PUlCiQCBAgiDoNMHv95Msy+T1etsWShIJgkCBQICIiIJBkYiIvF4vEREVFhXRxo0baePGjRQTE0M8z1Pnzp2ppqaWGhsb6eDBg7Rw4UI6f/48HT16lO666y4qLCykQ4cO0UcffURz582lCRMm0EsvvURGo5GmTJlCa9asoT59+lBjYyOtXbuW4uI6EwCy2210/fp1eu655wgApaen03vv7SCj0UjR0dG0efNmWr9+PZWWlpKqqiSKIsmyHDp3kKSg1EGwIomiSIFAgGRZpnYa4A8vDAR04svKyujdd9+l7du3k6qq9Ntvv9HGjRvpnfXrieM4AkBOl5M4jqN58+ZRQ0MDDR02lJYuXUrHjx8nWZZp1OjRxLAMDRjQn+Li4ggAWSwWstls1LVbV7JYLBRy2GR32On555+nuXPn0uuvv06pqan0zjvv0M2bN8loNBIAeu+996i4uJji4+PJ5XLRpk2baP369VRdXU2yLNPevXtp3bp1VFFRQYqikCiKIeI1wUZqABMI+Inn2zInSZLAsiyMBiMaGhvw3HPP4c0334TP60NACKCqqgqtHg/+e9UqxLpjMWzoMBw7dgytra0AgFOnTsHj8WDKlClwOp3o3LkzSkpKENclDoPTB2PQoEHo2asXDAbtwhW+bYpiEBUVZTh//iccP34cRIT09HSsXLkSgwYNQk5ODpYsWYJHHnkE2dnZ2Lp1K4iAt95ahujoaKxZswYmkwnJyclQFAU2mw0bNryLjz7KRlRUFGRZ1pMfLbwTOI4HgsGgbjeBQIBEUSRFUaiuro5WrVpFRUVFtGnTJjpy5AjNnz+f9u3bR51D6vnGG28QEdFvv/1GWVlZlJSURL1796a8q3mUnJxMACi+ezytWLGCdu3aRYuXLKb777+fevToQQzL6FLneZ5SUlJo6tSptGLFCtqzZw8tXLiQrFYrAaD+/fsTAJo8eTIRES1ZsoQAkNlspldffZWio6OpU6dOlJ2dTY/Nnk25ubm0efNmKioqohUrVlBjYyMpiqJLXxAE3QwQVocw8aIoUktLC61a9d9UVlZG5eXltHnTZvr4409o+/bt1KdPH/3L+/fvT3//n7/Tyy+/TLIskyAItHr1agJARqORFixYQO+//z7NmDGD7A67TnBCQgItWbKE/v73v9OBAwfomWeeIYfDoT+Pi4ujp556ivbv30+zZs0iAMQwDH3zzTe0Y8cOAkAcx9GOHTuotbWV9u3bR7GxsTRs2DDatnUrZWdn05YtW6iqqopKS0tp+VvLqaW5hURR1IiPMAPoH4oi+Xw+IiLavfsDysvLo6amJsrKWkfHjx+nL774gjIzM4njOHrwwQfJZrMRAMrKyqKcnBwaNGgQTZw4ke6++26Kj4+nHTt20AsvvEAmk4kAkMlkIpZladq0afr3NDc36461pKSEBg4cSAaDgRhGY0SnTp1o9erVtHHjX8hqtZLdbieLxULR0dGUk5NDRERTpkyhmTNn0v33308A6MEHH6TPP/+ccnNz6c9//jN5PB4qKCigXbt2ERGR3+/XBS0IgsaAsPR9Ph8pskK5ubm0Y8cOWrVyFR07doz+8Y9/0Pz58wkADR06lIiIvvjiC7LarJScnEwnT57UGZKamkr79++nIUOGEACyWi305ptv0vnz5+nKlSukqipdvXqVRo8eTbGxsRQbG0uzZ88mr9dLLS0tlJ+fT7m5uTR9+nRdIx5++GH64IMPqHNnzfS2bNlCtbW1NGHCBFqzZo0eFv/0pz8RAHrmmWcoJyeHDh3KpVWrVtHu3bvp0KFDpCgK+f1+XeCCIBACgYAeIiRJ0sNDRUUFLVu2jPbt20evv/56iBgrRUdH08GDB6mxoYEKCwupV6+etGDBAkpMTKS0tDQ6cOAAxXfvTizLktlspj179oRCqIeuXLlChYWFlJKSEgpxdrLb7XoOUVxcTBcvXqTwa/78+brnHzFiBGVnZ1N8fDwlJyfT/v37KSUlhViWpZSUFCopKaGysjKaPXs2AaClS5fSgY8O0MKFC+nGjRukhnxApPSDwWBbGIxMgERRpHPnztH27dvpzTffJI7jqHv37tS7d29dIs8//zwdOXKESkpKdLveu3cvJSQkkMFgIIvFQhkZGUREdObMGerZsyexHEsul4tsNhtFO6PJ4XCQI8pB0dHR7Zgxfvx4amxspBs3bpDT6aSYmBgCQMOHD6cPPviALBYLDR48mB544AHq27cv3bp1i86ePUtWq5Xy8vIoNfUuYlmWli9fTtu2baPTp0+3c3xh4v1+P/FSUNJQE0GAMQRZ/f777zh9+jTq6uqwZcsWAMBf3v0LJkyaiE8/+QS1tbUYODANc+bMQY8eCXC5nHjzzTdRVVWFYDAIi8WC1tZW3HPPPQCApUuX4saNG3C5XAgGg2A5Fqqi5eQgtF2tQYiJicH333+P7OxsLFy4EPHx8SgoKIDdYUdZWRlu3bqFtWvXYvHixeA4DgUF+fj6668hCAJ++uknOBwO+Hx+mM1mrFu3DovfWAyvx4Pu3bujR48e2nUZWnpvNBjBGowh/CyEtYVvVp07d8a3334LjuNgsViQtS4LFeXlsFgsEEUR8fHd0CMxEZcuXcbLL78ChmHw6KOPhq7FHqxYsQJ//etfUVhYiLKyMlit1tCtjL3t/hr+r34woxHHjh1DZeVNHDt2DHPnzoXX40V8fDymTZsGlmWxaNEiKIqC2bMfw9KlSzFt2jR8/fXXGDlyJOrr62E0GsHzPL499C26duumA62q0gadiUFRQ4XDuJnZZIYkSXA4HCAi9OrVS8fXioqK8Ic//AEJCQnwer3IzMzEpYsXMW/ePLhcLkyYMAHx8fGoqanBo4/Owp///Gd89dVXGDJkCFpbWyKwuDaiKfQvE8EIRVFgNptx4sQJpKcPRl1dHT766CPcc889qK6uRp8+fTBy5EgkJiZi5syZuHLlCnr27Iny8nJkZWWhprYGJpMRRARFUZCYmAgAiI2N1THB8AXPaDSCbUNQNZATAJxOJziOQ3Jysn4ljoqKQlNTE+bNm4e4uDhIkoTMzEwMGTIE/fr1Q58+fdDY2AiWZTFjxgyIooi33npLw90Y9jbYgglJPHQ514AL7UKvAyx1dXVYuXIlVFXFmDFjoCgK/D4/MjIyEB8fj8zMTGRkZOD8+fOYPmO6hihbbXp2SUTo2bMnjEYj7HY7KATehDVAkiSwcgTYaTBqKbHZbEZsbCxSUlLgdrvh9/vBMAwcDgf8fj9Wr16NYcOGYebMR+B2uzFp0iRIkqTfzVtbW2EymcDzvA5EQpezhi+0/XAAw0Q8bQ9dGQwGsCyLhvp6iKIIAkGWZTz00EOwWq2YM2cO+g/oj5rqGh0Y5Xkefr8fbrcbffv2hcvlgtls1gohEQAuz/NguQ4Vl3ARY+TIkZBlGa+88iosFguamppw69YtBINBTJ8+Hf/1X3MQFeXArFmzEAgEwPM8mpqaMHfuXMycORNHjhyBz+fTVD9C+izLwuf3wefzodXTipaWljaEhtOYolWkNC0oKipCfn4+1r39NsaNGwchIIBIY8KcOXPA8zyeevIpPPDAAxAEAc3NzWhqaoLZbMarr74KIiAjIwOiIEYIA7oZMIIgUFupitVtx2q1orS0FJ988omO7ymqgrjOcXC73UhMTMSDDz4IRVGgKAosFgvy8/NRWlqKiRMnomevXrjV2AibzaYXLiRJQjAYRGpqKsaOHatD2Pv27QPP82htbQXP83pNgDfwaG5qxn333YfvvvsOBw4cwOjRo5GYmKhXkVRVxT/+8Q/U1tbi1q1bqK+vhyzLSEpKgiRJmD9/PhITExHwB8BybDukm2EY8O2tUrMRq9WKixcv4vr162BZFlVVVYiOjgbLsrj33nuRlJSE5ORkCIKgIyzhTWVZRllZGZpu3dIJ4XgerS0t2LhxI0aNGoW77roLTqdT/+Z58+ZBURSUl5dj8+bNuHTpEswWM1RFhdFoRF1dHRRF0ctrkXVAAHjsscdQXFyMa79dw6mTp2Cz2VBfX4/Y2FicPn0aKSkpyMjI0M4b4Y2ISMMEI0FOq9WKw4cPo6ioCAaDAWlpaYiJjUVBfj7q6uoQCASQnJwMr9cLk9GoQcs6A7SNO3fuDLfbjebm5hAuF4TL5YLFYsG///1v5ObmIiAEkNQrqZ3PMJvNiI+Px6VLlwACGJaBLMtITk7WvHeooBG+1oZhNZ/Ph9TUVPz666+Ii9M0tF+/fqipqUFxcTGqq6tRW1uLadOmtaHJIQayityG91mtVvz6awkuX76CsWPHIhgMIhgMounWLdisNqSlpaG4uBinT5+G3W5HUJK0pEYNOSyeg9/vxwsLXkBdXR2MRoOOvrIsiwsXLiAqKgoVFRXIGJ6Bw4cP48SJE0hOScG1a9cQGxurA7DhWoPD4cDBgwexadMmRDudEAVBL9iGhWaz2XDixEn8/vsNpKT0gcFgQHNzs16kGTFiBPLy8lBQUNAOk9SctCFU9jIYAQBXrlxGfHw3nDp1GhMnTkSfu+7CtwcPYtbsWbh8+TL8fj/Kysp0AEVDkBmAAIvViuPHj+PgNwdhsVigqCo4loPX68X06dMxdepUTJo8GS5XDAYPTkcgEICqqhg2dBhsViumT5+O2tpaHDx4MKTe4ToEsGPnDrz04ksYPXq0npuEy3WiKKKs7Ab8fh8SE3tg0KBB+PjjjzF79mxcuXwFJ0+dRNeuXVFYWIh+/frpdUEpXB43GAyQZAmqquLWrVuI794dTqcTXbt2RUN9PZKSklBRUYErl6+ge/d4eDweiKIYgqDbyuNGoxEejwccz+kV47C3HTRoEK5fv46zZ85g4MAB+PzzzxEfH4+kpCTs27cXffv21WoJ1dXo3bu37l+ISEOtxSC8Xq8esURRhMFgAAC0trYiEPAjISEBJSUlqKmpQf/+/VFVVYVOnTshMTER8fHxaGpq0iH/sANmI0vfWrrIIhDwo0ePBERHR6O8vByHDh1CSUkJHnr4ITgcUVBVVee+LLfF1ubmZowdOxbdunZDS0uLhtWHXrIsY968ebj222/417/+hdbWVowdOxbDhw9HUAzi6NGjEAQBzz33XCh8agUMjtPMKj09HUlJSbqjbTsvFzIFGVFRUbjvvvvw66+/4ptvvkFjQwOcTie6dOmCgBCAwWDQzDWcCAUl8OFU2O/3w+FwICoqCl6PF79d+w3jx4+H0+nEzJkzkZqaigsXLqClRavnuVwu+P1+vZYQjiAJCQnYs2cP5s2bh7q6OlhtVgDAtWvX4Ha7sWDBAgDA1q1bsW7dOvj9fvS5qw+ef/55AEBJSQkaGxvB8wa9gyQjIwObNm3C+R9/1CXv8/lgMpkgCAKcTiesFisqKytRX1+PzMxMdOnSBaQSHA4Hfvr5Z8R17oyoqCgYDDwCsgSoKgxGA/hw14XZbEEwGMSIESPx+eefAwD++c9/IjU1FVevXkV5eTmqq6uhqirGjx8fUkWDVhSNKDc1Nzdj2rRpKCoqwqhRo3D58mWYTCaUlpZCkiQIgoBt27bhwIEDaGhogKIo6Ny5M5qamvDGG2+gqKgIPp8PMTExaGhowNtvv41ly5YBAI4ePapldCENiMzsxmSOwdGjR3Hu7FlUV1ejvr4eGRkZ+PTTTyEFg6irq8Mjjzyi/024RYYPV1HCFdceCT0wYsQI/PvcOVRVVaGiogLNzc2IiYlBZWUlLBYLPB6PFoZIAcNo4UhVCS6XE5s3b8aFn3/GsrfewmeffYbnn38eJ06cQH5+PkRRRHl5Oc6cOYMBAwZgxIgRYBgGJdeuIS8vDx6PB7/88gtUVUVDQwP+9Kc/YdmyZThx4gQ+/vhj5OXlYdasWeA4DoIggGU5GAw8fD4fPB4PamtrIYoCPF4vWlpaUF9fr+f9Y+4dg27dukEURbBsWy+DVh6PKCUD0NtXzp8/D1mWcfXqVbjdbqiqqt/WjEYjnnrqKd0EzGYzqqqqMHjwYNTW1mLq1Kn4+uuv4fP5MGvWLPz444/Yvn07Zs+eDQBobGzEsmXL4Pf7sXXrVsTGxkJVVYwePRr5+fmYMWMGsrOzUVhYiNGjR6OpqQkpKSm4dPEijCaTfo7Kykp8+eWX2kXJ74fVakVDQyN4nkPfvn1hMpmQkZGBbt266Y61XUMVQGBCSUX4oSAISEhIQM+ePfHTTz+hvr4Bv/5ajJycHPj9fvTv3x9z587F7t278eKLL7ZrkuA4DlFRUTh06BAmTpyI119/Hbt378Z3332Hd999F1OnToUsy4iNjcXUqVPBsiyiojTH+sknnyAuLg7b39uOKEcUduzYgfXr10MQBNjsNvA8p12giWA2m9HQ0IAvv/wSYjCInTt2oK6uDk6nE48/PgdOZzSGDBmClJQUKIoS0hhWv32CSLultgGEAYpEiAP+APl8Ptq7dy8tDuHwDoeDnE4nAaB77rmHdu7cSdu2bdOqSKpK5eXl1KVLFw3yinYSw2jYf0xMDLndbnI6nfTss8/SvffeS3v37tWxvw8//JDuvfdeSk8fTLGxsdSrVy+KiorS4HeLmZxOJ5ktZkoJlc6IiOrq6mjbtm20ZetWcrlcZDAYKNoZrdcS1qxZQ9nZ2SQIAvl8Pp22SEBUFEViWZaFGmp9URVVTzFNZhOabjVBVVWcOnlSuzqyLGRFhsvlQmFhIXbv3g2TyYQdO3ag1eOB1WoFw0BrZeEYREVHITo6GoqioKGhAWPGjMGYMWNw6dIlPP300+jePR6JiYl48sknwXEcXn31FXi9XtTX12u4hMupwVYsCyEgwGgw6L7o008/haqqWJeVhUAgoN07QncHhmFw7t/noCgKvF4vzGbzbS0/bamwooAP9waEGwpDYIKiKnqChBCCw4CBLEuIio7ClatXsHXrVtjtdux+fzdaWlpw5MhRpKcPQtOtJoC0+O/1egEAHo8Hjz/+OLKysuB0OpGamgqn04m4uM44dOgQkpOTIYoivF4vvF4vRFEEANy6dQuZmZn49ttvkZeXhy+//BKCICArKwsejwcmkwmKqrQjLigGQ1ds7o7Nl3qXGM/zel+fFNH5pSgKYlwumE1m9OnTR+/KDN8cZVlGdFQ0SkpKsHbtWrAci39+9U/4fD6cP/8TlixegpaWFpjNZvzhD3/A5MmTdUaYzWYkJibiu++O48MPPwTDMLBarZAkCV27dsXLr7yM8ePHI8YVA4/Hg9WrV+P48eMoLS3FqVOnUFtXi7Vr1+q5gKIoOroU1uCk3r1hMplgDAEqd+oUlaRQImTs0H8Xzq/tDgdiY2MxYMAAHDx4UE94IgFMm92GxsZGLF++HC+88AJ++uk8iouLsXzFcowbPw45OTl455134Ha7kZSUhI0bN8JkMoELOSS73Q6z2YLTp07jpZdfwnPPPYfVq1ejqrIKmzZvwuTJk5Geno7s7Gz4/X5cuHABn3zyCUxmUyiza1NtAAhKQbjdsRg4YADcbjdsNhs8Hg+sFguCUoemToMBjCzL9J8aCjmOQ2VlJXJzc3HixAnk5OTA5XKFcD6mHcbH8Ryam5oxbtw4TJs2HUQq+vfvj9jYGPwr9zAyx2aiW7dumDt3Lq5cuQJVVTF27Fg0NNTj5wsX4I5145VXXsXKlSvw/fff4+LFi8jMzITP50N+fj4CgQD279+PoqIiAIDDYW8Hs4Vbb5uamvDss89i8ODBmD17NkwmU1vrbqirNKwpsiSDv1P3J88boKgylKCCHj16oFOnThg//j78/PNPqKqqhslkBlGoQZll0NrSisOHj6CwsACLFi3Cjz/+iOkzpkNVVTgcDtzd72589dVX6NPnLpw6dQpXr17F1atXUVFRAZvNhuXLV2DcuHFwOBzYtm0b6uvrMXToMBQUFKCurg7nzp3DN998g7i4OLz22mvweDz4/PPPtTYXjgeR1hfU2tqKtLQ0pKcPRmpqKqKjo3UUqmMDqKIoMJqMYCRJovCNUJYk8BFtsmF7YRgGH3zwAWRZwdKlb+qelmVZNDc349FHH8Vnn32GSZMm4dixY5gwYQIKCgoQDIoYO24c0gelIz4+HufOnYPD4cATTzwBt9sNu90OVVXh9/tRU1OD/fv3Q5ZlDBs2DL/fuIFTJ0/i7NmzkGUZL7zwAoYMGYKWlhY8+cSTOHHqBGY+PBM2m02H24wmI9asXgO73YEnnpgPRVH0Zqk7OUJZlrVOUa2FTA51gbZvkyOVwPEcampq8Nlnn8Hj8WDNmjWIiorSgYW8vDz88MMPmD9/Pu655x788ssvmD17Nk6cOAGHw4GbN2+iX79+6Nu3L7p27YqoqCjYbLZ2VZpAIICGhgbU1dXhwoULuH79OtLSBsJoNKGsrAyVlZVYu3Yt1q5di1GjRuH498cxImMECgoKdM1ds2aNjhQ7nU4dNwx3lUa2yYWzQb08HhRFEgLtk6HwTyAQIFVVKS8vj7Zu3UorV64kjuOI4zhKS0sjQRCoS5cuBIDOnDlDP/74IwGgjRs3ks/no+joaOI4lpKTk8lms5Hdbien00kpKcmUlJRE3bp1I4fDQUlJSRQVFUU9e/ak3Nxc2rlzF/Xr148A0CuvvEKyLFNCjwQCQKWlpTRi5AgCQDabjd5++23avHkL3fj9d70MHm70iqRJEMR2BdL/s1U2Mq6Gkd9Lly7hhzM/wOf3YcOGDfB4PPjmm2/w888/w2q1YsmSJRgwcABKfi3BqVOn0Lt3b7z44os4+8MP+O36dQwaNAhEhA0bNuCpp57CuHHjMGXKFAwYMACFhYXYs2cPfv/9d5SXl2Pu3Llobm7GpUuX0NDQgKLCIvx4/kcUFBQgJSUFTz75JBISEvDqq6+C53lMmTIFycnJWt9gyNv/v2iDEAjoHSKRnSJ3KiWHGxvy8/Npy+YttHXrVho4cCABoNWrV1Nubi7NmDFDL2fX1NTQY489Rnv37qWnn36afr9xgwDQjBkziIgosWciuWJcNGLECCIivaeAYVk6lHuIysrKaNq0acTzWjPWQw89RI2NjbRw4UICQGPGjKH33nuP/va3v1FFRYUu+ciul8h3jab2GqH3CEWWxyOZELmZJEl6R0dtbS3t2rWLtv/tb/TMM8/oeT/P88TzPG3fvp2Ki4uJYRjKzs6mGzfKaMuWLQSAnn32WaqqqiKXy0U8z5PL5aLaulqaM2eO3nn22muvUU1NDY0cOZJefOlFcjqdWjnd4SCDwUAvv/wybd++nbKzs8nj8ZCiKBQIBCgQEEgKSu1okiSJAhEmESbe7/cTGwYYb+8U1VSFZdq3yZrNZvh8PnTq1AnPPPMMUvr0wYABA7Bp0ybMmTMHnTp1gizL+PDDfVi0aBE4jsPhw4eRmNgDR48eBQD06NEDAOD1emG1WuHz+8CAQb9+/fSizPHjx1FZWYlZs2ahqLAIzc3NMJlMmDx5Mv76178iNTUVaWlpmDdvHsxmszb9wTDgOBaSLLUDTaVQdAujzWFTMBjCiFBELhA5N6SqKlRqP4cjiiLMZrMOh02aNAlpaWk4e/YsLBYLBg8ejKKiIpw5cwZHjhyGoqj49LNPEQgEcPXqVfA8j0AggIsXL4JhGH285auvvgpBYTwYhkFhUSEGDx4MAEhISNAjjMPhQFxcHMaNHYdoZ7RWLwz3/odngSIKvv/XdIskSWD8fj+1Hy8JwmhsywUi08Y7JU0sy4LjOPA8j5qaGly8eBHV1dUIBoPw+Xyorq5GXl4e8vPz4ff7EQgE2qXUHV82uw2xMbHo1q0b7u53N3on9dbnjXr06IG0tDQd3OBYbUgrLCyQlpFGCus2wXIc1FB+YzAYQolQMAijyYSgKMLQQQMAgGM5Xa06bhpmVLjeznEcPB4PKisrcfnyZVy6dAkDBw5Ea2urzhRJklBdXQ1ZkWExW2AymWC1WnVCVVWF3W7HzZs3YbVa8ccpU5Cc1FsHWL1eLywWS1t6K8tgIjQgXOi5U4arqkr7RMjv95PRYNRH4Tq2zN9xHC005haUgu1mBwEgjDKHgccNG97FgAH9kdInBeuy1oFhGHi9Xjz88MMAgAsXLqC+vl6/xYXBUbfbjQMHDmDRokVwu91aSYvjoIQA0UgBtGuDD938jOG5ochBsPDQVCgEchwHJhgM0n+aF+g4L6TPFhkMkCW5wxxO+wnTsI0pioLs7Gx06dIFFRUV6Nw5Dp06uXH9+nXMmTMH695eh/KycixYsAA1NTX45ZdfkJ6ejsrKSowdOxb9+vXTR+q0WSVDxDCkcvt8UwjfvPO8QFsZLwyIaBMjoeEBjmWhdkwYQuM0kcXIO424dhywUlUVLMMAIUdXVFQEm82G7t27g2VZfTzO6XQiJSUFw4cPh6qqqKmpQX19PZKTk2Gz2TRbjyCy3Vhsh/NGjsvcPpLLdijkar/rmaCeG4czJH2zthEhbYKm7QOKzKlDjLpTthUGMYkAUdQaHCwWi34r43kegiBoiLTRCCZCe3QGtyXwbb0kkcL6D88iPmh/3nB5PLJzI1KV9He9e0dDUVUisAxzG+c7Ti8xYKCSqk2YQdXhrbBphcvU4VJXOOcQQ/E8vJbaTh2qNDO6Jt421daBcF3NGbadcCJfbOSMTXgQOXJzhLpHIlUq0vF0vDZ3NBNZabta6/tSW50/st4fnutpP+IWGtML7avPAoa0407zjR2nx1U1pEnq7abaVhwNefXwZHj4sNoXtzmVyMnRcF/RnaJFuOEqMrKEJR0ebgpPjYfxSKPRqGESkVPpofkeQ4fp1Y5OW9Og9mFQO6/YNgrMse0xQVnG/wIeYq5dNmTYAAAAAABJRU5ErkJggg==';

const UserIcon = () => (
  <img
    src={USER_AVATAR_SRC}
    alt="Ng??i d?ng"
    className="h-full w-full rounded-full object-cover"
    draggable={false}
  />
);

const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
  </svg>
);

const SidebarIcon = ({ name }: { name: 'new' | 'search' | 'history' | 'api' | 'data' | 'more' | 'panel' | 'chart' | 'distribution' | 'correlation' | 'map' }) => {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true" {...common}>
      {name === 'chart' && <><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16V9"/><path d="M12 16V7"/><path d="M16 16v-4"/></>}
      {name === 'distribution' && <><path d="M4 18h16"/><path d="M7 18V9"/><path d="M12 18V5"/><path d="M17 18v-6"/></>}
      {name === 'correlation' && <><circle cx="7" cy="16" r="1.5"/><circle cx="12" cy="11" r="1.5"/><circle cx="17" cy="7" r="1.5"/><path d="M8.2 14.8 10.8 12.2"/><path d="M13.3 10 15.7 8"/></>}
      {name === 'map' && <><path d="M9 18 3 20V6l6-2 6 2 6-2v14l-6 2-6-2Z"/><path d="M9 4v14"/><path d="M15 6v14"/></>}
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

const ActionIcon = ({ name }: { name: 'copy' | 'edit' | 'like' | 'dislike' | 'check' | 'trash' | 'attach' | 'x' }) => {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true" {...common}>
      {name === 'copy' && <><rect x="8" y="8" width="10" height="12" rx="2.5"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v8A2.5 2.5 0 0 0 6.5 17H8"/></>}
      {name === 'edit' && <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></>}
      {name === 'like' && <><path d="M7.5 11.5v8"/><path d="M7.5 18.5H5.75A2.25 2.25 0 0 1 3.5 16.25v-2.5a2.25 2.25 0 0 1 2.25-2.25H7.5"/><path d="M7.5 11.5 11.2 4.8a1.7 1.7 0 0 1 3.2.9v3.1h3.45a2.65 2.65 0 0 1 2.55 3.35l-1.05 4.1a3 3 0 0 1-2.9 2.25H7.5"/></>}
      {name === 'dislike' && <><path d="M16.5 12.5v-8"/><path d="M16.5 5.5h1.75a2.25 2.25 0 0 1 2.25 2.25v2.5a2.25 2.25 0 0 1-2.25 2.25H16.5"/><path d="M16.5 12.5 12.8 19.2a1.7 1.7 0 0 1-3.2-.9v-3.1H6.15a2.65 2.65 0 0 1-2.55-3.35l1.05-4.1A3 3 0 0 1 7.55 5.5h8.95"/></>}
      {name === 'check' && <path d="m5.5 12.5 4 4 9-9"/>}
      {name === 'trash' && <><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 14h10l1-14"/><path d="M9 7V4h6v3"/></>}
      {name === 'attach' && <><path d="m21.4 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l8.5-8.5a4 4 0 1 1 5.7 5.7l-8.5 8.5a2 2 0 0 1-2.8-2.8l8-8"/></>}
      {name === 'x' && <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>}
    </svg>
  );
};

// ── Chat Tab ──────────────────────────────────────────────
// Required flow: prompt -> generate code -> user reviews/edits -> execute after confirmation.
// The confirmation step is mandatory: keep pending, setPending, PendingReview,
// editedCode, handleAccept, handleCancel, the review warning, and the
// "Duyệt & chạy" button.
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
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, pending, loading]);
  useEffect(() => { onMessagesChange?.(messages); }, [messages, onMessagesChange]);

  const copyMessage = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const sendPrompt = useCallback(async (prompt: string, baseMessages?: Message[], promptAttachments = attachments) => {
    if (loading || !prompt.trim()) return;
    const attachmentNote = promptAttachments.length
      ? `\n\nĐính kèm: ${promptAttachments.map(item => item.filename).join(', ')}`
      : '';
    const nextMessages = [...(baseMessages ?? messages), { role: 'user' as const, content: `${prompt.trim()}${attachmentNote}` }];
    setMessages(nextMessages);
    setInput('');
    setAttachments([]);
    setPending(null);
    setLoading(true);
    setError('');
    const gen = await callApi('POST', '/api/ai/generate', {
      prompt,
      history: getContextHistory(baseMessages ?? messages),
      attachments: promptAttachments.map(item => ({
        filename: item.filename,
        kind: item.kind,
        summary: item.summary,
        data_url: item.data_url,
      })),
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
  }, [attachments, loading, messages]);

  const handleAttachmentUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingAttachment(true);
    setError('');
    for (const file of Array.from(files).slice(0, 5)) {
      const uploaded = await uploadAttachment(file);
      const uploadError = getApiError(uploaded);
      if (uploadError) {
        setError(`Không thể đính kèm ${file.name}: ${uploadError}`);
        continue;
      }
      setAttachments(prev => [...prev.filter(item => item.filename !== file.name), uploaded as ChatAttachment].slice(-5));
    }
    setUploadingAttachment(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(item => item.id !== id));
  };

  const submitEditedMessage = () => {
    const text = editingText.trim();
    if (!text) return;
    setEditingIndex(null);
    setEditingText('');
    sendPrompt(text);
  };

  const executePythonCode = async ({
    code,
    generatedCode,
    explanation,
    prompt,
    onSuccess,
    messageIndex,
  }: {
    code: string;
    generatedCode?: string;
    explanation: string;
    prompt: string;
    onSuccess: (output: string, plot_b64?: string, analysis?: string, errorText?: string, logText?: string) => void;
    messageIndex?: number;
  }) => {
    if (messageIndex === undefined) setExecuting(true);
    else setRerunExecutingIndex(messageIndex);
    const exec = await callApi('POST', '/api/execute', {
      approved: true,
      code,
      generated_code: generatedCode ?? code,
      prompt,
      explanation,
    });
    if (messageIndex === undefined) setExecuting(false);
    else setRerunExecutingIndex(null);
    const executeError = getApiError(exec);
    if (executeError) { setError(`Lỗi khi thực thi mã: ${executeError}`); return; }
    const combinedOutput = exec.stdout?.trim() ?? '';
    const logText = exec.stderr?.trim() ?? '';
    const errorText = exec.success ? '' : (logText || 'Mã Python không thực thi thành công.');
    const resultOutput = exec.analysis
      ? uniqueMarkdownSections([
          compactGeminiError(exec.analysis),
          combinedOutput ? `### Kết quả chi tiết\n\n${combinedOutput}` : '',
        ])
      : (combinedOutput ? compactGeminiError(combinedOutput) : '');
    onSuccess(
      resultOutput,
      exec.plot_b64,
      exec.analysis,
      compactGeminiError(errorText),
      logText
    );
  };

  const handleAccept = async () => {
    if (!pending) return;
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    await executePythonCode({
      code: editedCode,
      generatedCode: pending.code,
      prompt: lastUserMsg?.content ?? '',
      explanation: pending.explanation,
      onSuccess: (output, plot_b64, analysis, errorText, logText) => {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: analysis || output.trim() === pending.explanation.trim() ? '' : pending.explanation,
            isFallbackInsight: pending.isFallbackInsight && !analysis,
            output,
            errorText,
            logText,
            code: editedCode,
            plot_b64,
          },
        ]);
        setPending(null);
        setEditedCode('');
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
      generatedCode: message.code,
      prompt: relatedPrompt,
      explanation: message.content,
      messageIndex,
      onSuccess: (output, plot_b64, _analysis, errorText, logText) => {
        setMessages(prev => prev.map((item, index) => (
          index === messageIndex
            ? { ...item, code, output, errorText, logText, plot_b64 }
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
    setEditedCode('');
  };

  const isEmpty = messages.length === 0 && !pending && !loading;
  const suggestedPrompts = getSuggestedPrompts(messages);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-12 text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5B6CFF] to-[#826ACA] shadow-lg shadow-[#826ACA]/25">
            <SparkleIcon size={20} color="white" />
          </div>
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-[#071636] sm:text-3xl">Bạn muốn phân tích gì?</h2>
          <p className="max-w-md text-sm leading-6 text-[#6F7C91]">Hỏi tự nhiên về điểm thi, mình sẽ chuẩn bị mã để bạn duyệt trước khi chạy.</p>
          <div className="mt-7 grid w-full max-w-6xl grid-cols-1 gap-3 md:grid-cols-3">
            {suggestedPrompts.map((p, i) => (
              <button key={i} onClick={() => sendPrompt(p)}
                className="prompt-starter min-h-12 w-full rounded-2xl border border-[#DDE3EE] bg-white px-4 py-3 text-left text-[12px] font-semibold leading-5 text-[#6F7C91] shadow-sm transition-all hover:border-[#C7B7F5] hover:bg-[#F3F0FF] hover:text-[#071636] lg:text-[13px]">
                {p}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pb-8 pr-2">
          {messages.map((msg, i) => (
            <div key={i} className="group message-animate px-3 py-4 sm:px-6 sm:py-5">
              <div className={`mx-auto flex max-w-[84rem] gap-2 sm:gap-3 ${msg.role === 'user' ? 'justify-end' : 'flex-row'}`}>
              {msg.role === 'assistant' && (
                <div className="mt-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5B6CFF] to-[#826ACA] shadow-md shadow-[#826ACA]/20">
                  <SparkleIcon size={14} color="white" />
                </div>
              )}
              <div className={`min-w-0 ${msg.role === 'user' ? 'flex max-w-[calc(100%-3rem)] flex-col items-end sm:max-w-[78%]' : 'flex-1'}`}>
                {msg.role === 'user' ? (
                  <>
                    {editingIndex === i ? (
                      <div className="w-[min(42rem,calc(100vw-5rem))] rounded-2xl rounded-tr-sm border border-[#DDE3EE] bg-white p-2 shadow-lg shadow-slate-300/50 ring-4 ring-[#F3F0FF]">
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
                          className="custom-scrollbar max-h-48 min-h-28 w-full resize-none rounded-xl border-0 bg-[#F5F7FB] px-4 py-3 text-[15px] leading-7 text-[#071636] outline-none placeholder:text-slate-400"
                          rows={Math.max(4, Math.min(7, editingText.split('\n').length + 1))}
                        />
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingIndex(null);
                              setEditingText('');
                            }}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                          >
                            Hủy
                          </button>
                          <button
                            onClick={submitEditedMessage}
                            disabled={!editingText.trim()}
                            className="rounded-lg bg-[#00195A] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#31327E] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Gửi lại
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl rounded-tr-sm bg-gradient-to-br from-[#00195A] to-[#31327E] px-4 py-3 text-sm leading-relaxed text-white shadow-md shadow-[#00195A]/15 sm:px-5 sm:py-3.5">
                        {msg.content}
                      </div>
                    )}
                    <div className="mt-1.5 flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => copyMessage(msg.content, i)} title="Sao chép" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                        <ActionIcon name={copiedIndex === i ? 'check' : 'copy'} />
                      </button>
                      <button
                        onClick={() => { setEditingIndex(i); setEditingText(msg.content); }}
                        title="Chỉnh sửa"
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      >
                        <ActionIcon name="edit" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className={`${msg.output || msg.errorText || msg.logText || msg.plot_b64 || msg.code ? 'w-full text-sm leading-relaxed text-slate-800' : 'w-full rounded-2xl border border-[#DDE3EE] bg-white px-4 py-3 text-sm leading-relaxed text-[#4B5568] shadow-sm shadow-slate-300/40 sm:px-5 sm:py-4'}`}>
                    {msg.output || msg.errorText || msg.logText || msg.plot_b64 || msg.code ? (
                      <ResultPanel
                        summary={msg.content}
                        output={msg.output}
                        errorText={msg.errorText}
                        logText={msg.logText}
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
                        onCopyCode={() => copyMessage(msg.code ?? '', i)}
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
                                <code {...props} className={`${className} bg-slate-200 text-slate-900 px-1.5 py-0.5 rounded text-xs font-mono`}>
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
                      <button onClick={() => copyMessage([msg.content, msg.output].filter(Boolean).join('\n\n'), i)} title="Sao chép" className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-neutral-100 hover:text-neutral-700 ${copiedIndex === i ? 'bg-neutral-100 text-neutral-700' : 'text-neutral-500'}`}>
                        <ActionIcon name={copiedIndex === i ? 'check' : 'copy'} />
                      </button>
                      <button onClick={() => setFeedback(prev => ({ ...prev, [i]: prev[i] === 'like' ? undefined : 'like' }))} title="Hữu ích" className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-neutral-100 hover:text-neutral-700 ${feedback[i] === 'like' ? 'bg-neutral-100 text-neutral-700' : 'text-neutral-500'}`}>
                        <ActionIcon name="like" />
                      </button>
                      <button onClick={() => setFeedback(prev => ({ ...prev, [i]: prev[i] === 'dislike' ? undefined : 'dislike' }))} title="Chưa tốt" className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-neutral-100 hover:text-neutral-700 ${feedback[i] === 'dislike' ? 'bg-neutral-100 text-neutral-700' : 'text-neutral-500'}`}>
                        <ActionIcon name="dislike" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="mt-1 h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
                  <UserIcon />
                </div>
              )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="px-3 py-5 sm:px-4">
              <div className="mx-auto flex max-w-[84rem] gap-4">
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
            <div className="mx-auto flex w-full max-w-[84rem] gap-3 px-3 py-5 sm:gap-4 sm:px-4">
              <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5B6CFF] to-[#826ACA] shadow-md shadow-[#826ACA]/20">
                <SparkleIcon size={14} color="white" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-[#DDE3EE] bg-white shadow-sm">
                <div className="border-b border-[#E6EBF3] px-4 py-3 sm:px-5">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-600">Chờ duyệt</div>
                    <h3 className="mt-1 text-sm font-bold text-slate-950">Mã Python AI đề xuất</h3>
                  </div>
                </div>
                <div className="space-y-3 bg-[#F5F7FB] p-3 sm:p-4">
                  <details className="rounded-xl border border-[#DDE3EE] bg-white">
                    <summary className="cursor-pointer select-none px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 transition-colors hover:bg-slate-50">
                      Phân tích câu hỏi
                    </summary>
                    <div className="border-t border-slate-200 px-4 py-3">
                      <div className="prose prose-sm max-w-none prose-p:my-2 prose-p:leading-7 prose-strong:text-slate-950 prose-ul:my-2 prose-li:my-1">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {pending.explanation}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </details>
                  <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400">
                      <span>python</span>
                      {executing && <span className="font-semibold text-slate-300">Đang chạy</span>}
                    </div>
                    <textarea
                      value={editedCode}
                      onChange={e => setEditedCode(e.target.value)}
                      rows={16}
                      wrap="off"
                      spellCheck={false}
                      disabled={executing}
                      aria-label="Mã Python AI đề xuất"
                      className="code-editor-scrollbar h-[28rem] w-full resize-y overflow-auto whitespace-pre bg-[#1e1e1e] p-4 font-mono text-[13px] leading-6 text-green-300 caret-green-200 outline-none transition-colors placeholder:text-slate-500 focus:bg-slate-950 focus:ring-2 focus:ring-inset focus:ring-slate-500 disabled:cursor-wait disabled:opacity-80"
                    />
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      onClick={handleCancel}
                      disabled={executing}
                      className="rounded-lg border border-[#DDE3EE] bg-white px-3 py-2 text-sm font-semibold text-[#6F7C91] transition-colors hover:bg-[#F3F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleAccept}
                      disabled={executing || !editedCode.trim()}
                      className="rounded-lg bg-[#00195A] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-[#00195A]/15 transition-colors hover:bg-[#31327E] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {executing ? 'Đang chạy' : 'Duyệt & chạy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && <div className="mx-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6">{error}</div>}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="mt-auto bg-gradient-to-t from-[#F5F7FB] via-[#F5F7FB] to-transparent px-3 pb-3 pt-8 sm:px-4 sm:pb-4">
        {!isEmpty && suggestedPrompts.length > 0 && (
          <div className="mx-auto mb-2 grid max-w-5xl grid-cols-1 gap-2 px-1 md:grid-cols-3">
            {suggestedPrompts.slice(0, 3).map((p, i) => (
              <button
                key={i}
                onClick={() => sendPrompt(p)}
                disabled={loading}
                className="min-h-10 rounded-full border border-[#DDE3EE] bg-white/90 px-3 py-1.5 text-left text-[11px] font-semibold leading-4 text-[#6F7C91] shadow-sm transition-all hover:border-[#C7B7F5] hover:bg-[#F3F0FF] hover:text-[#071636] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
        )}
        <div className="input-glow mx-auto flex max-w-3xl items-end gap-2 rounded-[1.4rem] border border-[#DDE3EE] bg-white px-3 py-2.5 shadow-xl shadow-slate-300/30 transition-all sm:rounded-3xl sm:px-4 sm:py-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.xlsx,.xls,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={event => handleAttachmentUpload(event.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || uploadingAttachment}
            title="Đính kèm CSV, XLSX hoặc ảnh"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-slate-500 transition-colors hover:bg-[#F3F0FF] hover:text-[#31327E] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ActionIcon name="attach" />
          </button>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPrompt(input); }}}
            placeholder={attachments.length ? 'Hỏi về file vừa đính kèm...' : 'Hỏi về điểm thi...'}
            rows={1} className="custom-scrollbar max-h-36 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-relaxed text-[#071636] outline-none placeholder-slate-400" />
          <button onClick={() => sendPrompt(input)} disabled={loading || !input.trim()}
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00195A] to-[#31327E] text-white shadow-md transition-all active:scale-95 disabled:opacity-40 ${input.trim() ? 'send-btn-ready' : ''}`}>
            <SendIcon />
          </button>
        </div>
        {(attachments.length > 0 || uploadingAttachment) && (
          <div className="mx-auto mt-2 flex max-w-3xl flex-wrap gap-2 px-1">
            {uploadingAttachment && (
              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-semibold text-sky-700">
                Đang đọc file...
              </span>
            )}
            {attachments.map(item => (
              <span key={item.id} className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#DDE3EE] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#4B5568] shadow-sm">
                <span className="truncate">{item.kind === 'image' ? 'Ảnh' : 'Bảng'}: {item.filename}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(item.id)}
                  title="Gỡ file"
                  className="text-slate-400 transition-colors hover:text-rose-600"
                >
                  <ActionIcon name="x" />
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="mt-2 text-center text-[10px] font-medium text-slate-400">Kiểm tra lại kết quả quan trọng.</p>
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
    callApi('GET', '/api/logs').then(data => {
      setLogs(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  const deleteHistoryLog = async (timestamp: string) => {
    setLogs(prev => prev.filter(log => log.timestamp !== timestamp));
    await callApi('POST', '/api/logs/delete', { timestamp });
  };

  const clearHistoryLogs = async () => {
    setLogs([]);
    await callApi('POST', '/api/logs/clear');
  };

  const formatTime = (ts: string) => {
    try { return new Date(ts).toLocaleString('vi-VN'); } catch { return ts; }
  };

  const getStatusMeta = (status: string) => {
    if (status === 'success') {
      return {
        label: 'Thành công',
        className: STATUS_BADGE_CLASS.success,
      };
    }
    if (status === 'cancelled') {
      return {
        label: 'Đã hủy',
        className: STATUS_BADGE_CLASS.pending,
      };
    }
    return {
      label: 'Lỗi',
      className: STATUS_BADGE_CLASS.error,
    };
  };

  const getFinalOutput = (log: LogEntry) => {
    return compactGeminiError(log.output || log.explanation || 'Không có nội dung output.');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-base font-bold text-slate-950">History</h2>
        {visibleLogs.length > 0 && (
          <button
            onClick={clearHistoryLogs}
            className="flex items-center gap-2 rounded-lg border border-[#DDE3EE] bg-white px-3 py-2 text-xs font-bold text-[#594DA3] shadow-sm transition hover:bg-[#F3F0FF]"
          >
            <ActionIcon name="trash" />
            <span>Xóa tất cả</span>
          </button>
        )}
      </div>
      {loading && <p className="text-slate-400 text-sm">Đang tải lịch sử...</p>}
      {!loading && visibleLogs.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm">
          Chưa có lịch sử.
        </div>
      )}
      {[...visibleLogs].reverse().map((log, i) => {
        const statusMeta = getStatusMeta(log.status);
        const finalOutput = getFinalOutput(log);
        const { text: rawNarrativeText, tables: tableText } = splitMarkdownTables(finalOutput);
        const narrativeText = removeOrphanDetailHeading(rawNarrativeText, Boolean(tableText));
        return (
        <details key={i} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow open:shadow-md">
          <summary className="grid cursor-pointer list-none grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-slate-50 sm:grid-cols-[7.5rem_minmax(0,1fr)_2rem_1.5rem] sm:items-center">
            <div className="flex sm:justify-center">
              <span className={`inline-flex min-w-[5.75rem] justify-center rounded-full border px-3 py-1.5 text-[11px] font-bold ${statusMeta.className}`}>
                {statusMeta.label}
              </span>
            </div>
            <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <div className="min-w-0">
                <span className="block truncate text-sm font-bold text-slate-950">{log.prompt || 'Không có prompt'}</span>
              </div>
              <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono">{formatTime(log.timestamp)}</span>
                {log.event_type && <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-600">{log.event_type}</span>}
                {log.model && <span className="max-w-full truncate rounded-md border border-slate-200 bg-white px-2 py-0.5">{log.model}</span>}
              </div>
            </div>
            <button
              onClick={event => {
                event.preventDefault();
                event.stopPropagation();
                deleteHistoryLog(log.timestamp);
              }}
              title="Xóa log"
              className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-[#F3F0FF] hover:text-[#594DA3] sm:flex"
            >
              <ActionIcon name="trash" />
            </button>
            <svg className="hidden h-4 w-4 justify-self-end text-slate-400 transition-transform group-open:rotate-180 sm:block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
          </summary>
          <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(30rem,1.1fr)]">
            <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Output</div>
              <div className="custom-scrollbar max-h-[34rem] overflow-auto">
                <OutputMarkdown>{narrativeText || finalOutput}</OutputMarkdown>
              </div>
            </section>

            <div className="min-w-0 space-y-3">
              {log.executed_code && !isGeminiErrorCode(log.executed_code) && (
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
              {!log.executed_code && !isGeminiErrorCode(log.generated_code) && (
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
              {log.plot_b64 && (
                <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Biểu đồ</div>
                  <div className="custom-scrollbar max-h-[34rem] overflow-auto">
                    <img src={`data:image/png;base64,${log.plot_b64}`} alt="Biểu đồ" className="max-w-full rounded-lg border border-slate-100" />
                  </div>
                </section>
              )}
              {tableText && (
                <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Bảng</div>
                  <div className="custom-scrollbar max-h-[30rem] overflow-auto">
                    <OutputMarkdown>{tableText}</OutputMarkdown>
                  </div>
                </section>
              )}
            </div>
          </div>
        </details>
      );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
type AssistantTab = 'chat' | 'history' | 'api';
const CHAT_SESSIONS_KEY = 'examdata_ai_chat_sessions';
const DASHBOARD_TABS: DashboardTab[] = ['overview', 'trends', 'distribution', 'regions'];
const ASSISTANT_TABS: AssistantTab[] = ['chat', 'history', 'api'];
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
    const validSessions = parsed
      .filter(session => session?.id && Array.isArray(session.messages))
      .map(compactSessionForStorage)
      .slice(0, MAX_SAVED_SESSIONS);
    if (validSessions.length > 0) {
      return [...validSessions].sort((a, b) => b.updatedAt - a.updatedAt);
    }
  } catch {
    window.localStorage.removeItem(CHAT_SESSIONS_KEY);
  }
  return [createChatSession()];
}

function parseViewState(search: string) {
  const params = new URLSearchParams(search);
  const dashboardParam = params.get('dashboard') as DashboardTab | null;
  const assistantParam = params.get('assistant') as AssistantTab | null;

  return {
    dashboardTab: dashboardParam && DASHBOARD_TABS.includes(dashboardParam) ? dashboardParam : 'overview',
    assistantOpen: Boolean(assistantParam && ASSISTANT_TABS.includes(assistantParam)),
    activeTab: assistantParam && ASSISTANT_TABS.includes(assistantParam) ? assistantParam : 'chat',
  };
}

function subscribeToUrlChanges(callback: () => void) {
  window.addEventListener('popstate', callback);
  window.addEventListener('examdata:urlchange', callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener('examdata:urlchange', callback);
  };
}

function getUrlSnapshot() {
  return window.location.search;
}

function getServerUrlSnapshot() {
  return '';
}

function updateViewUrl({
  dashboardTab,
  assistantOpen,
  activeTab,
}: {
  dashboardTab: DashboardTab;
  assistantOpen: boolean;
  activeTab: AssistantTab;
}) {
  const params = new URLSearchParams();
  if (assistantOpen) {
    params.set('assistant', activeTab);
  } else if (dashboardTab !== 'overview') {
    params.set('dashboard', dashboardTab);
  }

  const query = params.toString();
  const nextUrl = query ? `/?${query}` : '/';
  if (window.location.pathname + window.location.search !== nextUrl) {
    window.history.pushState(null, '', nextUrl);
    window.dispatchEvent(new Event('examdata:urlchange'));
  }
}

export default function Home() {
  const urlSearch = useSyncExternalStore(subscribeToUrlChanges, getUrlSnapshot, getServerUrlSnapshot);
  const { dashboardTab, assistantOpen, activeTab } = parseViewState(urlSearch);
  const [sessions, setSessions] = useState<ChatSession[]>([EMPTY_CHAT_SESSION]);
  const [activeSessionId, setActiveSessionId] = useState(EMPTY_CHAT_SESSION.id);
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionsHydrated, setSessionsHydrated] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const openDashboardTab = useCallback((tab: DashboardTab) => {
    updateViewUrl({ dashboardTab: tab, assistantOpen: false, activeTab });
  }, [activeTab]);

  const openAssistantTab = useCallback((tab: AssistantTab) => {
    updateViewUrl({ dashboardTab, assistantOpen: true, activeTab: tab });
  }, [dashboardTab]);

  const openDashboard = useCallback(() => {
    updateViewUrl({ dashboardTab, assistantOpen: false, activeTab });
  }, [activeTab, dashboardTab]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loadedSessions = loadChatSessions();
      setSessions(loadedSessions);
      setActiveSessionId(loadedSessions[0]?.id ?? EMPTY_CHAT_SESSION.id);
      setSessionsHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!sessionsHydrated) return;
    const nonEmptySessions = sessions
      .filter(session => session.messages.length > 0)
      .slice(0, MAX_SAVED_SESSIONS)
      .map(compactSessionForStorage);
    window.localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(nonEmptySessions));
  }, [sessions, sessionsHydrated]);

  const startNewChat = useCallback(() => {
    const newSession = createChatSession();
    setSessions(prev => [newSession, ...prev.filter(session => session.messages.length > 0)]);
    setActiveSessionId(newSession.id);
    openAssistantTab('chat');
  }, [openAssistantTab]);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const remaining = prev.filter(session => session.id !== sessionId);
      const nextSessions = remaining.length > 0 ? remaining : [createChatSession()];
      if (activeSessionId === sessionId) {
        setActiveSessionId(nextSessions[0].id);
        openAssistantTab('chat');
      }
      return nextSessions;
    });
  }, [activeSessionId, openAssistantTab]);

  const clearSessions = useCallback(() => {
    const newSession = createChatSession();
    setSessions([newSession]);
    setActiveSessionId(newSession.id);
    setSessionSearch('');
    openAssistantTab('chat');
  }, [openAssistantTab]);

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
  const groupedVisibleSessions = groupSessionsByDate(visibleSessions);
  const sidebarWidthClass = sidebarCollapsed ? 'w-[80px]' : 'w-[272px]';
  const mainOffsetClass = sidebarCollapsed ? 'ml-[80px]' : 'ml-[272px]';

  return (
    <>
      <div className={`min-h-screen bg-[#F5F7FB] font-sans text-slate-900 ${assistantOpen ? 'hidden' : ''}`}>
        <aside className="fixed inset-y-0 left-0 z-20 flex w-[272px] flex-col border-r border-white/5 px-3 py-4 text-slate-300 shadow-2xl shadow-slate-950/10" style={{ background: 'linear-gradient(180deg, #00195A 0%, #31327E 100%)' }}>
          <div className="mb-4 flex h-12 items-center px-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 shadow-lg shadow-indigo-500/20">
                <SparkleIcon size={16} color="white" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-tight text-white">ExamData AI</p>
                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Analytics</p>
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            <button onClick={() => openDashboardTab('overview')} className={`sidebar-nav-item ${dashboardTab === 'overview' ? 'sidebar-item-active text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
              <SidebarIcon name="chart" />
              <span>Tổng quan</span>
            </button>
            <button onClick={() => openDashboardTab('trends')} className={`sidebar-nav-item ${dashboardTab === 'trends' ? 'sidebar-item-active text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
              <SidebarIcon name="distribution" />
              <span>Xu hướng & Môn học</span>
            </button>
            <button onClick={() => openDashboardTab('distribution')} className={`sidebar-nav-item ${dashboardTab === 'distribution' ? 'sidebar-item-active text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
              <SidebarIcon name="correlation" />
              <span>Phổ điểm & Tổ hợp</span>
            </button>
            <button onClick={() => openDashboardTab('regions')} className={`sidebar-nav-item ${dashboardTab === 'regions' ? 'sidebar-item-active text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
              <SidebarIcon name="map" />
              <span>Địa phương & Vùng miền</span>
            </button>
            <button onClick={() => openAssistantTab('chat')} className="sidebar-nav-item text-slate-400 hover:bg-white/5 hover:text-slate-200">
              <SidebarIcon name="data" />
              <span>Trợ lý AI</span>
            </button>
          </nav>

          <div className="mx-2 my-4 border-t border-white/5" />
        </aside>

        <main className="ml-[272px] h-screen overflow-hidden bg-[#F5F7FB]">
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1">
              {dashboardTab === 'overview' && <OverviewTab />}
              {dashboardTab === 'trends' && <SubjectTrendTab />}
              {dashboardTab === 'distribution' && <DistributionTab />}
              {dashboardTab === 'regions' && <RegionTab />}
            </div>
          </div>
        </main>
      </div>

      <div className={`min-h-screen bg-[#F5F7FB] font-sans text-slate-900 ${assistantOpen ? '' : 'hidden'}`}>
      <aside className={`fixed inset-y-0 left-0 z-20 hidden ${sidebarWidthClass} flex-col border-r border-white/5 px-3 py-4 text-slate-300 shadow-2xl shadow-slate-950/10 transition-all duration-200 md:flex`} style={{ background: 'linear-gradient(180deg, #00195A 0%, #31327E 100%)' }}>
        <div className={`mb-4 flex h-12 items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between px-2'}`}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#5B6CFF] to-[#826ACA] shadow-lg shadow-[#826ACA]/20">
              <SparkleIcon size={16} color="white" />
            </div>
            <div className={sidebarCollapsed ? 'hidden' : ''}>
              <p className="text-sm font-bold tracking-tight text-white">ExamData AI</p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Assistant</p>
            </div>
          </div>
          <button
            aria-label={sidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
            onClick={() => setSidebarCollapsed(prev => !prev)}
            className={`${sidebarCollapsed ? 'absolute left-1/2 top-16 -translate-x-1/2' : ''} flex h-8 w-8 items-center justify-center rounded-lg text-indigo-200 transition-colors hover:bg-white/10 hover:text-white`}
          >
            <SidebarIcon name="panel" />
          </button>
        </div>

        <nav className="space-y-2">
          <button
            aria-label="Back to dashboard"
            onClick={openDashboard}
            className={`flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-left text-[13px] font-semibold text-slate-100 shadow-sm transition-colors hover:bg-white/20 ${sidebarCollapsed ? 'mt-10 h-11 px-0' : ''}`}
          >
            <span className="text-base leading-none">←</span>
            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>
          <button aria-label="New chat" onClick={startNewChat} className={`flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white px-3 py-2.5 text-left text-[13px] font-semibold text-[#00195A] shadow-sm transition-colors hover:bg-[#F3F0FF] ${sidebarCollapsed ? 'mt-10 h-11 px-0' : ''}`}>
            <SidebarIcon name="new" />
            {!sidebarCollapsed && <span>New</span>}
          </button>
          {!sidebarCollapsed && <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-200"><SidebarIcon name="search" /></span>
            <input
              value={sessionSearch}
              onChange={e => setSessionSearch(e.target.value)}
              placeholder="Tìm chat..."
              className="w-full rounded-xl border border-white/15 bg-white/10 py-2.5 pl-10 pr-3 text-[12.5px] text-white outline-none transition-all placeholder:text-indigo-200/70 focus:border-white/40 focus:bg-white/15 focus:ring-2 focus:ring-white/10"
            />
          </div>}
          <button aria-label="Chat" onClick={() => openAssistantTab('chat')} className={`sidebar-nav-item ${sidebarCollapsed ? 'justify-center px-0' : ''} ${activeTab === 'chat' ? 'sidebar-item-active text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
            <SidebarIcon name="data" />
            {!sidebarCollapsed && <span>Chat</span>}
          </button>
          <button aria-label="History" onClick={() => openAssistantTab('history')} className={`sidebar-nav-item ${sidebarCollapsed ? 'justify-center px-0' : ''} ${activeTab === 'history' ? 'sidebar-item-active text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
            <SidebarIcon name="history" />
            {!sidebarCollapsed && <span>History</span>}
          </button>
          <button aria-label="API" onClick={() => openAssistantTab('api')} className={`sidebar-nav-item ${sidebarCollapsed ? 'justify-center px-0' : ''} ${activeTab === 'api' ? 'sidebar-item-active text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
            <SidebarIcon name="api" />
            {!sidebarCollapsed && <span>API</span>}
          </button>
        </nav>

        <div className="mx-2 my-4 border-t border-white/5" />

        <div className={`min-h-0 flex-1 ${sidebarCollapsed ? 'hidden' : ''}`}>
          <div className="custom-scrollbar h-full space-y-4 overflow-y-auto pr-1">
            {visibleSessions.length > 0 && (
              <button
                onClick={clearSessions}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-[12px] font-semibold text-indigo-100 transition hover:bg-white/10 hover:text-white"
              >
                <ActionIcon name="trash" />
                <span>Xóa lịch sử chat</span>
              </button>
            )}
            {visibleSessions.length === 0 && (
              <div className="px-3 py-6 text-center text-[12px] italic leading-relaxed text-slate-400">
                {sessionSearch ? 'Không tìm thấy đoạn chat.' : 'Chưa có hội thoại nào.'}
              </div>
            )}
            {groupedVisibleSessions.map(group => (
              <div key={group.label} className="space-y-1">
                <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-indigo-200/70">{group.label}</p>
                <div className="space-y-1">
                  {group.sessions.map(session => {
                    const isActiveSession = activeSessionId === session.id;
                    return (
                      <div
                        key={session.id}
                        className={`group relative flex w-full items-center rounded-xl px-3 py-2.5 text-left transition-all ${
                          isActiveSession
                            ? 'sidebar-item-active text-[#00195A]'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        }`}
                      >
                        <SidebarIcon name="data" />
                        <div className="ml-2.5 min-w-0 flex-1">
                          <button
                            onClick={() => { setActiveSessionId(session.id); openAssistantTab('chat'); }}
                            className={`block w-full truncate text-left text-[12.5px] ${isActiveSession ? 'font-bold' : 'font-medium'}`}
                          >
                            {session.title}
                          </button>
                        </div>
                        <span className={`ml-2 flex-shrink-0 text-[10px] ${isActiveSession ? 'font-semibold text-[#594DA3]' : 'text-indigo-200/70'}`}>{formatSessionTime(session.updatedAt)}</span>
                        <button
                          onClick={() => deleteSession(session.id)}
                          title="Xóa hội thoại"
                          className={`ml-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg opacity-0 transition group-hover:opacity-100 ${isActiveSession ? 'text-[#594DA3] hover:bg-[#F3F0FF]' : 'text-indigo-200 hover:bg-white/10 hover:text-white'}`}
                        >
                          <ActionIcon name="trash" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className={`${mainOffsetClass} h-screen overflow-hidden bg-[#F5F7FB] transition-all duration-200 max-md:ml-0`}>
        <div className="flex h-full flex-col">
          <div className="border-b border-[#DDE3EE] bg-[#F5F7FB]/90 px-4 pb-3 pt-4 backdrop-blur sm:px-8 sm:pt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  {activeTab === 'chat' ? 'Chat' : 'History'}
                </p>
                <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#071636] sm:text-2xl">
                  ExamData AI
                </h1>
              </div>
              <button
                onClick={openDashboard}
                className="rounded-lg border border-[#C7B7F5] bg-white px-3 py-2 text-sm font-bold text-[#594DA3] shadow-sm transition hover:bg-[#F3F0FF]"
              >
                ← Về dashboard
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <div className={activeTab === 'chat' ? 'h-full min-h-0' : 'hidden'}>
              {activeSession && (
              <ChatTab
                key={activeSession.id}
                initialMessages={activeSession.messages}
                onMessagesChange={updateActiveSession}
              />
              )}
            </div>
            {activeTab === 'history' && <div className="h-full overflow-y-auto px-4 pb-6 pt-4 sm:px-8"><HistoryTab /></div>}
            
          </div>
        </div>
      </main>
      </div>
    </>
  );
}
