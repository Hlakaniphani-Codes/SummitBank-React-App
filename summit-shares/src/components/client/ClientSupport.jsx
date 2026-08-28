import React, { useState } from 'react';
import { useClient } from './ClientLayout';

const ClientSupport = () => {
  const { showToast } = useClient();

  const [openFaq, setOpenFaq] = useState(null);
  const [submittingTicket, setSubmittingTicket] = useState(false);

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (submittingTicket) return;
    const form = e.target;
    const data = new FormData(form);
    const payload = {
      name: data.get('fullName'),
      email: data.get('email'),
      subject: data.get('subject'),
      message: data.get('message'),
    };

    setSubmittingTicket(true);
    try {
      const { submitSupportTicket } = await import('../../api');
      await submitSupportTicket(payload);
      showToast("Support ticket submitted! We'll respond within 24 hours.");
      form.reset();
    } catch (err) {
      showToast(err.message || 'Failed to submit ticket');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const faqItems = [
    {
      question: 'How do I reset my password?',
      answer: 'Go to Security Settings and use the Change Password form. You will need your current password to set a new one.',
    },
    {
      question: 'How do I report a lost or stolen card?',
      answer: 'Contact our fraud team immediately via the Support page. We monitor accounts 24/7 and will block your card instantly.',
    },
    {
      question: 'How do I check my account balance?',
      answer: 'Your account balance is displayed at the top of the Dashboard. You can also view individual account balances with the show/hide toggle.',
    },
    {
      question: 'How do I transfer funds between accounts?',
      answer: 'Go to Fund Transfer in the sidebar. Select the source and destination accounts, enter the amount, and click Send Transfer.',
    },
    {
      question: 'How do I contact customer support?',
      answer: 'You can reach us via the Support page. Our team typically responds within 24 hours.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Support Center</h2>
        <p className="text-sm text-gray-500 mt-1">Get help with your Summit Shares account</p>
      </div>

      {/* Grid: FAQ + Contact Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FAQ Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-5">
            <i className="fas fa-question-circle text-amber-500"></i> Frequently Asked Questions
          </h3>
          <div className="space-y-3">
            {faqItems.map((item, idx) => (
              <div
                key={idx}
                className="border border-gray-100 rounded-xl overflow-hidden transition"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition text-left"
                >
                  <span>{item.question}</span>
                  <i
                    className={`fas fa-chevron-down text-xs text-gray-400 transition-transform ${
                      openFaq === idx ? 'rotate-180' : ''
                    }`}
                  ></i>
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-3 text-sm text-gray-500 leading-relaxed">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-5">
            <i className="fas fa-headset text-amber-500"></i> Contact Support
          </h3>
          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                placeholder="John Doe"
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-amber-400 focus:border-amber-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                placeholder="john@example.com"
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-amber-400 focus:border-amber-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Subject
              </label>
              <select
                name="subject"
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-amber-400 focus:border-amber-400 transition"
              >
                <option value="Account Issue">Account Issue</option>
                <option value="Transaction Inquiry">Transaction Inquiry</option>
                <option value="Card Support">Card Support</option>
                <option value="Technical Issue">Technical Issue</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Message
              </label>
              <textarea
                name="message"
                rows="4"
                placeholder="Describe your issue..."
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-amber-400 focus:border-amber-400 transition resize-none"
              ></textarea>
            </div>
            <button
              type="submit"
              disabled={submittingTicket}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <i className="fas fa-paper-plane text-xs"></i> {submittingTicket ? 'Submitting…' : 'Submit Ticket'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClientSupport;