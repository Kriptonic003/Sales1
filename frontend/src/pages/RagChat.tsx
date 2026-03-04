import { useState, useRef, useCallback } from 'react';

const API_BASE = 'http://localhost:8000';

const SUPPORTED_EXTS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.pptx', '.txt', '.md'];
const ACCEPT_ATTR = SUPPORTED_EXTS.join(',');
const FORMAT_LABEL = 'PDF, DOCX, XLSX, CSV, PPTX, TXT, MD';

interface RagResponse {
    answer: string;
    llm_used: string;
    source_chunks: string[];
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    llm_used?: string;
    source_chunks?: string[];
}

export default function RagChatPage() {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [expandedChunks, setExpandedChunks] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const isValidFile = (f: File) => {
        const ext = '.' + (f.name.split('.').pop() ?? '').toLowerCase();
        return SUPPORTED_EXTS.includes(ext);
    };

    /* ── Drag & Drop ── */
    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback(() => setIsDragging(false), []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped && isValidFile(dropped)) {
            setFile(dropped);
            setError('');
        } else {
            setError(`Unsupported file type. Supported: ${FORMAT_LABEL}`);
        }
    }, []);

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f && isValidFile(f)) { setFile(f); setError(''); }
        else if (f) setError(`Unsupported file type. Supported: ${FORMAT_LABEL}`);
    };

    /* ── Submit ── */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) { setError('Please upload a file first.'); return; }
        if (!question.trim()) { setError('Please enter a question.'); return; }

        const userMsg: Message = { role: 'user', content: question.trim() };
        setMessages(prev => [...prev, userMsg]);
        setQuestion('');
        setLoading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('question', userMsg.content);

            // 3-minute timeout — CPU embedding can be slow on first request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 180_000);

            // Show "still working" hint after 15s
            const slowHintId = setTimeout(() =>
                setError('⏳ Still processing… embedding a large file on CPU takes a moment.'),
                15_000
            );

            const res = await fetch(`${API_BASE}/rag/chat`, {
                method: 'POST',
                body: formData,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            clearTimeout(slowHintId);
            setError(''); // clear any slow hint

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Request failed');
            }

            const data: RagResponse = await res.json();
            const assistantMsg: Message = {
                role: 'assistant',
                content: data.answer,
                llm_used: data.llm_used,
                source_chunks: data.source_chunks,
            };
            setMessages(prev => [...prev, assistantMsg]);
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
            setMessages(prev => prev.slice(0, -1)); // remove optimistic user msg
        } finally {
            setLoading(false);
        }
    };

    const clearAll = () => {
        setFile(null);
        setMessages([]);
        setQuestion('');
        setError('');
        setExpandedChunks(null);
    };

    return (
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 1rem' }}>
            {/* ── Page header ── */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                    background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(99,102,241,0.15))',
                    border: '1px solid rgba(6,182,212,0.3)',
                    borderRadius: 999, padding: '0.35rem 1.1rem',
                    fontSize: '0.75rem', fontWeight: 600, color: '#67e8f9',
                    letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.9rem',
                }}>
                    <span>🧠</span> AI · RAG · Document Insights
                </div>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.4rem' }}>
                    Sales Document Chatbot
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
                    Upload your sales report ({FORMAT_LABEL}) and ask any question — powered by Gemini&nbsp;AI
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '1.5rem', alignItems: 'start' }}>

                {/* ── LEFT: Upload panel ── */}
                <div style={{
                    background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.7)',
                    borderRadius: 16, padding: '1.4rem', backdropFilter: 'blur(12px)',
                }}>
                    <h2 style={{ color: '#e2e8f0', fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>
                        📄 Upload File
                    </h2>

                    {/* Drop zone */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        style={{
                            border: `2px dashed ${isDragging ? '#22d3ee' : file ? '#6366f1' : 'rgba(99,102,241,0.4)'}`,
                            borderRadius: 12,
                            padding: '2rem 1rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: isDragging ? 'rgba(34,211,238,0.05)' : file
                                ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.03)',
                            transition: 'all 0.2s',
                            marginBottom: '1rem',
                        }}
                    >
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                            {file ? '✅' : '📂'}
                        </div>
                        {file ? (
                            <>
                                <p style={{ color: '#a5b4fc', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                                    {file.name}
                                </p>
                                <p style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                    {(file.size / 1024).toFixed(1)} KB
                                </p>
                            </>
                        ) : (
                            <>
                                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                                    Drop file here or click to browse
                                </p>
                                <p style={{ color: '#475569', fontSize: '0.75rem' }}>{FORMAT_LABEL} · Max 20 MB</p>
                            </>
                        )}
                        <input ref={fileInputRef} type="file" accept={ACCEPT_ATTR} onChange={onFileChange} style={{ display: 'none' }} />
                    </div>

                    {file && (
                        <button
                            onClick={clearAll}
                            style={{
                                width: '100%', padding: '0.5rem', borderRadius: 8, border: 'none',
                                background: 'rgba(239,68,68,0.15)', color: '#f87171',
                                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, transition: 'background 0.2s',
                            }}
                            onMouseOver={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.25)')}
                            onMouseOut={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
                        >
                            🗑 Clear all
                        </button>
                    )}

                    {/* Sample questions */}
                    <div style={{ marginTop: '1.5rem' }}>
                        <p style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                            Try asking…
                        </p>
                        {[
                            'What is the total revenue?',
                            'Which product has the highest sales?',
                            'Summarize the key insights',
                            'What are the top-performing regions?',
                        ].map(q => (
                            <button
                                key={q}
                                onClick={() => setQuestion(q)}
                                style={{
                                    display: 'block', width: '100%', textAlign: 'left',
                                    padding: '0.45rem 0.7rem', marginBottom: '0.4rem',
                                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                                    borderRadius: 8, color: '#a5b4fc', cursor: 'pointer', fontSize: '0.8rem',
                                    transition: 'all 0.15s',
                                }}
                                onMouseOver={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.18)')}
                                onMouseOut={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.08)')}
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── RIGHT: Chat panel ── */}
                <div style={{
                    background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.7)',
                    borderRadius: 16, padding: '1.4rem', backdropFilter: 'blur(12px)',
                    display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 500,
                }}>
                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: 380 }}>
                        {messages.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#475569' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '0.8rem' }}>💬</div>
                                <p style={{ fontSize: '0.9rem' }}>Upload a file and ask your first question</p>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i}>
                                {msg.role === 'user' ? (
                                    /* User bubble */
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <div style={{
                                            maxWidth: '85%', padding: '0.75rem 1rem',
                                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                            borderRadius: '16px 16px 4px 16px',
                                            color: '#fff', fontSize: '0.9rem', lineHeight: 1.5,
                                            boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
                                        }}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ) : (
                                    /* Assistant bubble */
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                            <div style={{
                                                width: 28, height: 28, borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.8rem', flexShrink: 0,
                                            }}>🤖</div>
                                            {/* LLM badge */}
                                            <span style={{
                                                padding: '0.15rem 0.55rem',
                                                borderRadius: 999,
                                                fontSize: '0.7rem', fontWeight: 600,
                                                background: msg.llm_used === 'gemini'
                                                    ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)',
                                                color: msg.llm_used === 'gemini' ? '#4ade80' : '#fb923c',
                                                border: `1px solid ${msg.llm_used === 'gemini' ? 'rgba(34,197,94,0.3)' : 'rgba(249,115,22,0.3)'}`,
                                                letterSpacing: '0.05em',
                                            }}>
                                                {msg.llm_used === 'gemini' ? '✦ Gemini' : '⚡ Groq'}
                                            </span>
                                        </div>

                                        <div style={{
                                            maxWidth: '90%', padding: '0.85rem 1rem',
                                            background: 'rgba(30,41,59,0.8)',
                                            border: '1px solid rgba(51,65,85,0.6)',
                                            borderRadius: '4px 16px 16px 16px',
                                            color: '#e2e8f0', fontSize: '0.9rem', lineHeight: 1.6,
                                        }}>
                                            {msg.content}
                                        </div>

                                        {/* Source chunks accordion */}
                                        {msg.source_chunks && msg.source_chunks.length > 0 && (
                                            <div style={{ maxWidth: '90%', marginTop: '0.5rem' }}>
                                                <button
                                                    onClick={() => setExpandedChunks(expandedChunks === i ? null : i)}
                                                    style={{
                                                        background: 'none', border: 'none', color: '#64748b',
                                                        cursor: 'pointer', fontSize: '0.75rem', padding: '0.2rem 0',
                                                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                                                    }}
                                                >
                                                    <span style={{ transform: expandedChunks === i ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▶</span>
                                                    {msg.source_chunks.length} source chunk{msg.source_chunks.length > 1 ? 's' : ''} used
                                                </button>
                                                {expandedChunks === i && (
                                                    <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                        {msg.source_chunks.map((chunk, ci) => (
                                                            <div key={ci} style={{
                                                                padding: '0.6rem 0.8rem',
                                                                background: 'rgba(15,23,42,0.6)',
                                                                border: '1px solid rgba(51,65,85,0.4)',
                                                                borderLeft: '3px solid #22d3ee',
                                                                borderRadius: '0 8px 8px 0',
                                                                fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5,
                                                                fontFamily: 'monospace',
                                                            }}>
                                                                {chunk}…
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <div style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem',
                                }}>🤖</div>
                                <div style={{
                                    padding: '0.75rem 1rem', background: 'rgba(30,41,59,0.8)',
                                    border: '1px solid rgba(51,65,85,0.6)', borderRadius: '4px 16px 16px 16px',
                                    display: 'flex', gap: '0.35rem', alignItems: 'center',
                                }}>
                                    {[0, 1, 2].map(d => (
                                        <span key={d} style={{
                                            width: 7, height: 7, borderRadius: '50%',
                                            background: '#22d3ee', display: 'inline-block',
                                            animation: `bounce 1.2s ${d * 0.2}s infinite`,
                                        }} />
                                    ))}
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{
                            padding: '0.6rem 0.9rem', borderRadius: 8,
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                            color: '#f87171', fontSize: '0.83rem',
                        }}>
                            ⚠ {error}
                        </div>
                    )}

                    {/* Input form */}
                    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.6rem' }}>
                        <input
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            placeholder={file ? 'Ask anything about your document…' : 'Upload a file first…'}
                            disabled={!file || loading}
                            style={{
                                flex: 1, padding: '0.75rem 1rem', borderRadius: 12,
                                border: '1px solid rgba(99,102,241,0.3)',
                                background: 'rgba(15,23,42,0.8)', color: '#f1f5f9',
                                fontSize: '0.9rem', outline: 'none',
                                opacity: !file ? 0.5 : 1,
                            }}
                        />
                        <button
                            type="submit"
                            disabled={!file || loading || !question.trim()}
                            style={{
                                padding: '0.75rem 1.2rem', borderRadius: 12, border: 'none',
                                background: (!file || loading || !question.trim())
                                    ? 'rgba(99,102,241,0.3)'
                                    : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                color: '#fff', cursor: (!file || loading || !question.trim()) ? 'not-allowed' : 'pointer',
                                fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
                                boxShadow: (!file || loading || !question.trim()) ? 'none' : '0 4px 15px rgba(99,102,241,0.4)',
                            }}
                        >
                            {loading ? '…' : '➤'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Bounce animation keyframes */}
            <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
        </div>
    );
}
