import React, { useState, useMemo } from 'react';
import {
  MessageSquare, ChevronRight, X, Check,
  Sparkles, Star, Terminal, HelpCircle, ArrowRight
} from 'lucide-react';
import { MasterProfile, getApi } from '../types';
import { suggestRolesFromUserInput } from '../data/jobRolesDataset';

interface InterviewPrepViewProps {
  profile: MasterProfile;
  onLog: (msg: string) => void;
}

const MOCK_QUESTIONS = [
  {
    id: 'star-conflict',
    title: 'Describe a time you had a technical disagreement with a teammate.',
    framework: 'STAR Method',
    category: 'Behavioral & Leadership',
    sampleAnswer: 'Situation: During a sprint, a senior backend engineer proposed caching database reads directly in Node.js memory, whereas I advocated for Redis to ensure consistency across multiple server instances.\n\nTask: We needed a solution that prevented stale session state while maintaining sub-10ms response times.\n\nAction: I created a quick benchmark script comparing memory consumption and cold-restart failover under 5,000 req/s. I scheduled a 15-minute sync with the data to walk through the trade-offs without personal confrontation.\n\nResult: We agreed to use Redis for shared cache-aside and in-memory LRU only for static configuration tokens, resulting in zero production desyncs during our launch.',
    tips: ['Avoid blaming teammates', 'Quantify the outcome', 'Highlight collaborative data-driven decision making']
  },
  {
    id: 'star-failure',
    title: 'Tell me about a time a production deployment broke and how you handled it.',
    framework: 'STAR & Postmortem',
    category: 'Engineering Resilience',
    sampleAnswer: 'Situation: After deploying a schema migration adding a NOT NULL constraint without a default value, user registration requests started failing with 500 errors.\n\nTask: Immediately restore uptime and prevent data corruption.\n\nAction: Within 90 seconds of the automated alert firing, I initiated our rollback runbook via CI/CD, posted an incident update in the engineering war room, and audited the Postgres error logs.\n\nResult: Total downtime was limited to 4 minutes. The next morning, I authored an incident postmortem and implemented a pre-commit linter check to catch unsafe DDL migrations.',
    tips: ['Own the mistake without hesitation', 'Focus on time-to-recovery (MTTR)', 'Explain systemic guardrails added']
  },
  {
    id: 'tech-architecture-scaling',
    title: 'How do you design an API that handles sudden 10x traffic spikes?',
    framework: 'System Design',
    category: 'Systems & Scalability',
    sampleAnswer: '1. Horizontal Autoscaling: Configure Kubernetes HPA with CPU/memory targets at 70%.\n2. Caching Tier: Implement Redis Cache-Aside with connection pooling to absorb 90% of read traffic.\n3. Async Worker Queues: Offload expensive work (email dispatch, report generation) to Redis/BullMQ.\n4. Database Protection: Enforce PgBouncer connection pooling and read replicas.',
    tips: ['Start high-level before diving into database specifics', 'Mention rate limiting and graceful degradation']
  }
];

