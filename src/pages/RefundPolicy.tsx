import React from 'react';
import { useRouter } from '../hooks/useRouter';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { useTranslation } from '../i18n';

export const RefundPolicyPage: React.FC = () => {
  const { navigate } = useRouter();
  const { isHindi } = useTranslation();

  return (
    <div className="bg-white dark:bg-[#0f0f0f] text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 space-y-10 pb-24">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate('home')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#065fd4] dark:hover:text-blue-500 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isHindi ? 'होम पर वापस जाएं' : 'Back to Home'}</span>
        </button>

        {/* Header Title Card */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/80 dark:border-emerald-900/40 rounded-full">
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {isHindi ? 'बिलिंग और रिफ़ंड' : 'Billing & Refunds'}
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-slate-900 dark:text-white">
            {isHindi ? 'रिफ़ंड नीति' : 'Refund Policy'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl font-medium leading-relaxed">
            {isHindi
              ? 'प्रो प्रीमियम अपग्रेड और विज्ञापन अभियान बजट पर पारदर्शी और निष्पक्ष बिलिंग नियम।'
              : 'Transparent and fair billing guarantees on GoPro Premium upgrades and Category advertising budgets.'}
          </p>
        </div>

        {/* Detailed Guidelines Card */}
        <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            {isHindi ? 'रिफ़ंड पात्रता दिशानिर्देश' : 'Refund Eligibility Guidelines'}
          </h3>
          
          <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium space-y-5">
            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide mb-1 text-[11px]">
                {isHindi ? '1. प्रो प्रीमियम सदस्यता रिफ़ंड' : '1. GoPro premium Subscription Refunds'}
              </h4>
              <p>
                {isHindi
                  ? 'प्रो अपग्रेड से उन्नत क्रिएटर आंकड़े, प्रीमियम बैज और पॉइंट्स पुरस्कार अनलॉक होते हैं। यदि अपग्रेड किए गए खाते ने अपग्रेड के बाद 2 से अधिक वीडियो प्रकाशित नहीं किए हैं और उस बिलिंग सप्ताह में पॉइंट्स नहीं बदले हैं, तो 7 कैलेंडर दिनों के भीतर 100% रिफ़ंड उपलब्ध है।'
                  : 'GoPro upgrades activate advanced creator stats, premium badges, and immediate points rewards parameters. We offer a full 100% refund within 7 calendar days if the upgraded creator account has not published more than 2 video assets post-upgrade and has not converted points during that billing week.'}
              </p>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide mb-1 text-[11px]">
                {isHindi ? '2. विज्ञापन अभियान बजट' : '2. Advertising Campaign Budgets'}
              </h4>
              <p>
                {isHindi
                  ? 'अभियान शुरू होने और प्रदर्शन देने के बाद प्रचारित अभियान बजट वापस नहीं किया जाता। सक्रिय डैशबोर्ड में बचा हुआ अप्रयुक्त बजट सहायता टिकट के माध्यम से मूल भुगतान विधि में वापस किया जा सकता है।'
                  : 'Promoted category campaign budgets are non-refundable once the campaign runs and starts delivering engagement. Unspent campaign budgets lying in active promotional dashboards can be refunded back to your source payment system upon initiating support tickets.'}
              </p>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide mb-1 text-[11px]">
                {isHindi ? '3. पॉइंट्स रूपांतरण की अंतिमता' : '3. Points Conversions finality'}
              </h4>
              <p>
                {isHindi
                  ? 'वॉलेट फंड में बदले गए रिवॉर्ड पॉइंट्स अपरिवर्तनीय लेनदेन हैं और इन्हें वापस पॉइंट्स में नहीं बदला जा सकता। प्रत्यक्ष निकासी सुरक्षा जांच के अधीन है।'
                  : 'Promotional reward points converted to real USD wallet funds represent irrevocable transactions and cannot be re-converted back to points tokens. Direct payouts are subject to manual security audits against engagement botting or fake accounts.'}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
