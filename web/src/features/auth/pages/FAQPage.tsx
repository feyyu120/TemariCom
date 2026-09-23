import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  UserPlus,
  LogIn,
  Key,
  Mail,
  ShieldCheck,
  Sparkles,
  Lock,
  RefreshCw,
  HelpCircle,
  BookOpen,
  ChevronDown,
  MessageCircle,
} from 'lucide-react';

interface FAQItem {
  id: string;
  category: 'registration' | 'login' | 'security' | 'campus';
  question: string;
  answer: string;
  icon: React.ReactNode;
}

export const FAQPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    'reg-1': true,
    'login-1': true,
  });

  const faqs: FAQItem[] = [
    // Registration FAQs
    {
      id: 'reg-1',
      category: 'registration',
      question: 'How do I create a new account on TemariCom?',
      answer:
        'Enter your valid email address (either your personal or your university .edu/.et email) in the registration form. We will instantly dispatch a secure 6-digit verification code to confirm your email ownership. Once verified, you can set your campus profile and join your university community!',
      icon: <UserPlus className="w-5 h-5 text-textPrimary" />,
    },
    {
      id: 'reg-2',
      category: 'registration',
      question: 'How and where will I receive my OTP code?',
      answer:
        'We send the 6-digit verification code directly to your email address. It typically arrives within seconds. If you do not see it in your primary inbox, please check your Spam, Junk, or Promotions folders.',
      icon: <Mail className="w-5 h-5 text-textPrimary" />,
    },
    {
      id: 'reg-3',
      category: 'registration',
      question: 'What happens after I verify my email?',
      answer:
        'You will be prompted to complete your student profile by selecting your university campus, department, academic year, and custom username. You can also skip any optional fields and fill them out later in your Profile settings.',
      icon: <Sparkles className="w-5 h-5 text-textPrimary" />,
    },
    {
      id: 'reg-4',
      category: 'registration',
      question: 'Is TemariCom free for Ethiopian students?',
      answer:
        'Yes! TemariCom is completely 100% free for all Ethiopian university students, tutors, faculty members, and academic departments.',
      icon: <ShieldCheck className="w-5 h-5 text-textPrimary" />,
    },

    // Sign In FAQs
    {
      id: 'login-1',
      category: 'login',
      question: 'How do I sign in to an existing account?',
      answer:
        'You can sign in using your registered email address, your unique username, or your verified phone number (if you already linked your phone number in your profile).',
      icon: <LogIn className="w-5 h-5 text-textPrimary" />,
    },
    {
      id: 'login-2',
      category: 'login',
      question: 'How does passwordless OTP sign-in work?',
      answer:
        '• If you have an active session on another device (such as your desktop or mobile app), TemariCom can send an in-app verification prompt.\n• Otherwise, a 6-digit one-time code is sent straight to your email. This eliminates forgotten passwords and protects against database password breaches.',
      icon: <Key className="w-5 h-5 text-textPrimary" />,
    },
    {
      id: 'login-3',
      category: 'login',
      question: 'What should I do if my verification code expires or fails to arrive?',
      answer:
        'Check that you entered your email correctly without typos. Each verification code is valid for 5 minutes. If it expires, simply click "Resend verification code" on the verification page to receive a fresh code.',
      icon: <RefreshCw className="w-5 h-5 text-textPrimary" />,
    },

    // Security FAQs
    {
      id: 'sec-1',
      category: 'security',
      question: 'Is Two-Step Verification (2FA) supported?',
      answer:
        'Yes! Once signed in, you can enable Two-Step Verification with a custom security password in your Account & Security settings for added peace of mind.',
      icon: <Lock className="w-5 h-5 text-textPrimary" />,
    },
    {
      id: 'sec-2',
      category: 'security',
      question: 'Can I stay signed in across multiple accounts on one device?',
      answer:
        'Yes. TemariCom features Telegram-style multi-account switching. You can add your personal student account, a club/department account, or multiple profiles and switch between them seamlessly without logging out.',
      icon: <BookOpen className="w-5 h-5 text-textPrimary" />,
    },

    // Campus FAQs
    {
      id: 'camp-1',
      category: 'campus',
      question: 'Can students from all Ethiopian universities join?',
      answer:
        'Yes! TemariCom is engineered to unite students across AAU, ASTU, AASTU, Hawassa, Jimma, Bahir Dar, Mekelle, Gondar, and all regional universities across Ethiopia.',
      icon: <BookOpen className="w-5 h-5 text-textPrimary" />,
    },
  ];

  // Category tab definitions
  const categories = [
    { id: 'all', label: 'All Questions' },
    { id: 'registration', label: 'Registration' },
    { id: 'login', label: 'Sign In' },
    { id: 'security', label: 'Security & Accounts' },
    { id: 'campus', label: 'Campus Community' },
  ];

  // Filtered FAQs based on category and search query
  const filteredFaqs = faqs.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesQuery =
      searchQuery.trim() === '' ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const toggleAccordion = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-textPrimary animate-fadeIn">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 rounded-full hover:bg-surface-elevated text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-textPrimary leading-tight">Help & FAQ</h1>
              <p className="text-xs text-textTertiary hidden sm:block">
                Everything you need to know about TemariCom
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-surface hover:bg-surface-elevated border border-border text-textSecondary hover:text-textPrimary transition-colors"
          >
            Back to Feed
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero Section */}
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-elevated border border-border mb-3 text-textPrimary shadow-sm">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-textPrimary tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-textSecondary mt-2">
            Find quick answers to common questions about registering, signing in, and securing your student account.
          </p>
        </div>

        {/* Search Input Bar */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="relative">
            <Search className="w-4 h-4 text-textTertiary absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions (e.g., OTP, email, campus, password)..."
              className="w-full h-12 pl-11 pr-4 rounded-2xl bg-surface border border-border focus:border-active focus:ring-2 focus:ring-active/20 text-sm text-textPrimary placeholder:text-textTertiary outline-none transition-all"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 no-scrollbar max-w-2xl mx-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-active text-active-text shadow-sm'
                  : 'bg-surface hover:bg-surface-elevated text-textSecondary hover:text-textPrimary border border-border'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQ Accordion List */}
        <div className="max-w-2xl mx-auto space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 rounded-3xl bg-surface border border-border p-8">
              <Search className="w-8 h-8 text-textTertiary mx-auto mb-3" />
              <h3 className="text-base font-bold text-textPrimary">No matching questions found</h3>
              <p className="text-xs text-textSecondary mt-1">
                Try searching with different keywords or switch categories.
              </p>
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = Boolean(openItems[faq.id]);
              return (
                <div
                  key={faq.id}
                  className="rounded-2xl bg-surface border border-border overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(faq.id)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-surface-elevated transition-colors cursor-pointer gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center shrink-0 mt-0.5">
                        {faq.icon}
                      </div>
                      <span className="font-bold text-sm sm:text-base text-textPrimary leading-snug">
                        {faq.question}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-textSecondary shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 border-t border-border-subtle bg-surface-elevated/40 animate-fadeIn">
                      <p className="text-xs sm:text-sm text-textSecondary leading-relaxed whitespace-pre-line pl-11">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Still Need Help Support Card */}
        <div className="max-w-2xl mx-auto mt-12 rounded-3xl bg-surface border border-border p-6 text-center shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mx-auto mb-3 text-textPrimary">
            <MessageCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-textPrimary">Still need assistance?</h3>
          <p className="text-xs text-textSecondary mt-1 max-w-md mx-auto">
            Our student support team and campus representatives are here to help with any registration or verification questions.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <a
              href="mailto:contact@temaricom.et"
              className="px-4 py-2 rounded-full bg-active text-active-text text-xs font-bold hover:bg-active/90 transition-colors"
            >
              Email Support (contact@temaricom.et)
            </a>
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 rounded-full bg-surface-elevated border border-border text-xs font-semibold text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
            >
              Return to Previous Page
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FAQPage;