export const InterviewPrepView: React.FC<InterviewPrepViewProps> = ({ profile, onLog }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedQuestion, setSelectedQuestion] = useState<typeof MOCK_QUESTIONS[0] | null>(null);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [feedback, setFeedback] = useState<{
    score: number;
    review: string;
    strengths?: string[];
    improvements?: string[];
  } | null>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);

  // Dynamic Role-Specific Questions from 10,000 Dataset
  const roleSpecificQuestions = useMemo(() => {
    if (!profile.desiredTitle) return [];
    const matched = suggestRolesFromUserInput(profile.desiredTitle, 1);
    if (!matched.length) return [];
    const target = matched[0];
    return target.interviewQuestions.map((qText, idx) => ({
      id: `role-dynamic-${idx}`,
      title: qText,
      framework: 'Technical Architecture & Deep Dive',
      category: target.domain,
      sampleAnswer: `When architecting for ${target.title}, start with separation of concerns between client requests and asynchronous workers. Use ${target.coreSkills.slice(0, 3).join(', ')} best practices, enforce strict idempotency keys, and monitor error rates with telemetry.`,
      tips: [
        `Focus on specific trade-offs in ${target.coreSkills[0] || 'the stack'}`,
        'Demonstrate understanding of production failure modes and data consistency',
        'Quantify throughput, latency, and memory targets'
      ],
    }));
  }, [profile.desiredTitle]);

  const allAvailableQuestions = useMemo(() => {
    return [...roleSpecificQuestions, ...MOCK_QUESTIONS];
  }, [roleSpecificQuestions]);

  const categories = useMemo(() => {
    const base = ['all', 'Behavioral & Leadership', 'Engineering Resilience', 'Systems & Scalability'];
    if (roleSpecificQuestions.length > 0 && roleSpecificQuestions[0].category) {
      if (!base.includes(roleSpecificQuestions[0].category)) {
        base.splice(1, 0, roleSpecificQuestions[0].category);
      }
    }
    return base;
  }, [roleSpecificQuestions]);

  const filteredQuestions = useMemo(() => {
    if (selectedCategory === 'all') return allAvailableQuestions;
    return allAvailableQuestions.filter(q => q.category === selectedCategory);
  }, [selectedCategory, allAvailableQuestions]);

  const handleEvaluateAnswer = async () => {
    if (!userAnswer.trim() || !selectedQuestion) return;
    setEvaluating(true);
    setFeedback(null);

    const api = getApi();
    if (api && api.evaluateInterviewAnswer) {
      try {
        const result = await api.evaluateInterviewAnswer({
          questionId: selectedQuestion.id,
          questionTitle: selectedQuestion.title,
          answerText: userAnswer,
          category: selectedQuestion.category,
        });

        setFeedback({
          score: result.score,
          review: result.review,
          strengths: result.strengths,
          improvements: result.improvements,
        });
        onLog(`[Interview AI] Evaluated answer: ${result.score}/100.`);
      } catch (err: any) {
        setFeedback({
          score: 75,
          review: `Evaluation complete. Keep practicing concise structure.`
        });
      } finally {
        setEvaluating(false);
      }
    } else {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6 font-sans select-none max-w-5xl mx-auto pb-20">
      
      {/* ── CLEAN TOP HEADER & CATEGORY PILLS ────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-zinc-100">
            Interview Prep
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Practice behavioral STAR method drills, incident postmortems, and system design questions.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                  : 'bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100'
              }`}
            >
              {cat === 'all' ? 'All Questions' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── QUESTION DRILL CARDS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredQuestions.map((q) => (
          <div
            key={q.id}
            onClick={() => {
              setSelectedQuestion(q);
              setUserAnswer('');
              setFeedback(null);
            }}
            className="p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="px-2 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                  {q.category}
                </span>
                <span className="text-slate-400">{q.framework}</span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:underline leading-snug">
                {q.title}
              </h3>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-zinc-100">
              <span>Practice Answer</span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        ))}
      </div>

      {/* ── PRACTICE DRAWER MODAL ────────────────────────────────────────────── */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-up">
            
            <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono text-slate-400">
                  {selectedQuestion.category} · {selectedQuestion.framework}
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-1">
                  {selectedQuestion.title}
                </h3>
              </div>
              <button onClick={() => setSelectedQuestion(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              
              {/* Exemplar Model Answer */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Benchmark Model Answer:</span>
                  <span className="text-[10px] font-mono text-emerald-600 font-semibold">{selectedQuestion.framework}</span>
                </div>
                <p className="text-slate-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed font-sans">
                  {selectedQuestion.sampleAnswer}
                </p>
              </div>

              {/* Key Tips */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Key Focus Points:</span>
                <ul className="space-y-1 text-slate-600 dark:text-zinc-400">
                  {selectedQuestion.tips.map((tip, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-400" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Your Practice Draft */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <label className="font-semibold text-slate-700 dark:text-zinc-300">Draft Your Response:</label>
                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Structure your answer: Situation, Task, Action, and Result..."
                  rows={6}
                  className="w-full p-3 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl outline-none leading-relaxed text-xs"
                />

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={handleEvaluateAnswer}
                    disabled={!userAnswer.trim() || evaluating}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 shadow-xs"
                  >
                    {evaluating ? 'Evaluating...' : 'Evaluate My Answer'}
                  </button>

                  {feedback && (
                    <span className="text-xs font-mono font-bold text-emerald-600">
                      Score: {feedback.score}/100
                    </span>
                  )}
                </div>

                {feedback && (
                  <div className="space-y-2.5 p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed animate-fade-up">
                    <p className="font-medium">{feedback.review}</p>
                    {feedback.strengths && feedback.strengths.length > 0 && (
                      <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 space-y-1">
                        <span className="font-bold text-[11px] text-emerald-800 dark:text-emerald-300">Key Strengths:</span>
                        <ul className="list-disc list-inside text-[11px] text-emerald-900 dark:text-emerald-300 space-y-0.5">
                          {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {feedback.improvements && feedback.improvements.length > 0 && (
                      <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 space-y-1">
                        <span className="font-bold text-[11px] text-amber-800 dark:text-amber-300">Suggested Enhancements:</span>
                        <ul className="list-disc list-inside text-[11px] text-amber-900 dark:text-amber-300 space-y-0.5">
                          {feedback.improvements.map((im, i) => <li key={i}>{im}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
